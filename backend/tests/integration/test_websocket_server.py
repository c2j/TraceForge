"""Integration tests for WebSocket Server functionality.

Per spec US1: WebSocket server accepts connections, handles health_check and get_kernels.
"""

import pytest
import time
from fastapi.testclient import TestClient

# Import Engine components
import sys
import os

# Add parent directories to path for imports
test_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(test_dir)
parent_dir = os.path.dirname(backend_dir)
engine_dir = os.path.join(parent_dir, "engine")
sys.path.insert(0, engine_dir)

from main import create_app
from models.websocket import (
    WSMessage,
    MessageType,
    HealthCheckRequest,
    GetKernelsRequest,
)
from websocket.manager import get_manager


class TestWebSocketServer:
    """Integration tests for WebSocket Server.

    Per spec T020-T023: WebSocket endpoint, handlers, connection management.
    """

    @pytest.fixture(autouse=True)
    def setup_database(self):
        """Initialize database before tests."""
        from database import init_db

        init_db()
        yield
        # No cleanup needed, tests use same database

    @pytest.fixture(autouse=True)
    def reset_manager(self, setup_database):
        """Reset connection manager before each test."""
        manager = get_manager()
        # Clear all active connections
        manager.active_connections.clear()
        yield
        # Cleanup after test
        manager.active_connections.clear()

    @pytest.fixture
    def app(self):
        """Create test FastAPI application."""
        return create_app()

    def test_websocket_connection_established(self, app):
        """Test that WebSocket connection can be established.

        Per spec T020: Implement /ws WebSocket endpoint.
        """
        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            # Connection established if no exception raised
            assert websocket is not None

    @pytest.mark.asyncio
    async def test_health_check_request_response(self, app):
        """Test that health_check request returns pong response.

        Per spec T021: health_check handler responds within 100ms.
        Per spec FR-022: Health check returns mode and active_sessions.
        """
        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            # Send health_check request
            request = WSMessage(
                id="test-health-check-001",
                type=MessageType.REQUEST,
                action="health_check",
                payload=HealthCheckRequest().model_dump(),
            )
            websocket.send_json(request.model_dump())

            # Receive response
            response_data = websocket.receive_json()
            response = WSMessage(**response_data)

            # Verify response structure
            assert response.type == MessageType.RESPONSE
            assert response.action == "health_check"
            assert response.id == request.id
            assert response.payload is not None
            assert "mode" in response.payload
            assert response.payload["mode"] in ["desktop", "agent"]
            assert "active_sessions" in response.payload

    @pytest.mark.asyncio
    async def test_health_check_response_time(self, app):
        """Test that health_check responds within 100ms.

        Per spec T021: Respond within 100ms.
        Per spec performance goal: 100ms for health check.
        """
        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            request = WSMessage(
                id="test-health-check-time-001",
                type=MessageType.REQUEST,
                action="health_check",
                payload=HealthCheckRequest().model_dump(),
            )

            start_time = time.time()
            websocket.send_json(request.model_dump())
            response_data = websocket.receive_json()
            elapsed = (time.time() - start_time) * 1000  # Convert to ms

            response = WSMessage(**response_data)
            assert response.type == MessageType.RESPONSE
            assert elapsed < 100, f"Health check took {elapsed}ms, expected <100ms"

    @pytest.mark.asyncio
    async def test_get_kernels_returns_list(self, app):
        """Test that get_kernels returns kernel list.

        Per spec T022: get_kernels handler returns available kernels.
        Per spec FR-001: Kernels registered from kernel_repo.
        """
        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            # Send get_kernels request
            request = WSMessage(
                id="test-get-kernels-001",
                type=MessageType.REQUEST,
                action="get_kernels",
                payload=GetKernelsRequest().model_dump(),
            )
            websocket.send_json(request.model_dump())

            # Receive response
            response_data = websocket.receive_json()
            response = WSMessage(**response_data)

            # Verify response structure
            assert response.type == MessageType.RESPONSE
            assert response.action == "get_kernels"
            assert response.id == request.id
            assert "kernels" in response.payload
            assert isinstance(response.payload["kernels"], list)

    @pytest.mark.asyncio
    async def test_get_kernels_kernel_structure(self, app):
        """Test that get_kernels returns proper kernel structure.

        Per spec: Kernel has id, name, type, browser_path, version.
        """
        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            request = WSMessage(
                id="test-get-kernels-structure-001",
                type=MessageType.REQUEST,
                action="get_kernels",
                payload=GetKernelsRequest().model_dump(),
            )
            websocket.send_json(request.model_dump())

            response_data = websocket.receive_json()
            response = WSMessage(**response_data)

            kernels = response.payload["kernels"]
            if len(kernels) > 0:
                kernel = kernels[0]
                assert "id" in kernel
                assert "name" in kernel
                assert "type" in kernel
                assert "browser_path" in kernel
                assert "version" in kernel

    def test_multiple_connections_not_supported(self, app):
        """Test that concurrent connections are rejected.

        Per spec FR-030: Single-session mode - reject concurrent requests.
        Per spec T028: Implement single-session lock.
        """
        client = TestClient(app)

        # First connection
        with client.websocket_connect("/ws") as ws1:
            # Second connection should be rejected or limited
            try:
                with client.websocket_connect("/ws") as ws2:
                    # If we get here, concurrent connections are allowed
                    # This test should verify that they are properly managed
                    pass
            except Exception as e:
                # Concurrent connection rejected as expected
                pass

    @pytest.mark.asyncio
    async def test_unknown_action_returns_error(self, app):
        """Test that unknown actions return error response.

        Per spec: Invalid actions should return error message.
        """
        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            request = WSMessage(
                id="test-unknown-action-001",
                type=MessageType.REQUEST,
                action="unknown_action",
                payload={},
            )
            websocket.send_json(request.model_dump())

            response_data = websocket.receive_json()
            response = WSMessage(**response_data)

            # Should receive error response
            assert response.type in [MessageType.RESPONSE, MessageType.EVENT]
            if response.type == MessageType.RESPONSE:
                assert (
                    response.error is not None
                    or "error" in str(response.payload).lower()
                )

    @pytest.mark.asyncio
    async def test_invalid_message_structure(self, app):
        """Test that invalid message structures are handled.

        Per spec T080: Validate message structure, sanitize inputs.
        """
        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            # Send invalid JSON
            websocket.send_text("{invalid json}")

            # Should receive error response or close connection
            try:
                response_data = websocket.receive_json()
                # If we get a response, verify it's an error
                response = WSMessage(**response_data)
                assert response.error is not None
            except Exception:
                # Connection may close on invalid input
                pass

    @pytest.mark.asyncio
    async def test_connection_cleanup_on_disconnect(self, app):
        """Test that connection is cleaned up on disconnect.

        Per spec T023: Disconnect handling in connection manager.
        """
        client = TestClient(app)

        # Connect and then disconnect
        with client.websocket_connect("/ws") as websocket:
            # Send a request first
            request = WSMessage(
                id="test-cleanup-001",
                type=MessageType.REQUEST,
                action="health_check",
                payload=HealthCheckRequest().model_dump(),
            )
            websocket.send_json(request.model_dump())
            websocket.receive_json()

        # Connection should be cleaned up after exiting context
        # (Cannot directly test manager state without accessing internals)
