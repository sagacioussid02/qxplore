"""Circuit-based Quantum TTT router (PDF variant)."""
import uuid
import logging
from fastapi import APIRouter, HTTPException
from ..models.circuit_ttt_models import (
    CircuitTTTGameState, CircuitCell, CircuitMove,
    CircuitMoveRequest, CircuitMoveResponse, CircuitCollapseResponse,
)
from ..quantum.circuit_ttt import build_and_measure

router = APIRouter(prefix="/circuit-ttt", tags=["circuit-ttt"])
log = logging.getLogger(__name__)

_games: dict[str, CircuitTTTGameState] = {}

WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
]


def _check_win(board: list[CircuitCell], terminal: bool = False) -> str | None:
    """Return the winning player string, 'draw', or None.

    Args:
        board: The current board state with classical owners after measurement.
        terminal: When True (e.g. after measurement), treat any non-win result
            as a draw because measurement always ends the game.  When False
            (mid-game checks), returns None to signal the game is still open.
    """
    owners = {cell.index: cell.classical_owner for cell in board}
    for line in WIN_LINES:
        vals = [owners.get(i) for i in line]
        if vals[0] and vals[0] == vals[1] == vals[2]:
            return vals[0]
    if all(owners.get(i) for i in range(9)):
        return "draw"
    return "draw" if terminal else None


def _cells_touched(moves: list[CircuitMove]) -> set[int]:
    touched: set[int] = set()
    for m in moves:
        touched.update(m.cells)
    return touched


def _ai_pick(state: CircuitTTTGameState) -> CircuitMoveRequest | None:
    """Simple AI: prefers CNOT on two untouched cells, falls back to X."""
    touched = _cells_touched(state.moves)
    free = [i for i in range(9) if i not in touched]
    if not free:
        return None
    # Try CNOT between two free cells (entanglement move — more interesting)
    if len(free) >= 2:
        return CircuitMoveRequest(
            player=state.ai_player,
            gate="CNOT",
            cells=[free[0], free[1]],
        )
    return CircuitMoveRequest(
        player=state.ai_player,
        gate="X",
        cells=[free[0]],
    )


def _apply_move(state: CircuitTTTGameState, req: CircuitMoveRequest) -> None:
    """Validate and append a move to state.moves, update board."""
    touched = _cells_touched(state.moves)
    board_map = {c.index: c for c in state.board}

    # Validate cells
    for ci in req.cells:
        if ci < 0 or ci > 8:
            raise HTTPException(400, f"Cell {ci} out of range")
        if ci in touched:
            raise HTTPException(400, f"Cell {ci} already has a gate")

    if req.gate in ("X", "H") and len(req.cells) != 1:
        raise HTTPException(400, f"{req.gate} gate needs exactly 1 cell")
    if req.gate == "CNOT":
        if len(req.cells) != 2 or req.cells[0] == req.cells[1]:
            raise HTTPException(400, "CNOT needs 2 different cells")

    move = CircuitMove(
        move_id=state.turn_number,
        player=req.player,
        gate=req.gate,
        cells=req.cells,
    )
    state.moves.append(move)

    # Update board metadata
    for i, ci in enumerate(req.cells):
        cell = board_map[ci]
        cell.owner = req.player
        cell.gate = req.gate
        if req.gate == "CNOT":
            cell.entangled_with = req.cells[1 - i]

    state.board = list(board_map.values())


@router.post("/new", response_model=CircuitTTTGameState)
async def new_game(vs_ai: bool = True):
    game_id = str(uuid.uuid4())
    board = [CircuitCell(index=i) for i in range(9)]
    state = CircuitTTTGameState(game_id=game_id, board=board, is_vs_ai=vs_ai)
    _games[game_id] = state
    return state


@router.get("/{game_id}", response_model=CircuitTTTGameState)
async def get_game(game_id: str):
    if game_id not in _games:
        raise HTTPException(404, "Game not found")
    return _games[game_id]


@router.post("/{game_id}/move", response_model=CircuitMoveResponse)
async def make_move(game_id: str, req: CircuitMoveRequest):
    if game_id not in _games:
        raise HTTPException(404, "Game not found")
    state = _games[game_id]

    if state.phase == "game_over":
        raise HTTPException(400, "Game is over")
    if req.player != state.current_player:
        raise HTTPException(400, f"It's {state.current_player}'s turn")

    _apply_move(state, req)
    state.turn_number += 1
    next_player = "O" if req.player == "X" else "X"
    state.current_player = next_player

    ai_move_result: CircuitMove | None = None

    # AI responds immediately after human
    if state.is_vs_ai and state.phase == "placing" and state.current_player == state.ai_player:
        ai_req = _ai_pick(state)
        if ai_req:
            try:
                _apply_move(state, ai_req)
                ai_move_result = state.moves[-1]
                state.turn_number += 1
                state.current_player = "X"
            except Exception as e:
                log.warning("AI move failed: %s", e)
                state.current_player = "X"
        else:
            state.current_player = "X"

    _games[game_id] = state
    return CircuitMoveResponse(game_state=state, ai_move=ai_move_result)


@router.post("/{game_id}/measure", response_model=CircuitCollapseResponse)
async def measure_game(game_id: str):
    """Collapse all qubits: run the circuit and determine classical owners."""
    if game_id not in _games:
        raise HTTPException(404, "Game not found")
    state = _games[game_id]

    if state.phase == "game_over":
        raise HTTPException(400, "Game already over")
    if state.measured:
        raise HTTPException(400, "Already measured")
    if len(state.moves) == 0:
        raise HTTPException(400, "No moves to measure")

    bits, diagram = build_and_measure(state.moves)

    board_map = {c.index: c for c in state.board}
    for cell in board_map.values():
        if cell.owner is not None:
            cell.classical_value = bits[cell.index]
            cell.classical_owner = cell.owner if bits[cell.index] == 1 else None

    state.board = list(board_map.values())
    state.measured = True
    state.circuit_diagram = diagram

    state.winner = _check_win(state.board, terminal=True)
    state.phase = "game_over"

    _games[game_id] = state
    return CircuitCollapseResponse(
        game_state=state,
        measurement_bits=bits,
        circuit_diagram=diagram,
    )


@router.delete("/{game_id}")
async def delete_game(game_id: str):
    if game_id in _games:
        del _games[game_id]
    return {"status": "deleted"}
