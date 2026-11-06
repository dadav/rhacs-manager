"""Store the remediation won't-fix reason separately from the notes

Marking a remediation ``wont_fix`` used to overwrite ``notes`` with the reason, so the
note was lost and the reason stayed behind as the note after a reopen.

Existing ``wont_fix`` rows take their reason from the audit log, the only reliable
source: ``notes`` can also hold a real note edited after closing. ``notes`` is cleared
only when it equals that reason. A row without an audited reason keeps ``notes`` as is.
Notes that were already overwritten were never stored elsewhere and stay lost. Rows
reopened before this revision keep the old reason in ``notes``.

The downgrade appends the reason to any existing note, so no text is lost, but the two
fields are not separated again by a later upgrade.

Revision ID: 031
Revises: 030
Create Date: 2026-11-06 12:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("remediations", sa.Column("wont_fix_reason", sa.Text(), nullable=True))
    op.execute(
        """
        WITH latest AS (
            SELECT DISTINCT ON (entity_id) entity_id, details->>'wont_fix_reason' AS reason
            FROM audit_log
            WHERE entity_type = 'remediation'
              AND action = 'remediation_updated'
              AND details->>'wont_fix_reason' IS NOT NULL
            ORDER BY entity_id, created_at DESC
        )
        UPDATE remediations AS r
        SET wont_fix_reason = latest.reason,
            notes = CASE WHEN r.notes = latest.reason THEN NULL ELSE r.notes END
        FROM latest
        WHERE r.status = 'wont_fix' AND latest.entity_id = CAST(r.id AS text)
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE remediations
        SET notes = CASE
            WHEN notes IS NULL OR notes = '' THEN wont_fix_reason
            ELSE notes || chr(10) || wont_fix_reason
        END
        WHERE wont_fix_reason IS NOT NULL
        """
    )
    op.drop_column("remediations", "wont_fix_reason")
