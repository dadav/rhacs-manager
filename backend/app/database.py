from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import settings

# App database — read-write
app_engine = create_async_engine(settings.app_db_url, echo=False, pool_pre_ping=True)
AppSessionLocal = async_sessionmaker(
    app_engine, class_=AsyncSession, expire_on_commit=False
)

# StackRox Central database — read-only
stackrox_engine = create_async_engine(
    settings.stackrox_db_url,
    echo=False,
    pool_pre_ping=True,
    execution_options={"postgresql_readonly": True},
)
StackRoxSessionLocal = async_sessionmaker(
    stackrox_engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass
