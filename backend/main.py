"""FastAPI application entry point."""
import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .core.config import get_settings
from .core.rate_limit import limiter
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
    # Tightened 2026-10-18: the frontend only issues GET/POST/DELETE (axios +
    # EventSource) and sends Authorization/Content-Type/Accept headers.
    # Previously allow_methods/allow_headers/expose_headers were ["*"].
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Accel-Buffering"],
    expose_headers=[],
)

# Rate limiting (slowapi). Limits are declared per-endpoint via
# @limiter.limit(...) — see routers/agents.py for the LLM endpoints.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
