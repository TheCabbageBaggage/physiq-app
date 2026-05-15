from typing import Callable, Literal

from fastapi import Depends, HTTPException

from .auth import get_current_active_user
from .models import User

PlanType = Literal["free", "pro", "enterprise"]

PLAN_LEVELS: dict[str, int] = {"free": 0, "pro": 1, "enterprise": 2}

PLAN_FEATURES: dict[str, list[str]] = {
    "free": ["basic_tracking", "csv_export", "charts"],
    "pro": ["basic_tracking", "csv_export", "charts", "predictions"],
    "enterprise": ["basic_tracking", "csv_export", "charts", "predictions", "coaching"],
}


def get_user_plan(user: User) -> str:
    return (getattr(user, "plan_type", None) or "free").lower()


def get_subscription_status(user: User) -> str:
    return (getattr(user, "subscription_status", None) or "inactive").lower()


def get_available_features(user: User) -> list[str]:
    plan = get_user_plan(user)
    return PLAN_FEATURES.get(plan, PLAN_FEATURES["free"])


def has_minimum_plan(user: User, min_plan: str) -> bool:
    plan = get_user_plan(user)
    status = get_subscription_status(user)

    if status != "active":
        return False

    return PLAN_LEVELS.get(plan, 0) >= PLAN_LEVELS.get(min_plan, 99)


def require_subscription(min_plan: PlanType) -> Callable:
    async def dependency(current_user: User = Depends(get_current_active_user)) -> User:
        if not has_minimum_plan(current_user, min_plan):
            raise HTTPException(status_code=403, detail=f"{min_plan} plan with active subscription required")
        return current_user

    return dependency

