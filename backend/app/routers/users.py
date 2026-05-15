from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from .. import auth, schemas
from ..database import get_db
from ..models import User
from ..subscription import get_available_features, get_user_plan, get_subscription_status

router = APIRouter()

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

UPLOAD_DIR = Path("uploads/profiles")
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024


def _validate_password_strength(password: str) -> None:
    checks = [
        (len(password) >= 8, "at least 8 characters"),
        (re.search(r"[A-Z]", password), "one uppercase letter"),
        (re.search(r"[a-z]", password), "one lowercase letter"),
        (re.search(r"\d", password), "one number"),
        (re.search(r"[^A-Za-z0-9]", password), "one special character"),
    ]
    missing = [msg for ok, msg in checks if not ok]
    if missing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Password must contain {', '.join(missing)}")


def _user_response(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name or "",
        "full_name": user.name or "",
        "plan_type": get_user_plan(user),
        "subscription_status": get_subscription_status(user),
        "available_features": get_available_features(user),
        "birth_date": user.birth_date,
        "gender": user.gender,
        "phone": user.phone,
        "address": user.address,
        "city": user.city,
        "postal_code": user.postal_code,
        "country": user.country,
        "profile_image_url": user.profile_image_url,
        "created_at": user.created_at,
    }


@router.get("/profile", response_model=schemas.UserResponse)
def get_profile(current_user: User = Depends(auth.get_current_user)):
    return _user_response(current_user)


@router.put("/profile", response_model=schemas.UserResponse)
def update_profile(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user),
):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return _user_response(current_user)

    if "full_name" in updates and updates["full_name"]:
        current_user.name = updates["full_name"]
    elif "name" in updates and updates["name"]:
        current_user.name = updates["name"]

    for field in ["birth_date", "gender", "phone", "address", "city", "postal_code", "country"]:
        if field in updates:
            setattr(current_user, field, updates[field])

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return _user_response(current_user)


@router.put("/password")
def change_password(
    payload: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user),
):
    if not auth.verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match")

    _validate_password_strength(payload.new_password)

    current_user.password_hash = auth.get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/profile-image", response_model=schemas.UserResponse)
async def upload_profile_image(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user),
):
    content_type = (image.content_type or "").lower()
    ext = ALLOWED_IMAGE_TYPES.get(content_type)
    if not ext:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image format. Use jpg, png, or webp.")

    data = await image.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(data) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image exceeds 5MB limit")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"user_{current_user.id}_{uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        f.write(data)

    current_user.profile_image_url = f"/uploads/profiles/{filename}"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return _user_response(current_user)
