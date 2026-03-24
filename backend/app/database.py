from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import settings

# App database — read-write
app_engine = create_async_engine(
    settings.effective_app_db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
AppSessionLocal = async_sessionmaker(app_engine, class_=AsyncSession, expire_on_commit=False)

# StackRox Central database — read-only
# Conservative pool: Central DB has max_connections=100 and must serve
# StackRox itself.  Keep our footprint small.
stackrox_engine = create_async_engine(
    settings.effective_stackrox_db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=7,
    execution_options={"postgresql_readonly": True},
)
StackRoxSessionLocal = async_sessionmaker(stackrox_engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
