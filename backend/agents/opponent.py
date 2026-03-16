"""AIOpponent: strategic Quantum TTT AI powered by Claude."""
import json
import re
from .base import BaseAgent
from ..models.game_state import OpponentRequest, OpponentResponse

_SYSTEM = """You are a strategic quantum tic-tac-toe AI opponent.
You receive the current board state as JSON. You MUST return ONLY a valid JSON object with no other text:
{"cells": [a, b], "reasoning": "brief explanation"}

Where cells are two DIFFERENT unoccupied cell indices (0-8) that haven't been classically claimed.
Cell layout:
0 | 1 | 2
3 | 4 | 5
6 | 7 | 8

Strategy priorities (in order):
1. If you can trigger a cycle that collapses to win — do it
2. Block opponent from winning via collapse
3. Create quantum moves that form cycles benefiting you
4. Place quantum markers in center and corners
5. Never place both cells in classically-owned positions

Return ONLY the JSON, no markdown, no explanation outside the JSON."""


def _parse_response(text: str) -> OpponentResponse:
    text = text.strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'\{[^}]+\}', text, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            # Fallback: pick first two available cells
            data = {"cells": [0, 4], "reasoning": "fallback move"}
    return OpponentResponse(cells=data["cells"][:2], reasoning=data.get("reasoning", ""))


class AIOpponent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=_SYSTEM, max_tokens=256)

    async def pick_move(self, request: OpponentRequest) -> OpponentResponse:
        game_json = json.dumps(request.game_state, indent=2)
        messages = [{
            "role": "user",
            "content": f"You are playing as {request.ai_player}. Difficulty: {request.difficulty}.\n\nBoard state:\n{game_json}\n\nReturn your move as JSON."
        }]
        response_text = await self.complete(messages)
        return _parse_response(response_text)
