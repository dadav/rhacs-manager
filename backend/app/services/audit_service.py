from sqlalchemy.ext.asyncio import AsyncSession

from ..models.audit_log import AuditLog


async def log_action(
    session: AsyncSession,
    user_id: str | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    details: dict | None = None,
) -> None:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
    )
    session.add(entry)
    await session.flush()
