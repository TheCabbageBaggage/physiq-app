import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from app.routers import auth, measurements, users, subscriptions, opportunities, calculate, admin_messages, admin_stats, admin_pricing
from app.database import engine, Base, get_db
from app.models import User
from app.middleware import RateLimiterMiddleware
from app import auth as auth_mod


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

        ocols = {c["name"] for c in inspector.get_columns("opportunities")}
        opp_alters = {
            "phone": "VARCHAR(30)",
            "interests": "JSON",
            "bia_access": "VARCHAR(20)",
            "newsletter_opt_in": "BOOLEAN DEFAULT 1",
        }
        for col, typ in opp_alters.items():
            if col not in ocols:
                conn.execute(text(f"ALTER TABLE opportunities ADD COLUMN {col} {typ}"))

        if "pricing_config" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS pricing_config (
                    id INTEGER PRIMARY KEY,
                    plan VARCHAR(20) UNIQUE NOT NULL,
                    price_monthly VARCHAR(50) DEFAULT '€0',
                    price_annual VARCHAR(50) DEFAULT '€0',
                    features JSON,
                    is_active BOOLEAN DEFAULT 1,
                    stripe_price_id_monthly VARCHAR(255),
                    stripe_price_id_annual VARCHAR(255),
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
                    discount_percent INTEGER DEFAULT 0,
                    discount_amount_cents INTEGER DEFAULT 0,
                    max_uses INTEGER DEFAULT 0,
                    current_uses INTEGER DEFAULT 0,
                    expires_at DATETIME,
                    is_active BOOLEAN DEFAULT 1,
                    created_by INTEGER,
                    created_at DATETIME,
                    FOREIGN KEY(created_by) REFERENCES users(id)
                )
            """))

        if "free_grants" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS free_grants (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    months INTEGER NOT NULL,
                    reason VARCHAR(255),
                    granted_by INTEGER,
                    expires_at DATETIME,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(granted_by) REFERENCES users(id)
                )
            """))

        if "mass_messages" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS mass_messages (
                    id INTEGER PRIMARY KEY,
                    subject VARCHAR(255) NOT NULL,
                    html_body TEXT NOT NULL,
                    status VARCHAR(20) DEFAULT 'draft',
                    target_group VARCHAR(50),
                    target_filter JSON,
                    sent_count INTEGER DEFAULT 0,
                    failed_count INTEGER DEFAULT 0,
                    total_recipients INTEGER DEFAULT 0,
                    created_by INTEGER,
                    created_at DATETIME,
                    sent_at DATETIME,
                    FOREIGN KEY(created_by) REFERENCES users(id)
                )
            """))

        if "mass_message_recipients" not in tables:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS mass_message_recipients (
                    id INTEGER PRIMARY KEY,
                    message_id INTEGER NOT NULL,
                    user_email VARCHAR(255) NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    sent_at DATETIME,
                    error TEXT,
                    FOREIGN KEY(message_id) REFERENCES mass_messages(id)
                )
            """))

        if "opportunities" not in tables:
            """))

    Path("uploads/profiles").mkdir(parents=True, exist_ok=True)


run_startup_migrations()

app = FastAPI(title="Physiq API", version="2.1.0")

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "https://dashboard.claw.lkohl.duckdns.org,http://localhost:3001")
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Rate Limiting (100 req/min per IP)
app.add_middleware(
    RateLimiterMiddleware,
    requests_per_minute=100,
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(measurements.router, prefix="/api/measurements", tags=["measurements"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])
app.include_router(calculate.router, prefix="/api", tags=["calculate"])
app.include_router(opportunities.router, prefix="/api", tags=["opportunities"])
app.include_router(admin_pricing.router, prefix="/api", tags=["admin-pricing"])
app.include_router(admin_messages.router, prefix="/api", tags=["admin-messages"])
app.include_router(admin_stats.router, prefix="/api/admin/stats", tags=["admin-stats"])
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
