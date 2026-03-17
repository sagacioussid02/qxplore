"""OpenAI GPT-4o bracket agent — uses openai SDK with structured output."""
from __future__ import annotations
import json
import copy
import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI
from ...core.config import get_settings

log = logging.getLogger(__name__)
from ...models.bracket import BracketData, BracketPick, Matchup
from ..bracket_engine import get_round_matchups, advance_winner, build_completed_bracket

_SYSTEM = """You are a data-driven quant analyst who treats NCAA brackets as a pure statistics problem.
You ONLY trust KenPom rankings, Adjusted Efficiency Margin (AdjEM), Strength of Schedule, and Luck scores. Seeds are largely irrelevant noise.

Respond ONLY with a JSON object — no markdown, no extra text:
{"winner_id": "<team_id>", "winner_name": "<team name>", "confidence": 0.0-1.0, "reasoning": "1-2 sentences"}

Your rules:
- The team with the better KenPom rank wins unless the margin is under 10 ranks — then apply the Luck correction.
- KenPom Luck is a regression signal: Luck > +0.04 means the team has been winning MORE than their efficiency predicts — statistically they are due to underperform. Luck < -0.04 means they have been unlucky and will regress UP.
- When two teams are within 15 KenPom ranks of each other, the team with the lower (less positive) Luck score wins.
- Conference record is a proxy for SOS: ACC/Big Ten/Big 12/SEC > everyone else.
- Statistically, the #1 KenPom team wins the championship only ~20% of the time. Do not pick them as champion unless their Luck score is negative (genuinely dominant). Pick a team ranked #3–#25 KenPom as your champion.
- Express confidence as a function of KenPom rank gap: >30 ranks → 0.85+, <10 ranks → 0.52-0.58.
- When KenPom data is unavailable, use seed as fallback."""


class OpenAIBracketAgent:
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    def _format_matchup(self, matchup: Matchup) -> str:
        a, b = matchup.team_a, matchup.team_b
        a_luck = f"{a.luck:+.3f}" if a.luck is not None else "?"
        b_luck = f"{b.luck:+.3f}" if b.luck is not None else "?"
        lines = [
            f"Round {matchup.round}, Game {matchup.game_id}:",
            f"  ({a.seed}) {a.name} [{a.conference}] {a.record} KenPom#{a.kenpom_rank or '?'} SOS:{a.strength_of_schedule or '?'} Luck:{a_luck}",
            f"  ({b.seed}) {b.name} [{b.conference}] {b.record} KenPom#{b.kenpom_rank or '?'} SOS:{b.strength_of_schedule or '?'} Luck:{b_luck}",
        ]
        if a.recent_news:
            lines.append(f"  {a.name} news: {a.recent_news[:150]}")
        if b.recent_news:
            lines.append(f"  {b.name} news: {b.recent_news[:150]}")
        return "\n".join(lines)

    async def pick_matchup(self, session_id: str, matchup: Matchup) -> BracketPick:
        resp = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": self._format_matchup(matchup)},
            ],
            response_format={"type": "json_object"},
            max_tokens=200,
            temperature=1.0,
            store=True,
            metadata={"session_id": session_id, "agent": "openai", "game_id": matchup.game_id},
        )
        raw = resp.choices[0].message.content or "{}"
        if resp.usage:
            log.info(
                "openai tokens model=%s in=%d out=%d total=%d",
                "gpt-4o", resp.usage.prompt_tokens, resp.usage.completion_tokens, resp.usage.total_tokens,
            )
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {}

        winner_id = data.get("winner_id", "")
        winner_name = data.get("winner_name", "")
        valid_ids = {matchup.team_a.team_id, matchup.team_b.team_id}
        if winner_id not in valid_ids:
            winner = matchup.team_a if matchup.team_a.seed <= matchup.team_b.seed else matchup.team_b
            winner_id, winner_name = winner.team_id, winner.name

        return BracketPick(
            session_id=session_id,
            agent="openai",
            game_id=matchup.game_id,
            winner_team_id=winner_id,
            winner_name=winner_name,
            confidence=float(data.get("confidence", 0.7)),
            reasoning=data.get("reasoning", ""),
        )

    async def fill_bracket(
        self, session_id: str, bracket: BracketData
    ) -> AsyncGenerator[str, None]:
        working = copy.deepcopy(bracket)
        picks: dict[str, BracketPick] = {}

        for round_num in range(1, 7):
            matchups = get_round_matchups(working, round_num)
            for matchup in matchups:
                if not matchup.team_a or not matchup.team_b:
                    continue
                pick = await self.pick_matchup(session_id, matchup)
                picks[matchup.game_id] = pick

                winner_team = (
                    matchup.team_a if matchup.team_a.team_id == pick.winner_team_id
                    else matchup.team_b
                )
                advance_winner(working, matchup.game_id, winner_team)

                yield json.dumps({
                    "type": "pick",
                    "agent": "openai",
                    "game_id": matchup.game_id,
                    "winner_team_id": pick.winner_team_id,
                    "winner_name": pick.winner_name,
                    "confidence": pick.confidence,
                    "reasoning": pick.reasoning,
                    "round": round_num,
                })

        completed = build_completed_bracket(session_id, "openai", picks, working)
        yield json.dumps({
            "type": "agent_complete",
            "agent": "openai",
            "champion": completed.champion.model_dump() if completed.champion else None,
            "picks": {gid: p.model_dump() for gid, p in picks.items()},
        })
