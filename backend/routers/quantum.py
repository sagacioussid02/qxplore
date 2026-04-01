"""Quantum circuit endpoints."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from ..quantum.coin import run_coin_flip
from ..quantum.roulette import run_roulette
from ..quantum.ttt_collapse import collapse_cycle
from ..quantum.circuit_builder import build_and_run
from ..models.quantum_state import CoinQuantumResult, RouletteQuantumResult, TTTCollapseResult
from ..models.game_state import EntangledMove
from ..core.supabase_auth import get_optional_user, deduct_credit
from pydantic import BaseModel
from typing import Optional

log = logging.getLogger(__name__)
router = APIRouter(prefix="/quantum", tags=["quantum"])

COIN_COST = 25

@router.post("/coin", response_model=CoinQuantumResult)
async def quantum_coin(user: dict | None = Depends(get_optional_user)):
    if user:
        log.info("quantum_coin: deducting %d credits from user %s", COIN_COST, user["sub"])
        await deduct_credit(user["sub"], amount=COIN_COST)
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


class GateInstruction(BaseModel):
    type: str
    qubit: int
    step: int
    target: Optional[int] = None


class CircuitRequest(BaseModel):
    num_qubits: int = 2
    gates: list[GateInstruction] = []


@router.post("/circuit")
async def run_circuit(req: CircuitRequest):
    if not (1 <= req.num_qubits <= 4):
        raise HTTPException(400, "num_qubits must be 1–4")
    gates_dicts = [g.model_dump() for g in req.gates]
    return build_and_run(req.num_qubits, gates_dicts)
