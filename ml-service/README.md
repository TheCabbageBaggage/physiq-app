# Physiq v2 ML Service

Standalone FastAPI microservice for body-fat and trend prediction.

## Run

```bash
cd /home/ubuntu/healthhub-v2/ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/train_models.py
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Endpoints

- `GET /health`
- `POST /api/v1/predict/bodyfat`
- `POST /api/v1/predict/trend`
- `POST /api/v1/admin/retrain` (optional token via `ML_ADMIN_TOKEN`)

## Example bodyfat request

```json
{
  "gender": "male",
  "age": 34,
  "height_cm": 180,
  "neck_cm": 39,
  "waist_cm": 89,
  "weight_kg": 81.5,
  "muscle_mass_percent": 42.0,
  "activity_level": "active"
}
```

## Optional systemd service

Create `/etc/systemd/system/physiq-ml.service`:

```ini
[Unit]
Description=Physiq ML Microservice
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/healthhub-v2/ml-service
Environment=ML_SERVICE_URL=http://127.0.0.1:8001
ExecStart=/home/ubuntu/healthhub-v2/ml-service/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now physiq-ml
sudo systemctl status physiq-ml
```
