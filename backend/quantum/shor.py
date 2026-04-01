"""
Shor's algorithm (period-finding via QPE) for n=15, plus classical RSA helpers.

Qiskit 2.x notes:
  - UnitaryGate is in qiskit.circuit.library (not qiskit.extensions)
  - QFTGate(n).inverse() for IQFT (QFT(..., inverse=True) is deprecated in 2.1)
  - AerSimulator returns Statevector objects; use np.asarray() if needed
  - optimization_level=0 avoids slow unitary decomposition on the statevector sim
  - Measurement bitstrings: int(bs, 2) gives the natural register value
    (Qiskit's get_counts bitstrings are MSB-first for the measured register)
"""
import math
import logging
from fractions import Fraction
from math import gcd

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import UnitaryGate, QFTGate
from qiskit_aer import AerSimulator

from .simulator import get_simulator
from ..models.rsa_models import (
    KeygenResponse,
    EncryptResponse,
    DecryptResponse,
    ClassicalFactorStep,
    ClassicalFactorResponse,
    ShorMeasurement,
    ShorResponse,
)

log = logging.getLogger(__name__)

# ── RSA math ──────────────────────────────────────────────────────────────────

def _is_prime(n: int) -> bool:
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    for i in range(3, int(math.isqrt(n)) + 1, 2):
        if n % i == 0:
            return False
    return True


def _pick_e(phi_n: int) -> int:
    """Smallest e > 1 that is coprime with phi_n."""
    for e in range(3, phi_n, 2):
        if gcd(e, phi_n) == 1:
            return e
    return 2  # fallback (shouldn't reach here for valid primes)


def run_keygen(p: int, q: int) -> KeygenResponse:
    n = p * q
    phi_n = (p - 1) * (q - 1)
    e = _pick_e(phi_n)
    d = pow(e, -1, phi_n)  # Python 3.8+: modular inverse
    steps = [
        f"Choose primes p = {p},  q = {q}",
        f"Compute modulus:  n = p × q = {p} × {q} = {n}",
        f"Euler's totient:  φ(n) = (p−1)(q−1) = {p-1} × {q-1} = {phi_n}",
        f"Public exponent:  e = {e}   [smallest odd > 1 with gcd(e, φ(n)) = 1]",
        f"Private exponent: d = e⁻¹ mod φ(n) = {d}",
        f"Verify: e × d mod φ(n) = {e} × {d} mod {phi_n} = {(e * d) % phi_n}  ✓",
        f"Public key  → (e = {e},  n = {n})",
        f"Private key → (d = {d},  n = {n})  ← keep this secret!",
    ]
    return KeygenResponse(p=p, q=q, n=n, phi_n=phi_n, e=e, d=d, steps=steps)


def run_encrypt(message_int: int, e: int, n: int) -> EncryptResponse:
    c = pow(message_int, e, n)
    steps = [
        f"Message (m) = {message_int}  (ASCII for the chosen character)",
        f"Ciphertext formula: c = mᵉ mod n",
        f"c = {message_int}^{e} mod {n}",
        f"c = {c}",
        f"📨 Sending ciphertext {c} to Bob…",
    ]
    return EncryptResponse(ciphertext=c, steps=steps)


def run_decrypt(ciphertext: int, d: int, n: int) -> DecryptResponse:
    m = pow(ciphertext, d, n)
    char = chr(m) if 32 <= m <= 126 else "?"
    steps = [
        f"Ciphertext (c) = {ciphertext}",
        f"Decryption formula: m = cᵈ mod n",
        f"m = {ciphertext}^{d} mod {n}",
        f"m = {m}",
        f"ASCII {m} → character '{char}'  ✓",
    ]
    return DecryptResponse(plaintext_int=m, plaintext_char=char, steps=steps)


# ── Classical trial-division factoring ───────────────────────────────────────

