"""Structured logging infrastructure for ForgeEngine.

Provides JSON logging with rotation and correlation IDs.
"""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pathlib import Path


class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs logs as JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", None),
        }

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": type(record.exc_info).__name__,
                "message": str(record.exc_info),
            }

        return json.dumps(log_entry)


class Logger:
    """Structured logger with correlation ID support."""

    _loggers: Dict[str, logging.Logger] = {}

    @classmethod
    def get(cls, name: str) -> logging.Logger:
        """Get or create a logger with the given name."""
        if name not in cls._loggers:
            cls._loggers[name] = cls._create_logger(name)
        return cls._loggers[name]

    @classmethod
    def _create_logger(cls, name: str) -> logging.Logger:
        """Create a new logger with JSON formatter and rotation."""
        logger = logging.getLogger(name)
        logger.setLevel(logging.DEBUG)

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(JSONFormatter())
        logger.addHandler(console_handler)

        return logger


_correlation_id: Optional[str] = None


def set_correlation_id(correlation_id: str) -> None:
    """Set correlation ID for the current context."""
    global _correlation_id
    _correlation_id = correlation_id


def get_correlation_id() -> Optional[str]:
    """Get correlation ID for the current context."""
    return _correlation_id


def init_logging(config) -> None:
    """Initialize logging based on configuration.

    Args:
        config: Config object with log_level and log_file
    """
    # Set root logger level
    level = getattr(logging, config.log_level.upper(), logging.INFO)
    logging.basicConfig(level=level)

    # Add file handler if specified
    if config.log_file:
        file_handler = logging.FileHandler(config.log_file, encoding="utf-8")
        file_handler.setFormatter(JSONFormatter())
        logging.getLogger().addHandler(file_handler)
