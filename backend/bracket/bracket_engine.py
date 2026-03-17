"""Shared bracket traversal utilities used by all agents."""
from __future__ import annotations
import copy
import json
import logging
from typing import AsyncGenerator
from ..models.bracket import BracketData, Matchup, TeamEntry, BracketPick, CompletedBracket, AgentName


def get_round_matchups(bracket: BracketData, round_num: int) -> list[Matchup]:
    """Return all matchups of a given round in bracket order."""
    matchups = []
    for region in bracket.regions:
        matchups.extend(m for m in region.matchups if m.round == round_num)
    if round_num == 5:
        matchups.extend(bracket.final_four)
    if round_num == 6 and bracket.championship:
        matchups.append(bracket.championship)
    return matchups


def get_matchup_by_id(bracket: BracketData, game_id: str) -> Matchup | None:
    for region in bracket.regions:
        for m in region.matchups:
            if m.game_id == game_id:
                return m
    for m in bracket.final_four:
        if m.game_id == game_id:
            return m
    if bracket.championship and bracket.championship.game_id == game_id:
        return bracket.championship
    return None


def advance_winner(bracket: BracketData, game_id: str, winner: TeamEntry) -> None:
    """Place winner into the next matchup (fills team_a or team_b slot)."""
    source = get_matchup_by_id(bracket, game_id)
    if not source or not source.winner_advances_to:
        return
    next_m = get_matchup_by_id(bracket, source.winner_advances_to)
    if not next_m:
        return
    if next_m.team_a is None:
        next_m.team_a = winner
    else:
        next_m.team_b = winner


def build_completed_bracket(
    session_id: str,
    agent: AgentName,
    picks: dict[str, BracketPick],
    bracket: BracketData,
    agent_metadata: dict | None = None,
) -> CompletedBracket:
    from datetime import datetime, timezone
    champ_pick = picks.get("CHAMP")
    champion = None
    if champ_pick:
        # Find the actual team from the bracket
        for region in bracket.regions:
            for matchup in region.matchups:
                for team in [matchup.team_a, matchup.team_b]:
                    if team and team.team_id == champ_pick.winner_team_id:
                        champion = team
        # Also check FF and championship
        if not champion:
            for m in bracket.final_four + ([bracket.championship] if bracket.championship else []):
                for team in [m.team_a, m.team_b]:
                    if team and team.team_id == champ_pick.winner_team_id:
                        champion = team

    return CompletedBracket(
        session_id=session_id,
        agent=agent,
        picks=picks,
        champion=champion,
        completed_at=datetime.now(timezone.utc).isoformat(),
        agent_metadata=agent_metadata or {},
    )


log = logging.getLogger(__name__)


async def fill_bracket_resumable(
    agent_name: str,
    agent_instance,
    session_id: str,
    bracket: BracketData,
    existing_picks: dict[str, BracketPick],
) -> AsyncGenerator[str, None]:
    """Fill a bracket replaying existing partial picks, then continuing with fresh LLM picks."""
    working = copy.deepcopy(bracket)
    picks: dict[str, BracketPick] = {}

    for round_num in range(1, 7):
        matchups = get_round_matchups(working, round_num)
        eligible = [m for m in matchups if m.team_a and m.team_b]

        for matchup in eligible:
            if matchup.game_id in existing_picks:
                # Replay cached pick (instant, no LLM call)
                pick = existing_picks[matchup.game_id]
                winner_team = (
                    matchup.team_a if matchup.team_a and matchup.team_a.team_id == pick.winner_team_id
                    else matchup.team_b
                )
                if not winner_team:
                    continue
                advance_winner(working, matchup.game_id, winner_team)
                picks[matchup.game_id] = pick
                yield json.dumps({
                    "type": "pick",
                    "agent": agent_name,
                    "game_id": matchup.game_id,
                    "winner_team_id": pick.winner_team_id,
                    "winner_name": pick.winner_name,
                    "confidence": pick.confidence,
                    "reasoning": pick.reasoning,
                    "round": round_num,
                    "from_cache": True,
                })
            else:
                # Fresh pick from the LLM agent
                try:
                    pick = await agent_instance.pick_matchup(session_id, matchup)
                except Exception as exc:
                    log.error("pick_matchup failed for %s game=%s: %s", agent_name, matchup.game_id, exc)
                    winner_team = matchup.team_a if matchup.team_a.seed <= matchup.team_b.seed else matchup.team_b
                    pick = BracketPick(
                        session_id=session_id,
                        agent=agent_name,
                        game_id=matchup.game_id,
                        winner_team_id=winner_team.team_id,
                        winner_name=winner_team.name,
                        confidence=0.5,
                        reasoning="[error fallback]",
                    )
                    yield json.dumps({"type": "error", "agent": agent_name, "game_id": matchup.game_id, "message": str(exc)})
                winner_team = (
                    matchup.team_a if matchup.team_a.team_id == pick.winner_team_id else matchup.team_b
                )
                advance_winner(working, matchup.game_id, winner_team)
                picks[matchup.game_id] = pick
                yield json.dumps({
                    "type": "pick",
                    "agent": agent_name,
                    "game_id": matchup.game_id,
                    "winner_team_id": pick.winner_team_id,
                    "winner_name": pick.winner_name,
                    "confidence": pick.confidence,
                    "reasoning": pick.reasoning,
                    "round": round_num,
                })

    completed = build_completed_bracket(session_id, agent_name, picks, working)
    yield json.dumps({
        "type": "agent_complete",
        "agent": agent_name,
        "champion": completed.champion.model_dump() if completed.champion else None,
        "picks": {gid: p.model_dump() for gid, p in picks.items()},
    })


