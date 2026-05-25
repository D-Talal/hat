"""Add multi-tenancy: organizations table + org_id on root tables

Revision ID: 001
Revises: 
Create Date: 2025-01-01
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # ── 1. Create organizations table ─────────────────────────────────────────
    op.create_table(
        'organizations',
        sa.Column('id',         sa.Integer(),     primary_key=True),
        sa.Column('name',       sa.String(255),   nullable=False),
        sa.Column('slug',       sa.String(100),   nullable=False, unique=True),
        sa.Column('plan',       sa.String(50),    server_default='trial'),
        sa.Column('is_active',  sa.Boolean(),     server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_organizations_slug', 'organizations', ['slug'])

    # ── 2. Insert default org for existing data ────────────────────────────────
    op.execute("""
        INSERT INTO organizations (name, slug, plan, is_active)
        VALUES ('Default Organization', 'default', 'trial', true)
    """)

    # ── 3. Add org_id to users ─────────────────────────────────────────────────
    op.add_column('users',
        sa.Column('organization_id', sa.Integer(),
                  sa.ForeignKey('organizations.id'), nullable=True))
    op.create_index('ix_users_organization_id', 'users', ['organization_id'])
    op.execute("UPDATE users SET organization_id = (SELECT id FROM organizations WHERE slug = 'default')")

    # ── 4. Root commercial tables ──────────────────────────────────────────────
    op.add_column('re_business_entities',
        sa.Column('org_id', sa.Integer(),
                  sa.ForeignKey('organizations.id'), nullable=True))
    op.create_index('ix_re_business_entities_org_id', 're_business_entities', ['org_id'])
    op.execute("UPDATE re_business_entities SET org_id = (SELECT id FROM organizations WHERE slug = 'default')")

    op.add_column('re_business_partners',
        sa.Column('org_id', sa.Integer(),
                  sa.ForeignKey('organizations.id'), nullable=True))
    op.create_index('ix_re_business_partners_org_id', 're_business_partners', ['org_id'])
    op.execute("UPDATE re_business_partners SET org_id = (SELECT id FROM organizations WHERE slug = 'default')")

    # ── 5. Hotel ───────────────────────────────────────────────────────────────
    op.add_column('hotels',
        sa.Column('org_id', sa.Integer(),
                  sa.ForeignKey('organizations.id'), nullable=True))
    op.create_index('ix_hotels_org_id', 'hotels', ['org_id'])
    op.execute("UPDATE hotels SET org_id = (SELECT id FROM organizations WHERE slug = 'default')")

    # ── 6. Posting engine ─────────────────────────────────────────────────────
    op.add_column('re_posting_runs',
        sa.Column('org_id', sa.Integer(),
                  sa.ForeignKey('organizations.id'), nullable=True))
    op.create_index('ix_re_posting_runs_org_id', 're_posting_runs', ['org_id'])
    op.execute("UPDATE re_posting_runs SET org_id = (SELECT id FROM organizations WHERE slug = 'default')")

    op.add_column('re_fx_rates',
        sa.Column('org_id', sa.Integer(),
                  sa.ForeignKey('organizations.id'), nullable=True))
    op.create_index('ix_re_fx_rates_org_id', 're_fx_rates', ['org_id'])
    op.execute("UPDATE re_fx_rates SET org_id = (SELECT id FROM organizations WHERE slug = 'default')")


def downgrade() -> None:
    op.drop_index('ix_re_fx_rates_org_id',           're_fx_rates')
    op.drop_column('re_fx_rates',                     'org_id')
    op.drop_index('ix_re_posting_runs_org_id',        're_posting_runs')
    op.drop_column('re_posting_runs',                 'org_id')
    op.drop_index('ix_hotels_org_id',                 'hotels')
    op.drop_column('hotels',                          'org_id')
    op.drop_index('ix_re_business_partners_org_id',   're_business_partners')
    op.drop_column('re_business_partners',            'org_id')
    op.drop_index('ix_re_business_entities_org_id',   're_business_entities')
    op.drop_column('re_business_entities',            'org_id')
    op.drop_index('ix_users_organization_id',         'users')
    op.drop_column('users',                           'organization_id')
    op.drop_index('ix_organizations_slug',            'organizations')
    op.drop_table('organizations')
