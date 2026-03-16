"""ConceptQA: multi-turn quantum concepts Q&A."""
from .base import BaseAgent
from ..models.game_state import ConceptQARequest, AgentMessage

_SYSTEM = """You are a quantum computing teacher in the sidebar of a quantum arcade game.
Answer questions about quantum mechanics: superposition, entanglement, measurement, interference,
teleportation, the Bloch sphere, quantum gates, and how these concepts appear in the games.
Keep answers concise (3-6 sentences) unless the user asks for depth.
Use analogies. Reference what's happening in the game when relevant.
Use |ket⟩ notation where appropriate but always explain it."""


class ConceptQA(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=_SYSTEM, max_tokens=1024)

    async def answer(self, request: ConceptQARequest):
        messages = [{"role": m.role, "content": m.content} for m in request.history]
        messages.append({"role": "user", "content": request.message})
        async for chunk in self.stream(messages):
            yield chunk
