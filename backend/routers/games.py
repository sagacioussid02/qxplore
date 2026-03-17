"""Game state management endpoints."""
import logging
import uuid
from fastapi import APIRouter, HTTPException, Depends
from ..models.game_state import (
    TTTGameState, TTTCell, EntangledMove, QuantumMarker,
    OpponentRequest
)
from ..quantum.ttt_collapse import collapse_cycle
from ..agents.opponent import AIOpponent
from ..core.supabase_auth import get_optional_user, deduct_credit
from pydantic import BaseModel
from typing import Literal

router = APIRouter(prefix="/games", tags=["games"])

# In-memory game store (replace with Redis for production)
_games: dict[str, TTTGameState] = {}


def _detect_cycle(moves: list[EntangledMove]) -> list[int] | None:
    """DFS cycle detection on the entanglement graph."""
    if len(moves) < 2:
        return None

    # Build adjacency: cell -> list of (partner_cell, move_id)
    adj: dict[int, list[tuple[int, int]]] = {}
    for move in moves:
        a, b = move.cells
        adj.setdefault(a, []).append((b, move.move_id))
        adj.setdefault(b, []).append((a, move.move_id))

    visited = set()
    path: list[int] = []

    def dfs(node: int, parent_move_id: int) -> list[int] | None:
        if node in visited:
            # Cycle found — return path from first occurrence
            idx = path.index(node)
            return path[idx:]
        visited.add(node)
        path.append(node)
        for neighbor, move_id in adj.get(node, []):
            if move_id == parent_move_id:
                continue  # don't go back on same edge
            result = dfs(neighbor, move_id)
            if result is not None:
                return result
        path.pop()
        visited.discard(node)
        return None

    for start in adj:
        if start not in visited:
            cycle = dfs(start, -1)
            if cycle:
                return cycle
    return None


def _check_classical_win(board: list[TTTCell]) -> str | None:
    """Check tic-tac-toe win on classically-owned cells."""
    wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  # rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  # cols
        [0, 4, 8], [2, 4, 6],             # diagonals
    ]
    owners = {cell.index: cell.classical_owner for cell in board}
    for line in wins:
        vals = [owners.get(i) for i in line]
        if vals[0] and vals[0] == vals[1] == vals[2]:
            return vals[0]
    # Check draw: all cells classically owned
    if all(owners.get(i) for i in range(9)):
        return "draw"
    return None


TTT_COST = 250
log = logging.getLogger(__name__)

@router.post("/ttt/new", response_model=TTTGameState)
async def new_ttt_game(vs_ai: bool = True, user: dict | None = Depends(get_optional_user)):
    if user:
        log.info("new_ttt_game: deducting %d credits from user %s", TTT_COST, user["sub"])
        await deduct_credit(user["sub"], amount=TTT_COST)
    game_id = str(uuid.uuid4())
    board = [TTTCell(index=i) for i in range(9)]
    state = TTTGameState(game_id=game_id, board=board, is_vs_ai=vs_ai)
    _games[game_id] = state
    return state


@router.get("/ttt/{game_id}", response_model=TTTGameState)
async def get_ttt_game(game_id: str):
    if game_id not in _games:
        raise HTTPException(404, "Game not found")
    return _games[game_id]


class MoveRequest(BaseModel):
    player: Literal["X", "O"]
    cells: list[int]  # [cell_a, cell_b]


class MoveResponse(BaseModel):
    game_state: TTTGameState
    cycle_detected: bool
    collapse_triggered: bool
    ai_move: list[int] | None = None


