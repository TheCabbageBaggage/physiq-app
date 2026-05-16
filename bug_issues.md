# Bug Issues and Test Results (2026-05-16)

## Test Scope
- Docker build and runtime for backend, frontend, ml-service
- API health, ML health, and landing page
- Calculator behavior with ML available/unavailable
- Waitlist insert and anti-abuse behavior
- Auth register/login/me flow
- Security hardening checks for secret handling, CORS config, and CI scans

## Test Results Summary
- Backend health: `200`
- ML health: `200`
- Landing page (`/healthhub` on port 3001): `200`
- Calculator (ML available): `200`, source=`ml`
- Calculator (ML unavailable): `200`, source=`navy_only`
- Waitlist create: `201`
- Waitlist check: `200`, exists=`true`
- Rate limit burst (6 rapid submissions): `201 201 201 201 429 429`
- Register: `200`
- Login (form-encoded): `200`
- Auth `/me`: `200`

## Bug Tracker

### BUG-001: Weak/Default backend secret could be used in deployment
- Severity: Critical
- Status: `COMPLETED`
- Reproduction:
1. Start backend with default or weak `SECRET_KEY`.
2. Tokens are signed with insecure material.
- Fix implemented:
1. Enforced strong secret validation at app boot (`>=32 chars`, rejects weak markers).
2. Removed insecure default from compose (`SECRET_KEY` must be provided).
- Files:
- `backend/app/security.py`
- `backend/app/auth.py`
- `docker-compose.yml`

### BUG-002: In-memory rate limiting was not shared across instances
- Severity: High
- Status: `COMPLETED`
- Reproduction:
1. Old implementation stored counts in process memory.
2. Multi-instance deployments bypass limits by distributing traffic.
- Fix implemented:
1. Added DB-backed `rate_limit_events` table.
2. Implemented shared waitlist limiter using DB queries + rolling window cleanup.
- Files:
- `backend/app/models.py`
- `backend/app/main.py`
- `backend/app/routers/opportunities.py`

### BUG-003: Missing dedicated security scanning workflow in CI
- Severity: Medium
- Status: `COMPLETED`
- Reproduction:
1. CI had deployment smoke tests only.
2. No SAST/dependency scan gate.
- Fix implemented:
1. Added security workflow with Bandit, pip-audit, and npm audit.
- Files:
- `.github/workflows/security-scans.yml`

### BUG-004: Backend crash loop when `SECRET_KEY` unset/weak
- Severity: High
- Status: `COMPLETED`
- Reproduction:
1. Start compose without `SECRET_KEY`.
2. Backend restarts with runtime error.
- Fix implemented:
1. Added explicit `.env` runtime secret for local run.
2. Kept fail-fast behavior (intentional secure default).
- Files:
- `.env` (runtime/local)
- `backend/app/security.py`
- `docker-compose.yml`

### BUG-005: Frontend container port 3000 conflict with another local container
- Severity: Low
- Status: `OPEN (environmental)`
- Reproduction:
1. Another container already binds host port `3000`.
2. `docker compose up` fails for frontend with bind error.
- Current mitigation:
1. Frontend started separately on host port `3001`.
- Recommended follow-up:
1. Add optional compose override for alternate frontend host port.

## Retest Notes
- Retested all core flows after fixes.
- Security behavior is now fail-fast on unsafe startup config.
- Waitlist abuse protection is enforced via shared DB limiter.
