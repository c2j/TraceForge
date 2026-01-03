"""Unit tests for executor module (engine, data_driven, fallback)."""

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
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from executor.engine import ExecutionEngine, get_task_semaphore
from models.kernel import (
    ExecutionResult,
    ExecutionStepResult,
    ExecutionArtifacts,
    ExecutionStepStatus,
)
from models.script import Script, Scenario, Page, Action, LocatorStrategy


@pytest.fixture(autouse=True)
def reset_executor_global_state():
    """Reset global state for executor module.

    Per pytest principle: Isolated & Repeatable.
    Ensures each test gets fresh state without interference.
    """
    import executor.engine as engine_module

    engine_module._task_semaphore = None
    yield
    # Cleanup after test
    engine_module._task_semaphore = None


@pytest.fixture(autouse=True)
def reset_executor_global_state():
    """Reset global state for executor module.

    Per pytest principle: Isolated & Repeatable.
    Ensures each test gets fresh state without interference.
    """
    import executor.engine as engine_module
    engine_module._task_semaphore = None
    yield
    # Cleanup after test
    engine_module._task_semaphore = None


class TestTaskSemaphore:
    """Unit tests for task semaphore."""

    def test_get_task_semaphore_default(self):
        """Test getting task semaphore with default concurrency."""
        semaphore = get_task_semaphore()
        assert semaphore is not None
        assert semaphore._value == 5

    def test_get_task_semaphore_custom(self):
        """Test getting task semaphore with custom concurrency."""
        semaphore = get_task_semaphore(max_concurrent=10)
        assert semaphore is not None
        assert semaphore._value == 10

    def test_get_task_semaphore_singleton(self):
        """Test that get_task_semaphore returns singleton."""
        sem1 = get_task_semaphore(max_concurrent=3)
        sem2 = get_task_semaphore(max_concurrent=5)
        assert sem1 is sem2
        assert sem1._value == 3
        _task_semaphore = None  # Reset for other tests


