"""
Admin Stats Router — Dashboard & Analytics

Provides aggregated statistics for the admin dashboard including
user metrics, calculation trends, and waitlist analytics.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract

from ..database import get_db
from ..models import User, Measurement, Opportunity, MassMessage
from .. import auth

router = APIRouter()


def _require_admin(current_user: User = Depends(auth.get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/overview")
def get_overview_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Get aggregated overview statistics for the admin dashboard."""
    now = datetime.utcnow()
    days_7_ago = now - timedelta(days=7)
    days_30_ago = now - timedelta(days=30)

    # User stats
    total_users = db.query(User).count()
    new_users_7d = db.query(User).filter(User.created_at >= days_7_ago).count()
    new_users_30d = db.query(User).filter(User.created_at >= days_30_ago).count()
    active_subscriptions = db.query(User).filter(
        User.subscription_status == "active"
    ).count()

    # Calculation stats
    total_calculations = db.query(Measurement).count()
    calculations_today = db.query(Measurement).filter(
        func.date(Measurement.date) == func.date("now")
    ).count()
    calculations_this_week = db.query(Measurement).filter(
        Measurement.date >= days_7_ago
    ).count()

    # Plan distribution
    plan_counts = {}
    for plan in ["free", "pro", "enterprise"]:
        plan_counts[plan] = db.query(User).filter(User.plan_type == plan).count()

    # Waitlist stats
    total_waitlist = db.query(Opportunity).count()
    waitlist_by_status = {}
    for status in ["waiting", "contacted", "converted", "expired"]:
        waitlist_by_status[status] = db.query(Opportunity).filter(
            Opportunity.status == status
        ).count()

    # Conversion rate
    conversion_rate = 0
    if total_waitlist > 0:
        conversion_rate = round(
            (waitlist_by_status.get("converted", 0) / total_waitlist) * 100, 1
        )

    # Mass email stats
    total_emails_sent = db.query(func.sum(MassMessage.sent_count)).scalar() or 0

    return {
        "users": {
            "total": total_users,
            "new_7d": new_users_7d,
            "new_30d": new_users_30d,
            "active_subscriptions": active_subscriptions,
        },
        "calculations": {
            "total": total_calculations,
            "today": calculations_today,
            "this_week": calculations_this_week,
        },
        "plans": plan_counts,
        "waitlist": {
            "total": total_waitlist,
            "by_status": waitlist_by_status,
            "conversion_rate_pct": conversion_rate,
        },
        "email": {
            "total_sent": total_emails_sent,
        },
    }


@router.get("/calculations")
def get_calculations_trend(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Get calculation trends over time (daily counts)."""
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)

    results = (
        db.query(
            func.date(Measurement.date).label("day"),
            func.count(Measurement.id).label("count"),
        )
        .filter(Measurement.date >= start_date)
        .group_by(func.date(Measurement.date))
        .order_by(func.date(Measurement.date))
        .all()
    )

    # Fill in missing days with zero
    daily_counts: dict[str, int] = {}
    for r in results:
        daily_counts[str(r.day)] = r.count

    trend_data = []
    for i in range(days):
        day = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        trend_data.append({
            "date": day,
            "count": daily_counts.get(day, 0),
        })

    return {
        "days": days,
        "total": sum(d["count"] for d in trend_data),
        "trend": trend_data,
    }


@router.get("/waitlist")
def get_waitlist_metrics(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Get waitlist signups over time and interest distribution."""
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)

    # Daily signups
    results = (
        db.query(
            func.date(Opportunity.created_at).label("day"),
            func.count(Opportunity.id).label("count"),
        )
        .filter(Opportunity.created_at >= start_date)
        .group_by(func.date(Opportunity.created_at))
        .order_by(func.date(Opportunity.created_at))
        .all()
    )

    daily_signups: dict[str, int] = {}
    for r in results:
        daily_signups[str(r.day)] = r.count

    trend_data = []
    for i in range(days):
        day = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        trend_data.append({
            "date": day,
            "count": daily_signups.get(day, 0),
        })

    # BIA access distribution
    bia_counts = {}
    for access in ["yes", "occasionally", "planning", "no"]:
        count = db.query(Opportunity).filter(
            Opportunity.bia_access == access
        ).count()
        if count > 0:
            bia_counts[access] = count

    # Interest distribution
    interest_counts: dict[str, int] = {}
    opportunities_with_interests = db.query(Opportunity).filter(
        Opportunity.interests.isnot(None)
    ).all()
    for opp in opportunities_with_interests:
        if opp.interests and isinstance(opp.interests, list):
            for interest in opp.interests:
                interest_counts[interest] = interest_counts.get(interest, 0) + 1

    return {
        "days": days,
        "total": len(daily_signups),
        "trend": trend_data,
        "bia_distribution": bia_counts,
        "interest_distribution": interest_counts,
    }


@router.get("/users")
def get_user_registration_trend(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Get user registration trend over time."""
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)

    results = (
        db.query(
            func.date(User.created_at).label("day"),
            func.count(User.id).label("count"),
        )
        .filter(User.created_at >= start_date)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
        .all()
    )

    daily_counts: dict[str, int] = {}
    for r in results:
        daily_counts[str(r.day)] = r.count

    trend_data = []
    for i in range(days):
        day = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        trend_data.append({
            "date": day,
            "count": daily_counts.get(day, 0),
        })

    return {
        "days": days,
        "total": sum(d["count"] for d in trend_data),
        "trend": trend_data,
    }
