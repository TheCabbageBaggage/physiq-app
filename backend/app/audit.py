from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from .models import AuditLog, User


def log_admin_action(
    db: Session,
    *,
    actor: User | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    entry = AuditLog(
        actor_user_id=actor.id if actor else None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details_json=details or {},
    )
    db.add(entry)

