"""Commissioner (evaluator) agent — Claude judges all 5 brackets."""
from __future__ import annotations
from typing import AsyncGenerator
from ...agents.base import BaseAgent
from ...models.bracket import CompletedBracket, AgentName, AGENT_LABELS

_SYSTEM = """You are the Commissioner of the Quantum Bracket Challenge — the ultimate authority judging 5 AI agents competing in an NCAA Tournament bracket competition.

The agents are:
- Claude (Anthropic): LLM-based reasoning
- OpenAI GPT-4o: LLM-based reasoning
- Gemini 2.0 Flash: LLM-based reasoning
- Monte Carlo: 10,000 statistical simulations with seed matrices and historical data
- Quantum ⚛: Qiskit quantum circuits using amplitude encoding (RY gates + CNOT entanglement)

For each agent, score them on:
1. METHODOLOGY (0-10): How rigorous/creative is their approach?
2. UPSETS (0-10): Interesting upset picks vs just chalking favorites?
3. CHAMPION PICK (0-10): Is the championship pick defensible?

Write 3-4 sentences of analysis per agent. Be analytical, witty, and direct.
Point out specific picks that were bold or foolish. Don't be bland.

End with:
## SCORES
Claude: Methodology X | Upsets X | Champion X | Total X/30
OpenAI: Methodology X | Upsets X | Champion X | Total X/30
Gemini: Methodology X | Upsets X | Champion X | Total X/30
Monte Carlo: Methodology X | Upsets X | Champion X | Total X/30
Quantum: Methodology X | Upsets X | Champion X | Total X/30

## VERDICT
Which bracket would you trust in a real pool, and why? (2-3 sentences)"""


class CommissionerAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=_SYSTEM, max_tokens=2500)

    def _summarize_brackets(self, brackets: dict[str, CompletedBracket]) -> str:
        lines = ["Here are the 5 completed 2025 NCAA Tournament brackets:\n"]
        for agent_name, bracket in brackets.items():
            label = AGENT_LABELS.get(agent_name, agent_name)
            champ = bracket.champion
            lines.append(f"## {label}")
            lines.append(f"Champion: {champ.name} (Seed {champ.seed}, {champ.conference})" if champ else "Champion: Unknown")

            # Find upsets (winner seed > loser seed by 4+)
            upsets = []
            for gid, pick in bracket.picks.items():
                # Detect upset: winner_name appears in reasoning with upset context
                if "upset" in pick.reasoning.lower() or pick.confidence < 0.55:
                    upsets.append(f"  Game {gid}: {pick.winner_name} ({pick.reasoning[:80]})")
            lines.append(f"Notable picks ({len(upsets)} uncertain/upset calls):")
            lines.extend(upsets[:5])

            # Sample picks for context
            sample_picks = list(bracket.picks.values())[:6]
            lines.append("Sample picks:")
            for p in sample_picks:
                lines.append(f"  {p.game_id}: {p.winner_name} (conf={p.confidence:.0%}) — {p.reasoning[:60]}")
            lines.append("")

        return "\n".join(lines)

    async def evaluate(
        self, brackets: dict[str, CompletedBracket]
    ) -> AsyncGenerator[str, None]:
        summary = self._summarize_brackets(brackets)
        messages = [{"role": "user", "content": summary}]
        async for chunk in self.stream(messages):
            yield chunk
