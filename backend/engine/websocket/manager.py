"""WebSocket connection manager for ForgeEngine.

Tracks connections, handles disconnects, and manages message broadcasting.
"""

import asyncio
from typing import Dict, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect

from utils.logging import Logger


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting."""

    def __init__(self):
        """Initialize connection manager."""
        self.active_connections: Dict[str, WebSocket] = {}
        self.paused_sessions: Dict[str, asyncio.Task] = {}
        self.reconnect_timeout = 30.0
        self.logger = Logger.get(__name__)

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.logger.info(f"Client connected: {client_id}")
        self.logger.info(f"Active connections: {len(self.active_connections)}")

    def disconnect(self, client_id: str) -> None:
        """Remove a WebSocket connection."""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            del self.active_connections[client_id]
            self.logger.info(f"Client disconnected: {client_id}")
            self.logger.info(f"Active connections: {len(self.active_connections)}")

    async def handle_connection_loss(
        self, client_id: str, session_id: Optional[str] = None
    ) -> None:
        """Handle WebSocket connection loss with pause/reconnect mechanism.

        Per spec FR-034: Pause session for 30s waiting for reconnection.
        Per spec FR-035: If no reconnection within 30s, terminate session.

        Args:
            client_id: Client ID that disconnected
            session_id: Optional session ID to pause (for recording/execution sessions)
        """
        self.logger.warning(f"Connection lost for client: {client_id}")

        if session_id:
            self.logger.info(
                f"Pausing session {session_id} for {self.reconnect_timeout}s reconnect window"
            )

            async def wait_for_reconnect():
                try:
                    await asyncio.sleep(self.reconnect_timeout)
                    if client_id not in self.active_connections:
                        self.logger.warning(
                            f"Session {session_id} terminated after {self.reconnect_timeout}s timeout"
                        )
                    del self.paused_sessions[session_id]
                except asyncio.CancelledError:
                    self.logger.info(f"Session {session_id} reconnected, cancelling timeout")

            self.paused_sessions[session_id] = asyncio.create_task(wait_for_reconnect())

    async def cancel_reconnect_timeout(self, session_id: str) -> None:
        """Cancel reconnect timeout when client reconnects.

        Args:
            session_id: Session ID to cancel timeout for
        """
        if session_id in self.paused_sessions:
            task = self.paused_sessions[session_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del self.paused_sessions[session_id]
            self.logger.info(f"Reconnect timeout cancelled for session: {session_id}")

    async def send_personal_message(self, client_id: str, message: dict) -> None:
        """Send a message to a specific client."""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception as e:
                self.logger.error(f"Failed to send message to {client_id}: {e}")

    async def broadcast(self, message: dict) -> None:
        """Broadcast a message to all connected clients."""
        disconnected = []
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except WebSocketDisconnect:
                disconnected.append(client_id)
            except Exception as e:
                self.logger.error(f"Failed to broadcast to {client_id}: {e}")
        # Clean up disconnected clients
        for client_id in disconnected:
            self.disconnect(client_id)

    def get_active_count(self) -> int:
        """Get number of active connections."""
        return len(self.active_connections)

    def has_active_connection(self, client_id: str) -> bool:
        """Check if client ID has active connection."""
        return client_id in self.active_connections


# Global connection manager instance
_manager: Optional[ConnectionManager] = None


def get_manager() -> ConnectionManager:
    """Get or create the connection manager singleton."""
    global _manager
    if _manager is None:
        _manager = ConnectionManager()
    return _manager
