"""FastAPI application entry point."""
import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .core.config import get_settings
from .routers import quantum, games, agents, stripe_router, rsa, circuit_ttt, challenges, benchmark

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    force=True,   # override any handlers uvicorn already installed
)

log = logging.getLogger(__name__)

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

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    # Skip health check noise
    if request.url.path != "/health":
        log.info("%s %s → %d (%.0fms)", request.method, request.url.path, response.status_code, ms)
    return response


app.include_router(quantum.router)
app.include_router(games.router)
app.include_router(agents.router)
app.include_router(stripe_router.router)
app.include_router(rsa.router)
app.include_router(circuit_ttt.router)
app.include_router(challenges.router)
app.include_router(benchmark.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Quantum Arcade API"}
