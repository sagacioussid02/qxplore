"""AI Agent SSE streaming endpoints."""
import json
from urllib.parse import unquote
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from ..agents.tutor import QuantumTutor
from ..agents.game_master import GameMaster
from ..agents.concept_qa import ConceptQA
from ..agents.opponent import AIOpponent
from ..models.game_state import (
    TutorContext, GameMasterEvent, ConceptQARequest, OpponentRequest
)

router = APIRouter(prefix="/agents", tags=["agents"])


async def sse_generator(agent_gen):
    """Wrap an async generator into SSE events."""
    async for chunk in agent_gen:
        yield {"data": json.dumps({"chunk": chunk, "done": False})}
    yield {"data": json.dumps({"chunk": "", "done": True})}


@router.get("/tutor/stream")
async def tutor_stream(context: str):
    ctx = TutorContext.model_validate_json(unquote(context))
    tutor = QuantumTutor()
    return EventSourceResponse(sse_generator(tutor.explain(ctx)))


@router.get("/game-master/stream")
async def game_master_stream(event: str):
    evt = GameMasterEvent.model_validate_json(unquote(event))
    gm = GameMaster()
    return EventSourceResponse(sse_generator(gm.narrate(evt)))


@router.get("/concept-qa/stream")
async def concept_qa_stream(request: str):
    req = ConceptQARequest.model_validate_json(unquote(request))
    qa = ConceptQA()
    return EventSourceResponse(sse_generator(qa.answer(req)))


@router.post("/opponent/move")
async def opponent_move(req: OpponentRequest):
    opponent = AIOpponent()
    response = await opponent.pick_move(req)
    return response
