"""Database connection pool and initialization."""

import os
from typing import Optional, Union
from sqlalchemy import create_engine, text, Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from database.models import Base


# Global engine and session factory
_engine: Optional[Engine] = None
_session_factory: Optional[sessionmaker] = None


def get_engine():
    """Get or create the database engine.

    Uses WAL mode for better concurrency per spec research.
    """
    global _engine
    if _engine is None:
        db_path = os.environ.get("FORGE_DB_PATH", "forgeengine.db")
        _engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=False,
        )
        # Enable WAL mode and foreign keys
        with _engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL"))
            conn.execute(text("PRAGMA foreign_keys=ON"))
            conn.execute(text("PRAGMA synchronous=NORMAL"))
    return _engine


def init_db() -> None:
    """Initialize database schema if needed."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine, checkfirst=True)

    # Register default kernels (use a separate session to avoid issues)
    try:
        _register_default_kernels()
    except Exception as e:
        # Log but don't fail init if kernel registration has issues
        import logging

        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to register default kernels: {e}")


def get_session() -> Session:
    """Get a new database session."""
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=get_engine(),
        )
    return _session_factory()


def close_db() -> None:
    """Close database connections."""
    global _engine
    if _engine:
        _engine.dispose()
        _engine = None
        _session_factory = None


def get_db() -> Session:
    """Get a new database session.

    Alias for get_session() for backward compatibility.
    """
    return get_session()


def _register_default_kernels() -> None:
    """Register default Chrome kernels if they don't exist."""
    from database.kernel_repo import KernelRepository
    from database.models import Kernel
    import logging

    logger = logging.getLogger(__name__)
    session = get_session()
    repo = KernelRepository(session)

    try:
        # Check if default kernels already exist
        existing = repo.get_all()
        if any(k.id == "default-chrome" for k in existing):
            return

        # Register default Chrome kernel
        default_kernel = Kernel(
            id="default-chrome",
            name="Default Chrome",
            executable_path="/usr/bin/google-chrome",  # Default path, will be validated
            version="unknown",
            is_default_record=True,
            is_default_agent=True,
        )
        session.add(default_kernel)
        session.commit()
        logger.info("Registered default Chrome kernel")
    except Exception as e:
        # Kernel already exists or table issue, ignore
        logger.warning(f"Failed to register default kernel: {e}")
        session.rollback()
    finally:
        session.close()
