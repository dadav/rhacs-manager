"""Catalog consistency for localized in-app notification texts."""

import string

from app.i18n import SUPPORTED_LANGS
from app.notifications.messages import NOTIFICATION_MESSAGES, STATUS_LABELS, render_notification


def _placeholders(template: str) -> set[str]:
    return {field for _, field, _, _ in string.Formatter().parse(template) if field}


def test_every_key_has_all_languages_with_matching_placeholders():
    for key, entry in NOTIFICATION_MESSAGES.items():
        assert set(entry) == set(SUPPORTED_LANGS), key
        for part in ("title", "message"):
            reference = _placeholders(entry["de"][part])
            for lang in SUPPORTED_LANGS:
                assert _placeholders(entry[lang][part]) == reference, (key, lang, part)


def test_status_labels_cover_the_same_values_in_every_language():
    assert set(STATUS_LABELS["de"]) == set(STATUS_LABELS["en"])


def test_unknown_key_renders_none():
    assert render_notification("does_not_exist", {}, "en") is None


def test_missing_param_falls_back_to_template():
    title, _ = render_notification("risk_expiring", {}, "en")
    assert title == "Risk acceptance expiring: {cve_id}"
