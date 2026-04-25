from __future__ import annotations

import math
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

MODEL_VERSION = "ml-v0.1.0"
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
BF_MODEL_PATH = MODEL_DIR / "bodyfat_residual_model.joblib"
ATHLETE_MODEL_PATH = MODEL_DIR / "athlete_classifier.joblib"
TREND_MODEL_PATH = MODEL_DIR / "trend_models.joblib"

ACTIVITY_MAP = {
    "sedentary": 0,
    "light": 1,
    "moderate": 2,
    "active": 3,
    "very_active": 4,
}


def us_navy_body_fat_percent(*, gender: str, height_cm: float, neck_cm: float, waist_cm: float, hip_cm: float | None = None) -> float:
    if gender == "male":
        if waist_cm <= neck_cm:
            raise ValueError("waist_cm must be greater than neck_cm for male formula")
        value = 495 / (1.0324 - 0.19077 * math.log10(waist_cm - neck_cm) + 0.15456 * math.log10(height_cm)) - 450
    else:
        if hip_cm is None:
            raise ValueError("hip_cm is required for female formula")
        if waist_cm + hip_cm <= neck_cm:
            raise ValueError("waist_cm + hip_cm must be greater than neck_cm for female formula")
        value = 495 / (1.29579 - 0.35004 * math.log10(waist_cm + hip_cm - neck_cm) + 0.22100 * math.log10(height_cm)) - 450
    return float(np.clip(value, 3.0, 55.0))


def _build_bodyfat_residual_model() -> Pipeline:
    rng = np.random.default_rng(42)
    n = 2000
    age = rng.integers(16, 70, size=n)
    gender = rng.integers(0, 2, size=n)
    weight = rng.normal(78, 18, size=n).clip(40, 180)
    muscle = rng.normal(38, 7, size=n).clip(20, 60)
    athlete = rng.integers(0, 2, size=n)

    # synthetic residual target: athlete and muscle generally reduce BF relative to navy baseline
    residual = (
        -0.03 * (muscle - 35)
        - 1.2 * athlete
        + 0.015 * (age - 35)
        + 0.01 * (weight - 75)
        + 0.7 * (gender == 1)
        + rng.normal(0, 1.2, size=n)
    )

    X = np.column_stack([age, gender, weight, muscle, athlete])
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("ridge", Ridge(alpha=1.0, random_state=42)),
    ])
    model.fit(X, residual)
    return model


def _build_athlete_classifier() -> Pipeline:
    rng = np.random.default_rng(7)
    n = 1500
    muscle_percent = rng.normal(38, 8, size=n).clip(20, 65)
    activity = rng.integers(0, 5, size=n)
    age = rng.integers(16, 70, size=n)
    y = ((muscle_percent > 42) & (activity >= 3)) | ((muscle_percent > 45) & (activity >= 2))
    y = y.astype(int)

    X = np.column_stack([muscle_percent, activity, age])
    clf = Pipeline([
        ("scaler", StandardScaler()),
        ("logreg", LogisticRegression(max_iter=400, random_state=42)),
    ])
    clf.fit(X, y)
    return clf


