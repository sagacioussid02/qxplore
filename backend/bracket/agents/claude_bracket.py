"""Claude bracket agent — uses Anthropic SDK."""
from __future__ import annotations
import json
import copy
from typing import AsyncGenerator
from ...agents.base import BaseAgent
from ...models.bracket import BracketData, BracketPick, CompletedBracket, Matchup, TeamEntry
from ..bracket_engine import get_round_matchups, advance_winner, build_completed_bracket

_SYSTEM = """You are a contrarian NCAA analyst who actively hunts for upsets and distrusts conventional wisdom.
Your edge comes from fading the public, identifying overrated high seeds, and backing hungry mid-major programs.

Respond ONLY with a JSON object — no markdown, no extra text:
{"winner_id": "<team_id>", "winner_name": "<team name>", "confidence": 0.0-1.0, "reasoning": "1-2 sentences"}

Your philosophy:
- Seeds are a starting point, NOT the answer. A #10 with a better KenPom than the #7 is your pick.
- You believe 5 vs 12 is a coin flip — pick the 12-seed unless the 5-seed has a top-20 KenPom.
- Be aggressive: pick at least ONE upset per round that shocks the bracket world.
- You HATE predictable chalk. Never pick all 1/2/3 seeds in the same round.
- Momentum matters: a team on a 10-game win streak beats a higher seed who limped in.
- Be decisive — no ties, own the pick."""


class ClaudeBracketAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=_SYSTEM, max_tokens=200, temperature=0.9)

    def _format_matchup(self, matchup: Matchup) -> str:
        a, b = matchup.team_a, matchup.team_b
        lines = [
            f"Round {matchup.round}, Game {matchup.game_id}:",
            f"  ({a.seed}) {a.name} [{a.conference}] {a.record} KenPom#{a.kenpom_rank or '?'} SOS:{a.strength_of_schedule or '?'}",
            f"  ({b.seed}) {b.name} [{b.conference}] {b.record} KenPom#{b.kenpom_rank or '?'} SOS:{b.strength_of_schedule or '?'}",
        ]
        if a.recent_news:
            lines.append(f"  {a.name} news: {a.recent_news[:150]}")
        if b.recent_news:
            lines.append(f"  {b.name} news: {b.recent_news[:150]}")
        return "\n".join(lines)

    async def pick_matchup(self, session_id: str, matchup: Matchup) -> BracketPick:
        messages = [{"role": "user", "content": self._format_matchup(matchup)}]
        raw = await self.complete(messages)
        try:
            data = json.loads(raw.strip())
        except json.JSONDecodeError:
            # Fallback: pick lower seed
            winner = matchup.team_a if matchup.team_a.seed <= matchup.team_b.seed else matchup.team_b
            data = {"winner_id": winner.team_id, "winner_name": winner.name, "confidence": 0.6, "reasoning": "Seed-based default."}

        winner_id = data.get("winner_id", "")
        winner_name = data.get("winner_name", "")
        # Validate winner_id is one of the two teams
        valid_ids = {matchup.team_a.team_id, matchup.team_b.team_id}
        if winner_id not in valid_ids:
            winner = matchup.team_a if matchup.team_a.seed <= matchup.team_b.seed else matchup.team_b
            winner_id, winner_name = winner.team_id, winner.name

        return BracketPick(
            session_id=session_id,
            agent="claude",
            game_id=matchup.game_id,
            winner_team_id=winner_id,
            winner_name=winner_name,
            confidence=float(data.get("confidence", 0.7)),
            reasoning=data.get("reasoning", ""),
        )

    async def fill_bracket(
        self, session_id: str, bracket: BracketData
    ) -> AsyncGenerator[str, None]:
        """Yield SSE-compatible JSON strings as picks are made."""
        working = copy.deepcopy(bracket)
        picks: dict[str, BracketPick] = {}

        for round_num in range(1, 7):
            matchups = get_round_matchups(working, round_num)
            for matchup in matchups:
                if not matchup.team_a or not matchup.team_b:
                    continue
                pick = await self.pick_matchup(session_id, matchup)
                picks[matchup.game_id] = pick

                # Advance winner
                winner_team = (
                    matchup.team_a if matchup.team_a.team_id == pick.winner_team_id
                    else matchup.team_b
                )
                advance_winner(working, matchup.game_id, winner_team)

                yield json.dumps({
                    "type": "pick",
                    "agent": "claude",
                    "game_id": matchup.game_id,
                    "winner_team_id": pick.winner_team_id,
                    "winner_name": pick.winner_name,
                    "confidence": pick.confidence,
                    "reasoning": pick.reasoning,
                    "round": round_num,
                })

        completed = build_completed_bracket(session_id, "claude", picks, working)
        yield json.dumps({
            "type": "agent_complete",
            "agent": "claude",
            "champion": completed.champion.model_dump() if completed.champion else None,
            "picks": {gid: p.model_dump() for gid, p in picks.items()},
        })
