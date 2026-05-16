import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from app.routers import auth, measurements, users, subscriptions, opportunities, calculate, pricing, admin_overview
from app.database import engine, Base, get_db
from app.models import User
from app import auth as auth_mod
from app.security import parse_allowed_origins, log_security_event


def run_startup_migrations() -> None:
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        if "pdf_extractions" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS pdf_extractions (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    raw_extracted_data JSON,
                    confidence_scores JSON,
                    llm_used BOOLEAN DEFAULT 0,
                    extraction_notes TEXT,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """))

        mcols = {c["name"] for c in inspector.get_columns("measurements")}
        if "stomach_circumference_cm" not in mcols:
            conn.execute(text("ALTER TABLE measurements ADD COLUMN stomach_circumference_cm FLOAT"))
        if "hip_circumference_cm" not in mcols:
            conn.execute(text("ALTER TABLE measurements ADD COLUMN hip_circumference_cm FLOAT"))
        if "chest_circumference_cm" not in mcols:
            conn.execute(text("ALTER TABLE measurements ADD COLUMN chest_circumference_cm FLOAT"))
        if "extraction_confidence" not in mcols:
            conn.execute(text("ALTER TABLE measurements ADD COLUMN extraction_confidence FLOAT"))
        if "pdf_extraction_id" not in mcols:
            conn.execute(text("ALTER TABLE measurements ADD COLUMN pdf_extraction_id INTEGER"))
        if "source_type" not in mcols:
            conn.execute(text("ALTER TABLE measurements ADD COLUMN source_type VARCHAR(50) DEFAULT manual"))

        ucols = {c["name"] for c in inspector.get_columns("users")}
        user_alters = {
            "birth_date": "DATE",
            "gender": "VARCHAR(30)",
            "phone": "VARCHAR(30)",
            "address": "VARCHAR(255)",
            "city": "VARCHAR(100)",
            "postal_code": "VARCHAR(20)",
            "country": "VARCHAR(100)",
            "profile_image_url": "VARCHAR(500)",
            "plan_type": "VARCHAR(20) DEFAULT 'free'",
            "subscription_status": "VARCHAR(20) DEFAULT 'inactive'",
            "stripe_customer_id": "VARCHAR(255)",
            "stripe_subscription_id": "VARCHAR(255)",
            "current_period_end": "DATETIME",
            "preferred_language": "VARCHAR(10) DEFAULT 'de'",
        }
        for col, typ in user_alters.items():
            if col not in ucols:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {typ}"))

        if "subscription_events" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS subscription_events (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
                    event_type VARCHAR(100) NOT NULL,
                    stripe_customer_id VARCHAR(255),
                    stripe_subscription_id VARCHAR(255),
                    payload TEXT,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """))

        if "opportunities" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS opportunities (
                    id INTEGER PRIMARY KEY,
                    uuid VARCHAR(36) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(100),
                    status VARCHAR(20) DEFAULT 'waiting',
                    referral_source VARCHAR(100),
                    calculated_kfa FLOAT,
                    calculated_mma FLOAT,
                    calculated_body_fat_navy FLOAT,
                    height_cm FLOAT,
                    weight_kg FLOAT,
                    age INTEGER,
                    gender VARCHAR(10),
                    neck_cm FLOAT,
                    waist_cm FLOAT,
                    hip_cm FLOAT,
                    metadata_json JSON,
                    converted_to_customer_id INTEGER,
                    converted_at DATETIME,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(converted_to_customer_id) REFERENCES users(id)
                )
            """))

        if "pricing_config" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS pricing_config (
                    id INTEGER PRIMARY KEY,
                    tier VARCHAR(20) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    monthly_price_cents INTEGER NOT NULL DEFAULT 0,
                    annual_price_cents INTEGER,
                    currency VARCHAR(3) DEFAULT 'EUR',
                    trial_days INTEGER DEFAULT 0,
                    features JSON DEFAULT '[]',
                    is_active BOOLEAN DEFAULT 1,
                    sort_order INTEGER DEFAULT 0,
                    created_at DATETIME,
                    updated_at DATETIME
                )
            """))

        if "coupons" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS coupons (
                    id INTEGER PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    description VARCHAR(255),
                    discount_type VARCHAR(20) NOT NULL,
                    discount_value INTEGER NOT NULL,
                    applicable_tiers JSON DEFAULT '[]',
                    min_interval VARCHAR(10) DEFAULT 'month',
                    max_uses INTEGER DEFAULT 0,
                    used_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    valid_from DATETIME,
                    valid_until DATETIME,
                    created_at DATETIME
                )
            """))

        if "user_free_months" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_free_months (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    months INTEGER NOT NULL DEFAULT 1,
                    reason VARCHAR(255),
                    granted_by INTEGER,
                    expires_at DATETIME,
                    used_count INTEGER DEFAULT 0,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(granted_by) REFERENCES users(id)
                )
            """))

        if "audit_logs" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY,
                    actor_user_id INTEGER,
                    action VARCHAR(100) NOT NULL,
                    resource_type VARCHAR(50) NOT NULL,
                    resource_id VARCHAR(100),
                    details_json JSON,
                    created_at DATETIME,
                    FOREIGN KEY(actor_user_id) REFERENCES users(id)
                )
            """))
        if "rate_limit_events" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS rate_limit_events (
                    id INTEGER PRIMARY KEY,
                    scope VARCHAR(50) NOT NULL,
                    key VARCHAR(255) NOT NULL,
                    created_at DATETIME
                )
            """))

        # Performance indexes (SQLite/PostgreSQL compatible SQL)
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_created_at ON users (created_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_measurements_user_date ON measurements (user_id, date)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_opportunities_status_created ON opportunities (status, created_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_opportunities_converted_user ON opportunities (converted_to_customer_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_subscription_events_user_created ON subscription_events (user_id, created_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_created ON audit_logs (actor_user_id, created_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rate_limit_scope_key_created ON rate_limit_events (scope, key, created_at)"))

    Path("uploads/profiles").mkdir(parents=True, exist_ok=True)


run_startup_migrations()

app = FastAPI(title="Physiq API", version="2.1.0")

app_env = os.getenv("APP_ENV", "development")
allowed_origins = parse_allowed_origins(app_env)
log_security_event("security.cors_configured", app_env=app_env, allowed_origins=allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(measurements.router, prefix="/api/measurements", tags=["measurements"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])
app.include_router(calculate.router, prefix="/api", tags=["calculate"])
app.include_router(opportunities.router, prefix="/api", tags=["opportunities"])
app.include_router(pricing.router, tags=["pricing"])
app.include_router(admin_overview.router, tags=["admin"])
app.mount("/uploads", StaticFiles(directory="uploads", check_dir=False), name="uploads")


@app.get("/")
def root():
    return {"message": "Physiq API", "version": "2.1.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/stats")
def stats_alias(
    current_user: User = Depends(auth_mod.get_current_user),
    db: Session = Depends(get_db),
):
    return measurements.get_stats(current_user=current_user, db=db)
