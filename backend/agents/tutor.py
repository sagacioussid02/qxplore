"""QuantumTutor: explains quantum events in plain language."""
from .base import BaseAgent
from ..models.game_state import TutorContext

_SYSTEM = """You are a quantum physics tutor inside a quantum arcade game.
When a game event occurs, explain the underlying quantum mechanics in 2-4 sentences.
Be accurate but accessible — assume the player knows basic math but no quantum physics.
Use |ket⟩ notation naturally. Reference what just happened in the game. Never break character.
Keep it engaging, educational, and brief."""


class QuantumTutor(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=_SYSTEM, max_tokens=512)

    def _build_messages(self, ctx: TutorContext) -> list[dict]:
        event_descriptions = {
            "coin_flip": f"The quantum coin was flipped. Result: {'Heads |0⟩' if ctx.game_state.get('last_result') == 0 else 'Tails |1⟩'}",
            "roulette_spin": f"The quantum roulette wheel spun. Outcome: {ctx.game_state.get('last_outcome_label', '?')}",
            "ttt_quantum_move": f"Player placed a quantum move: {ctx.player_action}",
            "ttt_cycle": "A quantum entanglement cycle was detected on the board!",
            "ttt_collapse": "The quantum state collapsed — superpositions resolved to classical positions.",
            "ttt_win": f"Game over! Winner: {ctx.game_state.get('winner', '?')}",
        }
        description = event_descriptions.get(ctx.event_type, f"Event: {ctx.event_type}")
        return [{"role": "user", "content": f"Game event: {description}\n\nPlease explain the quantum mechanics behind what just happened."}]

    async def explain(self, ctx: TutorContext):
        messages = self._build_messages(ctx)
        async for chunk in self.stream(messages):
            yield chunk
