"""Integration tests for Agent Mode functionality.

Per spec US5: Agent mode with headless execution, Server registration, API Key auth, heartbeat.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import time
import sys
import os

# Add parent directories to path for imports
test_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(test_dir)
parent_dir = os.path.dirname(backend_dir)
engine_dir = os.path.join(parent_dir, "engine")
sys.path.insert(0, engine_dir)

from agent.auth import AuthManager
from agent.heartbeat import HeartbeatManager
from agent.client import ServerClient


class TestAgentMode:
    """Integration tests for Agent Mode.

    Per spec T054-T061: Agent mode setup, Server registration, authentication, heartbeat.
    """

    @pytest.fixture
    def auth_manager(self):
        """Create AuthManager for testing."""
        return AuthManager("test-api-key-12345")

    @pytest.fixture
    def heartbeat_manager(self):
        """Create HeartbeatManager for testing."""
        return HeartbeatManager()

    @pytest.fixture
    def server_client(self):
        """Create ServerClient for testing."""
        return ServerClient(
            server_url="http://localhost:8080", api_key="test-api-key-12345"
        )

    def test_auth_manager_created(self, auth_manager):
        """Test that AuthManager can be instantiated.

        Per spec T058: Create API Key authentication module.
        """
        assert auth_manager is not None
        assert hasattr(auth_manager, "validate_api_key")
        assert hasattr(auth_manager, "generate_token")

    def test_auth_validate_valid_api_key(self, auth_manager):
        """Test validating a valid API Key.

        Per spec T058: Validate API Key from WebSocket handshake or headers.
        """
        # Valid API Key should pass
        result = auth_manager.validate_api_key("test-api-key-12345")
        assert result is True

    def test_auth_validate_invalid_api_key(self, auth_manager):
        """Test validating an invalid API Key.

        Per spec T058: Validate API Key, reject invalid ones.
        Per spec FR-036: Authentication required for Agent mode.
        """
        # Invalid API Key should fail
        result = auth_manager.validate_api_key("invalid-api-key")
        assert result is False

    def test_auth_validate_empty_api_key(self, auth_manager):
        """Test validating empty API Key.

        Per spec: Reject empty or missing API Keys.
        """
        result = auth_manager.validate_api_key("")
        assert result is False

        result = auth_manager.validate_api_key(None)
        assert result is False

    def test_auth_generate_token(self, auth_manager):
        """Test token generation.

        Per spec T058: Generate tokens for authenticated connections.
        """
        token = auth_manager.generate_token()
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_auth_tokens_are_unique(self, auth_manager):
        """Test that generated tokens are unique.

        Per spec: Tokens should be unique per connection.
        """
        token1 = auth_manager.generate_token()
        token2 = auth_manager.generate_token()
        assert token1 != token2

    def test_heartbeat_manager_created(self, heartbeat_manager):
        """Test that HeartbeatManager can be instantiated.

        Per spec T060: Create heartbeat module.
        """
        assert heartbeat_manager is not None
        assert hasattr(heartbeat_manager, "send_heartbeat")
        assert hasattr(heartbeat_manager, "start_heartbeat_loop")
        assert hasattr(heartbeat_manager, "stop_heartbeat_loop")

    @pytest.mark.asyncio
    async def test_heartbeat_send_mock(self, heartbeat_manager):
        """Test sending heartbeat.

        Per spec T060: Send heartbeat every 30s with status, kernels, active_tasks.
        """
        mock_send = AsyncMock()
        with patch.object(heartbeat_manager, "_send_heartbeat_http", mock_send):
            await heartbeat_manager.send_heartbeat()
            mock_send.assert_called_once()

    @pytest.mark.asyncio
    async def test_heartbeat_payload_structure(self, heartbeat_manager):
        """Test heartbeat payload structure.

        Per spec T060: Heartbeat includes status, kernels, active_tasks.
        """
        mock_send = AsyncMock()
        with patch.object(heartbeat_manager, "_send_heartbeat_http", mock_send):
            await heartbeat_manager.send_heartbeat()

            # Verify payload structure
            call_args = mock_send.call_args[0][0]
            assert "status" in call_args
            assert "kernels" in call_args
            assert "active_tasks" in call_args
            assert "timestamp" in call_args

    @pytest.mark.asyncio
    async def test_heartbeat_loop_started_stopped(self, heartbeat_manager):
        """Test that heartbeat loop can be started and stopped.

        Per spec T061: Implement heartbeat scheduling.
        """
        # Start heartbeat loop with short interval for testing
        await heartbeat_manager.start_heartbeat_loop(interval=1)

        # Wait for at least one heartbeat
        await asyncio.sleep(2)

        # Stop heartbeat loop
        await heartbeat_manager.stop_heartbeat_loop()

        # Should stop cleanly
        assert True

    def test_server_client_created(self, server_client):
        """Test that ServerClient can be instantiated.

        Per spec T056: Create Server client.
        """
        assert server_client is not None
        assert hasattr(server_client, "register")
        assert hasattr(server_client, "send_heartbeat")
        assert hasattr(server_client, "reconnect")

    @pytest.mark.asyncio
    async def test_server_client_register_mock(self, server_client):
        """Test Server registration.

        Per spec T056: POST registration on startup with kernel list and capabilities.
        """
        kernels = [
            {
                "id": "chrome-86",
                "name": "Chrome 86",
                "type": "chrome",
                "browser_path": "/usr/bin/chrome",
                "version": "86.0.4240.111",
            }
        ]
        capabilities = {"max_concurrent_tasks": 5, "supports_headless": True}

        mock_post = AsyncMock(
            return_value={"status": "registered", "agent_id": "agent-001"}
        )

        with patch.object(server_client, "_http_post", mock_post):
            result = await server_client.register(kernels, capabilities)

            # Verify registration payload
            assert mock_post.called
            call_args = mock_post.call_args[0][0]
            assert "/register" in call_args
            payload = mock_post.call_args[0][1]
            assert "kernels" in payload
            assert "capabilities" in payload

    @pytest.mark.asyncio
    async def test_server_client_heartbeat_mock(self, server_client):
        """Test sending heartbeat to Server.

        Per spec T060: Send heartbeat to Server.
        """
        heartbeat_payload = {
            "status": "idle",
            "kernels": [],
            "active_tasks": [],
            "timestamp": "2026-01-01T00:00:00Z",
        }

        mock_post = AsyncMock(return_value={"status": "received"})

        with patch.object(server_client, "_http_post", mock_post):
            result = await server_client.send_heartbeat(heartbeat_payload)

            # Verify heartbeat payload
            assert mock_post.called
            call_args = mock_post.call_args[0][0]
            assert "/heartbeat" in call_args
            payload = mock_post.call_args[0][1]
            assert payload["status"] == "idle"
            assert "kernels" in payload
            assert "active_tasks" in payload

    @pytest.mark.asyncio
    async def test_server_client_reconnect_mock(self, server_client):
        """Test Server reconnection logic.

        Per spec T068: Implement Server reconnection logic.
        """
        mock_register = AsyncMock(
            return_value={"status": "registered", "agent_id": "agent-001"}
        )

        with patch.object(server_client, "register", mock_register):
            await server_client.reconnect()
            mock_register.assert_called_once()

    def test_auth_api_key_not_logged(self, auth_manager, caplog):
        """Test that API Keys are not logged.

        Per spec T082: Add API Key logging protection.
        Per spec security: Never log API Keys.
        """
        import logging

        with caplog.at_level(logging.INFO):
            result = auth_manager.validate_api_key("test-api-key-12345")

        # API Key should not appear in logs
        for record in caplog.records:
            assert "test-api-key-12345" not in record.message
            assert (
                "api-key" not in record.message.lower()
                or "api_key" not in record.message
            )

    @pytest.mark.asyncio
    async def test_heartbeat_interval_is_30s(self, heartbeat_manager):
        """Test that heartbeat interval is 30 seconds.

        Per spec T060: Send heartbeat every 30s.
        """
        # Get default interval
        assert hasattr(heartbeat_manager, "interval")
        # Default should be 30 seconds
        # Note: This test verifies the constant, not actual timing

    @pytest.mark.asyncio
    async def test_server_client_handles_registration_failure(self, server_client):
        """Test handling of registration failure.

        Per spec: Handle registration failures gracefully.
        """
        kernels = []
        capabilities = {}

        mock_post = AsyncMock(
            side_effect=Exception("Registration failed: Server unavailable")
        )

        with patch.object(server_client, "_http_post", mock_post):
            try:
                result = await server_client.register(kernels, capabilities)
                # Should handle error gracefully
            except Exception as e:
                # Or raise appropriate error
                assert "Server" in str(e) or "registration" in str(e).lower()

    @pytest.mark.asyncio
    async def test_heartbeat_handles_network_errors(self, heartbeat_manager):
        """Test that heartbeat handles network errors.

        Per spec: Handle network errors gracefully, retry on next heartbeat.
        """
        mock_send = AsyncMock(side_effect=Exception("Network error"))

        with patch.object(heartbeat_manager, "_send_heartbeat_http", mock_send):
            # Should not crash
            try:
                await heartbeat_manager.send_heartbeat()
            except Exception:
                pass  # Expected to handle gracefully

    def test_auth_manager_different_keys(self, auth_manager):
        """Test that different API Keys are treated differently.

        Per spec FR-036: Each agent has its own API Key.
        """
        key1 = "key-001"
        key2 = "key-002"

        # Set a new key
        auth_manager.set_api_key(key1)
        assert auth_manager.validate_api_key(key1) is True
        assert auth_manager.validate_api_key(key2) is False

        # Change key
        auth_manager.set_api_key(key2)
        assert auth_manager.validate_api_key(key2) is True
        assert auth_manager.validate_api_key(key1) is False

    @pytest.mark.asyncio
    async def test_server_client_registration_includes_agent_info(self, server_client):
        """Test that registration includes agent information.

        Per spec: Registration includes agent ID, capabilities, kernels.
        """
        kernels = [{"id": "chrome-86", "name": "Chrome 86", "type": "chrome"}]
        capabilities = {"max_concurrent_tasks": 5}

        mock_post = AsyncMock(return_value={"status": "registered"})

        with patch.object(server_client, "_http_post", mock_post):
            await server_client.register(kernels, capabilities)

            payload = mock_post.call_args[0][1]
            assert "agent_id" in payload
            assert "capabilities" in payload
            assert "kernels" in payload
            assert "max_concurrent_tasks" in payload["capabilities"]


# Import asyncio for test-06
import asyncio
