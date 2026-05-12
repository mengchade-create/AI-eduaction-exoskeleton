"""Initial ExoKids schema.

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-05-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def create_telemetry_hypertable() -> None:
    """Create the TimescaleDB hypertable with a clear prerequisite error."""

    bind = op.get_bind()
    timescale_available = bind.execute(
        sa.text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')")
    ).scalar()
    if not timescale_available:
        raise RuntimeError(
            "TimescaleDB extension is required before running this migration. "
            "Install/enable TimescaleDB and run `CREATE EXTENSION IF NOT EXISTS timescaledb;`."
        )
    op.execute("SELECT create_hypertable('telemetry', 'ts')")


def upgrade() -> None:
    """Create all SPEC section 4 tables."""

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("display_name", sa.String(length=64)),
        sa.Column("avatar", sa.String(length=32)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_users_username", "users", ["username"])

    op.create_table(
        "classes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "class_members",
        sa.Column("class_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("classes.id")),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.PrimaryKeyConstraint("class_id", "student_id"),
    )

    op.create_table(
        "assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("class_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("classes.id")),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("template_code", sa.Text()),
        sa.Column("due_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assignments.id")),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("blockly_xml", sa.Text()),
        sa.Column("language", sa.String(length=16), server_default="python"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("status", sa.String(length=16), server_default="submitted"),
    )

    op.create_table(
        "experiments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("class_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("classes.id")),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assignments.id")),
        sa.Column("code_snapshot", sa.Text()),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("action", sa.String(length=32)),
        sa.Column("strategy_params", postgresql.JSONB()),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
        sa.Column("telemetry_blob_url", sa.Text()),
        sa.Column("summary", postgresql.JSONB()),
    )

    op.create_table(
        "telemetry",
        sa.Column("experiment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(length=16)),
        sa.Column("imu", postgresql.JSONB()),
        sa.Column("joints", postgresql.JSONB()),
        sa.Column("motors", postgresql.JSONB()),
        sa.Column("step_count", sa.Integer()),
        sa.Column("battery", sa.REAL()),
        sa.Column("assist_mode", sa.String(length=32)),
    )
    op.create_index("ix_telemetry_experiment_id_ts", "telemetry", ["experiment_id", sa.text("ts DESC")])
    create_telemetry_hypertable()

    op.create_table(
        "devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=64)),
        sa.Column("pi_host", sa.String(length=128)),
        sa.Column("pi_user", sa.String(length=32)),
        sa.Column("ssh_key_ref", sa.String(length=128)),
        sa.Column("online", sa.Boolean(), server_default=sa.text("FALSE")),
        sa.Column("current_deployment_id", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "deployments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("submissions.id")),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("devices.id")),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("version", sa.Integer()),
        sa.Column("status", sa.String(length=16)),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
        sa.Column("log_blob_url", sa.Text()),
    )

    op.create_table(
        "classifier_datasets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("name", sa.String(length=64)),
        sa.Column("samples", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "classifier_models",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("classifier_datasets.id")),
        sa.Column("algorithm", sa.String(length=32)),
        sa.Column("metrics", postgresql.JSONB()),
        sa.Column("model_blob_url", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "llm_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("messages", postgresql.JSONB()),
        sa.Column("context", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("action", sa.String(length=64)),
        sa.Column("target", sa.String(length=64)),
        sa.Column("payload", postgresql.JSONB()),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    """Drop all SPEC section 4 tables in dependency-safe order."""

    op.drop_table("audit_logs")
    op.drop_table("llm_sessions")
    op.drop_table("classifier_models")
    op.drop_table("classifier_datasets")
    op.drop_table("deployments")
    op.drop_table("devices")
    op.drop_index("ix_telemetry_experiment_id_ts", table_name="telemetry")
    op.drop_table("telemetry")
    op.drop_table("experiments")
    op.drop_table("submissions")
    op.drop_table("assignments")
    op.drop_table("class_members")
    op.drop_table("classes")
    op.drop_table("users")
