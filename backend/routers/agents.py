"""AI Agent SSE streaming endpoints.

Security notes:
- Every endpoint requires authentication (require_user) and deducts credits
  up front (deduct_credit): each call spins up a claude-opus client, so
  anonymous access would allow uncapped third-party LLM spend on the
  project's Anthropic key.
- Per-endpoint slowapi rate limits apply for the same reason.
- Auth for SSE: EventSource cannot set request headers, so the frontend
  passes the Supabase access token as ?token=. See get_optional_user in
  ..core.supabase_auth for the tradeoff discussion.
"""
import json
import logging
from urllib.parse import unquote
from fastapi import APIRouter, Depends, Query, Request
from sse_starlette.sse import EventSourceResponse
from ..agents.tutor import QuantumTutor
from ..agents.game_master import GameMaster
from ..agents.concept_qa import ConceptQA
from ..agents.opponent import AIOpponent
from ..core.rate_limit import limiter
from ..core.supabase_auth import require_user, deduct_credit
from ..models.game_state import (
    TutorContext, GameMasterEvent, ConceptQARequest, OpponentRequest
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])

# Credits charged per LLM-backed call (cf. COIN_COST=25, _SHOR_COST=100).
LLM_CALL_COST = 100


async def sse_generator(agent_gen):
    """Wrap an async generator into SSE events."""
    async for chunk in agent_gen:
        yield {"data": json.dumps({"chunk": chunk, "done": False})}
    yield {"data": json.dumps({"chunk": "", "done": True})}


@router.get("/tutor/stream")
@limiter.limit("30/minute")
async def tutor_stream(
    request: Request, context: str, user: dict = Depends(require_user)
):
    await deduct_credit(user["sub"], amount=LLM_CALL_COST)
    ctx = TutorContext.model_validate_json(unquote(context))
    tutor = QuantumTutor()
    return EventSourceResponse(sse_generator(tutor.explain(ctx)))


@router.get("/game-master/stream")
@limiter.limit("30/minute")
async def game_master_stream(
    request: Request, event: str, user: dict = Depends(require_user)
):
    await deduct_credit(user["sub"], amount=LLM_CALL_COST)
    evt = GameMasterEvent.model_validate_json(unquote(event))
    gm = GameMaster()
    return EventSourceResponse(sse_generator(gm.narrate(evt)))


@router.get("/concept-qa/stream")
@limiter.limit("30/minute")
async def concept_qa_stream(
    request: Request,
    payload: str = Query(alias="request"),
    user: dict = Depends(require_user),
):
    # NOTE: the query parameter keeps its public name `request` (via alias).
    # The local name differs because slowapi's @limiter.limit requires a
    # `request: Request` argument, which would otherwise collide with it.
    await deduct_credit(user["sub"], amount=LLM_CALL_COST)
    req = ConceptQARequest.model_validate_json(unquote(payload))
    qa = ConceptQA()
    return EventSourceResponse(sse_generator(qa.answer(req)))


@router.post("/opponent/move")
@limiter.limit("30/minute")
async def opponent_move(
    request: Request, req: OpponentRequest, user: dict = Depends(require_user)
):
    await deduct_credit(user["sub"], amount=LLM_CALL_COST)
    opponent = AIOpponent()
    response = await opponent.pick_move(req)
    return response