class TestExecutionEngine:
    """Unit tests for ExecutionEngine."""

    @pytest.fixture
    def mock_websocket(self):
        """Create mock WebSocket."""
        mock = Mock(spec=object)
        mock.send_json = AsyncMock()
        return mock

    @pytest.fixture
    def mock_browser_manager(self):
        """Create mock browser manager."""
        mock = Mock()
        mock.launch_browser = AsyncMock(return_value={})
        mock.get_all_contexts = Mock(return_value={})
        mock.close_browser = AsyncMock(return_value=True)
        return mock

    @pytest.fixture
    def execution_engine(self, mock_websocket, mock_browser_manager):
        """Create ExecutionEngine instance."""
        return ExecutionEngine(
            websocket=mock_websocket,
            browser_manager=mock_browser_manager,
            agent_mode=False,
        )

    @pytest.fixture
    def sample_script(self):
        """Create sample script for testing."""
        action = Action(
            id="action-001",
            name="Click button",
            action_type="click",
            locators=[
                LocatorStrategy(
                    type="role",
                    value="button",
                    name="Submit",
                    fallback=False,
                )
            ],
            params={},
        )
        page = Page(
            id="page-001",
            name="Homepage",
            actions=[action],
        )
        scenario = Scenario(
            id="scenario-001",
            name="Test Scenario",
            pages=[page],
        )
        return Script(
            id="script-001",
            name="Test Script",
            scenarios=[scenario],
        )

    def test_execution_engine_initialization(self, execution_engine):
        """Test ExecutionEngine initialization."""
        assert execution_engine.websocket is not None
        assert execution_engine.browser_manager is not None
        assert execution_engine.agent_mode is False
        assert execution_engine.current_execution_id == ""
        assert execution_engine.current_script is None
        assert execution_engine.artifacts is not None

    def test_execution_engine_agent_mode(self, mock_websocket, mock_browser_manager):
        """Test ExecutionEngine with agent mode enabled."""
        engine = ExecutionEngine(
            websocket=mock_websocket,
            browser_manager=mock_browser_manager,
            agent_mode=True,
        )
        assert engine.agent_mode is True

    @pytest.mark.asyncio
    async def test_execute_script_dict(self, execution_engine):
        """Test executing script from dict."""
        script_dict = {
            "id": "script-001",
            "name": "Test Script",
            "scenarios": [
                {
                    "id": "scenario-001",
                    "name": "Test Scenario",
                    "pages": [
                        {
                            "id": "page-001",
                            "name": "Homepage",
                            "actions": [],
                        }
                    ],
                }
            ],
        }

        result = await execution_engine.execute_script(
            script=script_dict,
            kernel_id="kernel-001",
            headless=False,
        )

        assert result is not None
        assert result.status in ["completed", "failed"]
        assert result.script_id == "script-001"

    @pytest.mark.asyncio
    async def test_execute_script_model(self, execution_engine, sample_script):
        """Test executing script from Script model."""
        result = await execution_engine.execute_script(
            script=sample_script,
            kernel_id="kernel-001",
            headless=False,
        )

        assert result is not None
        assert result.status in ["completed", "failed"]

    @pytest.mark.asyncio
    async def test_execute_script_agent_mode_forces_headless(
        self, mock_websocket, mock_browser_manager
    ):
        """Test that agent mode forces headless execution."""
        engine = ExecutionEngine(
            websocket=mock_websocket,
            browser_manager=mock_browser_manager,
            agent_mode=True,
        )
        script_dict = {
            "id": "script-001",
            "name": "Test",
            "scenarios": [{"id": "s1", "name": "S1", "pages": []}],
        }

        await engine.execute_script(
            script=script_dict,
            kernel_id="kernel-001",
            headless=False,
        )

        mock_browser_manager.launch_browser.assert_called_once()
        call_kwargs = mock_browser_manager.launch_browser.call_args[1]
        assert call_kwargs["headless"] is True

    @pytest.mark.asyncio
    async def test_execute_script_with_data_driven(
        self, execution_engine, sample_script
    ):
        """Test executing script with data-driven rows."""
        data_rows = [
            {"username": "user1", "password": "pass1"},
            {"username": "user2", "password": "pass2"},
        ]

        result = await execution_engine.execute_script(
            script=sample_script,
            kernel_id="kernel-001",
            headless=False,
            data_rows=data_rows,
        )

        assert result is not None
        assert result.status in ["completed", "failed"]

    def test_get_action_attr_dict(self, execution_engine):
        """Test getting attribute from action dict."""
        action = {"id": "action-001", "name": "Test Action", "action_type": "click"}
        assert execution_engine._get_action_attr(action, "id") == "action-001"
        assert execution_engine._get_action_attr(action, "name") == "Test Action"
        assert (
            execution_engine._get_action_attr(action, "nonexistent", "default")
            == "default"
        )

    def test_get_action_attr_object(self, execution_engine):
        """Test getting attribute from action object."""
        action = Action(
            id="action-002",
            name="Object Action",
            action_type="fill",
            locators=[],
            params={},
        )
        assert execution_engine._get_action_attr(action, "id") == "action-002"
        assert execution_engine._get_action_attr(action, "name") == "Object Action"

    def test_get_script_attr_dict(self, execution_engine):
        """Test getting attribute from script dict."""
        script = {"id": "script-001", "name": "Test Script"}
        assert execution_engine._get_script_attr(script, "id") == "script-001"
        assert (
            execution_engine._get_script_attr(script, "nonexistent", "default")
            == "default"
        )

    @pytest.mark.asyncio
    async def test_wait_for_page_load(self, execution_engine):
        """Test waiting for page load."""
        await execution_engine._wait_for_page_load("networkidle")

    @pytest.mark.asyncio
    async def test_wait_for_page_load_with_mock_page(self, execution_engine):
        """Test waiting for page load with mocked page."""
        mock_page = Mock()
        mock_page.wait_for_load_state = AsyncMock()
        execution_engine._set_page(mock_page)

        await execution_engine._wait_for_page_load("load")
        mock_page.wait_for_load_state.assert_called_once_with("load")

    @pytest.mark.asyncio
    async def test_send_step_start_event(self, execution_engine):
        """Test sending step start event."""
        action = {
            "id": "action-001",
            "name": "Click",
            "action_type": "click",
        }

        await execution_engine._send_step_start_event("step-001", action, 0)

        execution_engine.websocket.send_json.assert_called()
        call_args = execution_engine.websocket.send_json.call_args[0][0]
        assert call_args["action"] == "step_start"

    @pytest.mark.asyncio
    async def test_send_step_complete_event(self, execution_engine):
        """Test sending step complete event."""
        step_status = ExecutionStepStatus(
            id="step-001",
            execution_id="exec-001",
            action_id="action-001",
            status="completed",
            result=ExecutionStepResult(),
            duration_ms=1000,
            error=None,
        )

        await execution_engine._send_step_complete_event("step-001", step_status, 0)

        execution_engine.websocket.send_json.assert_called()
        call_args = execution_engine.websocket.send_json.call_args[0][0]
        assert call_args["action"] == "step_complete"

    @pytest.mark.asyncio
    async def test_send_execution_complete_event(self, execution_engine):
        """Test sending execution complete event."""
        result = ExecutionResult(
            id="exec-001",
            script_id="script-001",
            kernel_id="kernel-001",
            status="completed",
            duration_ms=5000,
        )

        await execution_engine._send_execution_complete_event(result)

        execution_engine.websocket.send_json.assert_called()
        call_args = execution_engine.websocket.send_json.call_args[0][0]
        assert call_args["action"] == "execution_complete"

    @pytest.mark.asyncio
    async def test_send_log_event(self, execution_engine):
        """Test sending log event."""
        await execution_engine._send_log_event("exec-001", "info", "Test log message")

        execution_engine.websocket.send_json.assert_called()
        call_args = execution_engine.websocket.send_json.call_args[0][0]
        assert call_args["action"] == "log"
        payload = call_args["payload"]
        assert payload["level"] == "info"
        assert payload["message"] == "Test log message"

    @pytest.mark.asyncio
    async def test_browser_context_management(self, execution_engine):
        """Test browser context getter/setter."""
        mock_context = Mock()
        execution_engine._set_browser_context(mock_context)
        assert await execution_engine._get_browser_context() == mock_context

    @pytest.mark.asyncio
    async def test_page_management(self, execution_engine):
        """Test page getter/setter."""
        mock_page = Mock()
        execution_engine._set_page(mock_page)
        assert await execution_engine._get_page() == mock_page

    @pytest.mark.asyncio
    async def test_execute_action(self, execution_engine):
        """Test executing an action."""
        action = {
            "id": "action-001",
            "name": "Click",
            "action_type": "click",
            "locators": [],
            "params": {},
        }

        result = await execution_engine.execute_action(Mock(), action)
        assert result is not None
        assert isinstance(result, ExecutionStepResult)
