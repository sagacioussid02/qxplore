"""Monte Carlo simulation bracket agent — 10,000 tournament simulations, no LLM."""
from __future__ import annotations
import json
import copy
import asyncio
from typing import AsyncGenerator
import numpy as np
from numpy.random import default_rng
from ...models.bracket import BracketData, BracketPick, Matchup, TeamEntry
from ..bracket_engine import get_round_matchups, advance_winner, build_completed_bracket

# Historical NCAA seed win-probability matrix (lower seed vs higher seed)
# Source: 1985-2025 aggregate (40 years of tournament data)
SEED_WIN_PROB: dict[tuple[int, int], float] = {
    (1, 16): 0.993, (2, 15): 0.942, (3, 14): 0.852, (4, 13): 0.793,
    (5, 12): 0.647, (6, 11): 0.630, (7, 10): 0.601, (8, 9): 0.516,
    # Same-seed (shouldn't happen in R1 but could in later rounds)
    (1, 1): 0.5, (2, 2): 0.5, (3, 3): 0.5, (4, 4): 0.5,
}

# Later rounds: fatigue, scouting, randomness push toward 50/50
ROUND_COMPRESSION = {1: 0.0, 2: 0.05, 3: 0.10, 4: 0.15, 5: 0.18, 6: 0.20}

N_SIMULATIONS = 10_000


def _seed_win_prob(seed_a: int, seed_b: int) -> float:
    """P(team with seed_a beats team with seed_b)."""
    lo, hi = min(seed_a, seed_b), max(seed_a, seed_b)
    base = SEED_WIN_PROB.get((lo, hi), 0.5)
    return base if seed_a <= seed_b else 1.0 - base


def _matchup_win_prob(team_a: TeamEntry, team_b: TeamEntry, round_num: int) -> float:
    """Compute P(team_a wins) with seed + SOS + KenPom adjustments."""
    p = _seed_win_prob(team_a.seed, team_b.seed)

    # SOS adjustment: ±3% per unit differential
    if team_a.strength_of_schedule is not None and team_b.strength_of_schedule is not None:
        sos_delta = (team_a.strength_of_schedule - team_b.strength_of_schedule) * 0.03
        p = np.clip(p + sos_delta, 0.05, 0.95)

    # KenPom adjustment: higher rank = weaker team
    if team_a.kenpom_rank and team_b.kenpom_rank:
        kp_delta = (team_b.kenpom_rank - team_a.kenpom_rank) * 0.001
        p = np.clip(p + kp_delta, 0.05, 0.95)

    # Luck adjustment: encode regression-to-mean.
    # If team_a is luckier than team_b, they are more likely to regress → reduce p.
    # delta = (B.luck - A.luck) * 0.30 → max effect ~±3% per matchup.
    if team_a.luck is not None and team_b.luck is not None:
        luck_delta = (team_b.luck - team_a.luck) * 0.30
        p = np.clip(p + luck_delta, 0.05, 0.95)

    # Round compression: push toward 0.5 in later rounds
    compression = ROUND_COMPRESSION.get(round_num, 0.0)
    p = 0.5 + (p - 0.5) * (1.0 - compression)

    return float(p)


def _simulate_full_tournament(bracket: BracketData, rng: np.random.Generator) -> dict[str, str]:
    """Run one full tournament. Returns {game_id: winner_team_id}."""
    working = copy.deepcopy(bracket)
    sim_picks: dict[str, str] = {}

    for round_num in range(1, 7):
        matchups = get_round_matchups(working, round_num)
        for matchup in matchups:
            if not matchup.team_a or not matchup.team_b:
                continue
            p_a = _matchup_win_prob(matchup.team_a, matchup.team_b, round_num)
            winner = matchup.team_a if rng.random() < p_a else matchup.team_b
            sim_picks[matchup.game_id] = winner.team_id
            advance_winner(working, matchup.game_id, winner)

    return sim_picks


def _run_simulations(bracket: BracketData) -> dict[str, dict[str, int]]:
    """Run N_SIMULATIONS. Returns {game_id: {team_id: win_count}}."""
    rng = default_rng()  # no fixed seed — different results each run
    win_counts: dict[str, dict[str, int]] = {}

    for _ in range(N_SIMULATIONS):
        sim = _simulate_full_tournament(bracket, rng)
        for game_id, winner_id in sim.items():
            win_counts.setdefault(game_id, {})
            win_counts[game_id][winner_id] = win_counts[game_id].get(winner_id, 0) + 1

    return win_counts


class MonteCarloAgent:
    async def fill_bracket(
        self, session_id: str, bracket: BracketData
    ) -> AsyncGenerator[str, None]:
        # Run simulations in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        win_counts = await loop.run_in_executor(None, _run_simulations, bracket)

        # Reconstruct bracket order for streaming picks in round order
        working = copy.deepcopy(bracket)
        picks: dict[str, BracketPick] = {}

        for round_num in range(1, 7):
            matchups = get_round_matchups(working, round_num)
            for matchup in matchups:
                if not matchup.team_a or not matchup.team_b:
                    continue
                game_counts = win_counts.get(matchup.game_id, {})
                if not game_counts:
                    winner = matchup.team_a
                    confidence = 0.5
                else:
                    winner_id = max(game_counts, key=game_counts.get)
                    winner = (
                        matchup.team_a if matchup.team_a.team_id == winner_id
                        else matchup.team_b
                    )
                    confidence = game_counts.get(winner_id, 0) / N_SIMULATIONS

                pick = BracketPick(
                    session_id=session_id,
                    agent="montecarlo",
                    game_id=matchup.game_id,
                    winner_team_id=winner.team_id,
                    winner_name=winner.name,
                    confidence=confidence,
                    reasoning=f"{int(confidence * N_SIMULATIONS):,}/{N_SIMULATIONS:,} simulations — P(win)={confidence:.1%}",
                    pick_metadata={
                        "win_counts": game_counts,
                        "n_simulations": N_SIMULATIONS,
                        "win_prob": _matchup_win_prob(matchup.team_a, matchup.team_b, round_num),
                    },
                )
                picks[matchup.game_id] = pick
                advance_winner(working, matchup.game_id, winner)

                yield json.dumps({
                    "type": "pick",
                    "agent": "montecarlo",
                    "game_id": matchup.game_id,
                    "winner_team_id": winner.team_id,
                    "winner_name": winner.name,
                    "confidence": confidence,
                    "reasoning": pick.reasoning,
                    "round": round_num,
                    "sim_data": {
                        "win_count": game_counts.get(winner.team_id, 0),
                        "total": N_SIMULATIONS,
                    },
                })

        completed = build_completed_bracket(
            session_id, "montecarlo", picks, working,
            {"n_simulations": N_SIMULATIONS}
        )
        yield json.dumps({
            "type": "agent_complete",
            "agent": "montecarlo",
            "champion": completed.champion.model_dump() if completed.champion else None,
            "picks": {gid: p.model_dump() for gid, p in picks.items()},
        })
