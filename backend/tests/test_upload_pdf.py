from fastapi.testclient import TestClient

from app.main import app
from app import auth
from app.models import User


class DummyUser(User):
    pass


def _fake_user():
    u = DummyUser()
    u.id = 1
    u.email = "test@example.com"
    u.full_name = "Test User"
    return u


def test_upload_pdf_rejects_non_pdf():
    app.dependency_overrides[auth.get_current_active_user] = _fake_user
    client = TestClient(app)

    response = client.post(
        "/api/measurements/upload-pdf",
        files={"file": ("x.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400


def test_upload_pdf_success(monkeypatch):
    app.dependency_overrides[auth.get_current_active_user] = _fake_user

    monkeypatch.setattr("app.routers.measurements.read_pdf_text", lambda _p: "Weight 80.5 kg Body fat 19.2% Muscle mass 36.0 kg")

    class _Extraction:
        def model_dump(self):
            return {
                "weight_kg": 80.5,
                "body_fat_percent": 19.2,
                "muscle_mass_kg": 36.0,
                "waist_circumference_cm": 88.0,
                "hip_circumference_cm": 98.0,
                "chest_circumference_cm": 102.0,
                "confidence_scores": {
                    "weight_kg": 0.95,
                    "body_fat_percent": 0.91,
                    "muscle_mass_kg": 0.88,
                    "waist_circumference_cm": 0.82,
                    "hip_circumference_cm": 0.85,
                    "chest_circumference_cm": 0.79,
                },
            }

    monkeypatch.setattr("app.routers.measurements.extract_metrics_from_text", lambda _t: _Extraction())

    client = TestClient(app)
    response = client.post(
        "/api/measurements/upload-pdf",
        files={"file": ("inbody.pdf", b"%PDF-1.4\n", "application/pdf")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "pdf_extraction"
    assert payload["extracted_values"]["weight_kg"] == 80.5
    assert "chest_circumference_cm" in payload["low_confidence_fields"]
