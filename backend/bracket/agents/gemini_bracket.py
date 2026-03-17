"""Gemini 2.0 Flash bracket agent — uses google-genai SDK (new)."""
from __future__ import annotations
import json
import copy
import logging
from typing import AsyncGenerator
from google import genai
from google.genai import types
from ...core.config import get_settings
from ...models.bracket import BracketData, BracketPick, Matchup
from ..bracket_engine import get_round_matchups, advance_winner, build_completed_bracket

log = logging.getLogger(__name__)

_SYSTEM = """You are a narrative-driven college basketball analyst who picks brackets based on storylines, momentum, and Cinderella potential.
You believe tournament basketball is won on heart, coaching, and destiny — not spreadsheets.

Respond ONLY with a JSON object — no markdown, no extra text:
{"winner_id": "<team_id>", "winner_name": "<team name>", "confidence": 0.0-1.0, "reasoning": "1-2 sentences"}

Your philosophy:
- Mid-major programs playing in their home region have a massive crowd advantage — back them.
- A team with a legendary tournament coach (over 10 Final Four appearances) beats chalk in close games.
- Injury news is the most important signal: a star player limited = automatic upset alert.
- You actively seek the Cinderella: one double-digit seed makes it to the Elite Eight every year.
- Never pick more than ONE 1-seed in the Final Four — the story of March is always an underdog.
- Conference tournament champions arrive HOT — respect that momentum.
- KenPom Luck reveals heart: a team with negative Luck has been playing harder than their record shows — they are warriors. A team with high positive Luck is playing above their head and will crack under pressure.
- Your champion MUST be a feel-good story — a seed ≥ 4, a mid-major, or a program that hasn't won in decades. A #1 blue blood winning is not a story worth telling.
- If two teams are evenly matched, pick the one from the smaller school. David beats Goliath."""


class GeminiBracketAgent:
    def __init__(self):
        settings = get_settings()
        if not settings.google_api_key:
            log.error("GeminiBracketAgent: GOOGLE_API_KEY is not set")
            raise ValueError("GOOGLE_API_KEY is required for Gemini agent")
        log.info("GeminiBracketAgent: initialising with google-genai SDK")
        self.client = genai.Client(api_key=settings.google_api_key)

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
        prompt = self._format_matchup(matchup)
        log.debug("Gemini pick_matchup game=%s\n%s", matchup.game_id, prompt)
        try:
            resp = await self.client.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=_SYSTEM,
                    response_mime_type="application/json",
                    max_output_tokens=200,
                    temperature=0.9,
                ),
            )
        except Exception as exc:
            log.error("Gemini API error on game %s: %s", matchup.game_id, exc, exc_info=True)
            raise

        raw = resp.text or "{}"
        log.debug("Gemini raw response game=%s: %s", matchup.game_id, raw)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            log.warning("Gemini JSON parse failed game=%s raw=%r error=%s", matchup.game_id, raw, exc)
            data = {}

        winner_id = data.get("winner_id", "")
        winner_name = data.get("winner_name", "")
        valid_ids = {matchup.team_a.team_id, matchup.team_b.team_id}
        if winner_id not in valid_ids:
            log.warning(
                "Gemini returned invalid winner_id=%r for game=%s (valid: %s) — falling back to lower seed",
                winner_id, matchup.game_id, valid_ids,
            )
            winner = matchup.team_a if matchup.team_a.seed <= matchup.team_b.seed else matchup.team_b
            winner_id, winner_name = winner.team_id, winner.name

        return BracketPick(
            session_id=session_id,
            agent="gemini",
            game_id=matchup.game_id,
            winner_team_id=winner_id,
            winner_name=winner_name,
            confidence=float(data.get("confidence", 0.7)),
            reasoning=data.get("reasoning", ""),
        )

    async def fill_bracket(
        self, session_id: str, bracket: BracketData
    ) -> AsyncGenerator[str, None]:
        log.info("Gemini fill_bracket start session=%s", session_id)
        working = copy.deepcopy(bracket)
        picks: dict[str, BracketPick] = {}

        for round_num in range(1, 7):
            matchups = get_round_matchups(working, round_num)
            eligible = [m for m in matchups if m.team_a and m.team_b]
            log.info("Gemini round=%d matchups=%d eligible=%d", round_num, len(matchups), len(eligible))

            for matchup in eligible:
                try:
                    pick = await self.pick_matchup(session_id, matchup)
                except Exception as exc:
                    log.error(
                        "Gemini pick failed session=%s game=%s — defaulting to lower seed. Error: %s",
                        session_id, matchup.game_id, exc, exc_info=True,
                    )
                    winner = matchup.team_a if matchup.team_a.seed <= matchup.team_b.seed else matchup.team_b
                    pick = BracketPick(
                        session_id=session_id,
                        agent="gemini",
                        game_id=matchup.game_id,
                        winner_team_id=winner.team_id,
                        winner_name=winner.name,
                        confidence=0.5,
                        reasoning="[error fallback]",
                    )
                    yield json.dumps({"type": "error", "agent": "gemini", "game_id": matchup.game_id, "message": str(exc)})

                picks[matchup.game_id] = pick

                winner_team = (
                    matchup.team_a if matchup.team_a.team_id == pick.winner_team_id
                    else matchup.team_b
                )
                advance_winner(working, matchup.game_id, winner_team)
                log.debug("Gemini round=%d game=%s → %s", round_num, matchup.game_id, pick.winner_name)

                yield json.dumps({
                    "type": "pick",
                    "agent": "gemini",
                    "game_id": matchup.game_id,
                    "winner_team_id": pick.winner_team_id,
                    "winner_name": pick.winner_name,
                    "confidence": pick.confidence,
                    "reasoning": pick.reasoning,
                    "round": round_num,
                })

        log.info("Gemini fill_bracket complete session=%s total_picks=%d", session_id, len(picks))
        completed = build_completed_bracket(session_id, "gemini", picks, working)
        yield json.dumps({
            "type": "agent_complete",
            "agent": "gemini",
            "champion": completed.champion.model_dump() if completed.champion else None,
            "picks": {gid: p.model_dump() for gid, p in picks.items()},
        })
