"""Pydantic models for Interview Prep challenges, submissions, and leaderboard."""
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel


CategoryType = Literal["fundamentals", "construction", "algorithm", "optimization"]
DifficultyType = Literal["beginner", "intermediate", "advanced", "expert"]


class ChallengeConstraints(BaseModel):
    max_qubits: int
    max_gates: int
    time_limit_seconds: int


class Challenge(BaseModel):
    id: str | None = None
    slug: str
    title: str
    category: CategoryType
    difficulty: DifficultyType
    description: str
    hints: list[str] = []
    constraints: ChallengeConstraints
    expected_sv: list[list[float]] | None = None  # [[re, im], ...]; None for optimization
    optimal_gates: int | None = None
    is_active: bool = True


class ChallengeListItem(BaseModel):
    slug: str
    title: str
    category: CategoryType
    difficulty: DifficultyType
    optimal_gates: int | None


class ChallengeDetail(Challenge):
    hints: list[str] = []  # gated: empty for free tier callers


class GateInstruction(BaseModel):
    type: str        # H, X, Y, Z, S, T, CNOT
    qubit: int
    step: int
    target: int | None = None  # second qubit for CNOT


class SubmitRequest(BaseModel):
    gates: list[GateInstruction]
    time_taken_s: int


class ScoringResult(BaseModel):
    score: int
    correctness: int
    efficiency: int
    speed_score: int
    passed: bool
    fidelity: float
    gate_count: int
    circuit_qasm: str | None = None
    submission_id: str | None = None


class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str | None
    best_score: int
    best_gates: int
    user_id: str


class UserSubmission(BaseModel):
    id: str
    challenge_id: str
    score: int
    correctness: int
    efficiency: int
    speed_score: int
    time_taken_s: int
    passed: bool
    submitted_at: str
