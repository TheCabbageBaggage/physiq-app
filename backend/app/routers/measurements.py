"""
Measurements Router
"""

import csv
import io
import json
import os
import tempfile
from datetime import date, timedelta
from typing import Any, List
import statistics
import time

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .. import schemas, auth
from ..database import get_db
from ..models import Measurement, User, PdfExtraction
from ..ml_client import cached_ml_post
from ..subscription import require_subscription
from ..pdf_extraction import (
    extract_metrics_from_text,
    read_pdf_text,
    validate_and_normalize,
    detect_anomalies,
)

router = APIRouter()

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

METRIC_FIELD_MAP = {
    "weight": "weight_kg",
    "weight_kg": "weight_kg",
    "body_fat": "body_fat_percent",
    "body_fat_percent": "body_fat_percent",
    "muscle_mass": "muscle_mass_percent",
    "muscle_mass_percent": "muscle_mass_percent",
    "stomach_circumference": "stomach_circumference_cm",
    "stomach_circumference_cm": "stomach_circumference_cm",
    "skeletal_muscle_mass": "skeletal_muscle_mass_kg",
    "skeletal_muscle_mass_kg": "skeletal_muscle_mass_kg",
    "bmi": "bmi",
    "visceral_fat": "visceral_fat_level",
    "visceral_fat_level": "visceral_fat_level",
    "bmr": "bmr_kcal",
    "bmr_kcal": "bmr_kcal",
}

PREDICTION_CACHE_TTL_SECONDS = int(os.getenv("PREDICTION_CACHE_TTL_SECONDS", "120"))
_prediction_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _prediction_cache_key(user_id: int, metric: str, days_ahead: int) -> str:
    return f"{user_id}:{metric}:{days_ahead}"


def _prediction_get_cached(user_id: int, metric: str, days_ahead: int) -> dict[str, Any] | None:
    key = _prediction_cache_key(user_id, metric, days_ahead)
    cached = _prediction_cache.get(key)
    if not cached:
        return None

    timestamp, payload = cached
    if (time.time() - timestamp) > PREDICTION_CACHE_TTL_SECONDS:
        _prediction_cache.pop(key, None)
        return None
    return payload


def _prediction_set_cached(user_id: int, metric: str, days_ahead: int, payload: dict[str, Any]) -> None:
    key = _prediction_cache_key(user_id, metric, days_ahead)
    _prediction_cache[key] = (time.time(), payload)


@router.post("/upload-pdf", response_model=schemas.PdfExtractionResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    if file.content_type and file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Invalid file content type")

    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "tmp"))
    os.makedirs(upload_dir, exist_ok=True)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir=upload_dir)
    try:
        tmp.write(data)
        tmp.flush()
        tmp.close()

        pdf_text = read_pdf_text(tmp.name)
        extracted = extract_metrics_from_text(pdf_text)

        payload = extracted.model_dump()
        confidence_scores = payload.pop("confidence_scores", {})
        normalized, plausibility = validate_and_normalize(payload)

        previous = (
            db.query(Measurement)
            .filter(Measurement.user_id == current_user.id)
            .order_by(desc(Measurement.date))
            .first()
        )

        previous_values = None
        if previous:
            previous_values = {
                "weight_kg": previous.weight_kg,
                "body_fat_percent": previous.body_fat_percent or previous.body_fat_percentage,
                "muscle_mass_percent": previous.muscle_mass_percent,
                "stomach_circumference_cm": previous.stomach_circumference_cm or previous.waist_circumference_cm,
                "hip_circumference_cm": previous.hip_circumference_cm,
                "chest_circumference_cm": previous.chest_circumference_cm,
            }
        anomaly_warnings = detect_anomalies(normalized, previous_values)

        low_confidence_fields = [
            k for k, v in confidence_scores.items() if v < 0.8
        ]

        extraction = PdfExtraction(
            user_id=current_user.id,
            file_path=tmp.name,
            raw_extracted_data=json.dumps(normalized),
            confidence_scores=json.dumps(confidence_scores),
        )
        db.add(extraction)
        db.commit()
        db.refresh(extraction)

        return {
            "pdf_extraction_id": extraction.id,
            "source": "pdf_extraction",
            "extracted_values": normalized,
            "confidence_scores": confidence_scores,
            "low_confidence_fields": low_confidence_fields,
            "plausibility_warnings": plausibility,
            "anomaly_warnings": anomaly_warnings,
            "raw_extracted_data": normalized,
        }
    except HTTPException:
        if os.path.exists(tmp.name):
            os.remove(tmp.name)
        raise
    except Exception as exc:
        if os.path.exists(tmp.name):
            os.remove(tmp.name)
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {exc}")


