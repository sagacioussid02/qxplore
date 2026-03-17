"""NCAA Bracket Challenge endpoints."""
from __future__ import annotations
import json
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from ..bracket.session_store import create_session, get_session, save_session, save_session_async, load_session_for_user
from ..bracket.agents.claude_bracket import ClaudeBracketAgent
from ..bracket.agents.openai_bracket import OpenAIBracketAgent
from ..bracket.agents.gemini_bracket import GeminiBracketAgent
from ..bracket.agents.montecarlo_bracket import MonteCarloAgent
from ..bracket.agents.quantum_bracket import QuantumBracketAgent
from ..bracket.agents.commissioner import CommissionerAgent
from ..bracket.bracket_engine import get_round_matchups, advance_winner, build_completed_bracket, fill_bracket_resumable
from ..data.sports_data_client import get_bracket, load_fallback_bracket
from ..data.team_research import enrich_bracket_with_news
from ..models.bracket import BracketSession, AgentName, CompletedBracket, BracketPick
from ..core.supabase_auth import get_optional_user, require_user, get_credits, deduct_credit

router = APIRouter(prefix="/bracket", tags=["bracket"])

_AGENT_CLASSES = {
    "claude": ClaudeBracketAgent,
    "openai": OpenAIBracketAgent,
    "gemini": GeminiBracketAgent,
    "montecarlo": MonteCarloAgent,
    "quantum": QuantumBracketAgent,
}


@router.post("/session")
async def create_bracket_session(user: dict | None = Depends(get_optional_user)) -> dict:
    """Create a new bracket session.
    - Anonymous users: always get fallback data (no live API call)
    - Authenticated users: try live data first, fall back if unavailable
    """
    if user:
        bracket = await get_bracket(year=2025)
        bracket = await enrich_bracket_with_news(bracket)
        credits = await get_credits(user["sub"])
    else:
        bracket = load_fallback_bracket()
        credits = None  # not applicable for anon

    session = create_session(bracket, user_id=user["sub"] if user else None)
    return {
        "session_id": session.session_id,
        "bracket": bracket.model_dump(),
        "source": bracket.source,
        "is_anonymous": user is None,
        "credits": credits,
    }


@router.get("/session/mine")
async def get_my_session(user: dict = Depends(require_user)) -> dict:
    """Return the authenticated user's most recent bracket session, or 404."""
    session = await load_session_for_user(user["sub"])
    if not session:
        raise HTTPException(status_code=404, detail="No session found")
    return session.model_dump()


@router.get("/session/{session_id}")
async def get_bracket_session(session_id: str) -> dict:
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.model_dump()


def _replay_completed(session_id: str, agent: AgentName, completed: "CompletedBracket"):
    """Return an async generator that replays cached picks for an already-completed agent."""
    async def replay():
        for pick in completed.picks.values():
            yield {"data": json.dumps({
                "type": "pick",
                "agent": agent,
                "game_id": pick.game_id,
                "winner_team_id": pick.winner_team_id,
                "winner_name": pick.winner_name,
                "confidence": pick.confidence,
                "reasoning": pick.reasoning,
                "round": (pick.pick_metadata or {}).get("round", 0),
                "from_cache": True,
            })}
        yield {"data": json.dumps({
            "type": "agent_complete",
            "agent": agent,
            "champion": completed.champion.model_dump() if completed.champion else None,
            "picks": {gid: p.model_dump() for gid, p in completed.picks.items()},
            "from_cache": True,
        })}
        yield {"data": json.dumps({"type": "stream_done", "agent": agent, "from_cache": True})}
    return replay()


