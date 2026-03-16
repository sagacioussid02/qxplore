"""NCAA Bracket Challenge endpoints."""
from __future__ import annotations
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from ..bracket.session_store import create_session, get_session, save_session, save_session_async, load_session_for_user
from ..bracket.agents.claude_bracket import ClaudeBracketAgent
from ..bracket.agents.openai_bracket import OpenAIBracketAgent
from ..bracket.agents.gemini_bracket import GeminiBracketAgent
from ..bracket.agents.montecarlo_bracket import MonteCarloAgent
from ..bracket.agents.quantum_bracket import QuantumBracketAgent
from ..bracket.agents.commissioner import CommissionerAgent
from ..bracket.bracket_engine import get_round_matchups
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
async def stream_agent_bracket(session_id: str, agent: AgentName):
    """SSE: stream one agent filling the bracket pick-by-pick."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    agent_cls = _AGENT_CLASSES.get(agent)
    if not agent_cls:
        raise HTTPException(status_code=400, detail=f"Unknown agent: {agent}")

    # ── Cache hit: replay existing picks without re-running ────────────────
    if agent in session.completed_brackets:
        return EventSourceResponse(_replay_completed(session_id, agent, session.completed_brackets[agent]), ping=30)

    agent_instance = agent_cls()
    bracket = session.bracket

    async def generate():
        picks: dict[str, BracketPick] = {}
        champion = None

        async for event_json in agent_instance.fill_bracket(session_id, bracket):
            yield {"data": event_json}

            # Track picks and completion in session store
            try:
                event = json.loads(event_json)
                if event.get("type") == "pick":
                    picks[event["game_id"]] = BracketPick(
                        session_id=session_id,
                        agent=agent,
                        game_id=event["game_id"],
                        winner_team_id=event["winner_team_id"],
                        winner_name=event["winner_name"],
                        confidence=event["confidence"],
                        reasoning=event.get("reasoning", ""),
                        pick_metadata=event.get("circuit") or event.get("sim_data") or {},
                    )
                elif event.get("type") == "agent_complete":
                    champion = event.get("champion")
                    from ..models.bracket import CompletedBracket
                    from ..models.bracket import TeamEntry
                    champ_team = TeamEntry(**champion) if champion else None
                    completed = CompletedBracket(
                        session_id=session_id,
                        agent=agent,
                        picks=picks,
                        champion=champ_team,
                        agent_metadata=event.get("agent_metadata", {}),
                    )
                    session.completed_brackets[agent] = completed
                    if len(session.completed_brackets) == 5:
                        session.status = "evaluating"
                    else:
                        session.status = "picking"
                    await save_session_async(session)
            except Exception:
                pass

        yield {"data": json.dumps({"type": "stream_done", "agent": agent})}

    return EventSourceResponse(generate(), ping=30)


@router.get("/session/{session_id}/all-agents/stream")
async def stream_all_agents(session_id: str, user: dict | None = Depends(get_optional_user)):
    """SSE: launch all 5 agents concurrently, multiplex their picks into one stream.

    Credit rules:
    - Anonymous: allowed (uses fallback data already locked in at session creation)
    - Authenticated + already completed (cache replay): allowed, no credit deducted
    - Authenticated + fresh run: deduct 1 credit; 402 if none left
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Determine if any fresh (non-cached) agents need to run
    fresh_agents = [n for n in _AGENT_CLASSES if n not in session.completed_brackets]
    needs_credits = user is not None and len(fresh_agents) > 0

    if needs_credits:
        # This raises 402 if credits = 0
        remaining = await deduct_credit(user["sub"])
    else:
        remaining = None

    session.status = "picking"
    await save_session_async(session)
    bracket = session.bracket

    async def generate():
        queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def run_agent(agent_name: str, agent_cls):
            agent_instance = agent_cls()
            async for event_json in agent_instance.fill_bracket(session_id, bracket):
                await queue.put(event_json)
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
                elif event.get("type") == "agent_complete":
                    agent_name = event.get("agent")
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
async def stream_evaluation(session_id: str):
    """SSE: Commissioner evaluates all 5 completed brackets."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if len(session.completed_brackets) < 5:
        raise HTTPException(
            status_code=400,
            detail=f"Only {len(session.completed_brackets)}/5 brackets complete. Run all agents first."
        )

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
