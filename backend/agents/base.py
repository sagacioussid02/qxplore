"""Base agent class using Anthropic async streaming SDK."""
import logging
from typing import AsyncGenerator
import anthropic
from ..core.config import get_settings

log = logging.getLogger(__name__)

MODEL = "claude-opus-4-6"


class BaseAgent:
    def __init__(self, system_prompt: str, max_tokens: int = 1024, temperature: float = 1.0):
        settings = get_settings()
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.system_prompt = system_prompt
        self.max_tokens = max_tokens
        self.temperature = temperature

    async def stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        async with self.client.messages.stream(
            model=MODEL,
            max_tokens=self.max_tokens,
            system=self.system_prompt,
            messages=messages,
            temperature=self.temperature,
        ) as stream:
            async for text in stream.text_stream:
                yield text
            final = await stream.get_final_message()
            u = final.usage
            log.info(
                "claude tokens model=%s in=%d out=%d total=%d",
                MODEL, u.input_tokens, u.output_tokens, u.input_tokens + u.output_tokens,
            )

    async def complete(self, messages: list[dict]) -> str:
        response = await self.client.messages.create(
            model=MODEL,
            max_tokens=self.max_tokens,
            system=self.system_prompt,
            messages=messages,
            temperature=self.temperature,
        )
        u = response.usage
        log.info(
            "claude tokens model=%s in=%d out=%d total=%d",
            MODEL, u.input_tokens, u.output_tokens, u.input_tokens + u.output_tokens,
        )
        return response.content[0].text
