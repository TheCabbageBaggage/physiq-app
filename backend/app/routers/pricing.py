"""
Pricing Config & Coupon System Router (ACT-28)

Admin endpoints for:
1. Dynamic pricing configuration (no code changes)
2. Coupon management (percentage/fixed discounts)
3. Free months grants
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import PricingConfig, Coupon, UserFreeMonth, User
from ..audit import log_admin_action
from .. import schemas, auth

router = APIRouter()


def _require_admin(current_user: User = Depends(auth.get_current_user)) -> User:
    """Dependency to check if user is admin."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ============ PRICING CONFIG ============


@router.get("/api/admin/pricing", response_model=list[schemas.PricingConfigResponse])
def get_pricing_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Get all pricing tiers."""
    configs = db.query(PricingConfig).order_by(PricingConfig.sort_order).all()
    return [_pricing_to_response(c) for c in configs]


@router.get("/api/admin/pricing/{tier}", response_model=schemas.PricingConfigResponse)
def get_pricing_tier(
    tier: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Get pricing for a specific tier."""
    config = db.query(PricingConfig).filter(PricingConfig.tier == tier).first()
    if not config:
        raise HTTPException(status_code=404, detail=f"Tier '{tier}' not found")
    return _pricing_to_response(config)


@router.post("/api/admin/pricing", response_model=schemas.PricingConfigResponse, status_code=201)
def create_pricing_tier(
    data: schemas.PricingConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Create a new pricing tier."""
    existing = db.query(PricingConfig).filter(PricingConfig.tier == data.tier).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Tier '{data.tier}' already exists")

    config = PricingConfig(
        tier=data.tier,
        name=data.name,
        monthly_price_cents=data.monthly_price_cents,
        annual_price_cents=data.annual_price_cents,
        currency=data.currency,
        trial_days=data.trial_days,
        features=data.features,
        sort_order=data.sort_order,
    )
    db.add(config)
    log_admin_action(
        db,
        actor=current_user,
        action="pricing.created",
        resource_type="pricing_tier",
        resource_id=config.tier,
        details=data.model_dump(),
    )
    db.commit()
    db.refresh(config)
    return _pricing_to_response(config)


@router.put("/api/admin/pricing/{tier}", response_model=schemas.PricingConfigResponse)
def update_pricing_tier(
    tier: str,
    data: schemas.PricingConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Update a pricing tier."""
    config = db.query(PricingConfig).filter(PricingConfig.tier == tier).first()
    if not config:
        raise HTTPException(status_code=404, detail=f"Tier '{tier}' not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    config.updated_at = datetime.utcnow()
    log_admin_action(
        db,
        actor=current_user,
        action="pricing.updated",
        resource_type="pricing_tier",
        resource_id=config.tier,
        details=update_data,
    )

    db.commit()
    db.refresh(config)
    return _pricing_to_response(config)


@router.delete("/api/admin/pricing/{tier}")
def delete_pricing_tier(
    tier: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Delete a pricing tier."""
    config = db.query(PricingConfig).filter(PricingConfig.tier == tier).first()
    if not config:
        raise HTTPException(status_code=404, detail=f"Tier '{tier}' not found")
    log_admin_action(
        db,
        actor=current_user,
        action="pricing.deleted",
        resource_type="pricing_tier",
        resource_id=config.tier,
    )
    db.delete(config)
    db.commit()
    return {"detail": f"Tier '{tier}' deleted"}


@router.get("/api/pricing/public", response_model=list[dict])
def get_public_pricing(db: Session = Depends(get_db)):
    """Public endpoint: get active pricing tiers (no auth)."""
    configs = (
        db.query(PricingConfig)
        .filter(PricingConfig.is_active == True)
        .order_by(PricingConfig.sort_order)
        .all()
    )
    return [
        {
            "tier": c.tier,
            "name": c.name,
            "monthly_price_cents": c.monthly_price_cents,
            "monthly_price": round(c.monthly_price_cents / 100, 2),
            "annual_price_cents": c.annual_price_cents,
            "annual_price": round(c.annual_price_cents / 100, 2) if c.annual_price_cents else None,
            "currency": c.currency,
            "trial_days": c.trial_days,
            "features": c.features,
        }
        for c in configs
    ]


# ============ COUPONS ============


@router.get("/api/admin/coupons", response_model=list[schemas.CouponResponse])
def list_coupons(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """List all coupons."""
    coupons = db.query(Coupon).order_by(desc(Coupon.created_at)).all()
    return coupons


@router.post("/api/admin/coupons", response_model=schemas.CouponResponse, status_code=201)
def create_coupon(
    data: schemas.CouponCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Create a new coupon."""
    existing = db.query(Coupon).filter(Coupon.code == data.code).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Coupon code '{data.code}' already exists")

    coupon = Coupon(
        code=data.code,
        description=data.description,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        applicable_tiers=data.applicable_tiers,
        min_interval=data.min_interval,
        max_uses=data.max_uses,
        valid_from=data.valid_from,
        valid_until=data.valid_until,
    )
    db.add(coupon)
    log_admin_action(
        db,
        actor=current_user,
        action="coupon.created",
        resource_type="coupon",
        resource_id=coupon.code,
        details=data.model_dump(),
    )
    db.commit()
    db.refresh(coupon)
    return coupon


@router.delete("/api/admin/coupons/{code}")
def deactivate_coupon(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Deactivate a coupon (soft delete via is_active flag)."""
    coupon = db.query(Coupon).filter(Coupon.code == code).first()
    if not coupon:
        raise HTTPException(status_code=404, detail=f"Coupon '{code}' not found")
    coupon.is_active = False
    log_admin_action(
        db,
        actor=current_user,
        action="coupon.deactivated",
        resource_type="coupon",
        resource_id=coupon.code,
    )
    db.commit()
    return {"detail": f"Coupon '{code}' deactivated"}


@router.post("/api/coupons/validate", response_model=schemas.CouponValidateResponse)
def validate_coupon(
    data: schemas.CouponValidateRequest,
    db: Session = Depends(get_db),
):
    """Validate a coupon code (public, no auth). Returns discount info if valid."""
    coupon = db.query(Coupon).filter(Coupon.code == data.code).first()
    if not coupon:
        return schemas.CouponValidateResponse(
            valid=False, code=data.code, message="Coupon not found"
        )

    if not coupon.is_active:
        return schemas.CouponValidateResponse(
            valid=False, code=data.code, message="Coupon is no longer active"
        )

    if coupon.max_uses > 0 and coupon.used_count >= coupon.max_uses:
        return schemas.CouponValidateResponse(
            valid=False, code=data.code, message="Coupon usage limit reached"
        )

    now = datetime.utcnow()
    if coupon.valid_from and now < coupon.valid_from:
        return schemas.CouponValidateResponse(
            valid=False, code=data.code, message="Coupon not yet valid"
        )
    if coupon.valid_until and now > coupon.valid_until:
        return schemas.CouponValidateResponse(
            valid=False, code=data.code, message="Coupon has expired"
        )

    # Check tier applicability
    if data.tier and coupon.applicable_tiers:
        if data.tier not in coupon.applicable_tiers:
            return schemas.CouponValidateResponse(
                valid=False, code=data.code, message=f"Coupon not applicable for tier '{data.tier}'"
            )

    # Build label
    if coupon.discount_type == "percentage":
        label = f"{coupon.discount_value}% off"
    else:
        label = f"€{coupon.discount_value / 100:.2f} off"

    return schemas.CouponValidateResponse(
        valid=True,
        code=coupon.code,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
        discount_label=label,
        message="Coupon is valid",
    )


# ============ FREE MONTHS ============


@router.post("/api/admin/users/{user_id}/free-months")
def grant_free_months(
    user_id: int,
    data: schemas.GrantFreeMonthsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Grant free months to a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    free_month = UserFreeMonth(
        user_id=user_id,
        months=data.months,
        reason=data.reason,
        granted_by=current_user.id,
    )
    db.add(free_month)
    log_admin_action(
        db,
        actor=current_user,
        action="user.free_months_granted",
        resource_type="user",
        resource_id=str(user_id),
        details={"months": data.months, "reason": data.reason},
    )
    db.commit()
    db.refresh(free_month)

    return {
        "detail": f"Granted {data.months} free month(s) to user {user_id}",
        "user_id": user_id,
        "months": data.months,
        "reason": data.reason,
    }


@router.get("/api/admin/users/{user_id}/free-months")
def get_user_free_months(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Get free months grants for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    grants = (
        db.query(UserFreeMonth)
        .filter(UserFreeMonth.user_id == user_id)
        .order_by(desc(UserFreeMonth.created_at))
        .all()
    )

    total_months = sum(g.months for g in grants)
    total_used = sum(g.used_count for g in grants)

    return {
        "user_id": user_id,
        "total_free_months": total_months,
        "used_free_months": total_used,
        "remaining_free_months": total_months - total_used,
        "grants": [
            {
                "id": g.id,
                "months": g.months,
                "used": g.used_count,
                "reason": g.reason,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in grants
        ],
    }


# ============ HELPERS ============


def _pricing_to_response(config: PricingConfig) -> dict:
    """Convert PricingConfig model to response with calculated prices."""
    return {
        "id": config.id,
        "tier": config.tier,
        "name": config.name,
        "monthly_price_cents": config.monthly_price_cents,
        "monthly_price": round(config.monthly_price_cents / 100, 2),
        "annual_price_cents": config.annual_price_cents,
        "annual_price": round(config.annual_price_cents / 100, 2) if config.annual_price_cents else None,
        "currency": config.currency,
        "trial_days": config.trial_days,
        "features": config.features,
        "is_active": config.is_active,
        "sort_order": config.sort_order,
        "created_at": config.created_at,
        "updated_at": config.updated_at,
    }
