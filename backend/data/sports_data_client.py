"""SportsDataIO NCAA Basketball client with static fallback."""
from __future__ import annotations
import json
import logging
import os
from pathlib import Path
from datetime import datetime, timezone
import httpx

log = logging.getLogger(__name__)
from ..core.config import get_settings
from ..models.bracket import BracketData, Region, Matchup, TeamEntry

SPORTSDATA_BASE = "https://api.sportsdata.io/v3/cbb/scores/json"
FALLBACK_PATH = Path(__file__).parent / "bracket_2025_fallback.json"


def load_fallback_bracket() -> BracketData:
    data = json.loads(FALLBACK_PATH.read_text())
    return BracketData(**data)


async def fetch_tournament_bracket(year: int) -> dict | None:
    settings = get_settings()
    if not settings.sporttsdataio_api_key:
        return None
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                f"{SPORTSDATA_BASE}/Tournament/{year}",
                headers={"Ocp-Apim-Subscription-Key": settings.sporttsdataio_api_key},
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            log.warning("SportsDataIO fetch failed: %s", e)
            return None


def _build_bracket_from_api(api_data: list[dict], year: int) -> BracketData:
    """Map SportsDataIO TournamentBracket response to our BracketData model."""
    region_map: dict[str, list[Matchup]] = {}
    final_four: list[Matchup] = []
    championship: Matchup | None = None

    for game in api_data:
        round_num = game.get("Round", 0)
        region_name = game.get("Region", "").lower() or "ff"
        game_id = f"{region_name[:1].upper()}_{game['GameID']}"

        def make_team(suffix: str) -> TeamEntry | None:
            name = game.get(f"{suffix}Team")
            seed = game.get(f"{suffix}TeamSeed")
            if not name:
                return None
            return TeamEntry(
                team_id=name.lower().replace(" ", "_"),
                name=name,
                seed=seed or 0,
                region=region_name,
                record=game.get(f"{suffix}TeamRecord", ""),
                conference=game.get(f"{suffix}TeamConference", ""),
            )

        matchup = Matchup(
            game_id=game_id,
            region_id=region_name,
            round=round_num,
            position=game.get("GameNumber", 0),
            team_a=make_team("Away"),
            team_b=make_team("Home"),
        )

        if round_num == 6:
            championship = matchup
        elif round_num == 5:
            final_four.append(matchup)
        else:
            region_map.setdefault(region_name, []).append(matchup)

    regions = [
        Region(name=r.capitalize(), region_id=r, matchups=ms)
        for r, ms in region_map.items()
    ]

    return BracketData(
        tournament_id=f"ncaa_{year}_mens",
        year=year,
        fetched_at=datetime.now(timezone.utc).isoformat(),
        source="sportsdata_io",
        regions=regions,
        final_four=final_four,
        championship=championship,
    )


async def get_bracket(year: int = 2025) -> BracketData:
    """Try SportsDataIO, fall back to static JSON."""
    api_data = await fetch_tournament_bracket(year)
    if api_data:
        try:
            return _build_bracket_from_api(api_data, year)
        except Exception as e:
            log.error("Failed to parse SportsDataIO response: %s", e, exc_info=True)
    return load_fallback_bracket()
