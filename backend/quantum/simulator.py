"""Core Qiskit AerSimulator wrapper."""
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from ..models.quantum_state import BlochVector, ComplexAmplitude, StatevectorResult

_simulator = AerSimulator(method="statevector")


def get_simulator() -> AerSimulator:
    return _simulator


def compute_bloch_vector(amplitudes: list[complex]) -> BlochVector:
    """Compute Bloch sphere coordinates from a single-qubit statevector [α, β]."""
    alpha, beta = amplitudes[0], amplitudes[1]
    # Normalize
    norm = np.sqrt(abs(alpha) ** 2 + abs(beta) ** 2)
    if norm > 0:
        alpha, beta = alpha / norm, beta / norm

    x = 2 * (alpha.real * beta.real + alpha.imag * beta.imag)
    y = 2 * (alpha.imag * beta.real - alpha.real * beta.imag)
    z = abs(alpha) ** 2 - abs(beta) ** 2

    # Clamp for numerical safety
    z = float(np.clip(z, -1.0, 1.0))
    theta = float(np.arccos(z))
    phi = float(np.arctan2(float(y), float(x)))

    return BlochVector(
        theta=theta,
        phi=phi,
        x=float(x),
        y=float(y),
        z=z,
    )


def statevector_to_result(
    sv_array: np.ndarray,
    n_qubits: int,
    measured_bitstring: str,
    circuit_qasm: str,
) -> StatevectorResult:
    amplitudes = [
        ComplexAmplitude(real=float(c.real), imag=float(c.imag)) for c in sv_array
    ]
    probs = {
        format(i, f"0{n_qubits}b"): float(abs(c) ** 2)
        for i, c in enumerate(sv_array)
        if abs(c) ** 2 > 1e-10
    }
    return StatevectorResult(
        amplitudes=amplitudes,
        n_qubits=n_qubits,
        probabilities=probs,
        measured_bitstring=measured_bitstring,
        circuit_qasm=circuit_qasm,
    )


def run_circuit_once(qc: QuantumCircuit) -> dict:
    """Transpile and run a circuit for 1 shot. Returns result data dict."""
    tqc = transpile(qc, _simulator)
    job = _simulator.run(tqc, shots=1)
    return job.result()
