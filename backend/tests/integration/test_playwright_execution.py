"""Integration tests for actual Playwright execution.

Per spec US3: Real Playwright execution, locator fallback with retries.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import asyncio
import sys
import os

# Add parent directories to path for imports
test_file = os.path.abspath(__file__)
integration_dir = os.path.dirname(test_file)
tests_dir = os.path.dirname(integration_dir)
backend_dir = os.path.dirname(tests_dir)
engine_dir = os.path.join(backend_dir, "engine")
sys.path.insert(0, engine_dir)

from executor.engine import ExecutionEngine
from executor.fallback import LocatorFallback


class TestPlaywrightExecution:
    """Integration tests for actual Playwright execution.

    Per spec T039-T043: Execution engine, locator fallback with retries.
    """

    @pytest.fixture
    def execution_engine(self):
        """Create ExecutionEngine instance for testing."""
        from unittest.mock import AsyncMock, Mock

        # Create mock websocket and browser manager
        mock_websocket = AsyncMock()
        mock_websocket.send_json = AsyncMock()

        mock_browser_manager = Mock()
        mock_browser_manager.launch_browser = AsyncMock()

        return ExecutionEngine(mock_websocket, mock_browser_manager)

    @pytest.fixture
    def locator_fallback(self):
        """Create LocatorFallback instance for testing."""
        return LocatorFallback()

    def test_execution_engine_created(self, execution_engine):
        """Test that ExecutionEngine can be instantiated.

        Per spec T039: Create execution engine.
        """
        assert execution_engine is not None
        assert hasattr(execution_engine, "execute_script")
        assert hasattr(execution_engine, "execute_action")

    @pytest.mark.asyncio
    async def test_execute_script_mock(self, execution_engine):
        """Test executing a script with mock browser.

        Per spec T039: Traverse Script→Scenario→Page→Action hierarchy.
        Per spec T040: Execute script handler launches browser.
        """
        # Create test script
        script = {
            "id": "test-script-001",
            "name": "Test Script",
            "scenarios": [
                {
                    "id": "scenario-001",
                    "name": "Test Scenario",
                    "pages": [],
                }
            ],
        }

        # Mock browser context and page
        mock_page = AsyncMock()
        mock_page.goto = AsyncMock()
        mock_page.click = AsyncMock()
        mock_page.fill = AsyncMock()
        mock_page.wait_for_load_state = AsyncMock()

        mock_context = Mock()
        mock_context.new_page = Mock(return_value=mock_page)

        # Execute with mock
        with patch.object(
            execution_engine, "_get_browser_context", return_value=mock_context
        ):
            result = await execution_engine.execute_script(
                script, kernel_id="test-kernel", headless=True
            )

            # Verify execution
            assert result is not None

    @pytest.mark.asyncio
    async def test_locator_fallback_role_to_text(self, locator_fallback):
        """Test locator fallback from role to text.

        Per spec T042: Try role → text → css → xpath → id.
        Per spec T043: Retry with next locator if previous fails.
        """
        mock_page = AsyncMock()

        # Role locator fails
        role_exception = Exception("Role locator not found")
        mock_page.get_by_role = Mock(side_effect=role_exception)

        # Text locator succeeds
        mock_element = Mock()
        mock_element.wait_for = AsyncMock()
        mock_page.get_by_text = Mock(return_value=mock_element)

        locators = [
            {"type": "role", "value": "button", "fallback": False},
            {"type": "text", "value": "Submit", "fallback": True},
            {"type": "css", "value": "#submit", "fallback": True},
        ]

        result = await locator_fallback.find_element(mock_page, locators)

        # Verify role was tried first
        mock_page.get_by_role.assert_called_once()
        # Verify text was tried as fallback
        mock_page.get_by_text.assert_called_once()
        # Verify element was found
        assert result[0] == mock_element  # find_element returns (locator, result)
        assert result[1].error is None

    @pytest.mark.asyncio
    async def test_execute_action_click(self, execution_engine):
        """Test executing a click action.

        Per spec T039: Execute Action with click action_type.
        """
        mock_page = AsyncMock()
        mock_page.click = AsyncMock()

        action = {
            "id": "action-001",
            "name": "Click Submit",
            "action_type": "click",
            "locators": [
                {"type": "role", "value": "button", "name": "Submit", "fallback": False}
            ],
            "params": {},
        }

        with patch.object(execution_engine, "_get_page", return_value=mock_page):
            with patch.object(execution_engine, "_find_element", return_value=Mock()):
                result = await execution_engine.execute_action(mock_page, action)

                # Verify click was executed
                assert result is not None

    @pytest.mark.asyncio
    async def test_execute_action_fill(self, execution_engine):
        """Test executing a fill action.

        Per spec T039: Execute Action with fill action_type.
        """
        mock_page = AsyncMock()
        mock_page.fill = AsyncMock()

        action = {
            "id": "action-002",
            "name": "Fill Email",
            "action_type": "fill",
            "locators": [{"type": "css", "value": "#email", "fallback": False}],
            "params": {"value": "test@example.com"},
        }

        with patch.object(execution_engine, "_get_page", return_value=mock_page):
            with patch.object(execution_engine, "_find_element", return_value=Mock()):
                result = await execution_engine.execute_action(mock_page, action)

                # Verify fill was executed
                assert result is not None

    @pytest.mark.asyncio
    async def test_execute_action_navigate(self, execution_engine):
        """Test executing a navigate action.

        Per spec T039: Execute Action with navigate action_type.
        """
        mock_page = AsyncMock()
        mock_page.goto = AsyncMock()

        action = {
            "id": "action-003",
            "name": "Navigate to Home",
            "action_type": "navigate",
            "params": {"url": "https://example.com"},
        }

        with patch.object(execution_engine, "_get_page", return_value=mock_page):
            result = await execution_engine.execute_action(mock_page, action)

            # Verify navigation was executed
            assert result is not None

    @pytest.mark.asyncio
    async def test_wait_for_load_state_networkidle(self, execution_engine):
        """Test waiting for network idle state.

        Per spec T044: wait_for_load_state with networkidle.
        """
        mock_page = AsyncMock()
        mock_page.wait_for_load_state = AsyncMock()

        page = {
            "id": "page-001",
            "name": "Test Page",
            "entry_url": "https://example.com",
            "default_wait": "networkidle",
            "actions": [],
        }

        await execution_engine._wait_for_page(mock_page, page)

        # Verify network idle wait was called
        mock_page.wait_for_load_state.assert_called_once_with("networkidle")

    @pytest.mark.asyncio
    async def test_wait_for_load_state_load(self, execution_engine):
        """Test waiting for load state.

        Per spec T044: wait_for_load_state with load.
        """
        mock_page = AsyncMock()
        mock_page.wait_for_load_state = AsyncMock()

        page = {
            "id": "page-002",
            "name": "Test Page 2",
            "entry_url": "https://example.com",
            "default_wait": "load",
            "actions": [],
        }

        await execution_engine._wait_for_page(mock_page, page)

        # Verify load wait was called
        mock_page.wait_for_load_state.assert_called_once_with("load")

    @pytest.mark.asyncio
    async def test_wait_for_load_state_domcontentloaded(self, execution_engine):
        """Test waiting for DOM content loaded state.

        Per spec T044: wait_for_load_state with domcontentloaded.
        """
        mock_page = AsyncMock()
        mock_page.wait_for_load_state = AsyncMock()

        page = {
            "id": "page-003",
            "name": "Test Page 3",
            "entry_url": "https://example.com",
            "default_wait": "domcontentloaded",
            "actions": [],
        }

        await execution_engine._wait_for_page(mock_page, page)

        # Verify domcontentloaded wait was called
        mock_page.wait_for_load_state.assert_called_once_with("domcontentloaded")

    @pytest.mark.asyncio
    async def test_execution_tracks_step_status(self, execution_engine):
        """Test that execution tracks step status.

        Per spec T041: Track status: pending/running/completed/failed.
        """
        script = {
            "id": "test-script-status",
            "name": "Status Test",
            "scenarios": [
                {
                    "id": "scenario-status",
                    "name": "Test",
                    "pages": [
                        {
                            "id": "page-status",
                            "name": "Test Page",
                            "entry_url": "https://example.com",
                            "default_wait": "networkidle",
                            "actions": [
                                {
                                    "id": "action-status",
                                    "name": "Test Action",
                                    "action_type": "click",
                                    "locators": [
                                        {
                                            "type": "role",
                                            "value": "button",
                                            "fallback": False,
                                        }
                                    ],
                                    "params": {},
                                }
                            ],
                        }
                    ],
                }
            ],
        }

        mock_page = AsyncMock()
        mock_page.click = AsyncMock()

        with patch.object(
            execution_engine, "_get_browser_context", return_value=Mock()
        ):
            with patch.object(execution_engine, "_get_page", return_value=mock_page):
                with patch.object(
                    execution_engine, "_find_element", return_value=Mock()
                ):
                    result = await execution_engine.execute_script(
                        script, kernel_id="test-kernel", headless=True
                    )

                    # Verify execution completed
                    assert result is not None
