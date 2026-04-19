"""Interview Prep challenge endpoints."""
from __future__ import annotations
import json
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException

from ..core.supabase_auth import get_optional_user, require_user, _supabase_headers
from ..models.challenge_models import (
    ChallengeDetail, ChallengeListItem, SubmitRequest, ScoringResult, LeaderboardEntry, UserSubmission,
)
from ..quantum.challenge_runner import run_and_score
from ..core.config import get_settings
import httpx

log = logging.getLogger(__name__)
router = APIRouter(prefix="/prep", tags=["prep"])

_CHALLENGES_DIR = Path(__file__).parent.parent / "data" / "challenges"
_FREE_MONTHLY_SUBMISSIONS = 3


# ── helpers ─────────────────────────────────────────────────────────────────

def _load_all_challenges() -> list[dict]:
    challenges = []
    for f in sorted(_CHALLENGES_DIR.glob("*.json")):
        try:
            challenges.append(json.loads(f.read_text()))
        except Exception as e:
            log.warning("Failed to load challenge %s: %s", f.name, e)
    return challenges


def _get_challenge(slug: str) -> dict:
    for f in _CHALLENGES_DIR.glob("*.json"):
        data = json.loads(f.read_text())
        if data.get("slug") == slug:
            return data
    raise HTTPException(status_code=404, detail=f"Challenge '{slug}' not found")


async def _get_monthly_submission_count(user_id: str, settings) -> int:
    if not settings.supabase_url:
        return 0
    async with httpx.AsyncClient() as client:
        resp = await client.head(
            f"{settings.supabase_url}/rest/v1/submissions",
            headers={**_supabase_headers(), "Prefer": "count=exact"},
            params={
                "user_id": f"eq.{user_id}",
                "submitted_at": f"gte.{_start_of_month()}",
                "select": "id",
            },
        )
    if resp.status_code not in (200, 206):
        return 0
    content_range = resp.headers.get("content-range", "")
    if "/" not in content_range:
        return 0
    total = content_range.rsplit("/", 1)[-1]
    return int(total) if total.isdigit() else 0


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


def _start_of_month() -> str:
    from datetime import datetime, timezone
    dt = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


async def _save_submission(user_id: str, challenge_id: str, gates: list, result: dict, settings) -> str | None:
    if not settings.supabase_url:
        return None
    payload = {
        "user_id": user_id,
        "challenge_id": challenge_id,
        "gates": gates,
        "score": result["score"],
        "correctness": result["correctness"],
        "efficiency": result["efficiency"],
        "speed_score": result["speed_score"],
        "time_taken_s": result.get("time_taken_s", 0),
        "passed": result["passed"],
        "circuit_qasm": result.get("circuit_qasm"),
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.supabase_url}/rest/v1/submissions",
            headers=_supabase_headers(),
            json=payload,
        )
    if resp.status_code in (200, 201):
        rows = resp.json()
        return rows[0]["id"] if rows else None
    return None


async def _upsert_leaderboard(user_id: str, challenge_id: str, score: int, gate_count: int, email: str, settings):
    if not settings.supabase_url:
        return
    async with httpx.AsyncClient() as client:
        # only update if new score is better
        existing = await client.get(
            f"{settings.supabase_url}/rest/v1/leaderboard",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}", "challenge_id": f"eq.{challenge_id}", "select": "best_score"},
        )
        if existing.status_code == 200 and existing.json():
            if existing.json()[0]["best_score"] >= score:
                return
        display_name = email.split("@")[0] if email else None
        await client.post(
            f"{settings.supabase_url}/rest/v1/leaderboard",
            headers={**_supabase_headers(), "Prefer": "resolution=merge-duplicates"},
            json={
                "user_id": user_id,
                "challenge_id": challenge_id,
                "best_score": score,
                "best_gates": gate_count,
                "display_name": display_name,
            },
        )


async def _get_challenge_id(slug: str, settings) -> str | None:
    """Look up challenges table uuid by slug."""
    if not settings.supabase_url:
        return slug  # local dev fallback
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/rest/v1/challenges",
            headers=_supabase_headers(),
            params={"slug": f"eq.{slug}", "select": "id"},
        )
    rows = resp.json() if resp.status_code == 200 else []
    return rows[0]["id"] if rows else None


