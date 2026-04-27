"""
Admin Pricing Router — Pricing Configuration & Coupon System

Provides CRUD endpoints for managing pricing plans, creating coupons,
and granting free months to users.
"""

from datetime import datetime
from typing import Optional, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import User, PricingConfig, Coupon, FreeGrant
from .. import auth

router = APIRouter()


# ============ SCHEMAS ============

class PricingPlanCreate(BaseModel):
    plan: Literal["free", "pro", "enterprise"]
    price_monthly: str = "€0"
    price_annual: str = "€0"
    features: Optional[list[str]] = None
    stripe_price_id_monthly: Optional[str] = None
    stripe_price_id_annual: Optional[str] = None
    is_active: bool = True


class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = None
    discount_percent: int = 0
    discount_amount_cents: int = 0
    max_uses: int = 0
    expires_at: Optional[datetime] = None


class FreeGrantCreate(BaseModel):
    user_id: int
    months: int
    reason: Optional[str] = None


# ============ ADMIN DEPENDENCY ============

def _require_admin(current_user: User = Depends(auth.get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ============ PRICING ENDPOINTS ============


@router.get("/admin/pricing")
def get_pricing_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Get all pricing plans."""
    plans = db.query(PricingConfig).order_by(PricingConfig.id).all()
    return {
        "plans": [
            {
                "id": p.id,
                "plan": p.plan,
                "price_monthly": p.price_monthly,
                "price_annual": p.price_annual,
                "features": p.features,
                "is_active": p.is_active,
                "stripe_price_id_monthly": p.stripe_price_id_monthly,
                "stripe_price_id_annual": p.stripe_price_id_annual,
            }
            for p in plans
        ]
    }


@router.post("/admin/pricing")
def create_pricing_plan(
    payload: PricingPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Create a new pricing plan."""
    existing = db.query(PricingConfig).filter(PricingConfig.plan == payload.plan).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Plan '{payload.plan}' already exists")

    plan = PricingConfig(
        plan=payload.plan,
        price_monthly=payload.price_monthly,
        price_annual=payload.price_annual,
        features=payload.features or [],
        is_active=payload.is_active,
        stripe_price_id_monthly=payload.stripe_price_id_monthly,
        stripe_price_id_annual=payload.stripe_price_id_annual,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return {"success": True, "plan": {"id": plan.id, "plan": plan.plan}}


@router.put("/admin/pricing/{plan_id}")
def update_pricing_plan(
    plan_id: int,
    payload: PricingPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Update a pricing plan."""
    plan = db.query(PricingConfig).filter(PricingConfig.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan.price_monthly = payload.price_monthly
    plan.price_annual = payload.price_annual
    plan.features = payload.features or []
    plan.is_active = payload.is_active
    plan.stripe_price_id_monthly = payload.stripe_price_id_monthly
    plan.stripe_price_id_annual = payload.stripe_price_id_annual
    plan.updated_at = datetime.utcnow()
    db.commit()

    return {"success": True, "plan": {"id": plan.id, "plan": plan.plan}}


# ============ COUPON ENDPOINTS ============


@router.get("/admin/coupons")
def list_coupons(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """List all coupons."""
    query = db.query(Coupon)
    total = query.count()
    coupons = (
        query.order_by(desc(Coupon.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "coupons": [
            {
                "id": c.id,
                "code": c.code,
                "description": c.description,
                "discount_percent": c.discount_percent,
                "discount_amount_cents": c.discount_amount_cents,
                "max_uses": c.max_uses,
                "current_uses": c.current_uses,
                "is_active": c.is_active,
                "expires_at": c.expires_at.isoformat() if c.expires_at else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in coupons
        ],
    }


@router.post("/admin/coupons")
def create_coupon(
    payload: CouponCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Create a new coupon."""
    existing = db.query(Coupon).filter(Coupon.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Coupon code '{payload.code}' already exists")

    coupon = Coupon(
        code=payload.code.upper(),
        description=payload.description,
        discount_percent=payload.discount_percent,
        discount_amount_cents=payload.discount_amount_cents,
        max_uses=payload.max_uses,
        expires_at=payload.expires_at,
        created_by=current_user.id,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)

    return {"success": True, "coupon": {"id": coupon.id, "code": coupon.code}}


@router.put("/admin/coupons/{coupon_id}/toggle")
def toggle_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Toggle coupon active/inactive."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    coupon.is_active = not coupon.is_active
    db.commit()
    return {"success": True, "is_active": coupon.is_active}


# ============ FREE GRANT ENDPOINTS ============


@router.post("/admin/users/grant-free-months")
def grant_free_months(
    payload: FreeGrantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Grant free months to a user."""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    grant = FreeGrant(
        user_id=payload.user_id,
        months=payload.months,
        reason=payload.reason,
        granted_by=current_user.id,
    )
    db.add(grant)

    # Update user's subscription (set as active pro/enterprise)
    user.subscription_status = "active"
    if not user.plan_type or user.plan_type == "free":
        user.plan_type = "pro"
    db.commit()

    return {
        "success": True,
        "grant": {
            "id": grant.id,
            "user_id": grant.user_id,
            "months": grant.months,
            "reason": grant.reason,
        },
    }


@router.get("/admin/users/grants")
def list_free_grants(
    user_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """List free grants, optionally filtered by user."""
    query = db.query(FreeGrant)
    if user_id:
        query = query.filter(FreeGrant.user_id == user_id)

    total = query.count()
    grants = (
        query.order_by(desc(FreeGrant.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "grants": [
            {
                "id": g.id,
                "user_id": g.user_id,
                "months": g.months,
                "reason": g.reason,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in grants
        ],
    }