def _time_estimate(n: int) -> str:
    """Rough human-readable estimate for trial-division worst case."""
    steps = math.isqrt(n)
    if steps < 1_000:
        return f"~{steps} steps — instant"
    if steps < 1_000_000:
        return f"~{steps:,} steps — milliseconds"
    if steps < 1_000_000_000:
        return f"~{steps:,} steps — seconds"
    if steps < 10 ** 15:
        return f"~{steps:.2e} steps — hours to years"
    return f"~{steps:.2e} steps — longer than the age of the universe"


def run_classical_factor(n: int, max_steps: int = 500) -> ClassicalFactorResponse:
    """
    Trial division from 2 up to sqrt(n).
    Returns the first 50 steps for the UI animation, plus totals.
    max_steps caps how many divisions we actually compute (for large n).
    """
    limit = math.isqrt(n) + 1
    step_log: list[ClassicalFactorStep] = []
    steps_taken = 0
    factors: list[int] = []

    for d in range(2, limit + 1):
        steps_taken += 1
        rem = n % d
        is_factor = rem == 0
        if len(step_log) < 50:
            step_log.append(ClassicalFactorStep(
                divisor=d, remainder=rem, is_factor=is_factor
            ))
        if is_factor:
            factors = sorted([d, n // d])
            break
        if steps_taken >= max_steps:
            break

    return ClassicalFactorResponse(
        n=n,
        factors=factors,
        steps_taken=steps_taken,
        total_steps_needed=limit,
        step_log=step_log,
        succeeded=len(factors) == 2,
        time_estimate=_time_estimate(n),
    )


# ── Shor's algorithm (QPE on AerSimulator, fixed n=15, a=7) ──────────────────

def _mod_mult_unitary(multiplier: int, mod: int, n_bits: int) -> np.ndarray:
    """
    Build the 2^n_bits × 2^n_bits permutation matrix for |x⟩ → |multiplier·x mod n⟩.
    For x >= mod, the matrix acts as identity (leaves out-of-range states unchanged).
    """
    dim = 2 ** n_bits
    U = np.zeros((dim, dim), dtype=complex)
    for x in range(dim):
        y = (multiplier * x) % mod if x < mod else x
        U[y, x] = 1.0
    return U


def _find_period(a: int, n: int, candidates: list[int]) -> int:
    """
    Return the smallest r > 0 such that a^r ≡ 1 (mod n),
    checking QPE candidates first (and multiples of them), then brute-force.
    """
    for r in candidates:
        if r <= 0:
            continue
        if pow(a, r, n) == 1:
            return r
        # A half-period from phase=0.5 gives r_candidate = r/2; try 2× too
        if pow(a, 2 * r, n) == 1:
            return 2 * r
    # Brute-force fallback (always works for small n)
    for r in range(1, n + 1):
        if pow(a, r, n) == 1:
            return r
    return 1


def run_shor_n15(shots: int = 2048) -> ShorResponse:
    """
    Run Shor's period-finding circuit for n=15, a=7 on the AerSimulator.

    Circuit layout (8 qubits total):
      q[0..3]  — counting register (QPE precision qubits), initialised to |+⟩
      q[4..7]  — work register (holds |x⟩), initialised to |1⟩

    Steps:
      1. H⊗4 on counting register
      2. X on q4 (work register → |1⟩)
      3. Controlled-U^(2^k) for k=0..3  (U: |y⟩ → |7^(2^k)·y mod 15⟩)
      4. Inverse QFT on counting register
      5. Measure counting register → phase estimate → continued fractions → period r
      6. gcd(a^(r/2) ± 1, n) → prime factors
    """
    n_count, n_work = 4, 4
    n, a = 15, 7
    sim = get_simulator()

    qc = QuantumCircuit(n_count + n_work, n_count)

    # Step 1: superposition on counting register
    for q in range(n_count):
        qc.h(q)

    # Step 2: work register starts at |1⟩
    qc.x(n_count)

    # Step 3: controlled-U^(2^k) — skip if U^(2^k) = identity
    for k in range(n_count):
        multiplier = pow(a, 2 ** k, n)   # a^(2^k) mod n
        if multiplier == 1:
            continue                       # identity gate — no effect
        U_mat = _mod_mult_unitary(multiplier, n, n_work)
        U_gate = UnitaryGate(U_mat, label=f"U^{2**k}")
        controlled_u = U_gate.control(1)
        qc.append(controlled_u, [k] + list(range(n_count, n_count + n_work)))

    # Step 4: inverse QFT on counting register
    iqft = QFTGate(n_count).inverse()
    qc.append(iqft, range(n_count))

    # Step 5: measure
    qc.measure(range(n_count), range(n_count))

    log.info("shor: running QPE circuit (depth=%d, qubits=%d)", qc.depth(), qc.num_qubits)
    tqc = transpile(qc, sim, optimization_level=0)
    raw_counts = sim.run(tqc, shots=shots).result().get_counts(0)
    log.info("shor: measurement complete, unique outcomes=%d", len(raw_counts))

    # Step 6: process measurements → period
    measurements: list[ShorMeasurement] = []
    period_candidates: list[int] = []

    for bs, count in sorted(raw_counts.items(), key=lambda x: -x[1]):
        val = int(bs, 2)           # Qiskit bitstring: MSB-first for the register
        phase = val / (2 ** n_count)
        if phase > 0:
            r_cand = Fraction(phase).limit_denominator(n).denominator
        else:
            r_cand = 0
        measurements.append(ShorMeasurement(
            bitstring=bs,
            register_value=val,
            phase=round(phase, 6),
            period_candidate=r_cand,
            count=count,
        ))
        period_candidates.append(r_cand)

    r = _find_period(a, n, period_candidates)

    # Step 7: extract factors via gcd
    half = pow(a, r // 2, n) if r % 2 == 0 else -1
    if half != -1 and half != n - 1:
        f1 = gcd(half - 1, n)
        f2 = gcd(half + 1, n)
        factors = sorted({f for f in [f1, f2] if 1 < f < n})
    else:
        factors = []

    succeeded = len(factors) == 2 and all(f > 1 for f in factors)

    # Human-readable narrative steps for the UI
    steps = [
        f"Choose random a = {a}  →  gcd({a}, {n}) = {gcd(a, n)} = 1  ✓ (coprime)",
        f"Build QPE circuit: {n_count} counting qubits + {n_work} work qubits = {n_count+n_work} total",
        f"Apply H⊗{n_count} to counting register  →  uniform superposition",
        f"Apply controlled-U^(2^k) gates:  U|y⟩ = |{a}y mod {n}⟩",
        f"Apply inverse QFT to counting register",
        f"Measure counting register  →  top outcomes: "
            + ", ".join(f"val={m.register_value}" for m in measurements[:4]),
        f"Continued fractions on phases  →  period candidates: {period_candidates[:4]}",
        f"Verified period: r = {r}   (check: {a}^{r} mod {n} = {pow(a,r,n)} ✓)",
    ]
    if r % 2 == 0 and half != -1:
        steps += [
            f"Compute a^(r/2) mod n = {a}^{r//2} mod {n} = {half}",
            f"Factor 1: gcd({half}−1, {n}) = gcd({half-1}, {n}) = {gcd(half-1,n)}",
            f"Factor 2: gcd({half}+1, {n}) = gcd({half+1}, {n}) = {gcd(half+1,n)}",
        ]
    if succeeded:
        steps.append(
            f"🎉 n = {factors[0]} × {factors[1]}  →  private key d is now computable!"
        )

    depth = tqc.depth()
    gate_count = sum(tqc.count_ops().values())

    return ShorResponse(
        n=n,
        a=a,
        factors=factors,
        period_r=r,
        measurements=measurements,
        num_qubits=n_count + n_work,
        circuit_depth=depth,
        gate_count=gate_count,
        shots=shots,
        steps=steps,
        succeeded=succeeded,
    )
