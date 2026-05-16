# PhysIQ App Specification And Assessment (2026-05-16)

## Coding Rules (Always)
1. Security first: validate all input server-side and fail closed.
2. No secrets in code or images; use environment variables and secret managers.
3. Reproducible deployment: Docker images must build and run from `main`.
4. API contracts are versioned and documented before UI integration.
5. Every feature must include automated tests (unit + integration where applicable).
6. No breaking DB schema changes without migration scripts and rollback steps.
7. Observability is required: logs, metrics, health checks, and error tracing.
8. Least privilege for database, API, and admin actions.
9. Performance budgets for core endpoints and pages are enforced in CI.
10. Accessibility and responsive behavior are required for all frontend flows.

## Executive Findings
- `Pull latest`: completed (`git pull --rebase --autostash`).
- Docker build/run from pulled branch was **not operational by default**:
  - missing `backend/Dockerfile` and `frontend/Dockerfile`
  - backend runtime missing `email-validator`
  - backend binds to `127.0.0.1` in container (`backend/run.py`), so host access to `:8000` fails.
- Landing page is available at `/healthhub` (basePath), not `/`.
- Landing calculator is **browser-local** and does **not call backend/ML API**.
- Waitlist API writes entries to SQLite table `opportunities` in `backend/healthhub.db`.
- Extended app functionality exists partially (login, measurements, charts, subscription scaffolding), but enterprise-grade ops/admin/security architecture is incomplete.

## Answers To Requested Questions
1. Is the landing page ready and operational?
- Partially.
- Render works at `http://localhost:3001/healthhub` in container run.
- `http://localhost:3001/` returns 404 by design (Next.js `basePath: /healthhub`).
- Auth links are currently malformed (`/healthhub/healthhub/login` style) due double base path composition.

2. Does the calculator work on the landing page using the API of the physiq ml model?
- No.
- Landing calculator (`frontend/components/calculator/BodyCompositionCalculator.tsx`) computes locally in JS and claims local-only processing.
- Backend `/api/calculate` exists and can call ML service, but ML service is not part of current compose stack, and tested response source is `navy_only` fallback.

3. Does the waitlist work? Where does the waitlist write entries?
- Backend waitlist endpoint works (`POST /api/opportunities`) when called internally in container.
- Entries are persisted in SQLite file `backend/healthhub.db`, table `opportunities`.
- Frontend waitlist likely misses local backend in production build because `NEXT_PUBLIC_API_URL` is not baked consistently and defaults to remote URL in `frontend/lib/api.ts`.

4. Does extended functionality exist (login, history charts, settings, payments)?
- Yes, partially.
- Present: register/login/profile/settings, measurements, charts, prediction/recommendation pages, Stripe subscription endpoints/scaffolding.
- Missing/incomplete: coherent full payment history UX, robust admin operations suite, hardened production-grade flows.

5. Does a performant state-of-the-art DB exist, connected to waitlist and conversion?
- No (not state-of-the-art for scale).
- Current DB is SQLite (single-file), acceptable for local MVP, not ideal for high concurrency/scalability.
- Waitlist-to-user conversion model exists (`opportunities.converted_to_customer_id`) and admin conversion endpoint exists.

6. Does an admin backend exist with full operational overview?
- Not fully.
- Exists: admin endpoints for opportunities and pricing/coupons/free-month grants.
- Missing: comprehensive admin UI/backend for all requested observability domains (full users overview, measurement counters dashboard, API health suite, payment ledger, DB/system health console).

7. Is architecture based on state-of-the-art scalable microservices?
- Not currently.
- Architecture is a modular monolith (FastAPI + Next.js + optional ML service), not a production microservice platform.
- Missing core production characteristics: service discovery, async messaging, distributed tracing, autoscaling-oriented data plane design.

8. Is app and DB design secure?
- Partially; significant gaps remain.
- Positives: JWT auth, ORM usage, some rate limiting, typed validation.
- Gaps: insecure defaults and deployment blockers (local bind in container, weak default secret fallback, in-memory rate limiting, SQLite for production scale, incomplete operational hardening and audit controls).

## Epic Backlog

### Epic 1: Deployment Reliability
Status: `COMPLETED`

User Story 1.1: As an operator, I can build and run the stack from `main` with one command.
- Status: `COMPLETED`
- Technical requirements:
1. Provide valid `backend/Dockerfile` and `frontend/Dockerfile`.
2. Ensure runtime dependencies include all required packages (`email-validator` for `EmailStr`).
3. CI smoke test must execute `docker compose build && docker compose up`.

User Story 1.2: As an operator, I can access backend from host through Docker port mapping.
- Status: `COMPLETED`
- Technical requirements:
1. Bind uvicorn host to `0.0.0.0` in container runtime.
2. Add automated container health probe from host network.
3. Fail CI if health endpoint unreachable from host.

