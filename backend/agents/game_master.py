"""GameMaster: dramatic narration for key game moments."""
from .base import BaseAgent
from ..models.game_state import GameMasterEvent

_SYSTEM = """You are the dramatic Game Master of a quantum arcade.
Narrate each game event in 1-3 short sentences with flair and excitement.
Reference quantum phenomena theatrically. Keep it punchy and memorable.
Use quantum vocabulary dramatically: superposition, collapse, entanglement, observation, wave function.
Never exceed 3 sentences."""


class GameMaster(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=_SYSTEM, max_tokens=200)

    def _build_messages(self, event: GameMasterEvent) -> list[dict]:
        drama = {"low": "mild", "medium": "exciting", "high": "EXTREMELY dramatic"}[event.drama_level]
        prompt = f"Event: {event.event_type}\nDetails: {event.details}\nMake it {drama}!"
        return [{"role": "user", "content": prompt}]

    async def narrate(self, event: GameMasterEvent):
        messages = self._build_messages(event)
        async for chunk in self.stream(messages):
            yield chunk
