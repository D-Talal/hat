"""Add internationalization settings to organizations

Revision ID: 003
Revises: 002
Create Date: 2026-06-04
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add i18n columns with safe defaults so existing rows stay valid.
    op.add_column('organizations',
        sa.Column('default_currency', sa.String(3),  server_default='USD',   nullable=False))
    op.add_column('organizations',
        sa.Column('country',          sa.String(2),  server_default='US',    nullable=False))
    op.add_column('organizations',
        sa.Column('locale',           sa.String(10), server_default='en-US', nullable=False))
    op.add_column('organizations',
        sa.Column('timezone',         sa.String(50), server_default='UTC',   nullable=False))
    op.add_column('organizations',
        sa.Column('area_unit',        sa.String(4),  server_default='sqm',   nullable=False))


def downgrade() -> None:
    op.drop_column('organizations', 'area_unit')
    op.drop_column('organizations', 'timezone')
    op.drop_column('organizations', 'locale')
    op.drop_column('organizations', 'country')
    op.drop_column('organizations', 'default_currency')
