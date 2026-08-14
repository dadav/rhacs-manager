"""Backend message localization.

Why this exists: all user-visible API error messages used to be hardcoded
German strings, so the UI showed German even when the user selected English.

How it works:
- The frontend sends the active UI language via the standard ``Accept-Language``
  header on every request (see ``frontend/src/api/client.ts``).
- ``LanguageMiddleware`` (a pure-ASGI middleware, so the ContextVar it sets is
  visible to endpoints and services in the same request task) stores the
  normalized language in a request-scoped ContextVar.
- ``ApiError`` resolves its message from ``MESSAGES`` using that language at
  raise time. Raise sites stay declarative: ``raise ApiError(404, "not_found")``.

German is the default (the product is German-first) and the fallback for any
missing translation, matching the existing PDF/Excel/export catalogs.
"""

from contextvars import ContextVar

from fastapi import HTTPException

DEFAULT_LANG = "de"
SUPPORTED_LANGS = ("de", "en")

_current_lang: ContextVar[str] = ContextVar("current_lang", default=DEFAULT_LANG)


def normalize_lang(raw: str | None) -> str:
    """Map a raw ``Accept-Language`` header to a supported language code."""
    if not raw:
        return DEFAULT_LANG
    first = raw.split(",")[0].strip().lower()
    for lang in SUPPORTED_LANGS:
        if first.startswith(lang):
            return lang
    return DEFAULT_LANG


def set_language(lang: str) -> None:
    _current_lang.set(lang if lang in SUPPORTED_LANGS else DEFAULT_LANG)


def get_language() -> str:
    return _current_lang.get()