@router.get("/session/{session_id}/agent/{agent}/stream")
async def stream_agent_bracket(
    session_id: str,
    agent: AgentName,
    user: dict | None = Depends(get_optional_user),
):
    """SSE: stream one agent filling the bracket pick-by-pick (supports resume from partial picks)."""
    session = get_session(session_id)
    if not session and user:
        loaded = await load_session_for_user(user["sub"])
        if loaded and loaded.session_id == session_id:
            session = loaded
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    agent_cls = _AGENT_CLASSES.get(agent)
    if not agent_cls:
        raise HTTPException(status_code=400, detail=f"Unknown agent: {agent}")

    log.info("stream_agent_bracket: session=%s agent=%s user=%s", session_id, agent, user.get("sub") if user else "anon")

    # ── Cache hit: replay existing picks without re-running ────────────────
    if agent in session.completed_brackets:
        log.info("stream_agent_bracket: replaying cached %s", agent)
        return EventSourceResponse(_replay_completed(session_id, agent, session.completed_brackets[agent]), ping=30)

    agent_instance = agent_cls()
    bracket = session.bracket
    existing = dict(session.partial_picks.get(agent, {}))
    log.info("stream_agent_bracket: running %s fresh (resume=%s, partial=%d)", agent, bool(existing), len(existing))

    async def generate():
        picks: dict[str, BracketPick] = {}

        gen = (
            fill_bracket_resumable(agent, agent_instance, session_id, bracket, existing)
            if existing else agent_instance.fill_bracket(session_id, bracket)
        )

        async for event_json in gen:
            yield {"data": event_json}
            try:
                event = json.loads(event_json)
                if event.get("type") == "pick" and not event.get("from_cache"):
                    bp = BracketPick(
                        session_id=session_id, agent=agent,
                        game_id=event["game_id"],
                        winner_team_id=event["winner_team_id"],
                        winner_name=event["winner_name"],
                        confidence=event["confidence"],
                        reasoning=event.get("reasoning", ""),
                        pick_metadata={"round": event.get("round", 0)},
                    )
                    picks[event["game_id"]] = bp
                    session.partial_picks.setdefault(agent, {})[event["game_id"]] = bp
                    await save_session_async(session)
                elif event.get("type") == "agent_complete":
                    session.partial_picks.pop(agent, None)
                    from ..models.bracket import CompletedBracket, TeamEntry
                    champ_data = event.get("champion")
                    picks_obj = {gid: BracketPick(**p) for gid, p in event.get("picks", {}).items()}
                    completed = CompletedBracket(
                        session_id=session_id, agent=agent,
                        picks=picks_obj,
                        champion=TeamEntry(**champ_data) if champ_data else None,
                    )
                    session.completed_brackets[agent] = completed
                    session.status = "evaluating" if len(session.completed_brackets) == 5 else "picking"
                    await save_session_async(session)
                    log.info("stream_agent_bracket: %s complete (%d total)", agent, len(session.completed_brackets))
            except Exception:
                pass

        yield {"data": json.dumps({"type": "stream_done", "agent": agent})}

    return EventSourceResponse(generate(), ping=30)


log = logging.getLogger(__name__)


