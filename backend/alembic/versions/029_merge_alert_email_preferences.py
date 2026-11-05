"""Merge split alert email preference rows

``alert_email_prioritized`` and ``alert_email_new_relevant`` were email-only rows for
the same events as ``priority`` and ``new_critical_cve``. Those two rows now hold the
email switch, so existing opt-ins move there. In-app choices are not changed.

Data only. ``alert_email_new_relevant`` never shipped in a release, so the downgrade
restores only ``alert_email_prioritized``. It leaves ``new_critical_cve.email`` alone:
older code ignores that value, and clearing it would lose the opt-in on re-upgrade.

Revision ID: 029
Revises: 028
Create Date: 2026-11-05 12:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None

_MERGED_CATEGORIES = {
    "alert_email_prioritized": "priority",
    "alert_email_new_relevant": "new_critical_cve",
}


def upgrade() -> None:
    for old_category, new_category in _MERGED_CATEGORIES.items():
        op.get_bind().execute(
            sa.text(
                """
                INSERT INTO notification_preferences (user_id, category, in_app, email)
                SELECT user_id, :new_category, true, true
                FROM notification_preferences
                WHERE category = :old_category AND email
                ON CONFLICT (user_id, category) DO UPDATE SET email = true
                """
            ),
            {"old_category": old_category, "new_category": new_category},
        )
        op.get_bind().execute(
            sa.text("DELETE FROM notification_preferences WHERE category = :old_category"),
            {"old_category": old_category},
        )


def downgrade() -> None:
    op.execute(
        """
        INSERT INTO notification_preferences (user_id, category, in_app, email)
        SELECT user_id, 'alert_email_prioritized', false, true
        FROM notification_preferences
        WHERE category = 'priority' AND email
        ON CONFLICT (user_id, category) DO UPDATE SET email = true
        """
    )
    op.execute("UPDATE notification_preferences SET email = false WHERE category = 'priority'")