### Epic 2: Landing And Acquisition Integrity
Status: `COMPLETED`

User Story 2.1: As a visitor, all landing links navigate correctly under base path.
- Status: `COMPLETED`
- Technical requirements:
1. Fix path composition to avoid duplicated `/healthhub`.
2. Add route tests for `/healthhub`, `/healthhub/login`, `/healthhub/register`.

User Story 2.2: As a visitor, waitlist submission reaches the intended environment backend.
- Status: `COMPLETED`
- Technical requirements:
1. Ensure `NEXT_PUBLIC_API_BASE` is environment-specific at build/deploy.
2. Add synthetic test that submits waitlist and validates DB insertion.
3. Expose explicit runtime diagnostics for API base in non-production.

### Epic 3: Calculator And ML Integration
Status: `COMPLETED`

User Story 3.1: As a visitor, calculator can run local-only or server-ML mode with clear labeling.
- Status: `COMPLETED`
- Technical requirements:
1. Define explicit mode switch and trust messaging in UI.
2. If server mode selected, call `/api/calculate` and show `source` from response.
3. Include ML availability indicator and fallback behavior.

User Story 3.2: As product owner, ML service is integrated in compose for deterministic environments.
- Status: `COMPLETED`
- Technical requirements:
1. Add ML service to root compose with health checks.
2. Wire `ML_SERVICE_URL` to internal Docker network.
3. Add integration tests for `source=ml` and fallback mode.

### Epic 4: User Platform Features
Status: `IN PROGRESS`

User Story 4.1: As a user, I can register/login and manage profile/settings.
- Status: `COMPLETED`
- Technical requirements:
1. JWT auth endpoints and frontend flows.
2. Profile read/update endpoints and UI.
3. Input validation and password hashing.

User Story 4.2: As a user, I can track measurements and visualize trends/history.
- Status: `COMPLETED`
- Technical requirements:
1. CRUD measurements endpoints.
2. Chart endpoints and frontend chart views.
3. Plan gating for premium features.

User Story 4.3: As a user, I can view complete payment history and invoices.
- Status: `PARTIALLY COMPLETED`
- Technical requirements:
1. Persist payment events in normalized ledger tables.
2. Add user-facing payment history and invoice list.
3. Add reconciliation tooling and audit trail.

### Epic 5: Data Architecture Modernization
Status: `NOT COMPLETED`

User Story 5.1: As platform owner, database supports high concurrency and scale.
- Status: `NOT COMPLETED`
- Technical requirements:
1. Migrate SQLite to PostgreSQL with migration tooling.
2. Add indexes for auth, measurements, waitlist, subscription events.
3. Add backup/restore and retention strategy.

User Story 5.2: As growth ops, waitlist conversion to customer is first-class workflow.
- Status: `PARTIALLY COMPLETED`
- Technical requirements:
1. Keep FK link `opportunities.converted_to_customer_id` (exists).
2. Add auto-link on successful registration by matching email.
3. Add reporting for conversion funnel.

### Epic 6: Admin And Operations Console
Status: `NOT COMPLETED`

User Story 6.1: As admin, I can view full operational dashboard.
- Status: `NOT COMPLETED`
- Technical requirements:
1. User counts and cohort summaries.
2. Measurement counters and growth trends.
3. API health and dependency status panel.
4. Payment and subscription overview.
5. Database/system health telemetry.

User Story 6.2: As admin, I can manage opportunities/pricing/coupons.
- Status: `PARTIALLY COMPLETED`
- Technical requirements:
1. Opportunities list/update/convert endpoints (exists).
2. Pricing/coupon/free-month endpoints (exists).
3. Missing: cohesive admin UI and audit trail for all actions.

### Epic 7: Security Hardening
Status: `IN PROGRESS`

User Story 7.1: As security owner, deployment uses secure defaults.
- Status: `NOT COMPLETED`
- Technical requirements:
1. Remove weak default secrets.
2. Enforce strong secret validation at boot.
3. Harden CORS and trusted origins per environment.

User Story 7.2: As security owner, platform has robust abuse protection and observability.
- Status: `NOT COMPLETED`
- Technical requirements:
1. Replace in-memory rate limiting with shared backend (Redis or API gateway).
2. Add structured security logs and alerting.
3. Add SAST/DAST + dependency scanning in CI.

## Completed In This Assessment Cycle
- Pulled latest branch changes.
- Performed repository/code architecture analysis.
- Built Docker images and ran containers.
- Identified and documented blocking runtime issues.
- Added missing container files and backend dependency required for startup.
- Validated landing rendering, calculator behavior, waitlist DB persistence path.
