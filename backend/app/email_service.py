"""
Email Service — AgentMail Integration for Physiq

Handles sending transactional and bulk emails via AgentMail API.
Uses AGENTMAIL_API_KEY environment variable for authentication.
"""

import os
import json
import time
import logging
from typing import Optional
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

logger = logging.getLogger(__name__)

AGENTMAIL_API_BASE = "https://api.agentmail.to/v1"
AGENTMAIL_API_KEY = os.getenv("AGENTMAIL_API_KEY", "")
DEFAULT_FROM_EMAIL = "clowie_claw@agentmail.to"
DEFAULT_FROM_NAME = "PhysIQ Team"

BATCH_SIZE = 10
BATCH_DELAY_SECONDS = 6


def _agentmail_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {AGENTMAIL_API_KEY}",
        "Content-Type": "application/json",
    }


def _make_request(method: str, path: str, body: Optional[dict] = None) -> dict:
    """Make an HTTP request to the AgentMail API."""
    url = f"{AGENTMAIL_API_BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = Request(url, data=data, headers=_agentmail_headers(), method=method)

    try:
        with urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        logger.error(f"AgentMail HTTP {e.code}: {err_body}")
        raise RuntimeError(f"AgentMail API error {e.code}: {err_body}")
    except URLError as e:
        logger.error(f"AgentMail connection error: {e.reason}")
        raise RuntimeError(f"AgentMail connection error: {e.reason}")


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    to_name: Optional[str] = None,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
) -> dict:
    """
    Send a single email via AgentMail.

    Args:
        to_email: Recipient email address
        subject: Email subject line
        html_body: HTML content of the email
        to_name: Optional recipient display name
        from_email: Optional sender email (default: clowie_claw@agentmail.to)
        from_name: Optional sender display name (default: PhysIQ Team)

    Returns:
        AgentMail API response dict

    Raises:
        RuntimeError: If sending fails
    """
    if not AGENTMAIL_API_KEY:
        raise RuntimeError("AGENTMAIL_API_KEY is not configured")

    payload = {
        "to": [{"email": to_email, "name": to_name or ""}],
        "from": {"email": from_email or DEFAULT_FROM_EMAIL, "name": from_name or DEFAULT_FROM_NAME},
        "subject": subject,
        "html": html_body,
    }

    return _make_request("POST", "/email", payload)


def send_bulk(
    recipients: list[dict],
    subject: str,
    html_body: str,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
    on_progress: Optional[callable] = None,
) -> dict:
    """
    Send bulk emails with rate limiting.

    Processes recipients in batches of BATCH_SIZE with BATCH_DELAY_SECONDS
    pause between batches to respect rate limits.

    Args:
        recipients: List of dicts with 'email' and optional 'name' keys
        subject: Email subject line
        html_body: HTML content (may contain {{name}} template variable)
        from_email: Optional sender email override
        from_name: Optional sender display name override
        on_progress: Optional callback(batch_index, total_batches, batch_results)

    Returns:
        dict with 'total', 'sent', 'failed', and 'results' keys
    """
    if not AGENTMAIL_API_KEY:
        raise RuntimeError("AGENTMAIL_API_KEY is not configured")

    all_results = []
    total = len(recipients)
    sent = 0
    failed = 0

    # Process in batches
    for i in range(0, total, BATCH_SIZE):
        batch = recipients[i : i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

        batch_results = []
        for recipient in batch:
            personal_body = html_body.replace("{{name}}", recipient.get("name", ""))
            try:
                result = send_email(
                    to_email=recipient["email"],
                    to_name=recipient.get("name"),
                    subject=subject,
                    html_body=personal_body,
                    from_email=from_email,
                    from_name=from_name,
                )
                batch_results.append({"email": recipient["email"], "status": "sent", "result": result})
                sent += 1
            except Exception as e:
                logger.warning(f"Failed to send to {recipient['email']}: {e}")
                batch_results.append({"email": recipient["email"], "status": "failed", "error": str(e)})
                failed += 1

        all_results.extend(batch_results)

        if on_progress:
            on_progress(batch_num, total_batches, batch_results)

        # Rate limit: pause between batches
        if i + BATCH_SIZE < total:
            time.sleep(BATCH_DELAY_SECONDS)

    return {
        "total": total,
        "sent": sent,
        "failed": failed,
        "results": all_results,
    }


def get_account_info() -> dict:
    """Get AgentMail account information."""
    if not AGENTMAIL_API_KEY:
        return {"configured": False, "message": "AGENTMAIL_API_KEY not configured"}
    try:
        return _make_request("GET", "/account")
    except Exception as e:
        return {"configured": False, "error": str(e)}
