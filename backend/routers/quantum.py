"""Quantum circuit endpoints."""
from fastapi import APIRouter
from ..quantum.coin import run_coin_flip
from ..quantum.roulette import run_roulette
from ..quantum.ttt_collapse import collapse_cycle
from ..models.quantum_state import CoinQuantumResult, RouletteQuantumResult, TTTCollapseResult
from ..models.game_state import EntangledMove
from pydantic import BaseModel

router = APIRouter(prefix="/quantum", tags=["quantum"])


@router.post("/coin", response_model=CoinQuantumResult)
async def quantum_coin():
    return run_coin_flip()


class RouletteRequest(BaseModel):
    n_qubits: int = 6


@router.post("/roulette", response_model=RouletteQuantumResult)
async def quantum_roulette(req: RouletteRequest = RouletteRequest()):
    return run_roulette(req.n_qubits)


class CollapseRequest(BaseModel):
    cycle_cells: list[int]
    moves: list[EntangledMove]


@router.post("/ttt-collapse", response_model=TTTCollapseResult)
async def quantum_ttt_collapse(req: CollapseRequest):
    return collapse_cycle(req.cycle_cells, req.moves)
