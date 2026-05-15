from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class BodyFatPredictionRequest(BaseModel):
    gender: Literal["male", "female"]
    age: int = Field(..., ge=12, le=95)
    height_cm: float = Field(..., ge=120, le=230)
    neck_cm: float = Field(..., ge=20, le=70)
    waist_cm: float = Field(..., ge=40, le=200)
    hip_cm: float | None = Field(default=None, ge=50, le=220)
    weight_kg: float = Field(..., ge=30, le=250)
    muscle_mass_percent: float | None = Field(default=None, ge=0, le=100)
    skeletal_muscle_mass_kg: float | None = Field(default=None, ge=5, le=120)
    water_percent: float | None = Field(default=None, ge=20, le=80)
    bone_mass_kg: float | None = Field(default=None, ge=0.5, le=10)
    activity_level: Literal["sedentary", "light", "moderate", "active", "very_active"] = "moderate"


class BodyFatPredictionResponse(BaseModel):
    body_fat_navy_percent: float
    body_fat_ml_corrected_percent: float
    residual_adjustment_percent: float
    athlete_type: Literal["athlete", "non_athlete"]
    confidence_score: float
    composition: dict
    mass_conservation_error_kg: float
    model_version: str


class TrendPoint(BaseModel):
    date: date
    weight_kg: float
    body_fat_percent: float | None = None
    muscle_mass_percent: float | None = None


class TrendPredictionRequest(BaseModel):
    history: list[TrendPoint] = Field(..., min_length=3)


class TrendBucket(BaseModel):
    day: int
    predicted_weight_kg: float
    predicted_body_fat_percent: float | None = None
    predicted_muscle_mass_percent: float | None = None


class TrendPredictionResponse(BaseModel):
    horizon_days: list[int]
    predictions: list[TrendBucket]
    confidence_score: float
    assumptions: list[str]
    model_version: str
