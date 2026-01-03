"""API Key authentication module for Agent mode.

Per spec FR-028, FR-036: API Key/Token authentication for Server communication.
Per spec security considerations: Never log API Keys, use secure storage.
"""

import os
import uuid
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
from utils.logging import Logger


class AuthManager:
    """Manages API Key authentication for Agent mode."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize AuthManager.

        Args:
            api_key: API Key for authentication (from config or env var)
        """
        self.api_key = api_key or os.environ.get("FORGE_API_KEY")
        self.logger = Logger.get(__name__)

        if not self.api_key:
            self.logger.warning("No API Key configured - Agent mode requires authentication")

    async def authenticate_websocket(self, websocket: WebSocket) -> bool:
        """Authenticate WebSocket connection using API Key.

        Per spec T059: Require API Key for /ws/agent connections.
        Per spec security: Never log API Keys.

        Args:
            websocket: WebSocket connection

        Returns:
            True if authenticated, False otherwise
        """
        if not self.api_key:
            await websocket.close(code=4001, reason="No API Key configured on Agent")
            self.logger.warning("WebSocket rejected: No API Key configured")
            return False

        # Extract API Key from headers
        headers = dict(websocket.headers)
        client_api_key = headers.get("x-api-key") or headers.get("authorization", "").replace(
            "Bearer ", ""
        )

        if not client_api_key:
            await websocket.close(code=4003, reason="Missing API Key in headers")
            self.logger.warning("WebSocket rejected: Missing API Key in headers")
            return False

        if client_api_key != self.api_key:
            await websocket.close(code=4002, reason="Invalid API Key")
            self.logger.warning("WebSocket rejected: Invalid API Key")
            return False

        self.logger.info("WebSocket authenticated successfully")
        return True

    def validate_api_key(self, api_key: str) -> bool:
        """Validate API Key (for internal use, never log).

        Args:
            api_key: API Key to validate

        Returns:
            True if valid, False otherwise
        """
        if not self.api_key:
            return False

        return api_key == self.api_key

    def is_configured(self) -> bool:
        """Check if API Key is configured."""
        return self.api_key is not None

    def generate_token(self) -> str:
        """Generate a unique token for authenticated connections.

        Per spec T058: Generate tokens for authenticated connections.

        Returns:
            Unique token string
        """
        return uuid.uuid4().hex

    def set_api_key(self, api_key: str):
        """Set API Key (for testing and dynamic configuration).

        Args:
            api_key: New API Key
        """
        self.api_key = api_key
