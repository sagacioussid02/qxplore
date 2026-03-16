"""Quantum roulette: n H-gates → measure → integer."""
import numpy as np
from qiskit import QuantumCircuit, transpile
from .simulator import get_simulator
from ..models.quantum_state import RouletteQuantumResult

# Standard European roulette: 0-36 (37 sectors)
# 0 = green; 1-10,19-28 odd=red even=black; 11-18,29-36 odd=black even=red
_RED = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}
_GREEN = {0}


def _outcome_label(n: int) -> tuple[str, str]:
    """Return (label, color) for roulette number 0-36."""
    if n in _GREEN:
        return "0", "green"
    color = "red" if n in _RED else "black"
    return str(n), color


def run_roulette(n_qubits: int = 6) -> RouletteQuantumResult:
    """
    Use n_qubits Hadamard gates to generate a uniform random n-bit integer.
    Map modulo 37 to a roulette outcome.
    """
    sim = get_simulator()
    qc = QuantumCircuit(n_qubits, n_qubits)
    for i in range(n_qubits):
        qc.h(i)
    qc.measure(range(n_qubits), range(n_qubits))

    tqc = transpile(qc, sim)
    result = sim.run(tqc, shots=1).result()
    counts = result.get_counts(0)
    bitstring = list(counts.keys())[0]

    raw_int = int(bitstring, 2)
    outcome = raw_int % 37  # map to 0-36

    label, color = _outcome_label(outcome)
    circuit_qasm = qc.qasm() if hasattr(qc, "qasm") else str(qc)

    return RouletteQuantumResult(
        result=outcome,
        n_qubits=n_qubits,
        bitstring=bitstring,
        circuit_qasm=circuit_qasm,
        outcome_label=label,
        color=color,
    )
