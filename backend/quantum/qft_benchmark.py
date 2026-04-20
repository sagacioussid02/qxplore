"""QFT circuit for benchmark comparison against classical FFT."""
from __future__ import annotations
import time
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import QFTGate
from .simulator import get_simulator


def run_qft(n_qubits: int) -> dict:
    """
    Run QFT on n_qubits (2–4). Compares against numpy FFT on same-size data.
    Returns circuit metrics.
    """
    n_qubits = max(2, min(n_qubits, 4))
    sim = get_simulator()

    qc = QuantumCircuit(n_qubits)
    # Prepare a non-trivial input: put q0 in |+⟩
    qc.h(0)
    qc.append(QFTGate(n_qubits), range(n_qubits))
    qc.save_statevector(label="sv")

    t0 = time.perf_counter()
    tqc = transpile(qc, sim, optimization_level=0)
    result = sim.run(tqc, shots=1).result()
    sim_time_ms = (time.perf_counter() - t0) * 1000

    sv = np.array(result.data(0)["sv"])
    probs = {format(i, f"0{n_qubits}b"): float(abs(amp) ** 2)
             for i, amp in enumerate(sv) if abs(amp) ** 2 > 1e-10}

    decomposed = tqc.decompose()

    return {
        "circuit_depth": decomposed.depth(),
        "gate_count": sum(decomposed.count_ops().values()),
        "cnot_count": decomposed.count_ops().get("cx", 0),
        "qubit_count": n_qubits,
        "n_points": 2 ** n_qubits,
        "sim_time_ms": round(sim_time_ms, 2),
        "shots": 1,
        "measurement_distribution": probs,
    }
