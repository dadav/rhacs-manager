"""The data migration removes old markers while preserving user notes."""

import importlib.util
from pathlib import Path

from sqlalchemy import create_engine, text


def test_strip_auto_resolve_markers_preserves_notes(monkeypatch):
    path = Path(__file__).parents[1] / "alembic/versions/032_strip_auto_resolve_note_marker.py"
    spec = importlib.util.spec_from_file_location("migration_032", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    marker = "[Automatisch behoben: CVE nicht mehr in Deployments gefunden]"
    cases = [
        (None, None),
        ("", ""),
        ("my note", "my note"),
        (marker, None),
        (f"\n{marker}", None),
        (f"\n{marker}\n{marker}", None),
        (f"my note\n{marker}\n{marker}", "my note"),
        (f"first line\nsecond line\n{marker}", "first line\nsecond line"),
        (f"my note\n{marker}\nmore notes", "my note\nmore notes"),
    ]
    engine = create_engine("sqlite:///:memory:")
    try:
        with engine.begin() as connection:
            # SQLite names this function char; the migration uses PostgreSQL's chr.
            connection.connection.driver_connection.create_function("chr", 1, chr)
            connection.execute(text("CREATE TABLE remediations (id INTEGER PRIMARY KEY, notes TEXT)"))
            connection.execute(
                text("INSERT INTO remediations (id, notes) VALUES (:id, :notes)"),
                [{"id": index, "notes": before} for index, (before, _) in enumerate(cases)],
            )
            monkeypatch.setattr(migration.op, "get_bind", lambda: connection)

            migration.upgrade()

            expected = [after for _, after in cases]
            assert connection.execute(text("SELECT notes FROM remediations ORDER BY id")).scalars().all() == expected

            migration.upgrade()
            migration.downgrade()

            assert connection.execute(text("SELECT notes FROM remediations ORDER BY id")).scalars().all() == expected
    finally:
        engine.dispose()
