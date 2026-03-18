"""Stripe checkout and webhook endpoints."""
from __future__ import annotations
import logging
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from ..core.config import get_settings
from ..core.supabase_auth import require_user, get_credits, add_credits, is_payment_processed, record_payment

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
        "success_url": f"{settings.cors_origins[0]}/ncaa?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
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


@router.get("/payments")
async def get_payment_history(user: dict = Depends(require_user)) -> dict:
    """Return the authenticated user's completed Stripe payments."""
    settings = get_settings()
    if not settings.stripe_secret_key:
        return {"payments": []}

    client = _stripe_client()
    try:
        response = client.checkout.sessions.list(params={"limit": 100, "status": "complete"})
        payments = [
            {
                "id": s.id,
                "amount": s.amount_total,       # in cents
                "currency": s.currency,
                "created": s.created,           # unix timestamp
                "credits_added": settings.stripe_credits_per_pack,
            }
            for s in response.data
            if (s.metadata or {}).get("user_id") == user["sub"]
        ]
        return {"payments": payments}
    except Exception as exc:
        log.error("Failed to fetch payment history for user %s: %s", user["sub"], exc)
        return {"payments": []}


@router.post("/webhook")
async def stripe_webhook(request: Request) -> dict:
    """Handle Stripe webhook events (called by Stripe, not the frontend)."""
    settings = get_settings()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    log.info("Stripe webhook received: sig_header_present=%s webhook_secret_set=%s",
             bool(sig_header), bool(settings.stripe_webhook_secret))

    try:
        event_obj = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.SignatureVerificationError as exc:
        log.warning("Stripe webhook signature invalid: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as exc:
        log.error("Stripe webhook parsing error: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail="Bad payload")

    log.info("Stripe webhook event type: %s id: %s", event_obj["type"], event_obj.get("id"))

    if event_obj["type"] == "checkout.session.completed":
        session_data = event_obj["data"]["object"]
        stripe_session_id = session_data.get("id", "unknown")
        payment_intent_id = session_data.get("payment_intent", "unknown")
        user_id = session_data.get("metadata", {}).get("user_id")

        log.info("checkout.session.completed: session=%s payment_intent=%s user_id=%s amount=%s",
                 stripe_session_id, payment_intent_id, user_id, session_data.get("amount_total"))

        if not user_id:
            log.warning("Stripe webhook: no user_id in metadata — session_id=%s", stripe_session_id)
            return {"status": "ignored"}

        if await is_payment_processed(stripe_session_id):
            log.info("Stripe webhook: session %s already processed, skipping", stripe_session_id)
            return {"status": "already_processed"}

        try:
            new_total = await add_credits(user_id, settings.stripe_credits_per_pack)
            await record_payment(user_id, stripe_session_id, settings.stripe_credits_per_pack)
            log.info("Stripe webhook: added %d credits to user %s → total %d (session=%s)",
                     settings.stripe_credits_per_pack, user_id, new_total, stripe_session_id)
        except Exception as exc:
            log.error("Stripe webhook: add_credits failed for user %s: %s", user_id, exc, exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to add credits")

    return {"status": "ok"}


@router.post("/fulfill-pending")
async def fulfill_pending_payments(user: dict = Depends(require_user)) -> dict:
    """Scan recent Stripe sessions for this user and fulfill any unprocessed completed payments.
    Called after a successful Stripe redirect — works even without a session_id in the URL.
    """
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    log.info("fulfill_pending: checking recent sessions for user=%s", user["sub"])
    client = _stripe_client()

    try:
        response = client.checkout.sessions.list(params={"limit": 20, "status": "complete"})
    except Exception as exc:
        log.error("fulfill_pending: failed to list sessions: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach Stripe")

    fulfilled_session = None
    for session in response.data:
        if (session.metadata or {}).get("user_id") != user["sub"]:
            continue
        if session.payment_status != "paid":
            continue
        if await is_payment_processed(session.id):
            log.info("fulfill_pending: session %s already processed, skipping", session.id)
            continue
        # Found an unprocessed paid session — fulfill it
        new_total = await add_credits(user["sub"], settings.stripe_credits_per_pack)
        await record_payment(user["sub"], session.id, settings.stripe_credits_per_pack)
        log.info("fulfill_pending: fulfilled session %s for user %s → total %d", session.id, user["sub"], new_total)
        fulfilled_session = session.id
        break  # one at a time

    credits = await get_credits(user["sub"])
    return {"credits": credits, "fulfilled": fulfilled_session is not None, "session_id": fulfilled_session}


@router.post("/verify-payment")
async def verify_payment(stripe_session_id: str, user: dict = Depends(require_user)) -> dict:
    """Verify a completed Stripe checkout session and add credits if not already fulfilled.
    Called by the frontend after Stripe redirects back — works even if the webhook hasn't fired yet.
    """
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    log.info("verify_payment called: session=%s user=%s", stripe_session_id, user["sub"])

    # Idempotency: skip if already processed
    if await is_payment_processed(stripe_session_id):
        log.info("verify_payment: session %s already processed", stripe_session_id)
        credits = await get_credits(user["sub"])
        return {"credits": credits, "fulfilled": False, "reason": "already_processed"}

    client = _stripe_client()
    try:
        session = client.checkout.sessions.retrieve(stripe_session_id)
    except Exception as exc:
        log.error("verify_payment: failed to retrieve session %s: %s", stripe_session_id, exc)
        raise HTTPException(status_code=400, detail="Could not retrieve payment session")

    session_user_id = (session.metadata or {}).get("user_id")
    log.info("verify_payment: session status=%s payment_status=%s session_user=%s",
             session.status, session.payment_status, session_user_id)

    if session_user_id != user["sub"]:
        log.warning("verify_payment: user mismatch session_user=%s caller=%s", session_user_id, user["sub"])
        raise HTTPException(status_code=403, detail="Payment session does not belong to this user")

    if session.payment_status != "paid" or session.status != "complete":
        credits = await get_credits(user["sub"])
        return {"credits": credits, "fulfilled": False, "reason": session.payment_status}

    new_total = await add_credits(user["sub"], settings.stripe_credits_per_pack)
    await record_payment(user["sub"], stripe_session_id, settings.stripe_credits_per_pack)
    log.info("verify_payment: fulfilled session %s for user %s → total %d",
             stripe_session_id, user["sub"], new_total)
    return {"credits": new_total, "fulfilled": True}