async def fill_bracket_random_completion(
    agent_name: str,
    session_id: str,
    bracket: BracketData,
    existing_picks: dict[str, "BracketPick"],
) -> AsyncGenerator[str, None]:
    """Fill any un-picked games with deterministic seed-based picks (no LLM).
    Used when an agent timed out and the user wants to complete the bracket instantly.
    """
    working = copy.deepcopy(bracket)
    picks: dict[str, "BracketPick"] = {}

    # Replay existing picks first to build working bracket state
    for round_num in range(1, 7):
        matchups = get_round_matchups(working, round_num)
        for matchup in matchups:
            if not matchup.team_a or not matchup.team_b:
                continue
            if matchup.game_id in existing_picks:
                pick = existing_picks[matchup.game_id]
                winner_team = (
                    matchup.team_a if matchup.team_a.team_id == pick.winner_team_id
                    else matchup.team_b
                )
                advance_winner(working, matchup.game_id, winner_team)
                picks[matchup.game_id] = pick
                yield json.dumps({
                    "type": "pick",
                    "agent": agent_name,
                    "game_id": matchup.game_id,
                    "winner_team_id": pick.winner_team_id,
                    "winner_name": pick.winner_name,
                    "confidence": pick.confidence,
                    "reasoning": pick.reasoning,
                    "round": round_num,
                    "from_cache": True,
                })
            else:
                # Seed-based fallback: lower seed (better team) wins
                winner_team = matchup.team_a if matchup.team_a.seed <= matchup.team_b.seed else matchup.team_b
                pick = BracketPick(
                    session_id=session_id,
                    agent=agent_name,
                    game_id=matchup.game_id,
                    winner_team_id=winner_team.team_id,
                    winner_name=winner_team.name,
                    confidence=0.5,
                    reasoning=f"Seed-based fill: #{winner_team.seed} {winner_team.name} over #{(matchup.team_b if winner_team == matchup.team_a else matchup.team_a).seed}",
                )
                advance_winner(working, matchup.game_id, winner_team)
                picks[matchup.game_id] = pick
                yield json.dumps({
                    "type": "pick",
                    "agent": agent_name,
                    "game_id": matchup.game_id,
                    "winner_team_id": pick.winner_team_id,
                    "winner_name": pick.winner_name,
                    "confidence": pick.confidence,
                    "reasoning": pick.reasoning,
                    "round": round_num,
                    "random_fill": True,
                })

    completed = build_completed_bracket(session_id, agent_name, picks, working)
    yield json.dumps({
        "type": "agent_complete",
        "agent": agent_name,
        "champion": completed.champion.model_dump() if completed.champion else None,
        "picks": {gid: p.model_dump() for gid, p in picks.items()},
    })
