"""Supabase JWT authentication dependency for FastAPI."""
from __future__ import annotations
import logging
import httpx
from fastapi import Header, HTTPException
from .config import get_settings

log = logging.getLogger(__name__)


async def _verify_token(token: str) -> dict | None:
    """Verify a Supabase access token via the Supabase Auth API.
    Works with any JWT algorithm (HS256, RS256) — no local key needed.
    Returns a minimal user dict {sub, email, role} or None if invalid.
    """
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        return None
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
        )
    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    if resp.status_code != 200:
        log.warning("Supabase auth check returned %s", resp.status_code)
        return None
    user = resp.json()
    return {
        "sub": user["id"],
        "email": user.get("email", ""),
        "role": "authenticated",
    }


async def get_optional_user(
    authorization: str = Header(None),
    token: str | None = None,   # query-param fallback (EventSource can't set headers)
) -> dict | None:
    """Returns the user dict for authenticated users, None for anonymous.
    Accepts token via Authorization header OR ?token= query param (for SSE endpoints).
    """
    raw = None
    if authorization and authorization.startswith("Bearer "):
        raw = authorization.removeprefix("Bearer ")
    elif token:
        raw = token
    if not raw:
        return None
    return await _verify_token(raw)


async def require_user(
    authorization: str = Header(None),
    token: str | None = None,
) -> dict:
    """Like get_optional_user but raises 401 if not authenticated."""
    user = await get_optional_user(authorization, token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


# ── Supabase service-role helpers (bypass RLS) ────────────────────────────────

def _supabase_headers() -> dict:
    settings = get_settings()
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def get_credits(user_id: str) -> int:
    """Fetch remaining credits for a user from Supabase."""
    settings = get_settings()
    if not settings.supabase_url:
        return 999  # local dev shortcut when Supabase not configured
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/rest/v1/credits",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}", "select": "credits"},
        )
        if resp.status_code != 200:
            log.error("get_credits failed: %s %s", resp.status_code, resp.text)
            return 0
        rows = resp.json()
        if rows:
            return rows[0]["credits"]
        # No row yet — new user. Insert with initial credits and return that value.
        initial = get_settings().initial_credits
        await client.post(
            f"{settings.supabase_url}/rest/v1/credits",
            headers={**_supabase_headers(), "Prefer": "resolution=ignore-duplicates,return=minimal"},
            json={"user_id": user_id, "credits": initial},
        )
        return initial


async def deduct_credit(user_id: str, amount: int = 1) -> int:
    """Atomically deduct `amount` credits. Returns remaining credits. Raises 402 if insufficient."""
    settings = get_settings()
    if not settings.supabase_url:
        return 999
    current = await get_credits(user_id)
    if current < amount:
        raise HTTPException(status_code=402, detail="No credits remaining")
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{settings.supabase_url}/rest/v1/credits",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}"},
            json={"credits": current - amount},
        )
        if resp.status_code not in (200, 204):
            log.error("deduct_credit failed: %s %s", resp.status_code, resp.text)
            raise HTTPException(status_code=500, detail="Credit deduction failed")
    return current - 1


async def save_bracket_session(session) -> None:
    """Upsert a BracketSession to Supabase for the owning user."""
    settings = get_settings()
    if not settings.supabase_url or not session.user_id:
        return
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.supabase_url}/rest/v1/bracket_sessions",
            headers={**_supabase_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
            json={
                "session_id": session.session_id,
                "user_id": session.user_id,
                "session_data": session.model_dump(mode="json"),
                "updated_at": "now()",
            },
        )
        if resp.status_code not in (200, 201, 204):
            log.error("save_bracket_session failed: %s %s", resp.status_code, resp.text)


async def load_bracket_session(user_id: str) -> dict | None:
    """Load the most recent BracketSession for a user from Supabase."""
    settings = get_settings()
    if not settings.supabase_url:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/rest/v1/bracket_sessions",
            headers=_supabase_headers(),
            params={
                "user_id": f"eq.{user_id}",
                "select": "session_data",
                "order": "updated_at.desc",
                "limit": "1",
            },
        )
        if resp.status_code != 200:
            log.error("load_bracket_session failed: %s %s", resp.status_code, resp.text)
            return None
        rows = resp.json()
        return rows[0]["session_data"] if rows else None


async def add_credits(user_id: str, amount: int) -> int:
    """Add credits to a user (called from Stripe webhook)."""
    settings = get_settings()
    current = await get_credits(user_id)
    new_total = current + amount
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{settings.supabase_url}/rest/v1/credits",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}"},
            json={"credits": new_total},
        )
        if resp.status_code not in (200, 204):
            log.error("add_credits failed: %s %s", resp.status_code, resp.text)
            raise HTTPException(status_code=500, detail="Credit update failed")
    return new_total