@router.get("/session/{session_id}/all-agents/stream")
async def stream_all_agents(session_id: str, user: dict | None = Depends(get_optional_user)):
    """SSE: launch all 5 agents concurrently, multiplex their picks into one stream.

    Credit rules:
    - Anonymous: allowed (uses fallback data already locked in at session creation)
    - Authenticated + already completed (cache replay): allowed, no credit deducted
    - Authenticated + resume (partial_picks exist): allowed, no extra credit deducted
    - Authenticated + fresh run: deduct 450 credits; 402 if insufficient
    """
    log.info("stream_all_agents called: session_id=%s user=%s", session_id, user.get("sub") if user else "anon")

    session = get_session(session_id)
    # If not in memory cache, try loading from Supabase for authenticated users
    if not session and user:
        log.info("Session %s not in memory cache, trying Supabase for user %s", session_id, user["sub"])
        loaded = await load_session_for_user(user["sub"])
        if loaded and loaded.session_id == session_id:
            session = loaded
            log.info("Restored session %s from Supabase", session_id)
        else:
            log.warning("Session %s not found in memory or Supabase", session_id)
    if not session:
        log.error("Session %s not found", session_id)
        raise HTTPException(status_code=404, detail="Session not found — please reload the bracket")

    # Determine if any fresh (non-cached) agents need to run
    fresh_agents = [n for n in _AGENT_CLASSES if n not in session.completed_brackets]
    # A "resume" means partial picks already exist — credits were charged on the original run
    is_resume = any(a in session.partial_picks for a in fresh_agents)
    needs_credits = user is not None and len(fresh_agents) > 0 and not is_resume

    log.info(
        "session %s: completed=%s fresh=%s partial=%s is_resume=%s needs_credits=%s",
        session_id,
        list(session.completed_brackets.keys()),
        fresh_agents,
        list(session.partial_picks.keys()),
        is_resume,
        needs_credits,
    )

    if needs_credits:
        credits_before = await get_credits(user["sub"])
        log.info("User %s has %d credits before deduction (need 450)", user["sub"], credits_before)
        if credits_before < 450:
            log.warning("User %s has insufficient credits: %d < 450", user["sub"], credits_before)
        # This raises 402 if insufficient credits
        remaining = await deduct_credit(user["sub"], amount=450)
        log.info("Deducted 450 credits from user %s, remaining=%d", user["sub"], remaining)
    else:
        remaining = None
        if user:
            log.info("No credit deduction needed for user %s (resume=%s fresh_count=%d)", user["sub"], is_resume, len(fresh_agents))

    session.status = "picking"
    await save_session_async(session)
    bracket = session.bracket

    async def generate():
        queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def run_agent(agent_name: str, agent_cls):
            try:
                agent_instance = agent_cls()
                existing = dict(session.partial_picks.get(agent_name, {}))
                log.info("Starting agent %s (resume=%s, existing_picks=%d)", agent_name, bool(existing), len(existing))
                gen = (
                    fill_bracket_resumable(agent_name, agent_instance, session_id, bracket, existing)
                    if existing else agent_instance.fill_bracket(session_id, bracket)
                )
                async for event_json in gen:
                    await queue.put(event_json)
                log.info("Agent %s finished streaming", agent_name)
            except Exception as exc:
                log.exception("Agent %s crashed: %s", agent_name, exc)
                await queue.put(json.dumps({"type": "error", "agent": agent_name, "message": str(exc)}))
            await queue.put(json.dumps({"type": "agent_done", "agent": agent_name}))

        async def replay_agent(agent_name: str, completed: CompletedBracket):
            async for item in _replay_completed(session_id, agent_name, completed):
                await queue.put(item["data"])
            await queue.put(json.dumps({"type": "agent_done", "agent": agent_name}))

        # For already-completed agents replay cache; run fresh for the rest
        tasks = []
        for name, cls in _AGENT_CLASSES.items():
            if name in session.completed_brackets:
                tasks.append(asyncio.create_task(replay_agent(name, session.completed_brackets[name])))
            else:
                tasks.append(asyncio.create_task(run_agent(name, cls)))

        completed_count = 0
        while completed_count < len(_AGENT_CLASSES):
            event_json = await queue.get()
            try:
                event = json.loads(event_json)
                # Track completions and persist picks
                if event.get("type") == "agent_done":
                    completed_count += 1
                elif event.get("type") == "pick" and not event.get("from_cache"):
                    # Save partial pick for resume — allows resuming from checkpoint on timeout
                    agent_n = event.get("agent")
                    if agent_n and agent_n not in session.completed_brackets:
                        session.partial_picks.setdefault(agent_n, {})[event["game_id"]] = BracketPick(
                            session_id=session_id,
                            agent=agent_n,
                            game_id=event["game_id"],
                            winner_team_id=event["winner_team_id"],
                            winner_name=event["winner_name"],
                            confidence=event.get("confidence", 0.7),
                            reasoning=event.get("reasoning", ""),
                            pick_metadata={"round": event.get("round", 0)},
                        )
                        await save_session_async(session)
                elif event.get("type") == "agent_complete":
                    agent_name = event.get("agent")
                    # Clear partial picks — agent is now fully complete
                    session.partial_picks.pop(agent_name, None)
                    champion_data = event.get("champion")
                    picks_data = event.get("picks", {})
                    from ..models.bracket import TeamEntry
                    champ = TeamEntry(**champion_data) if champion_data else None
                    picks_obj = {
                        gid: BracketPick(**p)
                        for gid, p in picks_data.items()
                    }
                    completed = CompletedBracket(
                        session_id=session_id,
                        agent=agent_name,
                        picks=picks_obj,
                        champion=champ,
                    )
                    session.completed_brackets[agent_name] = completed
                    if len(session.completed_brackets) == 5:
                        session.status = "evaluating"
                    await save_session_async(session)
            except Exception:
                pass

            yield {"data": event_json}

        await asyncio.gather(*tasks, return_exceptions=True)
        yield {"data": json.dumps({
            "type": "all_agents_complete",
            "credits_remaining": remaining,
        })}

    return EventSourceResponse(generate(), ping=30)