@router.post("/ttt/{game_id}/move", response_model=MoveResponse)
async def make_ttt_move(game_id: str, req: MoveRequest):
    if game_id not in _games:
        raise HTTPException(404, "Game not found")
    state = _games[game_id]

    if state.phase == "game_over":
        raise HTTPException(400, "Game is over")
    if req.player != state.current_player:
        raise HTTPException(400, f"It's {state.current_player}'s turn")
    if len(req.cells) != 2 or req.cells[0] == req.cells[1]:
        raise HTTPException(400, "Must select exactly 2 different cells")

    # Validate cells
    board_map = {cell.index: cell for cell in state.board}
    for ci in req.cells:
        if board_map[ci].classical_owner:
            raise HTTPException(400, f"Cell {ci} is already classically owned")

    # Prevent duplicate move: same pair of cells already used by this player
    existing_pairs = {frozenset(m.cells) for m in state.moves if m.player == req.player}
    if frozenset(req.cells) in existing_pairs:
        raise HTTPException(400, "You already have a quantum move between those two cells")

    # Create quantum move
    move_id = state.turn_number
    move = EntangledMove(
        move_id=move_id,
        player=req.player,
        cells=(req.cells[0], req.cells[1]),
        turn_number=state.turn_number,
    )
    state.moves.append(move)

    # Add markers to both cells
    for i, ci in enumerate(req.cells):
        partner = req.cells[1 - i]
        board_map[ci].markers.append(
            QuantumMarker(
                move_id=move_id,
                player=req.player,
                partner_cell=partner,
                collapsed=False,
            )
        )

    # Detect cycle
    cycle = _detect_cycle(state.moves)
    collapse_triggered = False
    ai_move = None

    def _apply_collapse(c: list[int]) -> bool:
        """Run Qiskit collapse for a cycle. Returns True if win found."""
        result = collapse_cycle(c, state.moves)
        # Conflict-free assignment: if two moves compete for the same cell,
        # redirect the loser to its other (partner) cell.
        cell_assignments: dict[int, str] = {}
        for assignment in result.assignments:
            target = assignment.assigned_cell
            if target in cell_assignments:
                # Redirect to partner cell
                a, b = assignment.original_cells
                other = b if a == target else a
                if other not in cell_assignments:
                    target = other
                else:
                    continue  # both cells taken; skip (shouldn't happen with valid cycles)
            cell_assignments[target] = assignment.player
        for cell_idx, player in cell_assignments.items():
            if board_map[cell_idx].classical_owner is None:
                board_map[cell_idx].classical_owner = player
        # Mark ALL markers in ALL cycle cells as collapsed so UI clears correctly
        for ci in c:
            for marker in board_map[ci].markers:
                marker.collapsed = True
        winner = _check_classical_win(list(board_map.values()))
        if winner:
            state.winner = winner
            state.phase = "game_over"
            return True
        return False

    if cycle:
        state.detected_cycle = cycle
        state.phase = "cycle_detected"
        collapse_triggered = True
        won = _apply_collapse(cycle)
        # Always clear cycle indicator and advance turn after collapse
        state.detected_cycle = None
        if not won:
            state.phase = "placing"
            next_player: Literal["X", "O"] = "O" if req.player == "X" else "X"
            state.current_player = next_player
            state.turn_number += 1
    else:
        # Normal move: switch player and increment turn
        next_player = "O" if req.player == "X" else "X"
        state.current_player = next_player
        state.turn_number += 1

    # AI move if it's now AI's turn and game is still going
    if (
        state.is_vs_ai
        and state.phase == "placing"
        and state.current_player == state.ai_player
    ):
        opponent = AIOpponent()
        ai_request = OpponentRequest(
            game_state=state.model_dump(),
            ai_player=state.ai_player,
        )
        try:
            ai_response = await opponent.pick_move(ai_request)
            ai_cells = ai_response.cells

            # Validate AI move: cells must be unclassically-owned, different, and
            # not duplicate of an existing move by the AI
            valid_cells = [i for i in range(9) if board_map[i].classical_owner is None]
            existing_ai_pairs = {
                frozenset(m.cells) for m in state.moves if m.player == state.ai_player
            }
            ai_pair = frozenset(ai_cells)
            if (
                len(ai_cells) == 2
                and ai_cells[0] != ai_cells[1]
                and all(c in valid_cells for c in ai_cells)
                and ai_pair not in existing_ai_pairs
            ):
                ai_move_id = state.turn_number
                ai_entangled = EntangledMove(
                    move_id=ai_move_id,
                    player=state.ai_player,
                    cells=(ai_cells[0], ai_cells[1]),
                    turn_number=state.turn_number,
                )
                state.moves.append(ai_entangled)
                for i, ci in enumerate(ai_cells):
                    partner = ai_cells[1 - i]
                    board_map[ci].markers.append(
                        QuantumMarker(
                            move_id=ai_move_id,
                            player=state.ai_player,
                            partner_cell=partner,
                            collapsed=False,
                        )
                    )
                ai_move = ai_cells

                # Check for cycle after AI move
                ai_cycle = _detect_cycle(state.moves)
                if ai_cycle:
                    state.detected_cycle = ai_cycle
                    collapse_triggered = True
                    won = _apply_collapse(ai_cycle)
                    state.detected_cycle = None
                    if not won:
                        state.phase = "placing"
                        state.current_player = "X"
                        state.turn_number += 1
                else:
                    state.current_player = "X"
                    state.turn_number += 1
            else:
                # AI returned invalid cells (out-of-range, duplicate pair, etc.)
                # — hand turn back to X so the game is never stuck on O forever
                state.current_player = "X"
        except Exception:
            # AI failed (API error, parse error, etc.) — hand turn back to human
            state.current_player = "X"

    state.board = list(board_map.values())
    _games[game_id] = state

    return MoveResponse(
        game_state=state,
        cycle_detected=cycle is not None,
        collapse_triggered=collapse_triggered,
        ai_move=ai_move,
    )


@router.delete("/ttt/{game_id}")
async def reset_ttt_game(game_id: str):
    if game_id in _games:
        del _games[game_id]
    return {"status": "deleted"}
