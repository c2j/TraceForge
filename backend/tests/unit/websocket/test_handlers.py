"""Unit tests for WebSocket handlers."""

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
from unittest.mock import Mock, AsyncMock, patch
from websocket.handlers import (
    handle_start_recording,
    handle_stop_recording,
    handle_execute_script,
    handle_connection_loss,
    validate_script_json,
)
from models.websocket import WSMessage, MessageType, ExecuteScriptRequest


class TestValidateScriptJson:
    """Unit tests for validate_script_json function."""

    def test_validate_script_valid(self):
        """Test validating a valid script."""
        script = {
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
                            "actions": [
                                {
                                    "id": "action-001",
                                    "name": "Click button",
                                    "action_type": "click",
                                }
                            ],
                        }
                    ],
                }
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is True
        assert error is None

    def test_validate_script_missing_id(self):
        """Test validating script missing id field."""
        script = {
            "name": "Test Script",
            "scenarios": [],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "Missing required field: id" in error

    def test_validate_script_missing_name(self):
        """Test validating script missing name field."""
        script = {
            "id": "script-001",
            "scenarios": [],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "Missing required field: name" in error

    def test_validate_script_missing_scenarios(self):
        """Test validating script missing scenarios field."""
        script = {
            "id": "script-001",
            "name": "Test Script",
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "Missing required field: scenarios" in error

    def test_validate_script_empty_scenarios(self):
        """Test validating script with empty scenarios."""
        script = {
            "id": "script-001",
            "name": "Test Script",
            "scenarios": [],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "must have at least one scenario" in error

    def test_validate_scenario_missing_id(self):
        """Test validating scenario missing id."""
        script = {
            "id": "script-001",
            "name": "Test Script",
            "scenarios": [
                {
                    "name": "Test Scenario",
                    "pages": [],
                }
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "Scenario 0 missing required field: id" in error

    def test_validate_scenario_missing_pages(self):
        """Test validating scenario missing pages."""
        script = {
            "id": "script-001",
            "name": "Test Script",
            "scenarios": [
                {
                    "id": "scenario-001",
                    "name": "Test Scenario",
                }
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "Scenario 0 missing required field: pages" in error

    def test_validate_scenario_empty_pages(self):
        """Test validating scenario with empty pages."""
        script = {
            "id": "script-001",
            "name": "Test Script",
            "scenarios": [
                {
                    "id": "scenario-001",
                    "name": "Test Scenario",
                    "pages": [],
                }
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "must have at least one page" in error

    def test_validate_page_missing_id(self):
        """Test validating page missing id."""
        script = {
            "id": "script-001",
            "name": "Test Script",
            "scenarios": [
                {
                    "id": "scenario-001",
                    "name": "Test Scenario",
                    "pages": [
                        {
                            "name": "Homepage",
                            "actions": [],
                        }
                    ],
                }
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "Page 0 missing required field: id" in error

    def test_validate_page_missing_actions(self):
        """Test validating page missing actions."""
        script = {
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
                        }
                    ],
                }
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "Page 0 missing required field: actions" in error

    def test_validate_action_missing_id(self):
        """Test validating action missing id."""
        script = {
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
                            "actions": [
                                {
                                    "name": "Click button",
                                    "action_type": "click",
                                }
                            ],
                        }
                    ],
                }
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "Action 0 missing required field: id" in error

    def test_validate_action_missing_action_type(self):
        """Test validating action missing action_type."""
        script = {
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
                            "actions": [
                                {
                                    "id": "action-001",
                                    "name": "Click button",
                                }
                            ],
                        }
                    ],
                }
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "Action 0 missing required field: action_type" in error

    def test_validate_action_invalid_type(self):
        """Test validating action with invalid type."""
        script = {
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
                            "actions": [
                                {
                                    "id": "action-001",
                                    "name": "Invalid Action",
                                    "action_type": "invalid_type",
                                }
                            ],
                        }
                    ],
                }
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "invalid action_type: invalid_type" in error

    def test_validate_action_valid_types(self):
        """Test all valid action types."""
        valid_types = [
            "navigate",
            "click",
            "fill",
            "hover",
            "wait_for",
            "assert_text",
            "screenshot",
            "press",
        ]

        for action_type in valid_types:
            script = {
                "id": f"script-{action_type}",
                "name": "Test Script",
                "scenarios": [
                    {
                        "id": "scenario-001",
                        "name": "Test Scenario",
                        "pages": [
                            {
                                "id": "page-001",
                                "name": "Homepage",
                                "actions": [
                                    {
                                        "id": "action-001",
                                        "name": "Test Action",
                                        "action_type": action_type,
                                    }
                                ],
                            }
                        ],
                    }
                ],
            }

            is_valid, error = validate_script_json(script)
            assert is_valid is True, f"Failed for action_type: {action_type}"

    def test_validate_data_driven_inconsistent_keys(self):
        """Test data-driven with inconsistent keys."""
        script = {
            "id": "script-001",
            "name": "Test Script",
            "scenarios": [
                {
                    "id": "scenario-001",
                    "name": "Test Scenario",
                    "pages": [{"id": "page-001", "name": "Homepage", "actions": []}],
                }
            ],
            "data_driven": [
                {"username": "user1", "password": "pass1"},
                {"username": "user2", "email": "user2@example.com"},
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "inconsistent keys" in error

    def test_validate_data_driven_valid(self):
        """Test valid data-driven configuration."""
        script = {
            "id": "script-001",
            "name": "Test Script",
            "scenarios": [
                {
                    "id": "scenario-001",
                    "name": "Test Scenario",
                    "pages": [{"id": "page-001", "name": "Homepage", "actions": []}],
                }
            ],
            "data_driven": [
                {"username": "user1", "password": "pass1"},
                {"username": "user2", "password": "pass2"},
            ],
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is True

    def test_validate_data_driven_not_list(self):
        """Test data-driven that is not a list."""
        script = {
            "id": "script-001",
            "name": "Test Script",
            "scenarios": [
                {
                    "id": "scenario-001",
                    "name": "Test Scenario",
                    "pages": [{"id": "page-001", "name": "Homepage", "actions": []}],
                }
            ],
            "data_driven": "not-a-list",
        }

        is_valid, error = validate_script_json(script)
        assert is_valid is False
        assert "data_driven must be a list" in error


class TestHandleStartRecording:
    """Unit tests for handle_start_recording handler."""

    @pytest.fixture
    def mock_websocket(self):
        """Create mock WebSocket."""
        mock = Mock(spec=object)
        mock.send_json = AsyncMock()
        return mock

    @pytest.fixture
    def ws_message(self):
        """Create WSMessage."""
        return WSMessage(
            id="msg-001",
            type=MessageType.REQUEST,
            action="start_recording",
            payload={"url": "https://example.com"},
        )

    @pytest.mark.asyncio
    async def test_handle_start_recording(self, mock_websocket, ws_message):
        """Test handling start_recording request."""
        await handle_start_recording(mock_websocket, ws_message)

        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["action"] == "start_recording"
        assert call_args["type"] == MessageType.RESPONSE
        assert "session_id" in call_args["payload"]


class TestHandleStopRecording:
    """Unit tests for handle_stop_recording handler."""

    @pytest.fixture
    def mock_websocket(self):
        """Create mock WebSocket."""
        mock = Mock(spec=object)
        mock.send_json = AsyncMock()
        return mock

    @pytest.fixture
    def ws_message(self):
        """Create WSMessage."""
        return WSMessage(
            id="msg-002",
            type=MessageType.REQUEST,
            action="stop_recording",
            payload={"session_id": "session-001"},
        )

    @pytest.mark.asyncio
    async def test_handle_stop_recording(self, mock_websocket, ws_message):
        """Test handling stop_recording request."""
        await handle_stop_recording(mock_websocket, ws_message)

        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["action"] == "stop_recording"
        assert call_args["type"] == MessageType.RESPONSE
        assert "script" in call_args["payload"]
        assert "trace_path" in call_args["payload"]


class TestHandleExecuteScript:
    """Unit tests for handle_execute_script handler."""

    @pytest.fixture
    def mock_websocket(self):
        """Create mock WebSocket."""
        mock = Mock(spec=object)
        mock.send_json = AsyncMock()
        return mock

    @pytest.fixture
    def valid_script(self):
        """Create valid script."""
        return {
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
                            "actions": [
                                {
                                    "id": "action-001",
                                    "name": "Click",
                                    "action_type": "click",
                                }
                            ],
                        }
                    ],
                }
            ],
        }

    @pytest.fixture
    def ws_message(self, valid_script):
        """Create WSMessage."""
        return WSMessage(
            id="msg-003",
            type=MessageType.REQUEST,
            action="execute_script",
            payload={
                "script": valid_script,
                "kernel_id": "kernel-001",
                "headless": False,
            },
        )

    @pytest.mark.asyncio
    async def test_handle_execute_script_valid(self, mock_websocket, ws_message):
        """Test handling execute_script with valid script."""
        await handle_execute_script(mock_websocket, ws_message)

        mock_websocket.send_json.assert_called()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["action"] == "execute_script"

    @pytest.mark.asyncio
    async def test_handle_execute_script_invalid(self, mock_websocket):
        """Test handling execute_script with invalid script."""
        invalid_script = {
            "id": "script-001",
            "name": "Invalid Script",
            "scenarios": [],
        }

        ws_message = WSMessage(
            id="msg-004",
            type=MessageType.REQUEST,
            action="execute_script",
            payload={
                "script": invalid_script,
                "kernel_id": "kernel-001",
            },
        )

        await handle_execute_script(mock_websocket, ws_message)

        mock_websocket.send_json.assert_called()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["action"] == "execute_script"
        assert call_args["error"] is not None


class TestHandleConnectionLoss:
    """Unit tests for handle_connection_loss handler."""

    @pytest.fixture
    def mock_websocket(self):
        """Create mock WebSocket."""
        mock = Mock(spec=object)
        return mock

    @pytest.mark.asyncio
    async def test_handle_connection_loss(self, mock_websocket):
        """Test handling connection loss."""
        await handle_connection_loss(mock_websocket)