@router.get("/session/{session_id}/evaluate/stream")
async def stream_evaluation(
    session_id: str,
    user: dict | None = Depends(get_optional_user),
):
    """SSE: Commissioner evaluates completed brackets (requires at least 1)."""
    session = get_session(session_id)
    if not session and user:
        loaded = await load_session_for_user(user["sub"])
        if loaded and loaded.session_id == session_id:
            session = loaded
            log.info("stream_evaluation: restored session %s from Supabase", session_id)
    if not session:
        log.error("stream_evaluation: session %s not found", session_id)
        raise HTTPException(status_code=404, detail="Session not found — reload the bracket")
    n_complete = len(session.completed_brackets)
    if n_complete < 1:
        log.warning("stream_evaluation: session %s has 0 completed brackets", session_id)
        raise HTTPException(status_code=400, detail="No completed brackets yet. Run at least one agent first.")
    log.info("stream_evaluation: session %s has %d/%d completed brackets — starting commissioner", session_id, n_complete, 5)

    commissioner = CommissionerAgent()

    async def generate():
        full_text = []
        async for chunk in commissioner.evaluate(session.completed_brackets):
            full_text.append(chunk)
            yield {"data": json.dumps({"type": "evaluation_chunk", "chunk": chunk, "done": False})}

        analysis = "".join(full_text)
        from ..models.bracket import EvaluationResult
        evaluation = EvaluationResult(session_id=session_id, written_analysis=analysis)
        session.evaluation = evaluation
        session.status = "complete"
        await save_session_async(session)

        yield {"data": json.dumps({"type": "evaluation_chunk", "chunk": "", "done": True})}
        yield {"data": json.dumps({"type": "evaluation_complete", "analysis": analysis})}

    return EventSourceResponse(generate(), ping=30)


@router.get("/session/{session_id}/consensus")
async def get_consensus(session_id: str) -> dict:
    """Returns per-game agreement/disagreement across all 5 brackets."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    all_brackets = session.completed_brackets
    if not all_brackets:
        return {"consensus": {}}

    # For each game_id: count how many agents picked each team
    all_game_ids: set[str] = set()
    for b in all_brackets.values():
        all_game_ids.update(b.picks.keys())

    consensus = {}
    for gid in sorted(all_game_ids):
        vote_counts: dict[str, list[str]] = {}
        for agent_name, b in all_brackets.items():
            pick = b.picks.get(gid)
            if pick:
                vote_counts.setdefault(pick.winner_name, []).append(agent_name)
        consensus[gid] = {
            "votes": vote_counts,
            "unanimous": len(vote_counts) == 1,
            "split": len(vote_counts) > 1,
        }

    return {"session_id": session_id, "consensus": consensus}
