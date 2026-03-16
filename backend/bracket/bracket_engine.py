"""Shared bracket traversal utilities used by all agents."""
from __future__ import annotations
import copy
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
