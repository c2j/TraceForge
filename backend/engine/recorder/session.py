"""Recording session manager for ForgeEngine.

Manages recording session state machine: active/paused/stopped.
Per spec FR-005: Start recording sessions with headful browser and Playwright trace enabled.
"""

import uuid
import asyncio
from typing import Optional, Dict, Any

from utils.logging import Logger


class RecordingSession:
    """Represents a recording session with state machine."""

    def __init__(self, session_id: str, start_url: str):
        """Initialize a new recording session."""
        self.session_id = session_id
        self.status = "active"  # active, paused, stopped
        self.start_url = start_url
        self.browser_context_id = None  # Playwright BrowserContext ID
        self.pages: list = []  # In-memory Page nodes
        self.actions: list = []  # In-memory Action nodes
        self.logger = Logger.get(__name__)

    def add_page(self, page: dict) -> None:
        """Add a new page node to the recording session."""
        self.pages.append(page)
        self.logger.info(f"Added page: {page.get('id')} - {page.get('name')}")

    def add_action(self, action: dict) -> None:
        """Add a new action node to the recording session."""
        self.actions.append(action)
        self.logger.debug(f"Added action: {action.get('id')} - {action.get('action_type')}")

    def get_script_json(self) -> dict:
        """Generate complete Script JSON from recorded pages and actions.

        Per spec FR-010: Return complete Script JSON with Scenario-Page-Action hierarchy.
        """
        # Add actions to pages
        pages_with_actions = []
        for page in self.pages:
            pages_with_actions.append({**page, "actions": [a for a in self.actions]})

        return {
            "id": str(uuid.uuid4()),
            "name": f"Recording - {self.session_id[:8]}",
            "scenarios": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Recorded Scenario",
                    "description": f"Recording session {self.session_id}",
                    "pages": pages_with_actions,
                }
            ],
        }

    def pause(self) -> None:
        """Pause the recording session.

        Per spec: Connection loss triggers 30s pause/reconnect.
        """
        self.status = "paused"
        self.logger.info(f"Paused recording session: {self.session_id}")

    def resume(self) -> None:
        """Resume a paused recording session."""
        self.status = "active"
        self.logger.info(f"Resumed recording session: {self.session_id}")

    def stop(self) -> dict:
        """Stop the recording session.

        Returns:
            Script JSON
            Pages and Actions
        """
        self.status = "stopped"
        self.logger.info(f"Stopped recording session: {self.session_id}")

        return self.get_script_json()


# Global active session
_active_session: Optional[RecordingSession] = None


def create_session(start_url: str) -> RecordingSession:
    """Create and activate a new recording session."""
    session_id = str(uuid.uuid4())
    session = RecordingSession(session_id, start_url)
    global _active_session
    _active_session = session
    return session


def get_active_session() -> Optional[RecordingSession]:
    """Get the currently active recording session."""
    return _active_session


def stop_active_session() -> Optional[dict]:
    """Stop the active recording session if exists.

    Returns:
        Script JSON or None
    """
    global _active_session
    if _active_session:
        result = _active_session.stop()
        _active_session = None
        return result
    return None


def pause_active_session() -> None:
    """Pause the active recording session if exists."""
    global _active_session
    if _active_session:
        _active_session.pause()
