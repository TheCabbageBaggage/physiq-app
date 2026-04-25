from __future__ import annotations

import json
import os
import time
from typing import Any
from urllib import request, error

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://127.0.0.1:8001")
ML_TIMEOUT_SECONDS = float(os.getenv("ML_TIMEOUT_SECONDS", "2.0"))
ML_CACHE_TTL_SECONDS = int(os.getenv("ML_CACHE_TTL_SECONDS", "120"))

_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        f"{ML_SERVICE_URL}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=ML_TIMEOUT_SECONDS) as resp:
        content = resp.read().decode("utf-8")
        return json.loads(content)


def _cache_key(path: str, payload: dict[str, Any]) -> str:
    return f"{path}:{json.dumps(payload, sort_keys=True, default=str)}"


def cached_ml_post(path: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    key = _cache_key(path, payload)
    now = time.time()

    if key in _cache:
        ts, value = _cache[key]
        if (now - ts) <= ML_CACHE_TTL_SECONDS:
            return value

    try:
        value = _post_json(path, payload)
        _cache[key] = (now, value)
        return value
    except (error.URLError, error.HTTPError, TimeoutError, ValueError):
        return None
