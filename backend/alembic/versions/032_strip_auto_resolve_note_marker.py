"""Strip the automatic resolution marker from remediation notes

Rows resolved by the scheduler keep resolved_by IS NULL, so the auto_resolved
response flag also covers historic rows.

Revision ID: 032
Revises: 031
Create Date: 2026-11-10 12:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None

_MARKER = "[Automatisch behoben: CVE nicht mehr in Deployments gefunden]"


def upgrade() -> None:
    # The marker was appended as chr(10) + marker, possibly several times after reopens.
    op.get_bind().execute(
        sa.text(
            """
            UPDATE remediations
            SET notes = NULLIF(replace(replace(notes, chr(10) || :marker, ''), :marker, ''), '')
            WHERE notes LIKE '%' || :marker || '%'
            """
        ),
        {"marker": _MARKER},
    )


def downgrade() -> None:
    # Lossy by design: the marker is not restored.
    pass
