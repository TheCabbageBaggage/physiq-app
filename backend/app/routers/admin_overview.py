from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import auth
from ..database import SQLALCHEMY_DATABASE_URL, engine, get_db
from ..ml_client import ml_get
from ..models import AuditLog, Measurement, Opportunity, SubscriptionEvent, User

router = APIRouter()
_STARTED_AT = datetime.now(timezone.utc)


def _require_admin(current_user: User = Depends(auth.get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/api/admin/overview")
def admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
) -> dict[str, Any]:
    users_total = db.query(func.count(User.id)).scalar() or 0
    users_active_subscriptions = (
        db.query(func.count(User.id))
        .filter(User.subscription_status == "active")
        .scalar()
        or 0
    )
    measurements_total = db.query(func.count(Measurement.id)).scalar() or 0
    opportunities_total = db.query(func.count(Opportunity.id)).scalar() or 0
    opportunities_waiting = (
        db.query(func.count(Opportunity.id))
        .filter(Opportunity.status == "waiting")
        .scalar()
        or 0
    )
    opportunities_converted = (
        db.query(func.count(Opportunity.id))
        .filter(Opportunity.status == "converted")
        .scalar()
        or 0
    )
    subscription_events_total = db.query(func.count(SubscriptionEvent.id)).scalar() or 0
    recent_subscription_events = (
        db.query(SubscriptionEvent)
        .order_by(SubscriptionEvent.created_at.desc())
        .limit(10)
        .all()
    )

    ml_health = ml_get("/health")
    db_size_bytes = None
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
        db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "", 1)
        p = Path(db_path)
        if p.exists():
            db_size_bytes = p.stat().st_size

    return {
        "api_status": "healthy",
        "ml_status": "healthy" if ml_health and ml_health.get("status") == "healthy" else "unreachable",
        "ml_model_version": ml_health.get("model_version") if ml_health else None,
        "database": {
            "url": SQLALCHEMY_DATABASE_URL,
            "dialect": engine.url.get_backend_name(),
            "size_bytes": db_size_bytes,
        },
        "system": {
            "started_at": _STARTED_AT.isoformat(),
            "uptime_seconds": int((datetime.now(timezone.utc) - _STARTED_AT).total_seconds()),
        },
        "users": {
            "total": int(users_total),
            "active_subscriptions": int(users_active_subscriptions),
        },
        "measurements": {
            "total": int(measurements_total),
        },
        "opportunities": {
            "total": int(opportunities_total),
            "waiting": int(opportunities_waiting),
            "converted": int(opportunities_converted),
        },
        "payments": {
            "subscription_events_total": int(subscription_events_total),
            "recent_events": [
                {
                    "stripe_event_id": e.stripe_event_id,
                    "event_type": e.event_type,
                    "created_at": e.created_at,
                }
                for e in recent_subscription_events
            ],
        },
    }


@router.get("/api/admin/audit-logs")
def list_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
) -> dict[str, Any]:
    safe_limit = max(1, min(limit, 200))
    rows = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    return {
        "total": len(rows),
        "items": [
            {
                "id": r.id,
                "actor_user_id": r.actor_user_id,
                "action": r.action,
                "resource_type": r.resource_type,
                "resource_id": r.resource_id,
                "details": r.details_json or {},
                "created_at": r.created_at,
            }
            for r in rows
        ],
    }
