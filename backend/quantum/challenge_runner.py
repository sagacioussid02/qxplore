"""Score a submitted circuit against an expected statevector."""
from __future__ import annotations
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.qasm2 import dumps as qasm2_dumps
from .simulator import get_simulator


def run_and_score(
    gates: list[dict],
    expected_sv: list[list[float]] | None,
    optimal_gates: int,
    time_taken_s: int,
    max_qubits: int = 4,
) -> dict:
    """
    Build and run a circuit from gate instructions, then score it.

    Returns a dict matching ScoringResult fields.
    expected_sv: list of [re, im] pairs (length = 2^n_qubits), or None for optimization challenges.
    """
    sim = get_simulator()

    n_qubits = _infer_qubits(gates, max_qubits, expected_sv)
    qc = QuantumCircuit(n_qubits)

    sorted_gates = sorted(gates, key=lambda g: (g.get("step", 0), g.get("qubit", 0)))

    qc.save_statevector(label="sv")
    _apply_gates(qc, sorted_gates, n_qubits)

    tqc = transpile(qc, sim, optimization_level=0)
    data = sim.run(tqc, shots=1).result().data(0)
    sv = np.array(data["sv"])

    if expected_sv:
        exp = np.array([complex(pair[0], pair[1]) for pair in expected_sv])
        exp = exp / np.linalg.norm(exp)  # normalise just in case
        fidelity = float(abs(np.dot(sv.conj(), exp)) ** 2)
        correctness = 100 if fidelity >= 0.99 else int(fidelity * 100)
    else:
        fidelity = 1.0
        correctness = 100
    efficiency = max(0, 100 - (len(sorted_gates) - (optimal_gates or len(sorted_gates))) * 5)
    speed = max(0, 100 - time_taken_s)
    score = int(0.6 * correctness + 0.3 * efficiency + 0.1 * speed)
    if expected_sv:
        passed = fidelity >= 0.99
    else:
        target_gate_count = optimal_gates if optimal_gates and optimal_gates > 0 else len(sorted_gates)
        passed = len(sorted_gates) <= target_gate_count

    try:
        circuit_qasm = qasm2_dumps(qc)
    except Exception:
        circuit_qasm = None

    return {
        "score": score,
        "correctness": correctness,
        "efficiency": efficiency,
        "speed_score": speed,
        "passed": passed,
        "fidelity": round(fidelity, 6),
        "gate_count": len(sorted_gates),
        "circuit_qasm": circuit_qasm,
    }


def _infer_qubits(gates: list[dict], max_qubits: int, expected_sv: list | None) -> int:
    """Derive qubit count from statevector length; cross-check with gate indices."""
    if expected_sv:
        n = max(1, int(np.log2(len(expected_sv))))
    else:
        n = 1
    max_gate_qubit = max(
        (max(int(g.get("qubit", 0)), int(g.get("target", 0) or 0)) for g in gates),
        default=0,
    )
    return min(max(n, max_gate_qubit + 1), max_qubits)


def _apply_gates(qc: QuantumCircuit, sorted_gates: list[dict], n_qubits: int) -> None:
    for g in sorted_gates:
        gtype = g["type"].upper()
        q = int(g["qubit"])
        if q >= n_qubits:
            continue
        if gtype == "H":
            qc.h(q)
        elif gtype == "X":
            qc.x(q)
        elif gtype == "Y":
            qc.y(q)
        elif gtype == "Z":
            qc.z(q)
        elif gtype == "S":
            qc.s(q)
        elif gtype == "T":
            qc.t(q)
        elif gtype == "CNOT":
            t = g.get("target")
            if t is not None and int(t) < n_qubits and int(t) != q:
                qc.cx(q, int(t))
