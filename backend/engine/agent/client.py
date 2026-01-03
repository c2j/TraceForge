"""Server client for Agent mode.

Handles POST registration to Server and task pull.
Per spec FR-020: POST registration on startup with kernel list and capabilities.
Per spec FR-021: Pull tasks from Server via WebSocket or HTTP.
"""

import asyncio
import json
from typing import Optional, Dict, Any, List
from models.kernel import KernelConfig
from utils.logging import Logger

# httpx is optional for development mode
try:
    import httpx
except ImportError:
    httpx = None


class ServerClient:
    """Client for communicating with Server in Agent mode."""

    def __init__(self, server_url: str, api_key: str, agent_id: Optional[str] = None):
        """Initialize Server client.

        Args:
            server_url: Server URL (e.g., "https://forge-server.example.com")
            api_key: API Key for authentication
            agent_id: Unique Agent identifier (optional)
        """
        self.server_url = server_url.rstrip("/")
        self.api_key = api_key
        self.agent_id = agent_id
        self.logger = Logger.get(__name__)
        self._client = None
        self._registered = False
        self._reconnect_task = None

        if httpx is None:
            self.logger.warning("httpx not installed - Server client disabled")

    async def start(self):
        """Initialize HTTP client."""
        if httpx is None:
            self.logger.warning("httpx not available - Server client disabled")
            return

        if not self._client:
            self._client = httpx.AsyncClient(headers={"Authorization": f"Bearer {self.api_key}"})

    async def stop(self):
        """Close HTTP client and cancel reconnection task."""
        if self._client:
            await self._client.aclose()
            self._client = None

        if self._reconnect_task:
            self._reconnect_task.cancel()
            self._reconnect_task = None

    async def register(
        self,
        kernels: Optional[List[Dict[str, Any]]] = None,
        capabilities: Optional[Dict[str, Any]] = None,
        agent_id: Optional[str] = None,
    ) -> bool:
        """Register Agent with Server.

        Per spec FR-020: POST registration on startup with kernel list and capabilities.
        Per spec success scenario 2: Agent registers with Server within 2 seconds.

        Args:
            agent_id: Unique Agent identifier (UUID) - optional, uses self.agent_id if not provided
            kernels: List of available kernels with ID, name, version, capabilities
            capabilities: Agent capabilities (max_concurrent_tasks, headless support, etc.)

        Returns:
            True if registration successful, False otherwise
        """
        actual_agent_id = agent_id or self.agent_id or "test-agent"
        actual_kernels = kernels or []
        actual_capabilities = capabilities or {
            "max_concurrent_tasks": 5,
            "headless": True,
            "trace_support": True,
            "visual_assertions": True,
        }

        if not self._client:
            await self.start()

        if self._client is None:
            self.logger.error("HTTP client not initialized")
            return False

        registration_data = {
            "agent_id": actual_agent_id,
            "kernels": actual_kernels,
            "capabilities": actual_capabilities,
        }

        try:
            self.logger.info(f"Registering Agent {actual_agent_id} with Server: {self.server_url}")

            response_data = await self._http_post("/api/agents/register", registration_data)

            if response_data and response_data.get("status") == "registered":
                self._registered = True
                self.logger.info(
                    f"Agent {actual_agent_id} registered successfully: {response_data}"
                )
                return True
            else:
                self.logger.error(f"Registration failed: {response_data}")
                return False

        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            return False

        registration_data = {
            "agent_id": actual_agent_id,
            "kernels": actual_kernels,
            "capabilities": actual_capabilities,
        }

        try:
            self.logger.info(f"Registering Agent {actual_agent_id} with Server: {self.server_url}")

            response = await self._client.post(
                f"{self.server_url}/api/agents/register",
                json=registration_data,
                timeout=10.0,
            )

            if response.status_code == 200:
                self._registered = True
                self.logger.info(
                    f"Agent {actual_agent_id} registered successfully: {response.json()}"
                )
                return True
            else:
                self.logger.error(f"Registration failed: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            return False

    async def _http_post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """HTTP POST wrapper for testing.

        Args:
            endpoint: API endpoint path
            data: Request payload

        Returns:
            Response data
        """
        if not self._client:
            await self.start()

        if self._client is None:
            raise Exception("HTTP client not initialized")

        response = await self._client.post(
            f"{self.server_url}{endpoint}",
            json=data,
            timeout=10.0,
        )

        return response.json()

    async def send_heartbeat(self, heartbeat_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send heartbeat to Server.

        Per spec FR-036: Send heartbeat every 30s with status, kernels, active_tasks.

        Args:
            heartbeat_data: Heartbeat payload with status, active_tasks, available_slots, kernels

        Returns:
            Response data from server, or empty dict on failure
        """
        if not self._client:
            await self.start()

        if self._client is None:
            self.logger.warning("HTTP client not initialized for heartbeat")
            return {}

        try:
            response_data = await self._http_post("/api/agents/heartbeat", heartbeat_data)

            if response_data:
                self.logger.debug(f"Heartbeat sent: {heartbeat_data}")
                return response_data
            else:
                self.logger.warning(f"Heartbeat failed: {response_data}")
                return {}

        except Exception as e:
            self.logger.error(f"Heartbeat error: {e}")
            await self._schedule_reconnect()
            return {}

    async def reconnect(
        self,
        kernels: Optional[List[Dict[str, Any]]] = None,
        capabilities: Optional[Dict[str, Any]] = None,
        agent_id: Optional[str] = None,
    ):
        """Reconnect to Server.

        Per spec T068: Reconnect on disconnection, re-register on reconnect.

        Args:
            kernels: List of available kernels
            capabilities: Agent capabilities
            agent_id: Unique Agent identifier
        """
        self._registered = False
        await self.register(kernels, capabilities, agent_id)

    async def _schedule_reconnect(
        self,
        kernels: Optional[List[Dict[str, Any]]] = None,
        capabilities: Optional[Dict[str, Any]] = None,
        agent_id: Optional[str] = None,
    ):
        """Schedule Server reconnection attempt.

        Per spec T068: Reconnect on disconnection, re-register on reconnect.
        """
        if self._reconnect_task and not self._reconnect_task.done():
            return

        self.logger.warning("Scheduling Server reconnection in 30 seconds...")
        await asyncio.sleep(30)

        if not self._registered:
            self.logger.info("Attempting Server reconnection...")
            await self.register(kernels, capabilities, agent_id)

    def is_registered(self) -> bool:
        """Check if Agent is registered with Server."""
        return self._registered

    def set_registered(self, registered: bool):
        """Set registration status (for reconnection logic)."""
        self._registered = registered
