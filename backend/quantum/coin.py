"""Quantum coin flip: |0⟩ → H → Measure."""
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from .simulator import get_simulator, compute_bloch_vector, statevector_to_result
from ..models.quantum_state import CoinQuantumResult, StatevectorResult, BlochVector


def run_coin_flip() -> CoinQuantumResult:
    sim = get_simulator()

    # --- Build circuit ---
    qc = QuantumCircuit(1, 1)
    # Save statevector BEFORE Hadamard (pure |0⟩)
    qc.save_statevector(label="initial")
    qc.h(0)
    # Save statevector AFTER H, BEFORE measurement (superposition)
    qc.save_statevector(label="superposition")
    qc.measure(0, 0)

    tqc = transpile(qc, sim)
    result = sim.run(tqc, shots=1).result()
    data = result.data(0)

    # Extract statevectors
    sv_initial = np.array(data["initial"])
    sv_superposition = np.array(data["superposition"])

    # Get measurement outcome
    counts = result.get_counts(0)
    measured_bit = int(list(counts.keys())[0])

    # After measurement, statevector collapses to |0⟩ or |1⟩
    sv_after = np.array([1.0 + 0j, 0.0 + 0j] if measured_bit == 0 else [0.0 + 0j, 1.0 + 0j])

    circuit_qasm = qc.qasm() if hasattr(qc, "qasm") else str(qc)

    sv_before_result = statevector_to_result(sv_superposition, 1, "superposition", circuit_qasm)
    sv_after_result = statevector_to_result(sv_after, 1, str(measured_bit), circuit_qasm)

    bloch_before = compute_bloch_vector(list(sv_superposition))
    bloch_after = compute_bloch_vector(list(sv_after))

    return CoinQuantumResult(
        result=measured_bit,
        statevector_before=sv_before_result,
        statevector_after=sv_after_result,
        bloch_before=bloch_before,
        bloch_after=bloch_after,
        circuit_qasm=circuit_qasm,
    )