@router.get("/", response_model=List[schemas.MeasurementResponse])
def list_measurements(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    measurements = db.query(Measurement)\
        .filter(Measurement.user_id == current_user.id)\
        .order_by(desc(Measurement.date))\
        .offset(skip)\
        .limit(limit)\
        .all()

    return measurements


@router.get("/stats", response_model=schemas.StatsResponse)
def get_stats(
    current_user: User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    trend_threshold = 0.1
    trend_fields = {
        "weight": lambda m: m.weight_kg,
        "body_fat": lambda m: m.body_fat_percent if m.body_fat_percent is not None else m.body_fat_percentage,
        "muscle_mass": lambda m: m.muscle_mass_percent,
        "stomach_circumference": lambda m: m.stomach_circumference_cm if m.stomach_circumference_cm is not None else m.waist_circumference_cm,
        "skeletal_muscle_mass": lambda m: m.skeletal_muscle_mass_kg,
        "bmi": lambda m: m.bmi,
        "visceral_fat": lambda m: m.visceral_fat_level,
        "bmr": lambda m: m.bmr_kcal,
    }

    def build_trend(current_value, previous_value):
        if current_value is None or previous_value is None:
            return {"direction": "stable", "change": 0.0, "change_percent": 0.0}

        change = float(current_value) - float(previous_value)
        if abs(change) < trend_threshold:
            direction = "stable"
        else:
            direction = "up" if change > 0 else "down"

        change_percent = 0.0
        if float(previous_value) != 0:
            change_percent = (change / float(previous_value)) * 100

        return {
            "direction": direction,
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
        }

    measurements = db.query(Measurement)\
        .filter(Measurement.user_id == current_user.id)\
        .order_by(Measurement.date.asc())\
        .all()

    total = len(measurements)
    if total == 0:
        empty_trends = {
            key: {"direction": "stable", "change": 0.0, "change_percent": 0.0}
            for key in trend_fields
        }
        return {
            "total_measurements": 0,
            "average_weight_kg": 0.0,
            "average_body_fat_percent": 0.0,
            "average_muscle_mass_percent": 0.0,
            "average_stomach_circumference_cm": 0.0,
            "average_skeletal_muscle_mass_kg": 0.0,
            "average_bmi": 0.0,
            "average_visceral_fat_level": 0.0,
            "average_bmr_kcal": 0.0,
            "weight_trend": "stable",
            "body_fat_percent_trend": "stable",
            "muscle_mass_percent_trend": "stable",
            "trends": empty_trends,
        }

    avg_weight = sum((m.weight_kg or 0) for m in measurements) / total
    avg_body_fat = sum((m.body_fat_percent or m.body_fat_percentage or 0) for m in measurements) / total
    avg_muscle = sum((m.muscle_mass_percent or 0) for m in measurements) / total
    avg_stomach = sum((m.stomach_circumference_cm or m.waist_circumference_cm or 0) for m in measurements) / total
    avg_skeletal = sum((m.skeletal_muscle_mass_kg or 0) for m in measurements) / total
    avg_bmi = sum((m.bmi or 0) for m in measurements) / total
    avg_visceral = sum((m.visceral_fat_level or 0) for m in measurements) / total
    avg_bmr = sum((m.bmr_kcal or 0) for m in measurements) / total

    def trend(first: float, last: float) -> str:
        if abs(last - first) < 0.1:
            return "stable"
        return "increasing" if last > first else "decreasing"

    first = measurements[0]
    last = measurements[-1]
    previous = measurements[-2] if total > 1 else None

    trends = {}
    for key, getter in trend_fields.items():
        current_value = getter(last)
        previous_value = getter(previous) if previous is not None else None
        trends[key] = build_trend(current_value, previous_value)

    return {
        "total_measurements": total,
        "average_weight_kg": round(avg_weight, 2),
        "average_body_fat_percent": round(avg_body_fat, 2),
        "average_muscle_mass_percent": round(avg_muscle, 2),
        "average_stomach_circumference_cm": round(avg_stomach, 2),
        "average_skeletal_muscle_mass_kg": round(avg_skeletal, 2),
        "average_bmi": round(avg_bmi, 2),
        "average_visceral_fat_level": round(avg_visceral, 2),
        "average_bmr_kcal": round(avg_bmr, 2),
        "weight_trend": trend(first.weight_kg or 0, last.weight_kg or 0),
        "body_fat_percent_trend": trend(first.body_fat_percent or first.body_fat_percentage or 0, last.body_fat_percent or last.body_fat_percentage or 0),
        "muscle_mass_percent_trend": trend(first.muscle_mass_percent or 0, last.muscle_mass_percent or 0),
        "trends": trends,
    }


@router.get("/predictions", response_model=schemas.PredictionResponse)
def get_predictions(
    metric: str = Query("weight_kg", description="Metric alias or field name"),
    days_ahead: int = Query(30, description="Prediction horizon in days (7, 30, 90)"),
    current_user: User = Depends(require_subscription("pro")),
    db: Session = Depends(get_db)
):
    if days_ahead not in {7, 30, 90}:
        raise HTTPException(status_code=400, detail="days_ahead must be one of: 7, 30, 90")

    normalized_metric = metric.strip().lower()
    field_name = METRIC_FIELD_MAP.get(normalized_metric)
    if not field_name:
        raise HTTPException(status_code=400, detail=f"Unsupported metric '{metric}'")

    cached_payload = _prediction_get_cached(current_user.id, field_name, days_ahead)
    if cached_payload is not None:
        return cached_payload

    measurements = (
        db.query(Measurement)
        .filter(Measurement.user_id == current_user.id)
        .order_by(Measurement.date.asc())
        .all()
    )

    def extract_metric_value(m: Measurement, metric_field: str) -> float | None:
        value = getattr(m, metric_field, None)
        if metric_field == "body_fat_percent" and value is None:
            value = m.body_fat_percentage
        if metric_field == "stomach_circumference_cm" and value is None:
            value = m.waist_circumference_cm
        return float(value) if value is not None else None

    historical_points: list[dict[str, Any]] = []
    history_payload: list[dict[str, Any]] = []
    for m in measurements[-120:]:
        metric_value = extract_metric_value(m, field_name)
        if metric_value is None:
            continue
        historical_points.append(
            {
                "date": m.date.isoformat(),
                "value": metric_value,
                "point_type": "historical",
                "confidence_low": None,
                "confidence_high": None,
            }
        )
        history_payload.append(
            {
                "date": m.date.isoformat(),
                "weight_kg": float(m.weight_kg),
                "body_fat_percent": float(m.body_fat_percent if m.body_fat_percent is not None else m.body_fat_percentage) if (m.body_fat_percent is not None or m.body_fat_percentage is not None) else None,
                "muscle_mass_percent": float(m.muscle_mass_percent) if m.muscle_mass_percent is not None else None,
            }
        )

    if len(historical_points) < 3:
        result = {
            "metric": field_name,
            "days_ahead": days_ahead,
            "current_value": historical_points[-1]["value"] if historical_points else 0.0,
            "predicted_value": historical_points[-1]["value"] if historical_points else 0.0,
            "confidence_interval": {
                "low": historical_points[-1]["value"] if historical_points else 0.0,
                "high": historical_points[-1]["value"] if historical_points else 0.0,
            },
            "trend": "stable",
            "confidence_score": 0.2,
            "assumptions": ["Need at least 3 measurements for trend prediction"],
            "source": "fallback",
            "points": historical_points,
        }
        _prediction_set_cached(current_user.id, field_name, days_ahead, result)
        return result

    current_value = historical_points[-1]["value"]
    latest_date = date.fromisoformat(historical_points[-1]["date"])

    ml_response = cached_ml_post("/api/v1/predict/trend", {"history": history_payload})
    predicted_value: float | None = None
    confidence_score = 0.35
    assumptions: list[str] = ["Fallback linear projection used"]
    source = "fallback"

    if ml_response and ml_response.get("predictions"):
        pred_bucket = next((p for p in ml_response["predictions"] if p.get("day") == days_ahead), None)
        if pred_bucket:
            metric_prediction_map = {
                "weight_kg": "predicted_weight_kg",
                "body_fat_percent": "predicted_body_fat_percent",
                "muscle_mass_percent": "predicted_muscle_mass_percent",
            }
            pred_key = metric_prediction_map.get(field_name)
            if pred_key and pred_bucket.get(pred_key) is not None:
                predicted_value = float(pred_bucket[pred_key])
                confidence_score = float(ml_response.get("confidence_score", 0.6))
                assumptions = list(ml_response.get("assumptions", ["ML trend prediction"]))
                source = "ml"

    if predicted_value is None:
        recent_points = historical_points[-8:] if len(historical_points) >= 8 else historical_points

        def avg_daily_delta(points: list[dict[str, Any]]) -> float:
            if len(points) < 2:
                return 0.0
            deltas_per_day: list[float] = []
            for i in range(1, len(points)):
                prev = points[i - 1]
                curr = points[i]
                prev_date = date.fromisoformat(prev["date"])
                curr_date = date.fromisoformat(curr["date"])
                day_gap = max(1, (curr_date - prev_date).days)
                deltas_per_day.append((curr["value"] - prev["value"]) / day_gap)
            return float(statistics.mean(deltas_per_day)) if deltas_per_day else 0.0

        daily_delta = avg_daily_delta(recent_points)
        predicted_value = round(current_value + daily_delta * days_ahead, 2)
        assumptions = [
            "Fallback linear projection used",
            "ML service unavailable/unsupported metric or returned invalid response",
        ]

    sigma = max(abs(predicted_value - current_value) * 0.25, abs(current_value) * 0.01, 0.1)
    confidence_spread = sigma * (1.0 - min(max(confidence_score, 0.0), 1.0) + 0.6)
    low = round(predicted_value - confidence_spread, 2)
    high = round(predicted_value + confidence_spread, 2)

    change = predicted_value - current_value
    threshold = max(abs(current_value) * 0.005, 0.05)
    if abs(change) <= threshold:
        trend = "stable"
    else:
        trend = "increasing" if change > 0 else "decreasing"

    prediction_point = {
        "date": (latest_date + timedelta(days=days_ahead)).isoformat(),
        "value": round(predicted_value, 2),
        "point_type": "predicted",
        "confidence_low": low,
        "confidence_high": high,
    }

    result = {
        "metric": field_name,
        "days_ahead": days_ahead,
        "current_value": round(current_value, 2),
        "predicted_value": round(predicted_value, 2),
        "confidence_interval": {"low": low, "high": high},
        "trend": trend,
        "confidence_score": round(confidence_score, 3),
        "assumptions": assumptions,
        "source": source,
        "points": historical_points + [prediction_point],
    }

    _prediction_set_cached(current_user.id, field_name, days_ahead, result)
    return result


@router.get("/recommendations", response_model=schemas.RecommendationResponse)
def get_recommendations(
    current_user: User = Depends(require_subscription("enterprise")),
    db: Session = Depends(get_db)
):
    return {
        "exercise_recommendations": ["Strength training 3x per week", "Cardio 2x per week"],
        "nutrition_recommendations": ["Increase protein intake", "Stay hydrated"],
        "recovery_recommendations": ["7-8 hours of sleep", "Active recovery days"],
        "priority_level": "medium",
        "rationale": "Based on average metrics and standard health guidelines"
    }


@router.get("/chart", response_model=schemas.ChartDataResponse)
def get_chart_data(
    metric: str = Query(..., description="Metric alias or field name"),
    days: int = Query(30, ge=0, description="7, 30, 90, or 0 for all"),
    current_user: User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    normalized_metric = metric.strip().lower()
    field_name = METRIC_FIELD_MAP.get(normalized_metric)

    if not field_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported metric '{metric}'",
        )

    query = db.query(Measurement).filter(Measurement.user_id == current_user.id)

    if days > 0:
        cutoff = date.today() - timedelta(days=days)
        query = query.filter(Measurement.date >= cutoff)

    measurements = query.order_by(Measurement.date.asc()).all()

    dates: list[str] = []
    values: list[float] = []

    for m in measurements:
        value = getattr(m, field_name, None)

        if field_name == "body_fat_percent" and value is None:
            value = m.body_fat_percentage
        elif field_name == "stomach_circumference_cm" and value is None:
            value = m.waist_circumference_cm

        if value is None:
            continue

        dates.append(m.date.isoformat())
        values.append(float(value))

    return {"dates": dates, "values": values}


@router.get("/export/csv")
def export_measurements_csv(
    current_user: User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    measurements = (
        db.query(Measurement)
        .filter(Measurement.user_id == current_user.id)
        .order_by(Measurement.date.asc())
        .all()
    )

    fieldnames = [
        "date",
        "weight_kg",
        "body_fat_percent",
        "muscle_mass_percent",
        "stomach_circumference_cm",
        "skeletal_muscle_mass_kg",
        "bmi",
        "visceral_fat_level",
        "bmr_kcal",
        "waist_cm",
        "hip_circumference_cm",
        "chest_circumference_cm",
        "source_type",
        "is_user_corrected",
        "notes",
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for m in measurements:
        writer.writerow(
            {
                "date": m.date.isoformat() if m.date else "",
                "weight_kg": m.weight_kg,
                "body_fat_percent": m.body_fat_percent if m.body_fat_percent is not None else m.body_fat_percentage,
                "muscle_mass_percent": m.muscle_mass_percent,
                "stomach_circumference_cm": m.stomach_circumference_cm if m.stomach_circumference_cm is not None else m.waist_circumference_cm,
                "skeletal_muscle_mass_kg": m.skeletal_muscle_mass_kg,
                "bmi": m.bmi,
                "visceral_fat_level": m.visceral_fat_level if m.visceral_fat_level is not None else m.visceral_fat,
                "bmr_kcal": m.bmr_kcal,
                "waist_cm": m.stomach_circumference_cm if m.stomach_circumference_cm is not None else m.waist_circumference_cm,
                "hip_circumference_cm": m.hip_circumference_cm,
                "chest_circumference_cm": m.chest_circumference_cm,
                "source_type": m.source_type if m.source_type is not None else m.source,
                "is_user_corrected": m.is_user_corrected if m.is_user_corrected is not None else False,
                "notes": m.notes if m.notes is not None else "",
            }
        )

    csv_content = output.getvalue()
    output.close()

    filename = f"measurements_{date.today().isoformat()}.csv"

    return StreamingResponse(
        iter([csv_content.encode("utf-8")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{measurement_id}", response_model=schemas.MeasurementResponse)
def get_measurement(
    measurement_id: int,
    current_user: User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    measurement = db.query(Measurement)\
        .filter(
            Measurement.id == measurement_id,
            Measurement.user_id == current_user.id
        )\
        .first()

    if not measurement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Measurement not found"
        )

    return measurement


@router.post("/", response_model=schemas.MeasurementResponse)
def create_measurement(
    measurement: schemas.MeasurementCreate,
    current_user: User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    payload = measurement.model_dump()

    if payload.get("body_fat_percent") is None and payload.get("body_fat_percentage") is not None:
        payload["body_fat_percent"] = payload["body_fat_percentage"]
    if payload.get("body_fat_percentage") is None and payload.get("body_fat_percent") is not None:
        payload["body_fat_percentage"] = payload["body_fat_percent"]
    if payload.get("stomach_circumference_cm") is None and payload.get("waist_circumference_cm") is not None:
        payload["stomach_circumference_cm"] = payload["waist_circumference_cm"]
    if payload.get("waist_circumference_cm") is None and payload.get("stomach_circumference_cm") is not None:
        payload["waist_circumference_cm"] = payload["stomach_circumference_cm"]
    if payload.get("source") is None and payload.get("source_type") is not None:
        payload["source"] = payload["source_type"]

    db_measurement = Measurement(**payload, user_id=current_user.id)

    db.add(db_measurement)
    db.commit()
    db.refresh(db_measurement)

    return db_measurement


@router.put("/{measurement_id}", response_model=schemas.MeasurementResponse)
def update_measurement(
    measurement_id: int,
    measurement_update: schemas.MeasurementUpdate,
    current_user: User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_measurement = db.query(Measurement)\
        .filter(
            Measurement.id == measurement_id,
            Measurement.user_id == current_user.id
        )\
        .first()

    if not db_measurement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Measurement not found"
        )

    update_data = measurement_update.model_dump(exclude_unset=True)
    if "body_fat_percent" in update_data and "body_fat_percentage" not in update_data:
        update_data["body_fat_percentage"] = update_data["body_fat_percent"]
    if "body_fat_percentage" in update_data and "body_fat_percent" not in update_data:
        update_data["body_fat_percent"] = update_data["body_fat_percentage"]
    if "stomach_circumference_cm" in update_data and "waist_circumference_cm" not in update_data:
        update_data["waist_circumference_cm"] = update_data["stomach_circumference_cm"]
    if "waist_circumference_cm" in update_data and "stomach_circumference_cm" not in update_data:
        update_data["stomach_circumference_cm"] = update_data["waist_circumference_cm"]
    if "source_type" in update_data and "source" not in update_data:
        update_data["source"] = update_data["source_type"]

    for field, value in update_data.items():
        setattr(db_measurement, field, value)

    db.commit()
    db.refresh(db_measurement)

    return db_measurement


@router.delete("/{measurement_id}")
def delete_measurement(
    measurement_id: int,
    current_user: User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_measurement = db.query(Measurement)\
        .filter(
            Measurement.id == measurement_id,
            Measurement.user_id == current_user.id
        )\
        .first()

    if not db_measurement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Measurement not found"
        )

    db.delete(db_measurement)
    db.commit()

    return {"message": "Measurement deleted successfully"}
