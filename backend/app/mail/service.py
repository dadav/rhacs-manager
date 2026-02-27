import logging
from pathlib import Path

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, FileSystemLoader

from ..config import settings

logger = logging.getLogger(__name__)

_template_dir = Path(__file__).parent / "templates"
_jinja_env = Environment(loader=FileSystemLoader(str(_template_dir)), autoescape=True)


async def send_email(to: str, subject: str, html_body: str) -> None:
    if not to:
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            use_tls=settings.smtp_tls,
        )
        logger.info("Email sent to %s: %s", to, subject)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)


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
        link=f"{base_url}/risikoakzeptanzen/{acceptance_id}",
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
        link=f"{base_url}/risikoakzeptanzen/{acceptance_id}",
    )
    await send_email(
        to_email, f"Risikoakzeptanz {status_de}: {cve_id}", html
    )


async def send_escalation_email(
    to_email: str,
    cve_id: str,
    team_name: str,
    level: int,
    base_url: str | None = None,
) -> None:
    base_url = base_url or settings.app_base_url
    tmpl = _jinja_env.get_template("escalation.html")
    html = tmpl.render(
        cve_id=cve_id,
        team_name=team_name,
        level=level,
        link=f"{base_url}/eskalationen",
    )
    await send_email(to_email, f"Eskalation Stufe {level}: {cve_id}", html)


async def send_weekly_digest(
    to_email: str,
    team_name: str,
    stats: dict,
    base_url: str | None = None,
) -> None:
    base_url = base_url or settings.app_base_url
    tmpl = _jinja_env.get_template("weekly_digest.html")
    html = tmpl.render(team_name=team_name, stats=stats, link=base_url)
    await send_email(to_email, f"Wöchentlicher CVE-Bericht: {team_name}", html)
