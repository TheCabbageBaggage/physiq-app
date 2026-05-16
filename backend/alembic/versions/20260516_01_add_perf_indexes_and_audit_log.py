"""add perf indexes and audit logs

Revision ID: 20260516_01
Revises:
Create Date: 2026-05-16
"""

from alembic import op


revision = "20260516_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
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
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_created_at ON users (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_measurements_user_date ON measurements (user_id, date)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_opportunities_status_created ON opportunities (status, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_opportunities_converted_user ON opportunities (converted_to_customer_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_subscription_events_user_created ON subscription_events (user_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_created ON audit_logs (actor_user_id, created_at)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_actor_created")
    op.execute("DROP INDEX IF EXISTS ix_subscription_events_user_created")
    op.execute("DROP INDEX IF EXISTS ix_opportunities_converted_user")
    op.execute("DROP INDEX IF EXISTS ix_opportunities_status_created")
    op.execute("DROP INDEX IF EXISTS ix_measurements_user_date")
    op.execute("DROP INDEX IF EXISTS ix_users_created_at")
    op.execute("DROP TABLE IF EXISTS audit_logs")
