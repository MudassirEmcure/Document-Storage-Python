"""Initial schema — all tables.

Revision ID: 001
Revises: None
Create Date: 2026-05-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types explicitly
    op.execute("CREATE TYPE user_role_enum AS ENUM ('admin', 'user', 'viewer')")
    op.execute("CREATE TYPE auth_type_enum AS ENUM ('local', 'sso')")

    # Users table
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('username', sa.String(100), unique=True, nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('role', sa.Enum('admin', 'user', 'viewer', name='user_role_enum', create_type=False), nullable=False),
        sa.Column('is_blocked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('auth_type', sa.Enum('local', 'sso', name='auth_type_enum', create_type=False), nullable=False),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # Password reset tokens
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # Refresh tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # Companies
    op.create_table(
        'companies',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # Banks
    op.create_table(
        'banks',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # Facilities
    op.create_table(
        'facilities',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # Documents
    op.create_table(
        'documents',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('document_name', sa.String(500), nullable=False),
        sa.Column('company_id', UUID(as_uuid=True), sa.ForeignKey('companies.id'), nullable=False),
        sa.Column('bank_id', UUID(as_uuid=True), sa.ForeignKey('banks.id'), nullable=False),
        sa.Column('facility_id', UUID(as_uuid=True), sa.ForeignKey('facilities.id'), nullable=False),
        sa.Column('expiry_date', sa.Date(), nullable=False),
        sa.Column('file_data', sa.LargeBinary(), nullable=False),
        sa.Column('file_name', sa.String(500), nullable=False),
        sa.Column('mime_type', sa.String(255), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('uploaded_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # Audit logs (immutable)
    op.create_table(
        'audit_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('actor_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('actor_email', sa.String(255), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(100), nullable=True),
        sa.Column('entity_id', UUID(as_uuid=True), nullable=True),
        sa.Column('metadata', JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # Indexes for performance
    op.create_index('ix_documents_document_name', 'documents', ['document_name'])
    op.create_index('ix_documents_expiry_date', 'documents', ['expiry_date'])
    op.create_index('ix_documents_is_deleted', 'documents', ['is_deleted'])
    op.create_index('ix_documents_uploaded_at', 'documents', ['uploaded_at'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])

    # Enable pg_trgm for trigram search on document_name
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE INDEX ix_documents_name_trgm ON documents USING gin (document_name gin_trgm_ops)")

    # Audit log immutability: revoke UPDATE and DELETE for the app user
    # (Adjust 'finance_app' to your actual app DB user)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finance_app') THEN
                REVOKE UPDATE, DELETE ON audit_logs FROM finance_app;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('documents')
    op.drop_table('facilities')
    op.drop_table('banks')
    op.drop_table('companies')
    op.drop_table('refresh_tokens')
    op.drop_table('password_reset_tokens')
    op.drop_table('users')
    op.execute("DROP TYPE IF EXISTS user_role_enum")
    op.execute("DROP TYPE IF EXISTS auth_type_enum")
