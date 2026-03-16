from pydantic import BaseModel
from typing import Optional


class BlochVector(BaseModel):
    theta: float
    phi: float
    x: float
    y: float
    z: float


class ComplexAmplitude(BaseModel):
    real: float
    imag: float


class StatevectorResult(BaseModel):
    amplitudes: list[ComplexAmplitude]
    n_qubits: int
    probabilities: dict[str, float]
    measured_bitstring: str
    circuit_qasm: str


class CoinQuantumResult(BaseModel):
    result: int  # 0 or 1
    statevector_before: StatevectorResult
    statevector_after: StatevectorResult
    bloch_before: BlochVector
    bloch_after: BlochVector
    circuit_qasm: str


class RouletteQuantumResult(BaseModel):
    result: int
    n_qubits: int
    bitstring: str
    circuit_qasm: str
    outcome_label: str
    color: str  # "green", "red", "black"


class CollapseAssignment(BaseModel):
    move_id: int
    player: str
    original_cells: tuple[int, int]
    assigned_cell: int


class TTTCollapseResult(BaseModel):
    assignments: list[CollapseAssignment]
    circuit_qasm: str
    measurement_results: dict[str, int]
