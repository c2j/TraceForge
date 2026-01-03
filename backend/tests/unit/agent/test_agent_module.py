"""Unit tests for agent module (task_queue, auth, heartbeat)."""

import sys
import os

# Add parent directories to path for imports
test_file = os.path.abspath(__file__)
unit_dir = os.path.dirname(test_file)
tests_dir = os.path.dirname(unit_dir)
backend_dir = os.path.dirname(tests_dir)
parent_dir = os.path.dirname(backend_dir)
engine_dir = os.path.join(parent_dir, "engine")
sys.path.insert(0, engine_dir)

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from agent.task_queue import TaskQueue
from agent.auth import AuthManager
from models.websocket import WSMessage, MessageType


class TestTaskQueue:
    """Unit tests for TaskQueue."""

    @pytest.fixture
    def task_queue(self):
        """Create a TaskQueue instance for testing."""
        return TaskQueue(max_concurrent=2)

    @pytest.mark.asyncio
    async def test_task_queue_initialization(self, task_queue):
        """Test TaskQueue initialization."""
        assert task_queue.max_concurrent == 2
        assert task_queue.get_active_count() == 0
        assert task_queue.get_queued_count() == 0
        assert task_queue.get_available_slots() == 2

    @pytest.mark.asyncio
    async def test_enqueue_task(self, task_queue):
        """Test enqueuing a task."""
        await task_queue.enqueue({"id": "task-001"})
        assert task_queue.get_queued_count() == 1
        assert task_queue.get_active_count() == 0

    @pytest.mark.asyncio
    async def test_enqueue_multiple_tasks(self, task_queue):
        """Test enqueuing multiple tasks."""
        await task_queue.enqueue({"id": "task-001"})
        await task_queue.enqueue({"id": "task-002"})
        await task_queue.enqueue({"id": "task-003"})
        assert task_queue.get_queued_count() == 3

    @pytest.mark.asyncio
    async def test_dequeue_task(self, task_queue):
        """Test dequeuing a task."""
        await task_queue.enqueue({"id": "task-001", "data": "test"})
        task = await task_queue.dequeue()
        assert task is not None
        assert task["id"] == "task-001"
        assert task_queue.get_queued_count() == 0

    @pytest.mark.asyncio
    async def test_dequeue_empty_queue(self, task_queue):
        """Test dequeuing from empty queue returns None."""
        task = await task_queue.dequeue()
        assert task is None

    @pytest.mark.asyncio
    async def test_get_status(self, task_queue):
        """Test getting queue status."""
        await task_queue.enqueue({"id": "task-001"})
        status = task_queue.get_status()
        assert status["active_tasks"] == 0
        assert status["queued_tasks"] == 1
        assert status["max_concurrent"] == 2

    @pytest.mark.asyncio
    async def test_get_queue_size(self, task_queue):
        """Test getting queue size."""
        assert task_queue.get_queue_size() == 0
        await task_queue.enqueue({"id": "task-001"})
        assert task_queue.get_queue_size() == 1

    @pytest.mark.asyncio
    async def test_get_available_slots(self, task_queue):
        """Test getting available slots."""
        assert task_queue.get_available_slots() == 2

    @pytest.mark.asyncio
    async def test_get_active_count(self, task_queue):
        """Test getting active task count."""
        assert task_queue.get_active_count() == 0

    @pytest.mark.asyncio
    async def test_start_stop_queue(self, task_queue):
        """Test starting and stopping task queue."""
        assert not task_queue._running
        await task_queue.start()
        assert task_queue._running
        await task_queue.stop()
        assert not task_queue._running

    @pytest.mark.asyncio
    async def test_enqueue_with_function(self, task_queue):
        """Test enqueuing a task with a function."""

        async def test_task():
            return "completed"

        await task_queue.enqueue("task-001", test_task)
        assert task_queue.get_queued_count() == 1

    @pytest.mark.asyncio
    async def test_process_tasks(self, task_queue):
        """Test processing tasks."""
        await task_queue.enqueue({"id": "task-001"})
        await task_queue.enqueue({"id": "task-002"})
        results = await task_queue.process(max_tasks=2)
        assert results is not None
        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_process_empty_queue(self, task_queue):
        """Test processing empty queue."""
        results = await task_queue.process()
        assert results is None

    @pytest.mark.asyncio
    async def test_execute_task(self, task_queue):
        """Test executing a task."""

        async def test_task():
            return "result"

        result = await task_queue._execute_task("task-001", test_task, (), {})
        assert result == "result"

    @pytest.mark.asyncio
    async def test_execute_task_with_error(self, task_queue):
        """Test executing a task that raises an error."""

        async def failing_task():
            raise ValueError("Test error")

        result = await task_queue._execute_task("task-001", failing_task, (), {})
        assert result is None


