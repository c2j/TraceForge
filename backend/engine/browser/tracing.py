"""Playwright tracing support for ForgeEngine.

Enables and manages Playwright trace generation.
Per spec FR-005: Playwright trace files for debugging.
"""

import os
import uuid
from typing import Optional, Dict
from pathlib import Path

from utils.logging import Logger


# Global tracing state
_tracing_enabled: bool = False
_trace_dir: Path = Path("traces")
_active_traces: Dict[str, str] = {}


class TracingManager:
    """Manages Playwright tracing functionality."""

    def __init__(self, trace_dir: Optional[str] = None):
        """Initialize tracing manager.

        Args:
            trace_dir: Directory to store trace files (default: traces/)
        """
        self.logger = Logger.get(__name__)
        global _trace_dir
        _trace_dir = Path(trace_dir) if trace_dir else Path("traces")
        _trace_dir.mkdir(parents=True, exist_ok=True)

    async def start_tracing(self, context, session_id: str) -> None:
        """Start tracing for a browser context.

        Args:
            context: Playwright browser context
            session_id: Session identifier for trace tracking
        """
        trace_path = str(_trace_dir / f"trace_{session_id}_{uuid.uuid4()}.zip")
        _active_traces[session_id] = trace_path

        if hasattr(context, "tracing") and hasattr(context.tracing, "start"):
            await context.tracing.start(path=trace_path)
            self.logger.info(f"Tracing started for session {session_id}: {trace_path}")
        else:
            self.logger.warning(f"Context does not support tracing for session {session_id}")

    async def stop_tracing(self, context, session_id: str) -> Optional[str]:
        """Stop tracing and save trace file.

        Args:
            context: Playwright browser context
            session_id: Session identifier for trace tracking

        Returns:
            Path to trace.zip file or None
        """
        trace_path = _active_traces.get(session_id)

        if trace_path and hasattr(context, "tracing") and hasattr(context.tracing, "stop"):
            try:
                await context.tracing.stop(path=trace_path)
                self.logger.info(f"Tracing stopped for session {session_id}: {trace_path}")
                return trace_path
            except Exception as e:
                self.logger.error(f"Failed to stop tracing for session {session_id}: {e}")
                return None
        else:
            self.logger.warning(
                f"No active trace or context does not support tracing for session {session_id}"
            )
            return trace_path

    async def get_trace_zip(self, session_id: str) -> Optional[str]:
        """Get path to trace.zip file for a session.

        Args:
            session_id: Session identifier

        Returns:
            Path to trace.zip file or None if not found
        """
        trace_path = _active_traces.get(session_id)
        if trace_path and os.path.exists(trace_path):
            return trace_path
        return None

    def is_enabled(self) -> bool:
        """Check if tracing is currently enabled."""
        return _tracing_enabled

    def enable(self, trace_path: Optional[str] = None) -> str:
        """Enable tracing and return trace file path.

        Args:
            trace_path: Optional specific trace file path (default: auto-generated)

        Returns:
            Path to trace.zip file
        """
        global _tracing_enabled
        _tracing_enabled = True

        if trace_path is None:
            trace_path = str(_trace_dir / f"trace_{uuid.uuid4()}.zip")

        self.logger.info(f"Tracing enabled, trace file: {trace_path}")
        return trace_path

    def disable(self) -> None:
        """Disable tracing."""
        global _tracing_enabled
        _tracing_enabled = False
        self.logger.info("Tracing disabled")


# Global tracing manager instance
_manager: Optional[TracingManager] = None


def get_manager() -> TracingManager:
    """Get or create the tracing manager singleton."""
    global _manager
    if _manager is None:
        _manager = TracingManager()
    return _manager
