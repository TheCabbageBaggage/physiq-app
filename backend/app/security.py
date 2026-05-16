from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any


def get_security_logger() -> logging.Logger:
    logger = logging.getLogger("physiq.security")
    if logger.handlers:
        return logger
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger


def log_security_event(event: str, **fields: Any) -> None:
    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }
    get_security_logger().info(json.dumps(payload, default=str))


def _is_weak_secret(secret: str) -> bool:
    if len(secret) < 32:
        return True
    lowered = secret.lower()
    weak_markers = [
        "secret",
        "changeme",
        "password",
        "default",
        "your-secret-key",
    ]
    return any(marker in lowered for marker in weak_markers)


def validate_secret_key_or_raise() -> str:
    secret = os.getenv("SECRET_KEY", "").strip()
    if not secret:
        raise RuntimeError("SECRET_KEY must be set")
    if _is_weak_secret(secret):
        raise RuntimeError("SECRET_KEY is too weak; use >=32 random characters")
    return secret


def parse_allowed_origins(app_env: str) -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    if not raw:
        raise RuntimeError("ALLOWED_ORIGINS must be set explicitly")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if not origins:
        raise RuntimeError("ALLOWED_ORIGINS has no valid values")
    if "*" in origins:
        raise RuntimeError("Wildcard CORS origin is not allowed")
    if app_env.lower() == "production":
        invalid = [o for o in origins if not o.startswith("https://")]
        if invalid:
            raise RuntimeError(f"Production CORS origins must be HTTPS only: {invalid}")
    return origins