class TestAuthManager:
    """Unit tests for AuthManager."""

    @pytest.fixture
    def auth_manager(self):
        """Create an AuthManager instance for testing."""
        return AuthManager(api_key="test-api-key-12345")

    def test_auth_manager_initialization(self, auth_manager):
        """Test AuthManager initialization."""
        assert auth_manager.api_key == "test-api-key-12345"

    def test_auth_manager_no_api_key(self):
        """Test AuthManager without API Key."""
        auth_manager = AuthManager(api_key=None)
        assert auth_manager.api_key is None
        assert not auth_manager.is_configured()

    def test_is_configured(self, auth_manager):
        """Test checking if API Key is configured."""
        assert auth_manager.is_configured()

    def test_validate_api_key_valid(self, auth_manager):
        """Test validating a valid API Key."""
        assert auth_manager.validate_api_key("test-api-key-12345") is True

    def test_validate_api_key_invalid(self, auth_manager):
        """Test validating an invalid API Key."""
        assert auth_manager.validate_api_key("wrong-key") is False

    def test_validate_api_key_no_key_configured(self):
        """Test validating when no API Key is configured."""
        auth_manager = AuthManager(api_key=None)
        assert auth_manager.validate_api_key("any-key") is False

    def test_set_api_key(self, auth_manager):
        """Test setting a new API Key."""
        auth_manager.set_api_key("new-api-key")
        assert auth_manager.api_key == "new-api-key"

    def test_generate_token(self, auth_manager):
        """Test generating a unique token."""
        token1 = auth_manager.generate_token()
        token2 = auth_manager.generate_token()
        assert token1 != token2
        assert len(token1) == 32

    @pytest.mark.asyncio
    async def test_authenticate_websocket_valid(self, auth_manager):
        """Test authenticating a WebSocket with valid API Key."""
        mock_websocket = Mock()
        mock_websocket.headers = {"x-api-key": "test-api-key-12345"}
        mock_websocket.close = AsyncMock()

        result = await auth_manager.authenticate_websocket(mock_websocket)
        assert result is True
        mock_websocket.close.assert_not_called()

    @pytest.mark.asyncio
    async def test_authenticate_websocket_missing_key(self, auth_manager):
        """Test authenticating a WebSocket without API Key."""
        mock_websocket = Mock()
        mock_websocket.headers = {}
        mock_websocket.close = AsyncMock()

        result = await auth_manager.authenticate_websocket(mock_websocket)
        assert result is False
        mock_websocket.close.assert_called_once_with(
            code=4003, reason="Missing API Key in headers"
        )

    @pytest.mark.asyncio
    async def test_authenticate_websocket_invalid_key(self, auth_manager):
        """Test authenticating a WebSocket with invalid API Key."""
        mock_websocket = Mock()
        mock_websocket.headers = {"x-api-key": "wrong-key"}
        mock_websocket.close = AsyncMock()

        result = await auth_manager.authenticate_websocket(mock_websocket)
        assert result is False
        mock_websocket.close.assert_called_once_with(
            code=4002, reason="Invalid API Key"
        )

    @pytest.mark.asyncio
    async def test_authenticate_websocket_bearer_token(self, auth_manager):
        """Test authenticating with Bearer token."""
        mock_websocket = Mock()
        mock_websocket.headers = {"authorization": "Bearer test-api-key-12345"}
        mock_websocket.close = AsyncMock()

        result = await auth_manager.authenticate_websocket(mock_websocket)
        assert result is True
        mock_websocket.close.assert_not_called()

    @pytest.mark.asyncio
    async def test_authenticate_websocket_no_api_key_configured(self):
        """Test authenticating when no API Key is configured."""
        auth_manager = AuthManager(api_key=None)
        mock_websocket = Mock()
        mock_websocket.headers = {"x-api-key": "any-key"}
        mock_websocket.close = AsyncMock()

        result = await auth_manager.authenticate_websocket(mock_websocket)
        assert result is False
        mock_websocket.close.assert_called_once_with(
            code=4001, reason="No API Key configured on Agent"
        )

    def test_auth_manager_from_env(self):
        """Test AuthManager initializing from environment variable."""
        import os

        os.environ["FORGE_API_KEY"] = "env-api-key"
        auth_manager = AuthManager()
        assert auth_manager.api_key == "env-api-key"
        del os.environ["FORGE_API_KEY"]