# code -> {lang: template}. Templates may use ``{name}`` placeholders filled
# from ApiError(**params). Keep both languages in sync.
MESSAGES: dict[str, dict[str, str]] = {
    # Generic
    "not_found": {"de": "Nicht gefunden", "en": "Not found"},
    "forbidden": {"de": "Kein Zugriff", "en": "Access denied"},
    "no_namespaces": {"de": "Keine Namespaces zugeordnet", "en": "No namespaces assigned"},
    "cve_not_found": {"de": "CVE nicht gefunden", "en": "CVE not found"},
    "user_not_found": {"de": "Benutzer nicht gefunden", "en": "User not found"},
    "image_not_found": {"de": "Image nicht gefunden", "en": "Image not found"},
    "comment_not_found": {"de": "Kommentar nicht gefunden", "en": "Comment not found"},
    "comment_edit_forbidden": {
        "de": "Kommentar eines anderen Benutzers kann nicht bearbeitet werden",
        "en": "Cannot edit another user's comment",
    },
    "comment_delete_forbidden": {
        "de": "Kommentar eines anderen Benutzers kann nicht gelöscht werden",
        "en": "Cannot delete another user's comment",
    },
    "escalation_not_found": {"de": "Eskalation nicht gefunden", "en": "Escalation not found"},
    "escalation_not_active": {
        "de": "Diese Eskalation ist nicht mehr die aktuelle Eskalationsstufe",
        "en": "This escalation is no longer the current escalation level",
    },
    "escalation_comment_forbidden": {
        "de": "Nur das Security-Team darf Eskalationskommentare erstellen",
        "en": "Only the security team can add escalation comments",
    },
    "too_many_mentions": {
        "de": "Zu viele Erwähnungen (maximal {max} Empfänger)",
        "en": "Too many mentions (maximum {max} recipients)",
    },
    "username_conflict": {
        "de": "Benutzername '{username}' kollidiert (Groß-/Kleinschreibung) mit einem bestehenden Konto",
        "en": "Username '{username}' conflicts (case-insensitively) with an existing account",
    },
    "invalid_status": {"de": "Ungültiger Status: {status}", "en": "Invalid status: {status}"},
    "invalid_type": {"de": "Ungültiger Typ: {type}", "en": "Invalid type: {type}"},
    "invalid_date": {"de": "Ungültiges Datum (Format: JJJJ-MM-TT)", "en": "Invalid date (format: YYYY-MM-DD)"},
    "invalid_status_transition": {
        "de": "Ungültiger Statusübergang: {old} → {new}",
        "en": "Invalid status transition: {old} → {new}",
    },
    # Auth
    "forwarded_user_missing": {"de": "X-Forwarded-User header fehlt", "en": "X-Forwarded-User header missing"},
    "token_no_kid": {"de": "Token hat kein kid im Header", "en": "Token has no kid in header"},
    "oidc_key_not_found": {"de": "Kein passender OIDC-Schlüssel gefunden", "en": "No matching OIDC key found"},
    "not_authenticated": {"de": "Nicht authentifiziert", "en": "Not authenticated"},
    "invalid_token": {"de": "Ungültiges Token", "en": "Invalid token"},
    "token_issuer_mismatch": {"de": "Token-Issuer stimmt nicht überein", "en": "Token issuer mismatch"},
    "auth_failed": {"de": "Authentifizierung fehlgeschlagen", "en": "Authentication failed"},
    "sec_team_only": {"de": "Nur für das Security-Team zugänglich", "en": "Security team access only"},
    "too_many_namespaces": {
        "de": "Zu viele Namespaces ({count} > {max})",
        "en": "Too many namespaces ({count} > {max})",
    },
    # Settings
    "digest_send_failed": {"de": "Digest-Versand fehlgeschlagen", "en": "Digest delivery failed"},
    "digest_no_management_email": {
        "de": "Keine Management-E-Mail konfiguriert",
        "en": "No management email configured",
    },
    # Priorities
    "already_prioritized": {"de": "{cve_id} ist bereits priorisiert", "en": "{cve_id} is already prioritized"},
    # Risk acceptances
    "cve_not_in_namespaces": {
        "de": "CVE in Ihren Namespaces nicht gefunden",
        "en": "CVE not found in your namespaces",
    },
    "cve_not_in_namespaces_anymore": {
        "de": "CVE in Ihren Namespaces nicht mehr gefunden",
        "en": "CVE no longer found in your namespaces",
    },
    "ra_sec_team_cannot_request": {
        "de": "Security-Team kann keine Risikoakzeptanzen beantragen",
        "en": "Security team cannot request risk acceptances",
    },
    "ra_sec_team_cannot_modify": {
        "de": "Security-Team kann keine Risikoakzeptanzen ändern",
        "en": "Security team cannot modify risk acceptances",
    },
    "ra_only_creator_can_modify": {
        "de": "Nur der Ersteller kann die Risikoakzeptanz ändern",
        "en": "Only the creator can modify the risk acceptance",
    },
    "ra_only_creator_can_delete": {
        "de": "Nur der Ersteller kann die Risikoakzeptanz löschen",
        "en": "Only the creator can delete the risk acceptance",
    },
    "ra_only_approved_rejected_modifiable": {
        "de": "Nur genehmigte oder abgelehnte Risikoakzeptanzen können geändert werden",
        "en": "Only approved or rejected risk acceptances can be modified",
    },
    "ra_duplicate_cve_scope": {
        "de": "Für diese CVE und diesen Scope existiert bereits eine aktive Risikoakzeptanz",
        "en": "An active risk acceptance already exists for this CVE and scope",
    },
    "ra_duplicate_scope": {
        "de": "Für diesen Scope existiert bereits eine aktive Risikoakzeptanz",
        "en": "An active risk acceptance already exists for this scope",
    },
    "ra_sec_team_only_review": {
        "de": "Nur das Security-Team kann Risikoakzeptanzen bearbeiten",
        "en": "Only the security team can review risk acceptances",
    },
    "ra_only_requested_reviewable": {
        "de": "Nur beantragte Risikoakzeptanzen können bewertet werden",
        "en": "Only requested risk acceptances can be reviewed",
    },
    "ra_sec_team_only_assign": {
        "de": "Nur das Security-Team kann Reviewer zuweisen",
        "en": "Only the security team can assign reviewers",
    },
    "ra_only_requested_assignable": {
        "de": "Nur beantragte Risikoakzeptanzen können zugewiesen werden",
        "en": "Only requested risk acceptances can be assigned",
    },
    "ra_reviewer_must_be_sec": {
        "de": "Nur Security-Team-Mitglieder können als Reviewer zugewiesen werden",
        "en": "Only security team members can be assigned as reviewers",
    },
    # Scope mode validation (Pydantic request validators)
    "scope_all_no_targets": {
        "de": "Für Scope-Modus 'all' dürfen keine Targets angegeben werden",
        "en": "No targets may be specified for scope mode 'all'",
    },
    "scope_targets_required": {
        "de": "Für den gewählten Scope-Modus sind Targets erforderlich",
        "en": "Targets are required for the selected scope mode",
    },
    # Suppression rule field validation (Pydantic request validators)
    "suppression_component_name_required": {
        "de": "component_name ist erforderlich für Typ 'component'",
        "en": "component_name is required for type 'component'",
    },
    "suppression_scope_not_allowed": {
        "de": "scope ist für Typ 'component' nicht erlaubt",
        "en": "scope is not allowed for type 'component'",
    },
    "suppression_cve_id_required": {
        "de": "cve_id ist erforderlich für Typ 'cve'",
        "en": "cve_id is required for type 'cve'",
    },
    "suppression_fields_not_allowed": {
        "de": "component_name und version_pattern sind für Typ 'cve' nicht erlaubt",
        "en": "component_name and version_pattern are not allowed for type 'cve'",
    },
    # Risk acceptance scope validation
    "scope_namespaces_without_cve": {
        "de": "Scope enthält Namespaces ohne diese CVE",
        "en": "Scope contains namespaces without this CVE",
    },
    "scope_image_requires_name": {
        "de": "Image-Scope erfordert image_name für jedes Target",
        "en": "Image scope requires image_name for each target",
    },
    "scope_images_without_cve": {
        "de": "Scope enthält Images ohne diese CVE",
        "en": "Scope contains images without this CVE",
    },
    "scope_deployment_requires_id": {
        "de": "Deployment-Scope erfordert deployment_id für jedes Target",
        "en": "Deployment scope requires deployment_id for each target",
    },
    "scope_deployments_without_cve": {
        "de": "Scope enthält Deployments ohne diese CVE",
        "en": "Scope contains deployments without this CVE",
    },
    "scope_deployment_requires_target": {
        "de": "Für Deployment-Scope sind mindestens ein Target erforderlich",
        "en": "Deployment scope requires at least one target",
    },
    # Remediations
    "remediation_namespace_forbidden": {
        "de": "Kein Zugriff auf diesen Namespace",
        "en": "No access to this namespace",
    },
    "cve_not_in_namespace": {
        "de": "CVE in diesem Namespace nicht gefunden",
        "en": "CVE not found in this namespace",
    },
    "remediation_duplicate": {
        "de": "Für diese CVE existiert bereits eine Behebung in diesem Namespace",
        "en": "A remediation already exists for this CVE in this namespace",
    },
    "remediation_wontfix_requires_reason": {
        "de": "Für 'Wird nicht behoben' ist eine Begründung erforderlich",
        "en": "A reason is required for 'won't fix'",
    },
    "remediation_only_creator_or_sec_delete": {
        "de": "Nur der Ersteller oder das Security-Team kann Behebungen löschen",
        "en": "Only the creator or the security team can delete remediations",
    },
    "remediation_only_open_rejected_deletable": {
        "de": "Nur offene oder abgelehnte Behebungen können gelöscht werden",
        "en": "Only open or rejected remediations can be deleted",
    },
    # Suppression rules
    "suppression_duplicate": {
        "de": "Für dieses Ziel existiert bereits eine aktive Unterdrückungsregel",
        "en": "An active suppression rule already exists for this target",
    },
    "suppression_only_creator_modify": {
        "de": "Nur der Ersteller kann die Regel ändern",
        "en": "Only the creator can modify the rule",
    },
    "suppression_only_requested_modifiable": {
        "de": "Nur beantragte Regeln können geändert werden",
        "en": "Only requested rules can be modified",
    },
    "suppression_sec_team_only_review": {
        "de": "Nur das Security-Team kann Unterdrückungsregeln überprüfen",
        "en": "Only the security team can review suppression rules",
    },
    "suppression_only_requested_reviewable": {
        "de": "Nur beantragte Regeln können überprüft werden",
        "en": "Only requested rules can be reviewed",
    },
    "suppression_only_creator_withdraw": {
        "de": "Nur der Ersteller kann die Regel zurückziehen",
        "en": "Only the creator can withdraw the rule",
    },
    "suppression_only_requested_withdrawable": {
        "de": "Nur beantragte Regeln können zurückgezogen werden",
        "en": "Only requested rules can be withdrawn",
    },
    # Badges
    "badge_namespace_not_accessible": {
        "de": "Namespace nicht in Ihren zugänglichen Namespaces",
        "en": "Namespace not among your accessible namespaces",
    },
}


