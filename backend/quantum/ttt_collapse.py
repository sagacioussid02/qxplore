"""Quantum collapse for Quantum TTT cycles."""
import numpy as np
from qiskit import QuantumCircuit, transpile
from .simulator import get_simulator
from ..models.quantum_state import CollapseAssignment, TTTCollapseResult
from ..models.game_state import EntangledMove


def collapse_cycle(
    cycle_cells: list[int],
    moves: list[EntangledMove],
) -> TTTCollapseResult:
    """
    For each quantum move whose both cells are in the cycle,
    create a qubit. Apply H, measure to decide which cell gets the marker.
    """
    sim = get_simulator()

    # Filter moves that are part of the cycle
    cycle_set = set(cycle_cells)
    cycle_moves = [
        m for m in moves
        if m.cells[0] in cycle_set and m.cells[1] in cycle_set
    ]

    n = len(cycle_moves)
    if n == 0:
        return TTTCollapseResult(assignments=[], circuit_qasm="", measurement_results={})

    qc = QuantumCircuit(n, n)
    for i in range(n):
        qc.h(i)
    qc.measure(range(n), range(n))

    tqc = transpile(qc, sim)
    result = sim.run(tqc, shots=1).result()
    counts = result.get_counts(0)
    bitstring = list(counts.keys())[0]
    # Qiskit bitstring is reversed (qubit 0 = rightmost char)
    bits = bitstring[::-1]

    assignments = []
    measurement_results = {}
    for idx, move in enumerate(cycle_moves):
        bit = int(bits[idx]) if idx < len(bits) else 0
        assigned_cell = move.cells[bit]
        measurement_results[f"q{idx}"] = bit
        assignments.append(
            CollapseAssignment(
                move_id=move.move_id,
                player=move.player,
                original_cells=move.cells,
                assigned_cell=assigned_cell,
            )
        )

    circuit_qasm = qc.qasm() if hasattr(qc, "qasm") else str(qc)
    return TTTCollapseResult(
        assignments=assignments,
        circuit_qasm=circuit_qasm,
        measurement_results=measurement_results,
    )
