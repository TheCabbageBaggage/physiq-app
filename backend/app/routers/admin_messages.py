"""
Admin Messages Router — Mass Email System

Handles composing, previewing, and sending mass emails to users.
Uses AgentMail integration for email delivery.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import MassMessage, MassMessageRecipient, User, Opportunity
from .. import auth, email_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ SCHEMAS ============

class SendMessageRequest(BaseModel):
    subject: str
    html_body: str
    target_group: str  # all, active_users, waitlist, custom
    custom_emails: Optional[list[EmailStr]] = None


class MessagePreviewResponse(BaseModel):
    subject: str
    html_body: str
    target_group: str
    estimated_recipients: int
    sample_recipients: list[dict]


class MessageHistoryResponse(BaseModel):
    id: int
    subject: str
    status: str
    target_group: Optional[str]
    sent_count: int
    failed_count: int
    total_recipients: int
    created_at: datetime
    sent_at: Optional[datetime]


class MessageDetailResponse(MessageHistoryResponse):
    html_body: str
    recipients: list[dict]


# ============ ADMIN DEPENDENCY ============

def _require_admin(current_user: User = Depends(auth.get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ============ HELPERS ============

def _get_target_emails(target_group: str, custom_emails: Optional[list[str]], db: Session) -> list[dict]:
    """Get recipient list for target group."""
    if target_group == "all":
        users = db.query(User).all()
        return [{"email": u.email, "name": u.name or u.email} for u in users if u.email]
    elif target_group == "active_users":
        users = db.query(User).filter(User.subscription_status == "active").all()
        return [{"email": u.email, "name": u.name or u.email} for u in users if u.email]
    elif target_group == "waitlist":
        opps = db.query(Opportunity).filter(Opportunity.status == "waiting").all()
        return [{"email": o.email, "name": o.name or o.email} for o in opps if o.email]
    elif target_group == "custom" and custom_emails:
        return [{"email": e, "name": e} for e in custom_emails]
    return []


# ============ ENDPOINTS ============


@router.post("/admin/messages/preview")
def preview_message(
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Preview estimated recipient count and sample."""
    recipients = _get_target_emails(payload.target_group, payload.custom_emails, db)
    total = len(recipients)
    sample = recipients[:5]

    return {
        "subject": payload.subject,
        "target_group": payload.target_group,
        "estimated_recipients": total,
        "sample_recipients": sample,
    }


@router.post("/admin/messages/send")
def send_message(
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Send a mass email to target group."""
    recipients = _get_target_emails(payload.target_group, payload.custom_emails, db)
    total = len(recipients)

    if total == 0:
        raise HTTPException(status_code=400, detail="No recipients found for the selected target group")

    # Create message record
    message = MassMessage(
        subject=payload.subject,
        html_body=payload.html_body,
        status="sending",
        target_group=payload.target_group,
        target_filter={"custom_emails": payload.custom_emails} if payload.custom_emails else None,
        total_recipients=total,
        created_by=current_user.id,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    # Create recipient records
    for r in recipients:
        db.add(MassMessageRecipient(
            message_id=message.id,
            user_email=r["email"],
            status="pending",
        ))
    db.commit()

    # Send emails via AgentMail
    try:
        def _on_progress(batch_num, total_batches, batch_results):
            logger.info(f"Batch {batch_num}/{total_batches} processed")

        result = email_service.send_bulk(
            recipients=recipients,
            subject=payload.subject,
            html_body=payload.html_body,
            on_progress=_on_progress,
        )

        # Update recipient statuses
        for r_result in result["results"]:
            db.query(MassMessageRecipient).filter(
                MassMessageRecipient.message_id == message.id,
                MassMessageRecipient.user_email == r_result["email"],
            ).update({
                "status": r_result["status"],
                "sent_at": datetime.utcnow() if r_result["status"] == "sent" else None,
                "error": r_result.get("error"),
            })

        message.sent_count = result["sent"]
        message.failed_count = result["failed"]
        message.status = "sent" if result["failed"] == 0 else "partial"
        message.sent_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        logger.error(f"Failed to send mass email {message.id}: {e}")
        message.status = "failed"
        db.commit()

        # Mark all pending as failed
        db.query(MassMessageRecipient).filter(
            MassMessageRecipient.message_id == message.id,
            MassMessageRecipient.status == "pending",
        ).update({"status": "failed", "error": str(e)})
        db.commit()

        raise HTTPException(status_code=500, detail=f"Email sending failed: {str(e)}")

    return {
        "success": True,
        "message_id": message.id,
        "total": result["total"],
        "sent": result["sent"],
        "failed": result["failed"],
    }


@router.get("/admin/messages/history")
def list_messages(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """List sent mass messages."""
    query = db.query(MassMessage)
    total = query.count()
    messages = (
        query.order_by(desc(MassMessage.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "messages": [
            {
                "id": m.id,
                "subject": m.subject,
                "status": m.status,
                "target_group": m.target_group,
                "sent_count": m.sent_count,
                "failed_count": m.failed_count,
                "total_recipients": m.total_recipients,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
            }
            for m in messages
        ],
    }


@router.get("/admin/messages/{message_id}")
def get_message_detail(
    message_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Get detailed info about a specific message including recipient list."""
    message = db.query(MassMessage).filter(MassMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    recipients_query = db.query(MassMessageRecipient).filter(
        MassMessageRecipient.message_id == message_id
    ).order_by(MassMessageRecipient.id)

    total_recipients = recipients_query.count()
    recipients = (
        recipients_query.offset((page - 1) * per_page).limit(per_page).all()
    )

    return {
        "id": message.id,
        "subject": message.subject,
        "html_body": message.html_body,
        "status": message.status,
        "target_group": message.target_group,
        "sent_count": message.sent_count,
        "failed_count": message.failed_count,
        "total_recipients": message.total_recipients,
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
        "recipients_page": page,
        "recipients_total": total_recipients,
        "recipients": [
            {
                "id": r.id,
                "email": r.user_email,
                "status": r.status,
                "sent_at": r.sent_at.isoformat() if r.sent_at else None,
                "error": r.error,
            }
            for r in recipients
        ],
    }


@router.get("/admin/messages/account/info")
def get_email_account_info(
    current_user: User = Depends(_require_admin),
):
    """Check AgentMail account configuration."""
    info = email_service.get_account_info()
    return info
