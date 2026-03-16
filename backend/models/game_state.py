from pydantic import BaseModel
from typing import Optional, Literal
from enum import Enum


class GamePhase(str, Enum):
    IDLE = "idle"
    BETTING = "betting"
    ANIMATING = "animating"
    REVEALING = "revealing"
    COMPLETE = "complete"


class CoinGameState(BaseModel):
    phase: GamePhase = GamePhase.IDLE
    last_result: Optional[int] = None  # 0=heads, 1=tails
    credits: int = 500
    flip_count: int = 0


class RouletteGameState(BaseModel):
    phase: GamePhase = GamePhase.IDLE
    last_result: Optional[int] = None
    last_outcome_label: Optional[str] = None
    last_color: Optional[str] = None
    current_bet: int = 10
    bet_type: Optional[str] = None
    credits: int = 500
    spin_count: int = 0


class QuantumMarker(BaseModel):
    move_id: int
    player: Literal["X", "O"]
    partner_cell: int
    collapsed: bool = False


class TTTCell(BaseModel):
    index: int
    markers: list[QuantumMarker] = []
    classical_owner: Optional[Literal["X", "O"]] = None
    is_collapsing: bool = False


class EntangledMove(BaseModel):
    move_id: int
    player: Literal["X", "O"]
    cells: tuple[int, int]
    turn_number: int


class TTTGameState(BaseModel):
    game_id: str
    board: list[TTTCell]
    moves: list[EntangledMove] = []
    current_player: Literal["X", "O"] = "X"
    turn_number: int = 1
    phase: Literal["placing", "cycle_detected", "collapsing", "game_over"] = "placing"
    detected_cycle: Optional[list[int]] = None
    winner: Optional[Literal["X", "O", "draw"]] = None
    is_vs_ai: bool = True
    ai_player: Optional[Literal["X", "O"]] = "O"


class AgentMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class TutorContext(BaseModel):
    event_type: Literal[
        "coin_flip", "roulette_spin",
        "ttt_quantum_move", "ttt_cycle", "ttt_collapse", "ttt_win"
    ]
    game_state: dict
    quantum_result: Optional[dict] = None
    player_action: Optional[str] = None


class GameMasterEvent(BaseModel):
    event_type: Literal[
        "spin_start", "spin_result", "ttt_cycle",
        "ttt_collapse", "ttt_win", "coin_flip"
    ]
    details: dict
    drama_level: Literal["low", "medium", "high"] = "medium"


class OpponentRequest(BaseModel):
    game_state: dict
    ai_player: Literal["X", "O"] = "O"
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class OpponentResponse(BaseModel):
    cells: list[int]
    reasoning: str


class ConceptQARequest(BaseModel):
    session_id: str
    message: str
    history: list[AgentMessage] = []