def t(code: str, lang: str | None = None, **params: object) -> str:
    """Resolve a message code to a localized string for the current request.

    Looks up ``MESSAGES[code]`` for the active (or given) language, falls back to
    German, then to the raw code, and fills any ``{placeholder}`` params. This is
    the single place message resolution happens; ``ApiError`` and Pydantic
    validators both go through it (the latter via the ``translate`` alias).
    """
    lang = lang or get_language()
    entry = MESSAGES.get(code)
    if entry is None:
        return code
    text = entry.get(lang) or entry.get(DEFAULT_LANG) or code
    if params:
        try:
            return text.format(**params)
        except (KeyError, IndexError):
            return text
    return text


# Explicit alias for call sites (e.g. Pydantic validators) that resolve a code
# to text directly rather than raising an ApiError.
translate = t


class ApiError(HTTPException):
    """HTTPException whose detail is a localized message resolved at raise time."""

    def __init__(self, status_code: int, code: str, **params: object) -> None:
        self.code = code
        super().__init__(status_code=status_code, detail=translate(code, **params))


class LanguageMiddleware:
    """Pure-ASGI middleware that pins the request language from Accept-Language."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            raw = ""
            for key, value in scope.get("headers", []):
                if key == b"accept-language":
                    raw = value.decode("latin-1")
                    break
            set_language(normalize_lang(raw))
        await self.app(scope, receive, send)
