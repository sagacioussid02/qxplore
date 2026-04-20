"""Benchmarking tool endpoints."""
from __future__ import annotations
import logging
from fastapi import APIRouter, Depends, HTTPException
import httpx

from ..core.supabase_auth import get_optional_user, require_user, _supabase_headers
from ..core.config import get_settings
from ..models.benchmark_models import (
    BenchmarkRunRequest, BenchmarkResult, BenchmarkRunSummary, TemplateInfo,
)
from ..quantum.benchmark_runner import run_benchmark

log = logging.getLogger(__name__)
router = APIRouter(prefix="/benchmark", tags=["benchmark"])

_FREE_MONTHLY_RUNS = 3

_TEMPLATES: list[TemplateInfo] = [
    TemplateInfo(
        name="grover",
        title="Grover's Search",
        tagline="Quantum search vs linear scan",
        quantum_algo="Grover's Algorithm",
        classical_algo="Linear Scan",
        complexity_quantum="O(√N)",
        complexity_classical="O(N)",
        parameters=[
            {"name": "n_items", "label": "Items (N)", "type": "int", "min": 4, "max": 256, "default": 16, "note": "Must be power of 2"},
            {"name": "target", "label": "Target index", "type": "int", "min": 0, "max": 255, "default": 7},
        ],
    ),
    TemplateInfo(
        name="rng",
        title="Random Number Generation",
        tagline="Quantum entropy vs PRNG",
        quantum_algo="H gate on N qubits",
        classical_algo="Python secrets.randbits",
        complexity_quantum="O(N) gates",
        complexity_classical="O(N) ops",
        parameters=[
            {"name": "n_bits", "label": "Bit width", "type": "int", "min": 1, "max": 16, "default": 8},
        ],
    ),
    TemplateInfo(
        name="shor",
        title="Integer Factoring",
        tagline="Shor's algorithm vs Pollard's Rho",
        quantum_algo="Shor's Algorithm (n=15)",
        classical_algo="Pollard's Rho",
        complexity_quantum="O((log N)^3)",
        complexity_classical="O(N^(1/4))",
        parameters=[],  # fixed to n=15
    ),
    TemplateInfo(
        name="qft",
        title="Quantum Fourier Transform",
        tagline="QFT vs classical FFT",
        quantum_algo="QFT (QFTGate)",
        classical_algo="numpy.fft.fft",
        complexity_quantum="O(n²) gates",
        complexity_classical="O(N log N) FLOPs",
        parameters=[
            {"name": "n_qubits", "label": "Register size (qubits)", "type": "int", "min": 2, "max": 4, "default": 3, "note": "N = 2^qubits data points"},
        ],
    ),
    TemplateInfo(
        name="qaoa",
        title="Max-Cut Optimization",
        tagline="QAOA vs brute force",
        quantum_algo="1-layer QAOA",
        classical_algo="Brute Force (2^N)",
        complexity_quantum="O(p·|E|) layers",
        complexity_classical="O(2^N)",
        parameters=[
            {"name": "n_nodes", "label": "Graph nodes", "type": "int", "min": 3, "max": 5, "default": 4},
        ],
    ),
    TemplateInfo(
        name="freeform",
        title="Free-Form Circuit",
        tagline="Build any circuit, get circuit stats",
        quantum_algo="Custom circuit",
        classical_algo="N/A",
        complexity_quantum="User-defined",
        complexity_classical="N/A",
        parameters=[
            {"name": "num_qubits", "label": "Qubits", "type": "int", "min": 1, "max": 4, "default": 2},
            {"name": "gates", "label": "Gate list", "type": "gates"},
        ],
    ),
]


# ── helpers ────────────────────────────────────────────────────────────────────

async def _get_monthly_run_count(user_id: str, settings) -> int:
    if not settings.supabase_url:
        return 0
    from ..routers.challenges import _start_of_month
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.head(
                f"{settings.supabase_url}/rest/v1/benchmark_runs",
                headers={**_supabase_headers(), "Prefer": "count=exact"},
                params={"user_id": f"eq.{user_id}", "created_at": f"gte.{_start_of_month()}", "select": "id"},
            )
        if resp.status_code not in (200, 206):
            log.warning(
                "Failed to get monthly run count: unexpected status %s",
                resp.status_code,
            )
            raise HTTPException(
                status_code=503,
                detail="Unable to verify monthly benchmark run limit right now. Please try again later.",
            )
        cr = resp.headers.get("content-range", "")
        total = cr.rsplit("/", 1)[-1]
        if not total.isdigit():
            log.warning("Failed to get monthly run count: malformed content-range %r", cr)
            raise HTTPException(
                status_code=503,
                detail="Unable to verify monthly benchmark run limit right now. Please try again later.",
            )
        return int(total)
    except HTTPException:
        raise
    except Exception as e:
        log.warning("Failed to get monthly run count: %s", e)
        raise HTTPException(
            status_code=503,
            detail="Unable to verify monthly benchmark run limit right now. Please try again later.",
        ) from e


