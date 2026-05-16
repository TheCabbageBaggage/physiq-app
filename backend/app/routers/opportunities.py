"""
Opportunities Router — Waitlist Management

This router handles:
1. Public waitlist signup (no auth required, rate limited)
2. Admin endpoints to view and manage opportunities
"""

from datetime import datetime
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Opportunity, RateLimitEvent, User
from ..audit import log_admin_action
from .. import schemas, auth
from ..security import log_security_event

router = APIRouter()

RATE_LIMIT_MAX = 5  # requests per minute
RATE_LIMIT_WINDOW = 60  # seconds


def _check_rate_limit(ip: str, db: Session) -> None:
    """DB-backed shared rate limiting by IP. Raises HTTPException if exceeded."""
    now = datetime.utcnow()
    window_start = now.timestamp() - RATE_LIMIT_WINDOW
    cutoff = datetime.utcfromtimestamp(window_start)

    # Cleanup old rows to keep table small.
    db.query(RateLimitEvent).filter(RateLimitEvent.created_at < cutoff).delete()
    count = (
        db.query(RateLimitEvent)
        .filter(
            RateLimitEvent.scope == "waitlist_signup",
            RateLimitEvent.key == ip,
            RateLimitEvent.created_at >= cutoff,
        )
        .count()
    )
    if count >= RATE_LIMIT_MAX:
        log_security_event("rate_limit.blocked", scope="waitlist_signup", ip=ip, count=count)
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again in a minute.",
        )
    db.add(RateLimitEvent(scope="waitlist_signup", key=ip, created_at=now))
    db.flush()


@router.post("/opportunities", status_code=201)
def create_opportunity(
    payload: schemas.OpportunityCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Public endpoint to join the waitlist.
    Rate limited to 5 requests per minute per IP.
    """
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip, db)

    # Check if email already exists
    existing = (
        db.query(Opportunity).filter(Opportunity.email == payload.email).first()
    )
    if existing:
        return {
            "success": True,
            "message": "Du bist bereits auf der Warteliste! Wir melden uns bei dir.",
            "uuid": existing.uuid,
        }

    # Create new opportunity
    opp = Opportunity(
        uuid=str(uuid4()),
        email=payload.email,
        name=payload.name,
        status="waiting",
        referral_source=payload.referral_source,
        calculated_kfa=payload.calculated_kfa,
        calculated_mma=payload.calculated_mma,
        calculated_body_fat_navy=payload.calculated_body_fat_navy,
        height_cm=payload.height_cm,
        weight_kg=payload.weight_kg,
        age=payload.age,
        gender=payload.gender,
        neck_cm=payload.neck_cm,
        waist_cm=payload.waist_cm,
        hip_cm=payload.hip_cm,
        metadata_json={"ip": client_ip, "calculated_at": datetime.utcnow().isoformat()},
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)

    return {
        "success": True,
        "message": "Du bist auf der Warteliste! Wir melden uns bei dir.",
        "uuid": opp.uuid,
    }


@router.get("/opportunities/check/{email}")
def check_opportunity(email: str, db: Session = Depends(get_db)):
    """Check if email is already on waitlist."""
    opp = db.query(Opportunity).filter(Opportunity.email == email).first()
    return {
        "exists": opp is not None,
        "status": opp.status if opp else None,
        "uuid": opp.uuid if opp else None,
    }


# ============ ADMIN ENDPOINTS ============

def _require_admin(
    current_user: User = Depends(auth.get_current_user),
) -> User:
    """Dependency to check if user is admin."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/admin/opportunities", response_model=schemas.OpportunityListResponse)
def list_opportunities(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search email or name"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """
    Admin: List all opportunities with filtering and pagination.
    """
    query = db.query(Opportunity)

    if status:
        query = query.filter(Opportunity.status == status)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Opportunity.email.ilike(search_filter))
            | (Opportunity.name.ilike(search_filter))
        )

    total = query.count()

    opportunities = (
        query.order_by(desc(Opportunity.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return schemas.OpportunityListResponse(
        total=total,
        opportunities=opportunities,
        page=page,
        per_page=per_page,
    )


@router.get("/admin/opportunities/{uuid}", response_model=schemas.OpportunityResponse)
def get_opportunity(
    uuid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Admin: Get single opportunity by UUID."""
    opp = db.query(Opportunity).filter(Opportunity.uuid == uuid).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp


@router.put("/admin/opportunities/{uuid}")
def update_opportunity(
    uuid: str,
    updates: schemas.OpportunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Admin: Update opportunity status."""
    opp = db.query(Opportunity).filter(Opportunity.uuid == uuid).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    if updates.name:
        opp.name = updates.name
    if updates.referral_source:
        opp.referral_source = updates.referral_source

    opp.updated_at = datetime.utcnow()
    log_admin_action(
        db,
        actor=current_user,
        action="opportunity.updated",
        resource_type="opportunity",
        resource_id=opp.uuid,
        details={"name": opp.name, "referral_source": opp.referral_source},
    )
    db.commit()
    db.refresh(opp)

    return {"success": True, "opportunity": opp}


@router.post("/admin/opportunities/{uuid}/contact")
def mark_contacted(
    uuid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Admin: Mark opportunity as contacted."""
    opp = db.query(Opportunity).filter(Opportunity.uuid == uuid).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    opp.status = "contacted"
    opp.updated_at = datetime.utcnow()
    log_admin_action(
        db,
        actor=current_user,
        action="opportunity.contacted",
        resource_type="opportunity",
        resource_id=opp.uuid,
    )
    db.commit()

    return {"success": True, "message": "Marked as contacted"}


@router.post("/admin/opportunities/{uuid}/convert")
def convert_to_customer(
    uuid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """
    Admin: Convert opportunity to customer.
    Requires that a User already exists with the same email.
    """
    opp = db.query(Opportunity).filter(Opportunity.uuid == uuid).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    if opp.status == "converted":
        raise HTTPException(status_code=400, detail="Already converted")

    # Find existing user
    user = db.query(User).filter(User.email == opp.email).first()
    if not user:
        raise HTTPException(
            status_code=400,
            detail="No user found with this email. Create user first.",
        )

    opp.status = "converted"
    opp.converted_to_customer_id = user.id
    opp.converted_at = datetime.utcnow()
    opp.updated_at = datetime.utcnow()
    log_admin_action(
        db,
        actor=current_user,
        action="opportunity.converted",
        resource_type="opportunity",
        resource_id=opp.uuid,
        details={"user_id": user.id, "email": user.email},
    )
    db.commit()

    return {"success": True, "message": "Converted to customer", "user_id": user.id}


@router.delete("/admin/opportunities/{uuid}")
def delete_opportunity(
    uuid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Admin: Soft delete opportunity (mark as expired)."""
    opp = db.query(Opportunity).filter(Opportunity.uuid == uuid).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    opp.status = "expired"
    opp.updated_at = datetime.utcnow()
    log_admin_action(
        db,
        actor=current_user,
        action="opportunity.expired",
        resource_type="opportunity",
        resource_id=opp.uuid,
    )
    db.commit()

    return {"success": True, "message": "Opportunity expired"}
