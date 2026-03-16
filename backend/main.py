"""FastAPI application entry point."""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import get_settings
from .routers import quantum, games, agents, bracket, stripe_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

settings = get_settings()

app = FastAPI(
    title="Quantum Arcade API",
    description="Backend for Quantum Arcade educational games",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "text/event-stream", "Cache-Control", "X-Accel-Buffering"],
    expose_headers=["*"],
)

app.include_router(quantum.router)
app.include_router(games.router)
app.include_router(agents.router)
app.include_router(bracket.router)
app.include_router(stripe_router.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Quantum Arcade API"}
