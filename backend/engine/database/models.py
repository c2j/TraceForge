"""Database schema and models for ForgeEngine.

This module defines SQLAlchemy models for SQLite database.
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Column, Text, Integer, Boolean, String, DateTime
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


class Kernel(Base):
    """Represents a browser kernel configuration."""

    __tablename__ = "kernels"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    executable_path = Column(Text, nullable=False)
    version = Column(Text, nullable=False)
    is_default_record = Column(Boolean, default=False)
    is_default_agent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Script(Base):
    """Represents a test script with hierarchical structure."""

    __tablename__ = "scripts"

    id = Column(Text, primary_key=True)
    project_id = Column(Text, nullable=True)
    script_json = Column(Text, nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    synced_at = Column(DateTime, nullable=True)


class Execution(Base):
    """Represents a script execution run with results."""

    __tablename__ = "executions"

    id = Column(Text, primary_key=True)
    script_id = Column(Text, nullable=False)
    kernel_id = Column(Text, nullable=False)
    status = Column(Text, nullable=False)
    duration_ms = Column(Integer, default=0)
    trace_path = Column(Text, nullable=True)
    artifacts = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Settings(Base):
    """Represents Engine configuration settings."""

    __tablename__ = "settings"

    key = Column(Text, primary_key=True)
    value = Column(Text, nullable=False)
