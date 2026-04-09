"""
Circuit-based Quantum TTT (PDF variant).

Mechanics:
- Each cell i maps to qubit i (9 qubits total).
- All qubits start in |0⟩.
- Players alternate applying gates:
    X    → Pauli-X (flip) on one cell they "claim"
    H    → Hadamard (superposition) on one cell
    CNOT → Control on their cell, target on any other cell (entanglement)
- When all 9 cells have a gate, or both players agree to measure:
    → run circuit, measure all 9 qubits
    → cells with |1⟩ are owned by whoever played the gate on that qubit
    → classical TTT win check on resulting board
"""

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.qasm2 import dumps as qasm2_dumps
from .simulator import get_simulator
from ..models.circuit_ttt_models import CircuitMove


def build_and_measure(moves: list[CircuitMove]) -> tuple[list[int], str]:
    """
    Replay all moves onto a 9-qubit circuit and measure.
    Returns:
        bits   — list[int] of length 9, one bit per cell (qubit)
        diagram — QASM string representation of the circuit
    """
    sim = get_simulator()
    n = 9
    qc = QuantumCircuit(n, n)

    for move in moves:
        g = move.gate
        if g == "X":
            qc.x(move.cells[0])
        elif g == "H":
            qc.h(move.cells[0])
        elif g == "CNOT":
            control, target = move.cells[0], move.cells[1]
            qc.cx(control, target)

    qc.measure(range(n), range(n))

    tqc = transpile(qc, sim, optimization_level=0)
    result = sim.run(tqc, shots=1).result()
    counts = result.get_counts(0)
    bitstring = list(counts.keys())[0]  # e.g. "010110001"
    # Qiskit bitstring is MSB-first (qubit n-1 … qubit 0)
    bits_reversed = bitstring[::-1]     # now bits_reversed[i] = qubit i result
    bits = [int(c) for c in bits_reversed]

    try:
        diagram = qasm2_dumps(qc)
    except Exception:
        diagram = str(qc)

    return bits, diagram


def is_board_full(moves: list[CircuitMove]) -> bool:
    """True if all 9 cells have been assigned a gate."""
    used: set[int] = set()
    for m in moves:
        used.update(m.cells)
    return len(used) >= 9
