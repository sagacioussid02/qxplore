"""Classical algorithm implementations with step counting for benchmark comparisons."""
from __future__ import annotations
import math
import time
import secrets
import random
from dataclasses import dataclass


@dataclass
class ClassicalResult:
    steps: int
    time_ms: float
    result: object
    complexity_label: str
    algorithm: str


def linear_search(n: int, target: int) -> ClassicalResult:
    """Search an unsorted list of n items for target index. O(N)."""
    items = list(range(n))
    steps = 0
    t0 = time.perf_counter()
    found = None
    for i, item in enumerate(items):
        steps += 1
        if item == target:
            found = i
            break
    elapsed = (time.perf_counter() - t0) * 1000
    return ClassicalResult(
        steps=steps,
        time_ms=round(elapsed, 4),
        result={"found_at": found, "target": target, "n": n},
        complexity_label="O(N)",
        algorithm="Linear Scan",
    )


def pollards_rho(n: int) -> ClassicalResult:
    """Factor n using Pollard's rho. Returns first non-trivial factor."""
    steps = 0
    t0 = time.perf_counter()

    def _rho(n: int) -> int:
        nonlocal steps
        if n % 2 == 0:
            return 2
        x = random.randint(2, n - 1)
        y = x
        c = random.randint(1, n - 1)
        d = 1
        while d == 1:
            steps += 1
            x = (x * x + c) % n
            y = (y * y + c) % n
            y = (y * y + c) % n
            d = math.gcd(abs(x - y), n)
            if steps > 100_000:
                break
        return d if d != n else None

    random.seed(42)  # deterministic for benchmarking
    factor = None
    for _ in range(20):
        f = _rho(n)
        if f and f != n:
            factor = f
            break

    elapsed = (time.perf_counter() - t0) * 1000
    other = n // factor if factor else None
    return ClassicalResult(
        steps=steps,
        time_ms=round(elapsed, 4),
        result={"n": n, "factor1": factor, "factor2": other},
        complexity_label="O(N^(1/4))",
        algorithm="Pollard's Rho",
    )


def trial_division(n: int) -> ClassicalResult:
    """Factor n by trial division. O(√N)."""
    steps = 0
    t0 = time.perf_counter()
    factors = []
    d = 2
    remaining = n
    while d * d <= remaining:
        steps += 1
        while remaining % d == 0:
            factors.append(d)
            remaining //= d
        d += 1
    if remaining > 1:
        factors.append(remaining)
    elapsed = (time.perf_counter() - t0) * 1000
    return ClassicalResult(
        steps=steps,
        time_ms=round(elapsed, 4),
        result={"n": n, "factors": factors},
        complexity_label="O(√N)",
        algorithm="Trial Division",
    )


def numpy_fft(n_points: int) -> ClassicalResult:
    """Run FFT on n_points of synthetic data. Counts FLOPs as n*log2(n)*5."""
    import numpy as np
    data = np.random.default_rng(42).random(n_points)
    t0 = time.perf_counter()
    result = np.fft.fft(data)
    elapsed = (time.perf_counter() - t0) * 1000
    # Standard FFT FLOP estimate: 5*N*log2(N)
    flops = int(5 * n_points * math.log2(max(n_points, 2)))
    return ClassicalResult(
        steps=flops,
        time_ms=round(elapsed, 4),
        result={"n_points": n_points, "dominant_freq": int(np.argmax(np.abs(result)))},
        complexity_label="O(N log N)",
        algorithm="numpy FFT",
    )


def brute_force_maxcut(n_nodes: int, edges: list[tuple[int, int]]) -> ClassicalResult:
    """Find max cut by enumerating all 2^N partitions."""
    steps = 0
    t0 = time.perf_counter()
    best_cut = 0
    best_partition = 0
    for mask in range(1 << n_nodes):
        steps += 1
        cut = sum(
            1 for u, v in edges
            if bool(mask & (1 << u)) != bool(mask & (1 << v))
        )
        if cut > best_cut:
            best_cut = cut
            best_partition = mask
    elapsed = (time.perf_counter() - t0) * 1000
    return ClassicalResult(
        steps=steps,
        time_ms=round(elapsed, 4),
        result={"max_cut": best_cut, "partition": best_partition, "n_nodes": n_nodes},
        complexity_label="O(2^N)",
        algorithm="Brute Force",
    )


def prng_bits(n_bits: int) -> ClassicalResult:
    """Generate n_bits of random bits using CSPRNG and PRNG for comparison."""
    steps = n_bits  # one "operation" per bit
    t0 = time.perf_counter()
    secure_val = secrets.randbits(n_bits)
    prng_val = random.getrandbits(n_bits)
    elapsed = (time.perf_counter() - t0) * 1000
    return ClassicalResult(
        steps=steps,
        time_ms=round(elapsed, 4),
        result={
            "n_bits": n_bits,
            "csprng_value": secure_val,
            "prng_value": prng_val,
            "note": "CSPRNG (secrets) is cryptographically secure; PRNG (random) is deterministic from seed",
        },
        complexity_label="O(N)",
        algorithm="Python secrets.randbits + random.getrandbits",
    )
