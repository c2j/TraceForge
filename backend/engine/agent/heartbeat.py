"""Heartbeat module for Agent mode.

Per spec FR-036: Send heartbeat every 30s with status, kernels, active_tasks.
Per spec acceptance scenario 5: Heartbeat contains status, active_tasks, available_slots, kernels.
"""

import asyncio
import time
import uuid
from typing import Dict, Any, List, Optional
from agent.client import ServerClient
from database.kernel_repo import KernelRepository
from database import get_session
from utils.logging import Logger


class HeartbeatManager:
    """Manages heartbeat to Server in Agent mode."""

    def __init__(
        self,
        server_client: Optional[ServerClient] = None,
        agent_id: str = "test-agent",
        interval: int = 30,
    ):
        """Initialize HeartbeatManager.

        Args:
            server_client: ServerClient instance (optional for testing)
            agent_id: Unique Agent identifier (UUID)
            interval: Heartbeat interval in seconds (default: 30 per spec FR-036)
        """
        self.server_client = server_client
        self.agent_id = agent_id
        self.interval = interval
        self.logger = Logger.get(__name__)
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self):
        """Start heartbeat task."""
        if self._running:
            return

        self._running = True
        self._task = asyncio.create_task(self._heartbeat_loop())
        self.logger.info(f"Heartbeat started (interval: {self.interval}s)")

    async def stop(self):
        """Stop heartbeat task."""
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None
        self.logger.info("Heartbeat stopped")

    async def start_heartbeat_loop(self, interval: Optional[int] = None):
        """Start heartbeat loop (for test compatibility).

        Args:
            interval: Override default interval
        """
        if interval is not None:
            self.interval = interval
        self._task = asyncio.create_task(self._heartbeat_loop())
        await asyncio.sleep(0.1)

    async def stop_heartbeat_loop(self):
        """Stop heartbeat loop (for test compatibility)."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _heartbeat_loop(self):
        """Heartbeat loop - send heartbeat every interval seconds."""
        while self._running:
            try:
                await self._send_heartbeat()
                await asyncio.sleep(self.interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Heartbeat error: {e}")
                await asyncio.sleep(self.interval)

    async def send_heartbeat(self) -> Optional[Dict[str, Any]]:
        """Send heartbeat to Server (public method for testing).

        Per spec FR-036: Include status, kernels, active_tasks in heartbeat.

        Returns:
            Heartbeat payload if sent, None otherwise
        """
        session = get_session()
        kernel_repo = KernelRepository(session)

        try:
            kernels = kernel_repo.get_all()
            kernel_list = [
                {
                    "id": k.id,
                    "name": k.name,
                    "version": k.version,
                }
                for k in kernels
            ]

            heartbeat_data = {
                "agent_id": self.agent_id,
                "timestamp": int(time.time() * 1000),
                "status": "available",
                "active_tasks": 0,  # TODO: Get from task semaphore (T062)
                "available_slots": 5,  # TODO: Get from task semaphore (T062)
                "kernels": kernel_list,
            }

            result = await self._send_heartbeat_http(heartbeat_data)

            if result:
                self.logger.debug(f"Heartbeat sent: {heartbeat_data['active_tasks']} active tasks")
                return heartbeat_data
            else:
                self.logger.warning("Heartbeat failed")
                return None

        finally:
            session.close()

    async def _send_heartbeat(self):
        """Internal send heartbeat method."""
        await self.send_heartbeat()

    async def _send_heartbeat_http(self, heartbeat_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send heartbeat via HTTP (for testing).

        Args:
            heartbeat_data: Heartbeat payload

        Returns:
            Response data
        """
        if not self.server_client:
            return {}
        return await self.server_client.send_heartbeat(heartbeat_data)
