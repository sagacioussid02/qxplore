"""Pydantic models for the RSA / Shor's algorithm feature."""
from pydantic import BaseModel
from typing import Optional


# ── Key generation ────────────────────────────────────────────────────────────

class KeygenRequest(BaseModel):
    p: int
    q: int


class KeygenResponse(BaseModel):
    p: int
    q: int
    n: int
    phi_n: int
    e: int
    d: int
    steps: list[str]   # human-readable derivation shown step-by-step in the UI


# ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

class EncryptRequest(BaseModel):
    message_int: int   # e.g. ord('H') = 72
    e: int
    n: int


class EncryptResponse(BaseModel):
    ciphertext: int
    steps: list[str]


class DecryptRequest(BaseModel):
    ciphertext: int
    d: int
    n: int


class DecryptResponse(BaseModel):
    plaintext_int: int
    plaintext_char: str
    steps: list[str]


# ── Classical trial-division factoring ───────────────────────────────────────

class ClassicalFactorRequest(BaseModel):
    n: int
    max_steps: int = 500   # cap for UI — full run may be huge


class ClassicalFactorStep(BaseModel):
    divisor: int
    remainder: int
    is_factor: bool


class ClassicalFactorResponse(BaseModel):
    n: int
    factors: list[int]         # [p, q], empty if not found within max_steps
    steps_taken: int
    total_steps_needed: int    # ceil(sqrt(n)) — true worst-case
    step_log: list[ClassicalFactorStep]   # first ~50 steps for UI animation
    succeeded: bool
    time_estimate: str         # human-readable scale hint


# ── Shor's algorithm (Qiskit, n=15 fixed) ────────────────────────────────────

class ShorMeasurement(BaseModel):
    bitstring: str
    register_value: int
    phase: float               # register_value / 2^n_count
    period_candidate: int      # denominator of continued-fraction approx
    count: int                 # number of shots producing this result


class ShorResponse(BaseModel):
    n: int
    a: int                     # random coprime chosen (7 for n=15)
    factors: list[int]         # [3, 5]
    period_r: int              # 4 for a=7, n=15
    measurements: list[ShorMeasurement]
    num_qubits: int
    circuit_depth: int
    gate_count: int
    shots: int
    steps: list[str]           # narrative steps for the UI to reveal one by one
    succeeded: bool
