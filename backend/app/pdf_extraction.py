import json
import os
import re
from typing import Any

from PyPDF2 import PdfReader
from pydantic import BaseModel, Field


FIELDS = [
    "weight_kg",
    "body_fat_percent",
    "muscle_mass_kg",
    "waist_circumference_cm",
    "hip_circumference_cm",
    "chest_circumference_cm",
]

RANGES = {
    "weight_kg": (30, 200),
    "body_fat_percent": (3, 50),
    "muscle_mass_kg": (10, 100),
    "waist_circumference_cm": (50, 150),
    "hip_circumference_cm": (60, 150),
    "chest_circumference_cm": (70, 150),
}


class ExtractedBodyMetrics(BaseModel):
    weight_kg: float | None = None
    body_fat_percent: float | None = None
    muscle_mass_kg: float | None = None
    waist_circumference_cm: float | None = None
    hip_circumference_cm: float | None = None
    chest_circumference_cm: float | None = None
    confidence_scores: dict[str, float] = Field(default_factory=dict)


PROMPT = """
You extract structured metrics from IBA/InBody report text.
Return ONLY JSON with this shape:
{
  "weight_kg": number|null,
  "body_fat_percent": number|null,
  "muscle_mass_kg": number|null,
  "waist_circumference_cm": number|null,
  "hip_circumference_cm": number|null,
  "chest_circumference_cm": number|null,
  "confidence_scores": {
    "weight_kg": 0.0-1.0,
    "body_fat_percent": 0.0-1.0,
    "muscle_mass_kg": 0.0-1.0,
    "waist_circumference_cm": 0.0-1.0,
    "hip_circumference_cm": 0.0-1.0,
    "chest_circumference_cm": 0.0-1.0
  }
}
If unknown, return null and confidence <= 0.4
""".strip()


def read_pdf_text(file_path: str) -> str:
    reader = PdfReader(file_path)
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages)


def _regex_extract(text: str) -> dict[str, Any]:
    patterns = {
        "weight_kg": [r"(?:weight|gewicht)\s*[:=]?\s*(\d{2,3}(?:[\.,]\d)?)\s*kg"],
        "body_fat_percent": [r"(?:body\s*fat|körperfett|koerperfett)\s*[:=]?\s*(\d{1,2}(?:[\.,]\d)?)\s*%"],
        "muscle_mass_kg": [r"(?:muscle\s*mass|muskelmasse|skeletal\s*muscle\s*mass)\s*[:=]?\s*(\d{1,3}(?:[\.,]\d)?)\s*kg"],
        "waist_circumference_cm": [r"(?:waist|taille|bauchumfang)\s*[:=]?\s*(\d{2,3}(?:[\.,]\d)?)\s*cm"],
        "hip_circumference_cm": [r"(?:hip|hüfte|huefte|hüftumfang|hueftumfang)\s*[:=]?\s*(\d{2,3}(?:[\.,]\d)?)\s*cm"],
        "chest_circumference_cm": [r"(?:chest|brust|brustumfang)\s*[:=]?\s*(\d{2,3}(?:[\.,]\d)?)\s*cm"],
    }

    out: dict[str, Any] = {}
    conf: dict[str, float] = {}
    lower = text.lower()
    for field, p_list in patterns.items():
        value = None
        for p in p_list:
            m = re.search(p, lower, re.IGNORECASE)
            if m:
                value = float(m.group(1).replace(",", "."))
                break
        out[field] = value
        conf[field] = 0.65 if value is not None else 0.2

    out["confidence_scores"] = conf
    return out


def extract_metrics_from_text(text: str) -> ExtractedBodyMetrics:
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(model="gpt-4o", temperature=0, api_key=api_key)
            raw = llm.invoke([
                {"role": "system", "content": PROMPT},
                {"role": "user", "content": text[:14000]},
            ]).content
            if isinstance(raw, list):
                raw = "".join([x.get("text", "") if isinstance(x, dict) else str(x) for x in raw])
            payload = json.loads(raw)
            return ExtractedBodyMetrics(**payload)
        except Exception:
            pass

    return ExtractedBodyMetrics(**_regex_extract(text))


def validate_and_normalize(payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, list[str]]]:
    warnings: dict[str, list[str]] = {k: [] for k in FIELDS}

    for field in FIELDS:
        value = payload.get(field)
        if value is None:
            continue
        payload[field] = round(float(value), 2)
        lo, hi = RANGES[field]
        if payload[field] < lo or payload[field] > hi:
            warnings[field].append(f"Value {payload[field]} outside plausible range {lo}-{hi}")

    return payload, warnings


def detect_anomalies(current: dict[str, Any], previous: dict[str, Any] | None) -> list[str]:
    if not previous:
        return []

    thresholds = {
        "weight_kg": 5.0,
        "body_fat_percent": 5.0,
        "muscle_mass_kg": 4.0,
        "waist_circumference_cm": 8.0,
        "hip_circumference_cm": 8.0,
        "chest_circumference_cm": 8.0,
    }
    anomalies: list[str] = []
    for k, threshold in thresholds.items():
        a, b = current.get(k), previous.get(k)
        if a is None or b is None:
            continue
        delta = abs(float(a) - float(b))
        if delta > threshold:
            anomalies.append(f"{k} changed by {delta:.2f} (threshold {threshold})")
    return anomalies
