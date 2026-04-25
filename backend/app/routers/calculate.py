"""
Public Calculate Router — KFA/MMA Calculator

This router provides a public endpoint for the landing page calculator.
No authentication required. Calls ML service or falls back to Navy Formula.
"""

import math
import os
from typing import Optional

from fastapi import APIRouter, HTTPException

from .. import schemas
from ..ml_client import cached_ml_post

router = APIRouter()

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://127.0.0.1:8001")


def _navy_body_fat(
    gender: str,
    height_cm: float,
    neck_cm: float,
    waist_cm: float,
    hip_cm: Optional[float] = None,
) -> float:
    """
    US Navy Body Fat Formula (DoD standard).
    Male: 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
    Female: 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
    """
    if gender == "male":
        if waist_cm <= neck_cm:
            raise ValueError("waist_cm must be greater than neck_cm for male formula")
        value = (
            495
            / (
                1.0324
                - 0.19077 * math.log10(waist_cm - neck_cm)
                + 0.15456 * math.log10(height_cm)
            )
            - 450
        )
    else:
        if hip_cm is None:
            raise ValueError("hip_cm is required for female formula")
        if waist_cm + hip_cm <= neck_cm:
            raise ValueError(
                "waist_cm + hip_cm must be greater than neck_cm for female formula"
            )
        value = (
            495
            / (
                1.29579
                - 0.35004 * math.log10(waist_cm + hip_cm - neck_cm)
                + 0.22100 * math.log10(height_cm)
            )
            - 450
        )
    return float(max(3.0, min(55.0, value)))


def _estimate_muscle_mass_percent(
    body_fat_percent: float, gender: str, activity_level: str
) -> float:
    """
    Estimate muscle mass percent based on body fat, gender, and activity.
    This is a heuristic fallback when ML is unavailable.
    """
    # Base lean mass (100 - fat) = approximate non-fat mass
    lean_mass = 100 - body_fat_percent

    # Gender adjustment (males typically higher muscle proportion)
    gender_factor = 0.48 if gender == "male" else 0.42

    # Activity adjustment
    activity_multipliers = {
        "sedentary": 0.95,
        "light": 0.97,
        "moderate": 1.0,
        "active": 1.03,
        "very_active": 1.06,
    }
    activity_mult = activity_multipliers.get(activity_level, 1.0)

    estimated = lean_mass * gender_factor * activity_mult
    return float(max(15.0, min(60.0, estimated)))


def _estimate_composition(
    weight_kg: float, body_fat_percent: float, muscle_mass_percent: float
) -> dict:
    """
    Estimate body composition breakdown.
    Uses mass conservation with sensible defaults for missing values.
    """
    fat_kg = weight_kg * body_fat_percent / 100.0
    muscle_kg = weight_kg * muscle_mass_percent / 100.0

    # Default values for missing data
    water_percent = 56.0
    water_kg = weight_kg * water_percent / 100.0
    bone_mass_kg = max(2.0, 0.04 * weight_kg)

    total = fat_kg + muscle_kg + water_kg + bone_mass_kg
    error = total - weight_kg

    # Rebalance water to satisfy mass conservation
    if abs(error) > 0.5:
        water_kg -= error
        total = fat_kg + muscle_kg + water_kg + bone_mass_kg
        error = total - weight_kg

    return {
        "fat_kg": round(fat_kg, 2),
        "muscle_kg": round(muscle_kg, 2),
        "water_kg": round(water_kg, 2),
        "bone_kg": round(bone_mass_kg, 2),
        "total_kg": round(total, 2),
    }


@router.post("/calculate", response_model=schemas.CalculateResponse)
def calculate_body_composition(payload: schemas.CalculateRequest):
    """
    Public endpoint to calculate body fat and muscle mass.
    
    Attempts to use ML service first, falls back to Navy Formula + heuristics
    if ML service is unavailable.
    """
    # Build ML payload
    ml_payload = {
        "gender": payload.gender,
        "age": payload.age,
        "height_cm": payload.height_cm,
        "neck_cm": payload.neck_cm,
        "waist_cm": payload.waist_cm,
        "hip_cm": payload.hip_cm,
        "weight_kg": payload.weight_kg,
        "muscle_mass_percent": None,  # Will be estimated by ML or fallback
        "water_percent": None,
        "bone_mass_kg": None,
        "activity_level": payload.activity_level,
    }

    # Try ML service first
    ml_result = cached_ml_post("/api/v1/predict/bodyfat", ml_payload)

    if ml_result:
        # ML service available
        return schemas.CalculateResponse(
            body_fat_percent=ml_result.get("body_fat_ml_corrected_percent", 20.0),
            body_fat_navy_percent=ml_result.get("body_fat_navy_percent", 20.0),
            muscle_mass_percent=ml_result.get("composition", {}).get("muscle_kg", 30.0)
            / payload.weight_kg
            * 100,
            athlete_type=ml_result.get("athlete_type", "non_athlete"),
            confidence_score=ml_result.get("confidence_score", 0.7),
            composition=ml_result.get("composition", {}),
            source="ml",
        )
    else:
        # Fallback: Navy Formula only
        try:
            navy_bf = _navy_body_fat(
                gender=payload.gender,
                height_cm=payload.height_cm,
                neck_cm=payload.neck_cm,
                waist_cm=payload.waist_cm,
                hip_cm=payload.hip_cm,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        # Estimate muscle mass
        muscle_pct = _estimate_muscle_mass_percent(
            body_fat_percent=navy_bf,
            gender=payload.gender,
            activity_level=payload.activity_level,
        )

        # Estimate composition
        composition = _estimate_composition(
            weight_kg=payload.weight_kg,
            body_fat_percent=navy_bf,
            muscle_mass_percent=muscle_pct,
        )

        # Simple athlete classification heuristic
        is_athlete = (
            muscle_pct > 42 and payload.activity_level in ["active", "very_active"]
        ) or (muscle_pct > 45 and payload.activity_level in ["moderate", "active", "very_active"])
        athlete_type = "athlete" if is_athlete else "non_athlete"

        # Confidence is lower for fallback
        confidence = 0.55

        return schemas.CalculateResponse(
            body_fat_percent=navy_bf,
            body_fat_navy_percent=navy_bf,
            muscle_mass_percent=round(muscle_pct, 2),
            athlete_type=athlete_type,
            confidence_score=confidence,
            composition=composition,
            source="navy_only",
        )
