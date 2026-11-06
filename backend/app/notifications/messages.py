"""Localized in-app notification texts.

Notifications store a ``message_key`` plus primitive ``params``; the title and
message are rendered on read in the request language (``app.i18n.get_language``).
The German rendering is also persisted in ``title``/``message`` as a fallback for
rows created before keys existed and for unknown keys.

Placeholders use ``str.format`` syntax. ``{status_label}`` is derived from
``params["status"]`` via ``STATUS_LABELS`` at render time, so a stored row
switches language together with the rest of the text.
"""

from ..i18n import DEFAULT_LANG

# Reserved params key: [[namespace, cluster], ...] the notification is about.
# Used on read to hide stale snapshot-targeted notifications and to fill the
# ``{namespaces}`` placeholder with only the namespaces the reader still sees.
# Namespace names are never stored as plain params for that reason.
SCOPE_PARAM = "_scope"


def namespace_label(scope: list[list[str]] | list[tuple[str, str]]) -> str:
    """Render [[namespace, cluster], ...] as 'cluster/namespace, ...' in a stable order."""
    return ", ".join(f"{cl}/{ns}" for ns, cl in sorted((tuple(p) for p in scope), key=lambda n: (n[1], n[0])))


NOTIFICATION_MESSAGES: dict[str, dict[str, dict[str, str]]] = {
    "risk_comment": {
        "de": {"title": "Neuer Kommentar: {cve_id}", "message": "{author} hat einen Kommentar hinterlassen."},
        "en": {"title": "New comment: {cve_id}", "message": "{author} left a comment."},
    },
    "risk_comment_sec_team": {
        "de": {"title": "Neuer Kommentar: {cve_id}", "message": "{author} hat einen Kommentar hinterlassen."},
        "en": {"title": "New comment: {cve_id}", "message": "{author} left a comment."},
    },
    "risk_status": {
        "de": {
            "title": "Risikoakzeptanz {status_label}: {cve_id}",
            "message": "Ihre Risikoakzeptanz für {cve_id} wurde {status_label}.",
        },
        "en": {
            "title": "Risk acceptance {status_label}: {cve_id}",
            "message": "Your risk acceptance for {cve_id} was {status_label}.",
        },
    },
    "risk_expiring": {
        "de": {
            "title": "Risikoakzeptanz läuft ab: {cve_id}",
            "message": "Die Risikoakzeptanz für {cve_id} läuft in 7 Tagen ab.",
        },
        "en": {
            "title": "Risk acceptance expiring: {cve_id}",
            "message": "The risk acceptance for {cve_id} expires in 7 days.",
        },
    },
    "risk_reviewer_assigned": {
        "de": {
            "title": "Risikoakzeptanz zugewiesen: {cve_id}",
            "message": "{actor} hat Ihnen die Prüfung der Risikoakzeptanz für {cve_id} zugewiesen.",
        },
        "en": {
            "title": "Risk acceptance assigned: {cve_id}",
            "message": "{actor} assigned you to review the risk acceptance for {cve_id}.",
        },
    },
    "new_priority": {
        "de": {"title": "CVE priorisiert: {cve_id}", "message": "{cve_id} wurde als '{priority_level}' priorisiert."},
        "en": {"title": "CVE prioritized: {cve_id}", "message": "{cve_id} was prioritized as '{priority_level}'."},
    },
    "escalation": {
        "de": {
            "title": "Eskalation Stufe {level}: {cve_id}",
            "message": "CVE {cve_id} in {namespace}/{cluster_name} wurde auf Eskalationsstufe {level} hochgestuft.",
        },
        "en": {
            "title": "Escalation level {level}: {cve_id}",
            "message": "CVE {cve_id} in {namespace}/{cluster_name} was raised to escalation level {level}.",
        },
    },
    "remediation_created": {
        "de": {
            "title": "Neue Behebung: {cve_id}",
            "message": "{actor} hat eine Behebung für {cve_id} in {namespace}/{cluster_name} erstellt.",
        },
        "en": {
            "title": "New remediation: {cve_id}",
            "message": "{actor} created a remediation for {cve_id} in {namespace}/{cluster_name}.",
        },
    },
    "remediation_assigned": {
        "de": {
            "title": "Behebung zugewiesen: {cve_id}",
            "message": "{actor} hat Ihnen die Behebung für {cve_id} in {namespace}/{cluster_name} zugewiesen.",
        },
        "en": {
            "title": "Remediation assigned: {cve_id}",
            "message": "{actor} assigned you the remediation for {cve_id} in {namespace}/{cluster_name}.",
        },
    },
    "remediation_status": {
        "de": {
            "title": "Behebung {status_label}: {cve_id}",
            "message": "Behebung für {cve_id} in {namespace}/{cluster_name}: {status_label}",
        },
        "en": {
            "title": "Remediation {status_label}: {cve_id}",
            "message": "Remediation for {cve_id} in {namespace}/{cluster_name}: {status_label}",
        },
    },
    "remediation_target_date_changed": {
        "de": {
            "title": "Zieldatum geändert: {cve_id}",
            "message": (
                "{actor} hat das Zieldatum der Behebung für {cve_id} in {namespace}/{cluster_name} geändert: "
                "{old_date} auf {new_date}."
            ),
        },
        "en": {
            "title": "Target date changed: {cve_id}",
            "message": (
                "{actor} changed the target date of the remediation for {cve_id} in {namespace}/{cluster_name}: "
                "{old_date} to {new_date}."
            ),
        },
    },
    "remediation_overdue": {
        "de": {
            "title": "Behebung überfällig: {cve_id}",
            "message": "Die Behebung für {cve_id} in {namespace}/{cluster_name} ist überfällig.",
        },
        "en": {
            "title": "Remediation overdue: {cve_id}",
            "message": "The remediation for {cve_id} in {namespace}/{cluster_name} is overdue.",
        },
    },
    "suppression_requested": {
        "de": {
            "title": "Neue Unterdrückungsanfrage: {target}",
            "message": "{actor} hat eine Unterdrückungsregel für {target} beantragt.",
        },
        "en": {
            "title": "New suppression request: {target}",
            "message": "{actor} requested a suppression rule for {target}.",
        },
    },
    "suppression_status": {
        "de": {
            "title": "Unterdrückungsregel {status_label}: {target}",
            "message": "Ihre Unterdrückungsregel für {target} wurde {status_label}.",
        },
        "en": {
            "title": "Suppression rule {status_label}: {target}",
            "message": "Your suppression rule for {target} was {status_label}.",
        },
    },
    "new_relevant_cve": {
        "de": {
            "title": "Neue relevante CVE: {cve_id}",
            "message": "{cve_id} liegt neu über den Schwellenwerten in: {namespaces}.",
        },
        "en": {
            "title": "New relevant CVE: {cve_id}",
            "message": "{cve_id} is newly above the thresholds in: {namespaces}.",
        },
    },
    "team_cve_alert_summary": {
        "de": {
            "title": "{count} neue relevante CVEs",
            "message": "In Ihren Namespaces liegen {count} CVEs neu über den Schwellenwerten.",
        },
        "en": {
            "title": "{count} new relevant CVEs",
            "message": "{count} CVEs are newly above the thresholds in your namespaces.",
        },
    },
    "team_priority_alert_summary": {
        "de": {
            "title": "{count} neu priorisierte CVEs",
            "message": "Das Security-Team hat {count} CVEs in Ihren Namespaces priorisiert.",
        },
        "en": {
            "title": "{count} newly prioritized CVEs",
            "message": "The security team prioritized {count} CVEs in your namespaces.",
        },
    },
    "cve_prioritized_team": {
        "de": {
            "title": "CVE priorisiert: {cve_id}",
            "message": "Das Security-Team hat {cve_id} priorisiert. Betroffen: {namespaces}.",
        },
        "en": {
            "title": "CVE prioritized: {cve_id}",
            "message": "The security team prioritized {cve_id}. Affected: {namespaces}.",
        },
    },
    "mention": {
        "de": {"title": "Erwähnung von {author}", "message": "{author} hat Sie in einem Kommentar erwähnt."},
        "en": {"title": "Mention by {author}", "message": "{author} mentioned you in a comment."},
    },
    # CVE subscriptions (services/cve_subscription_service.py). Params never carry
    # namespace names, image names, versions, or counts per location: {namespaces}
    # is filled on read from the scope the reader still sees.
    "subscription.comment": {
        "de": {
            "title": "Neuer Kommentar: {cve_id}",
            "message": "{author} hat einen Kommentar zu einem abonnierten CVE geschrieben.",
        },
        "en": {"title": "New comment: {cve_id}", "message": "{author} commented on a CVE you follow."},
    },
    "subscription.priority_set": {
        "de": {"title": "Priorisiert: {cve_id}", "message": "{cve_id} wurde mit Priorität {status_label} priorisiert."},
        "en": {"title": "Prioritized: {cve_id}", "message": "{cve_id} was prioritized as {status_label}."},
    },
    "subscription.priority_changed": {
        "de": {
            "title": "Priorität geändert: {cve_id}",
            "message": "Die Priorität von {cve_id} ist jetzt {status_label}.",
        },
        "en": {"title": "Priority changed: {cve_id}", "message": "The priority of {cve_id} is now {status_label}."},
    },
    "subscription.priority_removed": {
        "de": {"title": "Priorität entfernt: {cve_id}", "message": "Die Priorisierung von {cve_id} wurde entfernt."},
        "en": {"title": "Priority removed: {cve_id}", "message": "{cve_id} is no longer prioritized."},
    },
    "subscription.risk_acceptance": {
        "de": {
            "title": "Risikoakzeptanz {status_label}: {cve_id}",
            "message": "Risikoakzeptanz für {cve_id} ({namespaces}): {status_label}.",
        },
        "en": {
            "title": "Risk acceptance {status_label}: {cve_id}",
            "message": "Risk acceptance for {cve_id} ({namespaces}): {status_label}.",
        },
    },
    "subscription.remediation": {
        "de": {
            "title": "Behebung {status_label}: {cve_id}",
            "message": "Behebung von {cve_id} in {namespaces}: {status_label}.",
        },
        "en": {
            "title": "Remediation {status_label}: {cve_id}",
            "message": "Remediation of {cve_id} in {namespaces}: {status_label}.",
        },
    },
    "subscription.escalation": {
        "de": {
            "title": "Eskalation Stufe {level}: {cve_id}",
            "message": "{cve_id} wurde in {namespaces} auf Stufe {level} eskaliert.",
        },
        "en": {
            "title": "Escalation level {level}: {cve_id}",
            "message": "{cve_id} was escalated to level {level} in {namespaces}.",
        },
    },
    "subscription.scores_changed": {
        "de": {
            "title": "Bewertung geändert: {cve_id}",
            "message": "Neue Bewertung für {cve_id}: CVSS {cvss_old} → {cvss}, EPSS {epss_old} → {epss}.",
        },
        "en": {
            "title": "Scores changed: {cve_id}",
            "message": "New scores for {cve_id}: CVSS {cvss_old} → {cvss}, EPSS {epss_old} → {epss}.",
        },
    },
    "subscription.fix_available": {
        "de": {"title": "Fix verfügbar: {cve_id}", "message": "Für {cve_id} ist in {namespaces} ein Fix verfügbar."},
        "en": {"title": "Fix available: {cve_id}", "message": "A fix for {cve_id} is available in {namespaces}."},
    },
    "subscription.new_images": {
        "de": {
            "title": "Neue betroffene Images: {cve_id}",
            "message": "{cve_id} betrifft neue Images in {namespaces}.",
        },
        "en": {"title": "New affected images: {cve_id}", "message": "{cve_id} affects new images in {namespaces}."},
    },
    "subscription.no_longer_affected": {
        "de": {
            "title": "Nicht mehr betroffen: {cve_id}",
            "message": "{cve_id} wird in {namespaces} nicht mehr gemeldet.",
        },
        "en": {
            "title": "No longer affected: {cve_id}",
            "message": "{cve_id} is no longer reported in {namespaces}.",
        },
    },
    "subscription.summary": {
        "de": {
            "title": "{count} Änderungen an abonnierten CVEs",
            "message": "Seit der letzten Prüfung gab es {count} Änderungen an Ihren abonnierten CVEs.",
        },
        "en": {
            "title": "{count} changes to followed CVEs",
            "message": "Since the last check there were {count} changes to the CVEs you follow.",
        },
    },
}