def _build_trend_models() -> dict:
    rng = np.random.default_rng(99)
    n = 2500
    slope_weight = rng.normal(0.0, 0.08, size=n)
    slope_bf = rng.normal(0.0, 0.05, size=n)
    slope_muscle = rng.normal(0.0, 0.04, size=n)
    momentum = rng.normal(0.0, 0.2, size=n)
    consistency = rng.uniform(0.2, 1.0, size=n)

    X = np.column_stack([slope_weight, slope_bf, slope_muscle, momentum, consistency])

    targets = {
        "weight_7": 7 * slope_weight + 0.4 * momentum + rng.normal(0, 0.2, size=n),
        "weight_30": 30 * slope_weight + 1.2 * momentum + rng.normal(0, 0.6, size=n),
        "weight_90": 90 * slope_weight + 2.0 * momentum + rng.normal(0, 1.0, size=n),
        "bf_7": 7 * slope_bf + rng.normal(0, 0.15, size=n),
        "bf_30": 30 * slope_bf + rng.normal(0, 0.35, size=n),
        "bf_90": 90 * slope_bf + rng.normal(0, 0.8, size=n),
        "muscle_7": 7 * slope_muscle + rng.normal(0, 0.08, size=n),
        "muscle_30": 30 * slope_muscle + rng.normal(0, 0.2, size=n),
        "muscle_90": 90 * slope_muscle + rng.normal(0, 0.4, size=n),
    }

    models = {}
    for name, y in targets.items():
        model = Pipeline([
            ("scaler", StandardScaler()),
            ("ridge", Ridge(alpha=1.0, random_state=42)),
        ])
        model.fit(X, y)
        models[name] = model
    return models


def ensure_models() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    if not BF_MODEL_PATH.exists():
        joblib.dump(_build_bodyfat_residual_model(), BF_MODEL_PATH)
    if not ATHLETE_MODEL_PATH.exists():
        joblib.dump(_build_athlete_classifier(), ATHLETE_MODEL_PATH)
    if not TREND_MODEL_PATH.exists():
        joblib.dump(_build_trend_models(), TREND_MODEL_PATH)


def load_models() -> tuple[Pipeline, Pipeline, dict]:
    ensure_models()
    return (
        joblib.load(BF_MODEL_PATH),
        joblib.load(ATHLETE_MODEL_PATH),
        joblib.load(TREND_MODEL_PATH),
    )


def athletic_type(*, athlete_model: Pipeline, muscle_mass_percent: float | None, activity_level: str, age: int) -> tuple[str, float]:
    muscle = float(muscle_mass_percent if muscle_mass_percent is not None else 35.0)
    activity = ACTIVITY_MAP.get(activity_level, 2)
    X = np.array([[muscle, activity, age]])
    p = float(athlete_model.predict_proba(X)[0][1])
    label = "athlete" if p >= 0.5 else "non_athlete"
    return label, p


def residual_correction(*, residual_model: Pipeline, age: int, gender: str, weight_kg: float, muscle_mass_percent: float | None, athlete_type_label: str) -> float:
    gender_code = 1 if gender == "female" else 0
    muscle = float(muscle_mass_percent if muscle_mass_percent is not None else 35.0)
    athlete = 1 if athlete_type_label == "athlete" else 0
    X = np.array([[age, gender_code, weight_kg, muscle, athlete]])
    correction = float(residual_model.predict(X)[0])
    return float(np.clip(correction, -8.0, 8.0))


def composition_with_mass_conservation(*, weight_kg: float, body_fat_percent: float, muscle_mass_percent: float | None, water_percent: float | None, bone_mass_kg: float | None) -> tuple[dict, float]:
    fat_kg = weight_kg * body_fat_percent / 100.0

    if muscle_mass_percent is None:
        muscle_mass_percent = 35.0
    muscle_kg = weight_kg * muscle_mass_percent / 100.0

    if water_percent is None:
        water_percent = 56.0
    water_kg = weight_kg * water_percent / 100.0

    if bone_mass_kg is None:
        bone_mass_kg = max(2.0, 0.04 * weight_kg)

    total = fat_kg + muscle_kg + water_kg + bone_mass_kg
    error = total - weight_kg

    if abs(error) > 0.5:
        # Rebalance water first to satisfy conservation with minimal disruption
        water_kg -= error
        total = fat_kg + muscle_kg + water_kg + bone_mass_kg
        error = total - weight_kg

    composition = {
        "fat_kg": round(fat_kg, 2),
        "muscle_kg": round(muscle_kg, 2),
        "water_kg": round(water_kg, 2),
        "bone_kg": round(bone_mass_kg, 2),
        "total_kg": round(total, 2),
    }
    return composition, round(float(error), 4)
