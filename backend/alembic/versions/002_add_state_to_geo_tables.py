"""Add state/province column to re_company_codes, re_business_entities, re_buildings

Revision ID: 002
Revises: 001
Create Date: 2025-06-01
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('re_company_codes',
        sa.Column('state', sa.String(100), nullable=True)
    )
    op.add_column('re_business_entities',
        sa.Column('state', sa.String(100), nullable=True)
    )
    op.add_column('re_buildings',
        sa.Column('state', sa.String(100), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('re_buildings',        'state')
    op.drop_column('re_business_entities', 'state')
    op.drop_column('re_company_codes',    'state')
