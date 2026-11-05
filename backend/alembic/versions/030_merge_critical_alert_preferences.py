"""Merge the two critical alert email preferences

``alert_email_new_critical`` and ``alert_email_critical_fixable`` become one switch,
``alert_email_critical``. Anyone opted into either old switch stays opted in. The
email keeps both count lines. Data only.

The downgrade is lossy: which single switch was on cannot be restored, so opted-in
users get both old switches back.

Revision ID: 030
Revises: 029
Create Date: 2026-11-05 13:00:00.000000
"""

from alembic import op

revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO notification_preferences (user_id, category, in_app, email)
        SELECT DISTINCT user_id, 'alert_email_critical', false, true
        FROM notification_preferences
        WHERE category IN ('alert_email_new_critical', 'alert_email_critical_fixable') AND email
        ON CONFLICT (user_id, category) DO UPDATE SET email = true
        """
    )
    op.execute(
        """
        DELETE FROM notification_preferences
        WHERE category IN ('alert_email_new_critical', 'alert_email_critical_fixable')
        """
    )


def downgrade() -> None:
    for category in ("alert_email_new_critical", "alert_email_critical_fixable"):
        op.execute(
            f"""
            INSERT INTO notification_preferences (user_id, category, in_app, email)
            SELECT user_id, '{category}', false, true
            FROM notification_preferences
            WHERE category = 'alert_email_critical' AND email
            ON CONFLICT (user_id, category) DO UPDATE SET email = true
            """
        )
    op.execute("DELETE FROM notification_preferences WHERE category = 'alert_email_critical'")