# Status values from risk acceptances, suppression rules, remediations, and
# priority levels. The value sets do not overlap, so one table per language is enough.
STATUS_LABELS: dict[str, dict[str, str]] = {
    "de": {
        "approved": "genehmigt",
        "rejected": "abgelehnt",
        "open": "Offen",
        "in_progress": "In Bearbeitung",
        "resolved": "Behoben",
        "verified": "Verifiziert",
        "wont_fix": "Wird nicht behoben",
        "requested": "beantragt",
        "expired": "abgelaufen",
        "deleted": "gelöscht",
        "critical": "Kritisch",
        "high": "Hoch",
        "medium": "Mittel",
        "low": "Niedrig",
    },
    "en": {
        "approved": "approved",
        "rejected": "rejected",
        "open": "open",
        "in_progress": "in progress",
        "resolved": "resolved",
        "verified": "verified",
        "wont_fix": "won't fix",
        "requested": "requested",
        "expired": "expired",
        "deleted": "deleted",
        "critical": "critical",
        "high": "high",
        "medium": "medium",
        "low": "low",
    },
}


def render_notification(key: str, params: dict, lang: str) -> tuple[str, str] | None:
    """Return ``(title, message)`` for ``key`` in ``lang``, or None if the key is unknown.

    Falls back to German for a missing language. Missing placeholders leave the
    template text unformatted rather than raising.
    """
    entry = NOTIFICATION_MESSAGES.get(key)
    if entry is None:
        return None
    texts = entry.get(lang) or entry[DEFAULT_LANG]
    values = dict(params)
    if "status" in values:
        labels = STATUS_LABELS.get(lang) or STATUS_LABELS[DEFAULT_LANG]
        values["status_label"] = labels.get(str(values["status"]), str(values["status"]))
    try:
        return texts["title"].format(**values), texts["message"].format(**values)
    except (KeyError, IndexError):
        return texts["title"], texts["message"]
