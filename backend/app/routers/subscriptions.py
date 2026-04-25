import json
import os
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import auth, schemas
from ..database import get_db
from ..models import SubscriptionEvent, User

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

PLAN_FEATURES = {
    "free": ["Basic tracking", "CSV export", "Charts"],
    "pro": ["Everything in Free", "Predictions", "Goal setting", "Weekly reports"],
    "enterprise": ["Everything in Pro", "Trainer-Client mode", "Coaching features"],
}

PRICE_ID_BY_PLAN = {
    "pro": os.getenv("STRIPE_PRICE_ID_PRO", ""),
    "enterprise": os.getenv("STRIPE_PRICE_ID_ENTERPRISE", ""),
}


def _to_dt(ts: int | None):
    if not ts:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def _status_from_stripe(status: str | None) -> str:
    if status in {"active", "trialing", "past_due"}:
        return "active"
    if status in {"canceled", "unpaid", "incomplete_expired"}:
        return "canceled"
    return "inactive"


def _plan_from_subscription(subscription: dict) -> str:
    items = (((subscription or {}).get("items") or {}).get("data") or [])
    price_id = None
    if items:
        price_id = ((items[0] or {}).get("price") or {}).get("id")

    for plan, configured_price in PRICE_ID_BY_PLAN.items():
        if configured_price and configured_price == price_id:
            return plan

    return "free"


def _ensure_stripe_ready():
    if not os.getenv("STRIPE_SECRET_KEY"):
        raise HTTPException(status_code=503, detail="Stripe is not configured")


@router.get("/status", response_model=schemas.SubscriptionStatusResponse)
def get_subscription_status(current_user: User = Depends(auth.get_current_active_user)):
    return {
        "plan_type": current_user.plan_type or "free",
        "subscription_status": current_user.subscription_status or "inactive",
        "current_period_end": current_user.current_period_end,
        "stripe_customer_id": current_user.stripe_customer_id,
        "stripe_subscription_id": current_user.stripe_subscription_id,
        "features": PLAN_FEATURES.get(current_user.plan_type or "free", PLAN_FEATURES["free"]),
    }


@router.post("/create-checkout", response_model=schemas.CreateCheckoutResponse)
def create_checkout_session(
    payload: schemas.CreateCheckoutRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_active_user),
):
    _ensure_stripe_ready()

    price_id = PRICE_ID_BY_PLAN.get(payload.plan_type)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Price ID not configured for plan '{payload.plan_type}'")

    base_url = str(request.base_url).rstrip("/")
    success_url = payload.success_url or f"{base_url}/pricing?checkout=success"
    cancel_url = payload.cancel_url or f"{base_url}/pricing?checkout=cancel"

    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.name,
            metadata={"user_id": str(current_user.id)},
        )
        current_user.stripe_customer_id = customer["id"]
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=current_user.stripe_customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=str(current_user.id),
        metadata={"user_id": str(current_user.id), "plan_type": payload.plan_type},
    )

    return {"checkout_url": session["url"], "session_id": session["id"]}


@router.post("/cancel", response_model=schemas.CancelSubscriptionResponse)
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_active_user),
):
    _ensure_stripe_ready()

    if not current_user.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active Stripe subscription found")

    canceled = stripe.Subscription.modify(current_user.stripe_subscription_id, cancel_at_period_end=True)
    current_user.subscription_status = _status_from_stripe(canceled.get("status"))
    current_user.current_period_end = _to_dt(canceled.get("current_period_end"))
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Subscription will be canceled at period end",
        "cancel_at_period_end": bool(canceled.get("cancel_at_period_end")),
        "current_period_end": current_user.current_period_end,
    }


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    event_id = event.get("id")
    if event_id and db.query(SubscriptionEvent).filter(SubscriptionEvent.stripe_event_id == event_id).first():
        return {"received": True, "duplicate": True}

    event_type = event.get("type", "")
    data_object = (event.get("data") or {}).get("object") or {}

    user = None

    if event_type == "checkout.session.completed":
        user_id = (data_object.get("metadata") or {}).get("user_id") or data_object.get("client_reference_id")
        subscription_id = data_object.get("subscription")
        customer_id = data_object.get("customer")

        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()

        if user and subscription_id:
            sub = stripe.Subscription.retrieve(subscription_id)
            user.stripe_customer_id = customer_id
            user.stripe_subscription_id = subscription_id
            user.subscription_status = _status_from_stripe(sub.get("status"))
            user.plan_type = _plan_from_subscription(sub)
            user.current_period_end = _to_dt(sub.get("current_period_end"))
            db.add(user)

    elif event_type == "customer.subscription.updated":
        subscription_id = data_object.get("id")
        customer_id = data_object.get("customer")
        user = (
            db.query(User)
            .filter(
                (User.stripe_subscription_id == subscription_id)
                | (User.stripe_customer_id == customer_id)
            )
            .first()
        )

        if user:
            user.stripe_customer_id = customer_id
            user.stripe_subscription_id = subscription_id
            user.subscription_status = _status_from_stripe(data_object.get("status"))
            user.plan_type = _plan_from_subscription(data_object)
            user.current_period_end = _to_dt(data_object.get("current_period_end"))
            db.add(user)

    elif event_type == "customer.subscription.deleted":
        subscription_id = data_object.get("id")
        customer_id = data_object.get("customer")
        user = (
            db.query(User)
            .filter(
                (User.stripe_subscription_id == subscription_id)
                | (User.stripe_customer_id == customer_id)
            )
            .first()
        )

        if user:
            user.subscription_status = "canceled"
            user.plan_type = "free"
            user.current_period_end = None
            db.add(user)

    db_event = SubscriptionEvent(
        user_id=user.id if user else None,
        stripe_event_id=event.get("id", "unknown"),
        event_type=event_type,
        stripe_customer_id=data_object.get("customer"),
        stripe_subscription_id=data_object.get("id") if event_type.startswith("customer.subscription") else data_object.get("subscription"),
        payload=json.dumps(event),
    )
    db.add(db_event)
    db.commit()

    return {"received": True}
