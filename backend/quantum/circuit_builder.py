"""Build and run custom Qiskit circuits from a gate instruction list."""
import numpy as np
from qiskit import QuantumCircuit, transpile
from .simulator import get_simulator


def build_and_run(num_qubits: int, gates: list[dict]) -> dict:
    """
    Build a Qiskit circuit from gate instructions and run it.

    Gate instruction keys: type (str), qubit (int), step (int), target (int, CNOT only)
    Gates are applied in ascending step order, ties broken by qubit index.
    Returns statevector, exact probabilities, per-qubit Bloch vectors, circuit metadata.
    """
    sim = get_simulator()
    qc = QuantumCircuit(num_qubits)

    sorted_gates = sorted(gates, key=lambda g: (g.get("step", 0), g.get("qubit", 0)))

    qc.save_statevector(label="sv")

    for g in sorted_gates:
        gtype = g["type"].upper()
        q = int(g["qubit"])
        if q >= num_qubits:
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
            if t is not None and int(t) < num_qubits and int(t) != q:
                qc.cx(q, int(t))

    qc.save_statevector(label="final")

    tqc = transpile(qc, sim)
    data = sim.run(tqc, shots=1).result().data(0)
    sv = np.array(data["final"])

    # Exact probabilities from statevector
    probs: dict[str, float] = {}
    for i, amp in enumerate(sv):
        p = float(abs(amp) ** 2)
        if p > 1e-10:
            probs[format(i, f"0{num_qubits}b")] = p

    statevector = [{"real": float(c.real), "imag": float(c.imag)} for c in sv]
    bloch_vectors = [_bloch_from_partial_trace(sv, num_qubits, q) for q in range(num_qubits)]

    return {
        "statevector": statevector,
        "probabilities": probs,
        "bloch_vectors": bloch_vectors,
        "circuit_depth": qc.depth(),
        "num_gates": len(sorted_gates),
    }


def _bloch_from_partial_trace(sv: np.ndarray, n: int, target_qubit: int) -> dict:
    """
    Compute the Bloch vector for target_qubit by partial-tracing over all other qubits.
    Qiskit convention: qubit q is at bit position q (LSB = qubit 0).
    In sv.reshape([2]*n), qubit q occupies axis (n-1-q).
    """
    sv_t = sv.reshape([2] * n)
    axis = n - 1 - target_qubit
    sv_q = np.moveaxis(sv_t, axis, 0).reshape(2, -1)  # (2, 2^(n-1))
    rho = sv_q @ sv_q.conj().T                          # 2×2 reduced density matrix

    # Bloch coords: ρ = (I + r·σ)/2  →  ρ[0,1] = (x - iy)/2
    x = float(2.0 * rho[0, 1].real)
    y = float(-2.0 * rho[0, 1].imag)
    z = float((rho[0, 0] - rho[1, 1]).real)
    theta = float(np.arccos(np.clip(z, -1.0, 1.0)))
    phi = float(np.arctan2(y, x))
    return {"x": x, "y": y, "z": z, "theta": theta, "phi": phi}