async def _get_user_tier(user_id: str, settings) -> str:
    if not settings.supabase_url:
        return "free"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/rest/v1/credits",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}", "select": "tier"},
        )
    rows = resp.json() if resp.status_code == 200 else []
    return rows[0]["tier"] if rows else "free"


async def _save_run(user_id: str, result: BenchmarkResult, settings) -> str | None:
    if not settings.supabase_url:
        return None
    payload = {
        "user_id": user_id,
        "template": result.template,
        "parameters": result.parameters,
        "quantum_result": result.quantum.model_dump(),
        "classical_result": result.classical.model_dump() if result.classical else None,
        "speedup_factor": result.speedup_factor,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.supabase_url}/rest/v1/benchmark_runs",
            headers=_supabase_headers(),
            json=payload,
        )
    if resp.status_code in (200, 201):
        rows = resp.json()
        return rows[0]["id"] if rows else None
    log.error("Failed to save benchmark run: %s %s", resp.status_code, resp.text[:200])
    return None


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=list[TemplateInfo])
async def list_templates():
    return _TEMPLATES


@router.post("/run", response_model=BenchmarkResult)
async def run_benchmark_endpoint(
    body: BenchmarkRunRequest,
    user: dict | None = Depends(get_optional_user),
):
    settings = get_settings()

    if user:
        tier = await _get_user_tier(user["sub"], settings)
        if tier == "free":
            count = await _get_monthly_run_count(user["sub"], settings)
            if count >= _FREE_MONTHLY_RUNS:
                raise HTTPException(
                    status_code=402,
                    detail="Free tier limit: 3 benchmark runs/month. Upgrade to Pro for unlimited.",
                )
    else:
        # Anonymous users get 3 total runs (checked via honour system — no persistent count)
        pass

    try:
        result = run_benchmark(body.template, body.parameters)
    except Exception as e:
        log.exception("Benchmark run failed for template=%s", body.template)
        raise HTTPException(
            status_code=500,
            detail="Benchmark failed due to an internal error.",
        ) from e

    if user:
        run_id = await _save_run(user["sub"], result, settings)
        result.id = run_id

    return result


@router.get("/runs", response_model=list[BenchmarkRunSummary])
async def list_runs(user: dict = Depends(require_user)):
    settings = get_settings()
    if not settings.supabase_url:
        return []
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/rest/v1/benchmark_runs",
            headers=_supabase_headers(),
            params={
                "user_id": f"eq.{user['sub']}",
                "select": "id,template,parameters,speedup_factor,quantum_result,created_at",
                "order": "created_at.desc",
                "limit": "50",
            },
        )
    rows = resp.json() if resp.status_code == 200 else []
    return [
        BenchmarkRunSummary(
            id=r["id"],
            template=r["template"],
            parameters=r["parameters"],
            speedup_factor=r.get("speedup_factor"),
            sim_time_ms=r.get("quantum_result", {}).get("sim_time_ms", 0),
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.get("/runs/{run_id}", response_model=BenchmarkResult)
async def get_run(run_id: str, user: dict = Depends(require_user)):
    settings = get_settings()
    if not settings.supabase_url:
        raise HTTPException(404, "Not found")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/rest/v1/benchmark_runs",
            headers=_supabase_headers(),
            params={"id": f"eq.{run_id}", "user_id": f"eq.{user['sub']}", "select": "*"},
        )
    rows = resp.json() if resp.status_code == 200 else []
    if not rows:
        raise HTTPException(404, "Run not found")
    r = rows[0]
    from ..models.benchmark_models import QuantumMetrics, ClassicalMetrics
    return BenchmarkResult(
        id=r["id"],
        template=r["template"],
        parameters=r["parameters"],
        quantum=QuantumMetrics(**r["quantum_result"]),
        classical=ClassicalMetrics(**r["classical_result"]) if r.get("classical_result") else None,
        speedup_factor=r.get("speedup_factor"),
        created_at=r["created_at"],
    )


@router.delete("/runs/{run_id}", status_code=204)
async def delete_run(run_id: str, user: dict = Depends(require_user)):
    settings = get_settings()
    if not settings.supabase_url:
        return
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{settings.supabase_url}/rest/v1/benchmark_runs",
            headers=_supabase_headers(),
            params={"id": f"eq.{run_id}", "user_id": f"eq.{user['sub']}"},
        )
