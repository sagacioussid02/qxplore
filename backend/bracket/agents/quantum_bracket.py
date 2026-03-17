"""Quantum circuit bracket agent — Qiskit amplitude encoding, no LLM."""
from __future__ import annotations
import json
import copy
import asyncio
import math
from typing import AsyncGenerator
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from ...models.bracket import BracketData, BracketPick, Matchup, TeamEntry
from ..bracket_engine import get_round_matchups, advance_winner, build_completed_bracket

SHOTS = 128  # fewer shots → more quantum uncertainty → upsets possible
_simulator = AerSimulator()


def _team_strength_angle(team: TeamEntry) -> float:
    """
    Encode team strength as RY rotation angle (0 to π).
    Stronger team → angle closer to π → qubit closer to |1⟩.

    Seed 1  → base ≈ π (1.0 normalized)
    Seed 16 → base ≈ π/16 (0.0625 normalized)

    Bonuses (clamped so total stays in [0.1, π]):
      KenPom top-25  → +0.25 rad
      KenPom top-50  → +0.15 rad
      SOS > 10       → +0.20 rad
      SOS > 7        → +0.10 rad
      Luck           → subtract luck value (~±0.10 rad)
                       Positive luck = overperforming = regression risk → lower angle
                       Negative luck = underperforming = hidden value → higher angle
    """
    seed_norm = (17 - team.seed) / 16.0        # seed=1 → 1.0, seed=16 → 0.0625
    base = seed_norm * math.pi

    bonus = 0.0
    if team.kenpom_rank:
        if team.kenpom_rank <= 25:
            bonus += 0.25
        elif team.kenpom_rank <= 50:
            bonus += 0.15
        elif team.kenpom_rank <= 75:
            bonus += 0.05
    if team.strength_of_schedule:
        if team.strength_of_schedule >= 10.0:
            bonus += 0.20
        elif team.strength_of_schedule >= 7.0:
            bonus += 0.10
    if team.luck is not None:
        # Subtract luck: positive luck (overperforming) lowers the angle,
        # negative luck (unlucky team) raises it — encoding regression to mean.
        bonus -= team.luck

    return float(max(0.1, min(base + bonus, math.pi)))


def _run_matchup_circuit(team_a: TeamEntry, team_b: TeamEntry) -> tuple[str, float, dict]:
    """
    2-qubit circuit:
      q0 ← team_a: RY(θ_a)
      q1 ← team_b: RY(θ_b)
      CNOT(q0 → q1)     ← entanglement: winner's state conditions loser's fate
      measure both

    Interpretation:
      '10' → q0=|1⟩, q1=|0⟩  → team_a wins   (dominant |1⟩ beats collapsed |0⟩)
      '01' → q0=|0⟩, q1=|1⟩  → team_b wins
      '11' → both |1⟩         → team_a wins   (higher amplitude wins ties)
      '00' → both |0⟩         → team_b wins   (collapses favour b — underdog)
    """
    θ_a = _team_strength_angle(team_a)
    θ_b = _team_strength_angle(team_b)

    qc = QuantumCircuit(2, 2)
    qc.ry(θ_a, 0)   # encode team_a strength
    qc.ry(θ_b, 1)   # encode team_b strength
    qc.cx(0, 1)     # entangle: team_a influences team_b
    qc.measure([0, 1], [0, 1])

    tqc = transpile(qc, _simulator)
    job = _simulator.run(tqc, shots=SHOTS)
    counts: dict[str, int] = job.result().get_counts()

    # Tally: states where q0=1 → team_a wins
    a_wins = counts.get("10", 0) + counts.get("11", 0)
    b_wins = counts.get("01", 0) + counts.get("00", 0)
    total = sum(counts.values())

    if a_wins >= b_wins:
        winner_id = team_a.team_id
        confidence = a_wins / total
    else:
        winner_id = team_b.team_id
        confidence = b_wins / total

    circuit_info = {
        "theta_a": round(θ_a, 4),
        "theta_b": round(θ_b, 4),
        "shots": SHOTS,
        "counts": counts,
        "a_wins": a_wins,
        "b_wins": b_wins,
    }
    return winner_id, float(confidence), circuit_info


class QuantumBracketAgent:
    async def fill_bracket(
        self, session_id: str, bracket: BracketData
    ) -> AsyncGenerator[str, None]:
        loop = asyncio.get_event_loop()
        working = copy.deepcopy(bracket)
        picks: dict[str, BracketPick] = {}

        for round_num in range(1, 7):
            matchups = get_round_matchups(working, round_num)
            for matchup in matchups:
                if not matchup.team_a or not matchup.team_b:
                    continue

                # Run quantum circuit in thread pool (Qiskit is CPU-bound)
                winner_id, confidence, circuit_info = await loop.run_in_executor(
                    None, _run_matchup_circuit, matchup.team_a, matchup.team_b
                )

                winner = (
                    matchup.team_a if matchup.team_a.team_id == winner_id
                    else matchup.team_b
                )

                θ_a = circuit_info["theta_a"]
                θ_b = circuit_info["theta_b"]
                luck_a = matchup.team_a.luck
                luck_b = matchup.team_b.luck
                luck_note = ""
                if luck_a is not None and luck_b is not None:
                    luck_note = (
                        f" [luck: {matchup.team_a.name} {luck_a:+.3f},"
                        f" {matchup.team_b.name} {luck_b:+.3f}]"
                    )
                reasoning = (
                    f"θ({matchup.team_a.name})={θ_a:.2f}rad vs θ({matchup.team_b.name})={θ_b:.2f}rad"
                    f" — {circuit_info['a_wins']}/{SHOTS} shots favoured {winner.name}"
                    f" (amplitude confidence {confidence:.1%}){luck_note}"
                )

                pick = BracketPick(
                    session_id=session_id,
                    agent="quantum",
                    game_id=matchup.game_id,
                    winner_team_id=winner_id,
                    winner_name=winner.name,
                    confidence=confidence,
                    reasoning=reasoning,
                    pick_metadata=circuit_info,
                )
                picks[matchup.game_id] = pick
                advance_winner(working, matchup.game_id, winner)

                yield json.dumps({
                    "type": "pick",
                    "agent": "quantum",
                    "game_id": matchup.game_id,
                    "winner_team_id": winner_id,
                    "winner_name": winner.name,
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "round": round_num,
                    "circuit": {
                        "theta_a": θ_a,
                        "theta_b": θ_b,
                        "counts": circuit_info["counts"],
                    },
                })

        completed = build_completed_bracket(
            session_id, "quantum", picks, working,
            {"shots_per_game": SHOTS, "entanglement": "CNOT", "encoding": "RY amplitude"}
        )
        yield json.dumps({
            "type": "agent_complete",
            "agent": "quantum",
            "champion": completed.champion.model_dump() if completed.champion else None,
            "picks": {gid: p.model_dump() for gid, p in picks.items()},
        })
