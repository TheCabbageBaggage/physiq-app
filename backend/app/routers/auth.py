"""
Authentication Router

This module handles user registration, login, and token management.
Provides endpoints for creating accounts and obtaining JWT tokens.

Endpoints:
- POST /register: Create a new user account
- POST /login: Authenticate user and return JWT token
- POST /refresh: Refresh an expired token (future enhancement)
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import schemas, auth
from ..database import get_db
from ..models import User
from ..subscription import get_available_features, get_subscription_status, get_user_plan

router = APIRouter()


def _detect_language_from_accept_header(accept_language: str | None) -> str:
    if not accept_language:
        return "de"
    normalized = accept_language.lower()
    if "en" in normalized:
        return "en"
    return "de"

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    Args:
        user: User registration data
        db: Database session
    
    Returns:
        Created user information (excluding password)
    
    Raises:
        HTTPException: If email already exists
    """
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = auth.get_password_hash(user.password)
    resolved_name = (user.full_name or user.name or "").strip()

    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        name=resolved_name,
        preferred_language=_detect_language_from_accept_header(request.headers.get("accept-language")),
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/login", response_model=schemas.Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT token.
    
    Args:
        form_data: OAuth2 form data (username=email, password)
        db: Database session
    
    Returns:
        JWT access token
    
    Raises:
        HTTPException: If authentication fails
    """
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.preferred_language:
        user.preferred_language = _detect_language_from_accept_header(request.headers.get("accept-language"))
        db.add(user)
        db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"user_id": user.id, "email": user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds
    }

@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: User = Depends(auth.get_current_active_user)):
    """
    Get current authenticated user information.
    
    Args:
        current_user: Authenticated user from JWT token
    
    Returns:
        Current user information
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name or "",
        "full_name": current_user.name or "",
        "plan_type": get_user_plan(current_user),
        "subscription_status": get_subscription_status(current_user),
        "available_features": get_available_features(current_user),
        "birth_date": current_user.birth_date,
        "gender": current_user.gender,
        "phone": current_user.phone,
        "address": current_user.address,
        "city": current_user.city,
        "postal_code": current_user.postal_code,
        "country": current_user.country,
        "profile_image_url": current_user.profile_image_url,
        "created_at": current_user.created_at,
    }
