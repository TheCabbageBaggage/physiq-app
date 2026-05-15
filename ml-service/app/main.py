from __future__ import annotations

from datetime import date
import os

import numpy as np
from fastapi import FastAPI, HTTPException, Header

from .ml import (
    MODEL_VERSION,
    load_models,
    us_navy_body_fat_percent,
    athletic_type,
    residual_correction,
    composition_with_mass_conservation,
    ensure_models,
)
from .schemas import (
    BodyFatPredictionRequest,
    BodyFatPredictionResponse,
    TrendPredictionRequest,
    TrendPredictionResponse,
    TrendBucket,
)

app = FastAPI(title="Physiq ML Service", version=MODEL_VERSION)
ADMIN_TOKEN = os.getenv("ML_ADMIN_TOKEN")

_residual_model = None
_athlete_model = None
_trend_models = None


@app.on_event("startup")
def startup_models() -> None:
    global _residual_model, _athlete_model, _trend_models
    _residual_model, _athlete_model, _trend_models = load_models()


@app.get("/health")
def health() -> dict:
    return {"status": "healthy", "model_version": MODEL_VERSION}


@app.post("/api/v1/predict/bodyfat", response_model=BodyFatPredictionResponse)
def predict_bodyfat(payload: BodyFatPredictionRequest) -> BodyFatPredictionResponse:
    try:
        navy_bf = us_navy_body_fat_percent(
            gender=payload.gender,
            height_cm=payload.height_cm,
            neck_cm=payload.neck_cm,
            waist_cm=payload.waist_cm,
            hip_cm=payload.hip_cm,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    athlete_label, athlete_prob = athletic_type(
        athlete_model=_athlete_model,
        muscle_mass_percent=payload.muscle_mass_percent,
        activity_level=payload.activity_level,
        age=payload.age,
    )

    residual = residual_correction(
        residual_model=_residual_model,
        age=payload.age,
        gender=payload.gender,
        weight_kg=payload.weight_kg,
        muscle_mass_percent=payload.muscle_mass_percent,
        athlete_type_label=athlete_label,
    )

    corrected = float(np.clip(navy_bf + residual, 3.0, 55.0))

    composition, mass_err = composition_with_mass_conservation(
        weight_kg=payload.weight_kg,
        body_fat_percent=corrected,
        muscle_mass_percent=payload.muscle_mass_percent,
        water_percent=payload.water_percent,
        bone_mass_kg=payload.bone_mass_kg,
    )

    confidence = float(np.clip(0.55 + (athlete_prob if athlete_label == "athlete" else (1 - athlete_prob)) * 0.3, 0.45, 0.95))

    return BodyFatPredictionResponse(
        body_fat_navy_percent=round(navy_bf, 2),
        body_fat_ml_corrected_percent=round(corrected, 2),
        residual_adjustment_percent=round(residual, 2),
        athlete_type=athlete_label,
        confidence_score=round(confidence, 3),
        composition=composition,
        mass_conservation_error_kg=mass_err,
        model_version=MODEL_VERSION,
    )


def _slope(series: list[float]) -> float:
    if len(series) < 2:
        return 0.0
    x = np.arange(len(series), dtype=float)
    y = np.array(series, dtype=float)
    slope, _intercept = np.polyfit(x, y, 1)
    return float(slope)


@app.post("/api/v1/admin/retrain")
def retrain_models(x_admin_token: str | None = Header(default=None)) -> dict:
    if ADMIN_TOKEN and x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")

    ensure_models()
    startup_models()
    return {"status": "ok", "message": "Models retrained", "model_version": MODEL_VERSION}


@app.post("/api/v1/predict/trend", response_model=TrendPredictionResponse)
def predict_trend(payload: TrendPredictionRequest) -> TrendPredictionResponse:
    history = sorted(payload.history, key=lambda h: h.date)

    weight = [h.weight_kg for h in history]
    bf = [h.body_fat_percent for h in history if h.body_fat_percent is not None]
    muscle = [h.muscle_mass_percent for h in history if h.muscle_mass_percent is not None]

    slope_weight = _slope(weight)
    slope_bf = _slope(bf)
    slope_muscle = _slope(muscle)

    momentum = (weight[-1] - weight[max(0, len(weight) - 4)]) / max(1, min(3, len(weight) - 1))
    deltas = [abs(weight[i] - weight[i - 1]) for i in range(1, len(weight))]
    consistency = 1.0 / (1.0 + (float(np.std(deltas)) if deltas else 0.0))

    X = np.array([[slope_weight, slope_bf, slope_muscle, momentum, consistency]])

    last = history[-1]
    horizons = [7, 30, 90]
    results: list[TrendBucket] = []

    for d in horizons:
        w_delta = float(_trend_models[f"weight_{d}"].predict(X)[0])
        bf_delta = float(_trend_models[f"bf_{d}"].predict(X)[0]) if bf else None
        mm_delta = float(_trend_models[f"muscle_{d}"].predict(X)[0]) if muscle else None

        max_w_delta = 0.15 * d
        max_bf_delta = 0.08 * d
        max_mm_delta = 0.06 * d

        w_delta = float(np.clip(w_delta, -max_w_delta, max_w_delta))
        if bf_delta is not None:
            bf_delta = float(np.clip(bf_delta, -max_bf_delta, max_bf_delta))
        if mm_delta is not None:
            mm_delta = float(np.clip(mm_delta, -max_mm_delta, max_mm_delta))

        pred_weight = float(np.clip(last.weight_kg + w_delta, 30.0, 250.0))
        pred_bf = float(np.clip((last.body_fat_percent or 0.0) + bf_delta, 3.0, 55.0)) if bf_delta is not None and last.body_fat_percent is not None else None
        pred_mm = float(np.clip((last.muscle_mass_percent or 0.0) + mm_delta, 10.0, 70.0)) if mm_delta is not None and last.muscle_mass_percent is not None else None

        results.append(
            TrendBucket(
                day=d,
                predicted_weight_kg=round(pred_weight, 2),
                predicted_body_fat_percent=round(pred_bf, 2) if pred_bf is not None else None,
                predicted_muscle_mass_percent=round(pred_mm, 2) if pred_mm is not None else None,
            )
        )

    confidence = float(np.clip(0.4 + consistency * 0.4 + min(len(history), 20) / 100.0, 0.35, 0.92))

    return TrendPredictionResponse(
        horizon_days=horizons,
        predictions=results,
        confidence_score=round(confidence, 3),
        assumptions=[
            "Hybrid slope plus ML residual trend model",
            "Recent trajectory persists absent major interventions",
            "Synthetic baseline model pending production retraining",
        ],
        model_version=MODEL_VERSION,
    )
