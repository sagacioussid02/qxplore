"""Brave Search enrichment for team news snippets."""
from __future__ import annotations
import asyncio
import httpx
from ..core.config import get_settings
from ..models.bracket import BracketData

BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"


async def _fetch_team_news(client: httpx.AsyncClient, team_name: str, api_key: str) -> str:
    try:
        resp = await client.get(
            BRAVE_SEARCH_URL,
            headers={"X-Subscription-Token": api_key, "Accept": "application/json"},
            params={"q": f"{team_name} NCAA basketball 2025 injuries form lineup", "count": 3},
            timeout=8.0,
        )
        resp.raise_for_status()
        results = resp.json().get("web", {}).get("results", [])
        snippets = [r.get("description", "") for r in results[:3] if r.get("description")]
        return " | ".join(snippets)[:400]
    except Exception:
        return ""


async def enrich_bracket_with_news(bracket: BracketData) -> BracketData:
    """Fetch news for each first-round team and inject into TeamEntry.recent_news."""
    settings = get_settings()
    if not settings.brave_search_api_key:
        return bracket

    # Collect all unique first-round teams
    teams: dict[str, object] = {}
    for region in bracket.regions:
        for matchup in region.matchups:
            if matchup.round == 1:
                for team in [matchup.team_a, matchup.team_b]:
                    if team and team.team_id not in teams:
                        teams[team.team_id] = team

    async with httpx.AsyncClient() as client:
        tasks = {
            tid: _fetch_team_news(client, t.name, settings.brave_search_api_key)
            for tid, t in teams.items()
        }
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        news_map = {
            tid: (res if isinstance(res, str) else "")
            for tid, res in zip(tasks.keys(), results)
        }

    # Inject news into all team entries across all matchups
    for region in bracket.regions:
        for matchup in region.matchups:
            for team in [matchup.team_a, matchup.team_b]:
                if team and team.team_id in news_map:
                    team.recent_news = news_map[team.team_id]

    return bracket
