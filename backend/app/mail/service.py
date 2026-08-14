import logging
from collections.abc import Sequence
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import TYPE_CHECKING

import aiosmtplib
from jinja2 import Environment, FileSystemLoader

from ..config import settings

if TYPE_CHECKING:
    from ..notifications.service import MentionEmailJob

logger = logging.getLogger(__name__)

_template_dir = Path(__file__).parent / "templates"
_jinja_env = Environment(loader=FileSystemLoader(str(_template_dir)), autoescape=True)


def _app_link(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


async def send_email(to: str, subject: str, html_body: str) -> None:
    if not to:
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        use_tls=settings.smtp_tls,
        start_tls=settings.smtp_starttls,
        validate_certs=settings.smtp_validate_certs,
    )
    logger.info("Email sent to %s: %s", to, subject)


async def send_risk_comment_email(
    to_email: str,
    cve_id: str,
    acceptance_id: str,
    author_name: str,
    comment_text: str,
    base_url: str | None = None,
) -> None:
    base_url = base_url or settings.app_base_url
    tmpl = _jinja_env.get_template("risk_comment.html")
    html = tmpl.render(
        cve_id=cve_id,
        author_name=author_name,
        comment_text=comment_text,
        link=_app_link(base_url, f"/risk-acceptances/{acceptance_id}"),
    )
    await send_email(to_email, f"Neuer Kommentar zur Risikoakzeptanz: {cve_id}", html)


async def send_risk_status_email(
    to_email: str,
    cve_id: str,
    acceptance_id: str,
    status: str,
    reviewer_name: str,
    comment: str | None,
    base_url: str | None = None,
) -> None:
    base_url = base_url or settings.app_base_url
    status_de = {"approved": "genehmigt", "rejected": "abgelehnt"}.get(status, status)
    tmpl = _jinja_env.get_template("risk_status_change.html")
    html = tmpl.render(
        cve_id=cve_id,
        status=status_de,
        reviewer_name=reviewer_name,
        comment=comment,
        link=_app_link(base_url, f"/risk-acceptances/{acceptance_id}"),
    )
    await send_email(to_email, f"Risikoakzeptanz {status_de}: {cve_id}", html)


async def send_escalation_email(
    to_email: str,
    cve_id: str,
    namespace: str,
    cluster_name: str,
    level: int,
    base_url: str | None = None,
    severity: int | None = None,
    cvss: float | None = None,
    epss_probability: float | None = None,
    deployments: list[dict] | None = None,
) -> None:
    base_url = base_url or settings.app_base_url
    tmpl = _jinja_env.get_template("escalation.html")
    html = tmpl.render(
        cve_id=cve_id,
        namespace=namespace,
        cluster_name=cluster_name,
        level=level,
        severity=severity,
        cvss=cvss,
        epss_probability=epss_probability,
        deployments=deployments or [],
        link=_app_link(base_url, "/escalations"),
    )
    await send_email(to_email, f"CVE-Eskalation Stufe {level}: {cve_id}", html)


async def send_escalation_warning_email(
    to_email: str,
    cve_id: str,
    namespace: str,
    cluster_name: str,
    level: int,
    days_until: int,
    base_url: str | None = None,
    severity: int | None = None,
    cvss: float | None = None,
    epss_probability: float | None = None,
    deployments: list[dict] | None = None,
) -> None:
    base_url = base_url or settings.app_base_url
    tmpl = _jinja_env.get_template("escalation_warning.html")
    html = tmpl.render(
        cve_id=cve_id,
        namespace=namespace,
        cluster_name=cluster_name,
        level=level,
        days_until=days_until,
        severity=severity,
        cvss=cvss,
        epss_probability=epss_probability,
        deployments=deployments or [],
        link=_app_link(base_url, "/escalations"),
    )
    await send_email(to_email, f"CVE-Eskalation in {days_until} Tagen: {cve_id}", html)


async def send_mention_email(
    to_email: str,
    author_name: str,
    context_label: str,
    link: str,
) -> None:
    """Send one @mention notification email.

    The template intentionally omits the comment text: recipient namespace
    access cannot be verified at send time, so only author, context, and the
    anchored link are included.
    """
    tmpl = _jinja_env.get_template("mention.html")
    html = tmpl.render(author_name=author_name, context_label=context_label, link=link)
    await send_email(to_email, f"Erwähnung von {author_name}", html)


async def send_mention_emails(jobs: "Sequence[MentionEmailJob]") -> None:
    """Best-effort delivery of all mention emails for one comment.

    Runs as a single post-commit background task. Each recipient is isolated:
    an SMTP failure for one address is logged and never blocks the others, and
    never affects the already-committed comment response.
    """
    for job in jobs:
        try:
            await send_mention_email(job.to_email, job.author_name, job.context_label, job.link)
        except Exception:
            logger.exception(
                "Mention email delivery failed",
                extra={
                    "recipient_id": job.recipient_id,
                    "context_label": job.context_label,
                    "link": job.link,
                },
            )


async def send_weekly_digest(
    to_email: str,
    stats: dict,
    base_url: str | None = None,
) -> None:
    base_url = base_url or settings.app_base_url
    tmpl = _jinja_env.get_template("weekly_digest.html")
    html = tmpl.render(stats=stats, link=base_url)
    await send_email(to_email, "Wöchentlicher CVE-Bericht", html)