# ── endpoints ────────────────────────────────────────────────────────────────

@router.get("/challenges", response_model=list[ChallengeListItem])
async def list_challenges(
    category: str | None = None,
    difficulty: str | None = None,
):
    challenges = _load_all_challenges()
    if category:
        challenges = [c for c in challenges if c.get("category") == category]
    if difficulty:
        challenges = [c for c in challenges if c.get("difficulty") == difficulty]
    return [
        ChallengeListItem(
            slug=c["slug"],
            title=c["title"],
            category=c["category"],
            difficulty=c["difficulty"],
            optimal_gates=c.get("optimal_gates"),
        )
        for c in challenges
    ]


@router.get("/challenges/{slug}", response_model=ChallengeDetail)
async def get_challenge(slug: str, user: dict | None = Depends(get_optional_user)):
    data = _get_challenge(slug)
    settings = get_settings()

    hints = []
    if user:
        tier = await _get_user_tier(user["sub"], settings)
        if tier != "free":
            hints = data.get("hints", [])

    from ..models.challenge_models import ChallengeConstraints
    return ChallengeDetail(
        slug=data["slug"],
        title=data["title"],
        category=data["category"],
        difficulty=data["difficulty"],
        description=data["description"],
        hints=hints,
        constraints=ChallengeConstraints(**data["constraints"]),
        optimal_gates=data.get("optimal_gates"),
    )


@router.post("/challenges/{slug}/submit", response_model=ScoringResult)
async def submit_challenge(
    slug: str,
    body: SubmitRequest,
    user: dict = Depends(require_user),
):
    settings = get_settings()
    challenge = _get_challenge(slug)

    tier = await _get_user_tier(user["sub"], settings)
    if tier == "free":
        count = await _get_monthly_submission_count(user["sub"], settings)
        if count >= _FREE_MONTHLY_SUBMISSIONS:
            raise HTTPException(
                status_code=402,
                detail="Free tier limit: 3 submissions/month. Upgrade to Prep for unlimited.",
            )

    gates_dicts = [g.model_dump() for g in body.gates]
    result = run_and_score(
        gates=gates_dicts,
        expected_sv=challenge["expected_sv"],
        optimal_gates=challenge.get("optimal_gates", len(gates_dicts)),
        time_taken_s=body.time_taken_s,
    )
    result["time_taken_s"] = body.time_taken_s

    challenge_id = await _get_challenge_id(slug, settings)
    if challenge_id:
        sub_id = await _save_submission(user["sub"], challenge_id, gates_dicts, result, settings)
        result["submission_id"] = sub_id
        if result["passed"]:
            await _upsert_leaderboard(
                user["sub"], challenge_id, result["score"], result["gate_count"],
                user.get("email", ""), settings,
            )

    return ScoringResult(**result)


@router.get("/leaderboard/{slug}", response_model=list[LeaderboardEntry])
async def get_challenge_leaderboard(slug: str):
    settings = get_settings()
    challenge_id = await _get_challenge_id(slug, settings)
    if not challenge_id or not settings.supabase_url:
        return []

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/rest/v1/leaderboard",
            headers=_supabase_headers(),
            params={
                "challenge_id": f"eq.{challenge_id}",
                "select": "user_id,best_score,best_gates,display_name",
                "order": "best_score.desc",
                "limit": "20",
            },
        )
    rows = resp.json() if resp.status_code == 200 else []
    return [
        LeaderboardEntry(rank=i + 1, **row)
        for i, row in enumerate(rows)
    ]


@router.get("/my-submissions", response_model=list[UserSubmission])
async def my_submissions(user: dict = Depends(require_user)):
    settings = get_settings()
    if not settings.supabase_url:
        return []

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/rest/v1/submissions",
            headers=_supabase_headers(),
            params={
                "user_id": f"eq.{user['sub']}",
                "select": "id,challenge_id,score,correctness,efficiency,speed_score,time_taken_s,passed,submitted_at",
                "order": "submitted_at.desc",
                "limit": "50",
            },
        )
    rows = resp.json() if resp.status_code == 200 else []
    return [UserSubmission(**row) for row in rows]
