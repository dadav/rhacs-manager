"""Send test escalation emails to Mailhog for visual verification.

Usage:
    uv run python scripts/test_escalation_email.py

Expects Mailhog running on SMTP_HOST:SMTP_PORT (default localhost:1025).
"""

import asyncio
import logging
from uuid import uuid4

from sqlalchemy import select

from app.config import settings
from app.database import AppSessionLocal
from app.mail import service as mail_svc
from app.models.escalation import Escalation
from app.models.global_settings import DEFAULT_ESCALATION_RULES, GlobalSettings
from app.models.namespace_contact import NamespaceContact

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

TEST_NAMESPACE = "test-ns"
TEST_CLUSTER = "dev-cluster"
TEST_CVE = "CVE-2025-99999"
TEST_EMAIL = "team-lead@example.com"
MANAGEMENT_EMAIL = "security-team@example.com"


async def ensure_global_settings(session) -> GlobalSettings:
    result = await session.execute(select(GlobalSettings).limit(1))
    gs = result.scalar_one_or_none()
    if gs:
        logger.info("GlobalSettings already exists (id=%s)", gs.id)
        return gs
    gs = GlobalSettings(escalation_rules=DEFAULT_ESCALATION_RULES)
    session.add(gs)
    await session.flush()
    logger.info("Created GlobalSettings (id=%s)", gs.id)
    return gs


async def ensure_namespace_contact(session) -> NamespaceContact:
    result = await session.execute(
        select(NamespaceContact).where(
            NamespaceContact.namespace == TEST_NAMESPACE,
            NamespaceContact.cluster_name == TEST_CLUSTER,
        )
    )
    contact = result.scalar_one_or_none()
    if contact:
        contact.escalation_email = TEST_EMAIL
        logger.info("Updated NamespaceContact for %s/%s", TEST_NAMESPACE, TEST_CLUSTER)
        return contact
    contact = NamespaceContact(
        namespace=TEST_NAMESPACE,
        cluster_name=TEST_CLUSTER,
        escalation_email=TEST_EMAIL,
    )
    session.add(contact)
    await session.flush()
    logger.info("Created NamespaceContact for %s/%s -> %s", TEST_NAMESPACE, TEST_CLUSTER, TEST_EMAIL)
    return contact


async def create_escalation(session, level: int) -> Escalation:
    esc = Escalation(
        id=uuid4(),
        cve_id=TEST_CVE,
        namespace=TEST_NAMESPACE,
        cluster_name=TEST_CLUSTER,
        level=level,
        notified=True,
    )
    session.add(esc)
    await session.flush()
    logger.info("Created Escalation level %d for %s", level, TEST_CVE)
    return esc


async def main() -> None:
    logger.info("SMTP target: %s:%d", settings.smtp_host, settings.smtp_port)
    logger.info(
        "smtp_tls=%s, smtp_starttls=%s, smtp_validate_certs=%s, smtp_user=%r",
        settings.smtp_tls,
        settings.smtp_starttls,
        settings.smtp_validate_certs,
        settings.smtp_user or None,
    )

    async with AppSessionLocal() as session:
        await ensure_global_settings(session)
        await ensure_namespace_contact(session)

        # Sample deployment data for email preview
        sample_deployments = [
            {"deployment_name": "frontend-app", "image_name": "registry.example.com/frontend:v1.2.3"},
            {"deployment_name": "backend-api", "image_name": "registry.example.com/backend:v2.0.1"},
            {"deployment_name": "worker", "image_name": "registry.example.com/worker:latest"},
        ]

        # Send one escalation email per level (1, 2, 3)
        for level in (1, 2, 3):
            await create_escalation(session, level)
            await mail_svc.send_escalation_email(
                to_email=TEST_EMAIL,
                cve_id=TEST_CVE,
                namespace=TEST_NAMESPACE,
                cluster_name=TEST_CLUSTER,
                level=level,
                severity=level + 1,
                cvss=7.5 + level,
                epss_probability=0.42,
                deployments=sample_deployments,
            )
            logger.info("Sent escalation email level %d -> %s", level, TEST_EMAIL)

        # Send one to management_email as fallback path
        await mail_svc.send_escalation_email(
            to_email=MANAGEMENT_EMAIL,
            cve_id=TEST_CVE,
            namespace=TEST_NAMESPACE,
            cluster_name=TEST_CLUSTER,
            level=3,
            severity=4,
            cvss=9.8,
            epss_probability=0.94,
            deployments=sample_deployments,
        )
        logger.info("Sent management fallback email -> %s", MANAGEMENT_EMAIL)

        await session.commit()

    logger.info("Done! Open http://localhost:8025 to inspect emails in Mailhog.")


if __name__ == "__main__":
    asyncio.run(main())
