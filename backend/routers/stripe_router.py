"""Stripe checkout and webhook endpoints."""
from __future__ import annotations
import json
import logging
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from ..core.config import get_settings
from ..core.supabase_auth import require_user, get_credits, add_credits

log = logging.getLogger(__name__)
router = APIRouter(prefix="/stripe", tags=["stripe"])


def _stripe_client() -> stripe.StripeClient:
    settings = get_settings()
    return stripe.StripeClient(settings.stripe_secret_key)


@router.post("/checkout")
async def create_checkout_session(user: dict = Depends(require_user)) -> dict:
    """Create a Stripe Checkout session for the authenticated user to buy credits."""
    settings = get_settings()
    if not settings.stripe_secret_key or not settings.stripe_price_id:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    client = _stripe_client()
    session = client.checkout.sessions.create(params={
        "mode": "payment",
        "line_items": [{"price": settings.stripe_price_id, "quantity": 1}],
        "success_url": f"{settings.cors_origins[0]}/ncaa?payment=success",
        "cancel_url": f"{settings.cors_origins[0]}/ncaa?payment=cancelled",
        "metadata": {"user_id": user["sub"]},
        "customer_email": user.get("email"),
    })
    return {"checkout_url": session.url}


@router.get("/credits")
async def get_user_credits(user: dict = Depends(require_user)) -> dict:
    """Return the current credit balance for the authenticated user."""
    credits = await get_credits(user["sub"])
    return {"user_id": user["sub"], "credits": credits}


@router.post("/webhook")
async def stripe_webhook(request: Request) -> dict:
    """Handle Stripe webhook events (called by Stripe, not the frontend)."""
    settings = get_settings()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.WebhookSignature.verify_header(
            payload.decode("utf-8"),
            sig_header,
            settings.stripe_webhook_secret,
        )
    except stripe.SignatureVerificationError as exc:
        log.warning("Stripe webhook signature invalid: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as exc:
        log.error("Stripe webhook parsing error: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail="Bad payload")

    event_obj = json.loads(payload)

    if event_obj["type"] == "checkout.session.completed":
        session_data = event_obj["data"]["object"]
        user_id = session_data.get("metadata", {}).get("user_id")
        if not user_id:
            log.warning("Stripe webhook: no user_id in metadata, skipping")
            return {"status": "ignored"}

        new_total = await add_credits(user_id, settings.stripe_credits_per_pack)
        log.info("Stripe webhook: added %d credits to user %s → total %d",
                 settings.stripe_credits_per_pack, user_id, new_total)

    return {"status": "ok"}
