"""Grover's search circuit auto-generated for N items (up to 2^8)."""
from __future__ import annotations
import math
import time
import numpy as np
from qiskit import QuantumCircuit, transpile
from .simulator import get_simulator


def run_grover(n_items: int, target: int) -> dict:
    """
    Build and run Grover's search for target in an unsorted list of n_items.
    n_items must be a power of 2, max 256 (2^8).
    Returns circuit metrics + measurement distribution.
    """
    n_qubits = math.ceil(math.log2(max(n_items, 2)))
    n_qubits = min(n_qubits, 8)
    n_iter = max(1, round(math.pi / 4 * math.sqrt(2 ** n_qubits)))

    sim = get_simulator()
    qc = QuantumCircuit(n_qubits)

    # Equal superposition
    qc.h(range(n_qubits))

    for _ in range(n_iter):
        _oracle(qc, n_qubits, target)
        _diffuser(qc, n_qubits)

    qc.save_statevector(label="sv")
    qc.measure_all()

    t0 = time.perf_counter()
    tqc = transpile(qc, sim, optimization_level=0)
    result = sim.run(tqc, shots=1024).result()
    sim_time_ms = (time.perf_counter() - t0) * 1000

    counts = result.get_counts()
    data = result.data(0)
    sv = np.array(data["sv"])

    # Convert MSB-first bitstring counts to int-keyed
    dist = {int(bs, 2): cnt for bs, cnt in counts.items()}
    top = max(dist, key=lambda k: dist[k])

    return {
        "circuit_depth": tqc.depth(),
        "gate_count": tqc.count_ops(),
        "cnot_count": tqc.count_ops().get("cx", 0),
        "qubit_count": n_qubits,
        "sim_time_ms": round(sim_time_ms, 2),
        "shots": 1024,
        "n_iterations": n_iter,
        "measurement_distribution": {str(k): v for k, v in sorted(dist.items())},
        "top_result": top,
        "success": top == target,
        "statevector_norm": float(np.linalg.norm(sv)),
    }


def _oracle(qc: QuantumCircuit, n: int, target: int) -> None:
    """Phase oracle: flips phase of |target⟩."""
    target_bits = format(target, f"0{n}b")
    # Flip qubits where target bit is 0
    for i, bit in enumerate(reversed(target_bits)):
        if bit == "0":
            qc.x(i)
    # Multi-controlled Z via H + MCX + H
    if n == 1:
        qc.z(0)
    else:
        qc.h(n - 1)
        qc.mcx(list(range(n - 1)), n - 1)
        qc.h(n - 1)
    # Unflip
    for i, bit in enumerate(reversed(target_bits)):
        if bit == "0":
            qc.x(i)


def _diffuser(qc: QuantumCircuit, n: int) -> None:
    """Grover diffuser (inversion about mean)."""
    qc.h(range(n))
    qc.x(range(n))
    qc.h(n - 1)
    qc.mcx(list(range(n - 1)), n - 1)
    qc.h(n - 1)
    qc.x(range(n))
    qc.h(range(n))
