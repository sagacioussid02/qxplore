"""Pydantic models for Circuit-based Quantum TTT (PDF variant)."""
from pydantic import BaseModel
from typing import Optional, Literal

GateType = Literal["X", "H", "CNOT"]


class CircuitCell(BaseModel):
    index: int
    owner: Optional[Literal["X", "O"]] = None       # who played on this cell
    gate: Optional[GateType] = None                  # gate applied to this qubit
    entangled_with: Optional[int] = None             # CNOT target → index of control cell
    classical_value: Optional[int] = None            # 0 or 1, set after measurement
    classical_owner: Optional[Literal["X", "O"]] = None  # set after measurement


class CircuitMove(BaseModel):
    move_id: int
    player: Literal["X", "O"]
    gate: GateType
    # X/H: one cell [idx]; CNOT: two cells [control_idx, target_idx]
    cells: list[int]


class CircuitTTTGameState(BaseModel):
    game_id: str
    board: list[CircuitCell]
    moves: list[CircuitMove] = []
    current_player: Literal["X", "O"] = "X"
    turn_number: int = 1
    phase: Literal["placing", "game_over"] = "placing"
    winner: Optional[Literal["X", "O", "draw"]] = None
    is_vs_ai: bool = True
    ai_player: Literal["X", "O"] = "O"
    measured: bool = False
    circuit_diagram: Optional[str] = None


class CircuitMoveRequest(BaseModel):
    player: Literal["X", "O"]
    gate: GateType
    cells: list[int]


class CircuitMoveResponse(BaseModel):
    game_state: CircuitTTTGameState
    ai_move: Optional[CircuitMove] = None


class CircuitCollapseResponse(BaseModel):
    game_state: CircuitTTTGameState
    measurement_bits: list[int]   # one bit per cell (index 0-8)
    circuit_diagram: str
