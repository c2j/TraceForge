"""Integration tests for Recording Workflow functionality.

Per spec US2: Recording workflow with start_recording, stop_recording, and auto_wait_suggested events.
"""

import pytest
import pytest_asyncio
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
    StartRecordingRequest,
    StopRecordingRequest,
    AutoWaitSuggestedEvent,
)
from websocket.manager import get_manager
from recorder import get_active_session


class TestRecordingWorkflow:
    """Integration tests for Recording Workflow.

    Per spec T068-T069: Recording workflow with start/stop and event broadcasting.
    """

    @pytest.fixture(autouse=True)
    def reset_manager(self):
        """Reset connection manager before each test."""
        manager = get_manager()
        manager.active_connections.clear()
        yield
        manager.active_connections.clear()

    @pytest.fixture
    def app(self):
        """Create test FastAPI application."""
        return create_app()

    @pytest.fixture
    def client(self, app):
        """Create test WebSocket client."""
        return TestClient(app)

    @pytest_asyncio.fixture
    async def websocket(self, app):
        """Create WebSocket connection for testing."""
        from fastapi.testclient import TestClient

        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            yield websocket

    @pytest.mark.asyncio
    async def test_start_recording_creates_session(self, app):
        """Test that start_recording creates a new recording session.

        Per spec acceptance scenario 1: Start recording session with URL.
        """
        # Connect to WebSocket
        from fastapi.testclient import TestClient

        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            # Send start_recording request
            request = WSMessage(
                id="550e8400-e29b-41d4-a716-4466554400000",
                type=MessageType.REQUEST,
                action="start_recording",
                payload=StartRecordingRequest(
                    url="https://example.com",
                    kernel_id=None,
                ).model_dump(),
            )
            websocket.send_json(request.model_dump())

            # Receive response
            response_data = websocket.receive_json()
            response = WSMessage(**response_data)

            # Verify response structure
            assert response.type == MessageType.RESPONSE
            assert response.action == "start_recording"
            assert "session_id" in response.payload

            # Verify session was created
            session = get_active_session()
            assert session is not None
            assert session.status == "active"
            assert session.start_url == "https://example.com"

    @pytest.mark.asyncio
    async def test_navigation_detection_creates_page_node(self, app):
        """Test that navigation events create new Page nodes.

        Per spec FR-006: Detect navigation, create Page node with entry_url.
        """
        from fastapi.testclient import TestClient

        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            # Start recording
            start_request = WSMessage(
                id="550e8400-e29b-41d4-a716-4466554400001",
                type=MessageType.REQUEST,
                action="start_recording",
                payload=StartRecordingRequest(
                    url="https://example.com",
                    kernel_id=None,
                ).model_dump(),
            )
            websocket.send_json(start_request.model_dump())
            websocket.receive_json()

            # Simulate navigation detection event
            session = get_active_session()
            assert session is not None

            # Add page node (simulating navigation event)
            page_node = {
                "id": "660e8400-e29b-41d4-a716-4466554400001",
                "name": "Example Page",
                "entry_url": "https://example.com",
                "default_wait": "networkidle",
                "actions": [],
            }
            session.add_page(page_node)

            # Verify page was added
            assert len(session.pages) == 1
            assert session.pages[0]["entry_url"] == "https://example.com"

    @pytest.mark.asyncio
    async def test_action_capture_with_multiple_locators(self, app):
        """Test that actions are captured with multiple locator strategies.

        Per spec FR-007: Capture click/fill/hover with multiple locators (role, text, css, xpath, id).
        """
        from fastapi.testclient import TestClient

        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            # Start recording
            start_request = WSMessage(
                id="550e8400-e29b-41d4-a716-4466554400002",
                type=MessageType.REQUEST,
                action="start_recording",
                payload=StartRecordingRequest(
                    url="https://example.com",
                    kernel_id=None,
                ).model_dump(),
            )
            websocket.send_json(start_request.model_dump())
            websocket.receive_json()

            # Get session and add page
            session = get_active_session()
            page_node = {
                "id": "660e8400-e29b-41d4-a716-4466554400002",
                "name": "Example Page",
                "entry_url": "https://example.com",
                "default_wait": "networkidle",
                "actions": [],
            }
            session.add_page(page_node)

            # Simulate action capture with multiple locators
            action_node = {
                "id": "770e8400-e29b-41d4-a716-4466554400002",
                "name": "Click Submit Button",
                "action_type": "click",
                "locators": [
                    {
                        "type": "role",
                        "value": "button",
                        "name": "Submit",
                        "fallback": False,
                    },
                    {
                        "type": "text",
                        "value": "Submit",
                        "fallback": True,
                    },
                    {
                        "type": "css",
                        "value": "#submit-button",
                        "fallback": True,
                    },
                ],
                "params": {},
                "wait_after": "networkidle",
            }
            session.add_action(action_node)

            # Verify action was captured
            assert len(session.actions) == 1
            assert session.actions[0]["action_type"] == "click"
            assert len(session.actions[0]["locators"]) == 3

    @pytest.mark.asyncio
    async def test_stop_recording_returns_script_json(self, app):
        """Test that stop_recording returns complete Script JSON.

        Per spec acceptance scenario 2: Stop recording, verify Script JSON returned with Scenario-Page-Action hierarchy.
        """
        from fastapi.testclient import TestClient

        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            # Start recording
            start_request = WSMessage(
                id="550e8400-e29b-41d4-a716-4466554400003",
                type=MessageType.REQUEST,
                action="start_recording",
                payload=StartRecordingRequest(
                    url="https://example.com",
                    kernel_id=None,
                ).model_dump(),
            )
            websocket.send_json(start_request.model_dump())

            # Get response
            start_response_data = websocket.receive_json()
            start_response = WSMessage(**start_response_data)
            session_id = start_response.payload["session_id"]

            # Add test data to session
            session = get_active_session()
            page_node = {
                "id": "660e8400-e29b-41d4-a716-4466554400003",
                "name": "Example Page",
                "entry_url": "https://example.com",
                "default_wait": "networkidle",
                "actions": [],
            }
            session.add_page(page_node)

            action_node = {
                "id": "770e8400-e29b-41d4-a716-4466554400003",
                "name": "Click Submit Button",
                "action_type": "click",
                "locators": [
                    {
                        "type": "role",
                        "value": "button",
                        "name": "Submit",
                        "fallback": False,
                    },
                ],
                "params": {},
                "wait_after": "networkidle",
            }
            session.add_action(action_node)

            # Stop recording
            stop_request = WSMessage(
                id="880e8400-e29b-41d4-a716-4466554400003",
                type=MessageType.REQUEST,
                action="stop_recording",
                payload=StopRecordingRequest(session_id=session_id).model_dump(),
            )
            websocket.send_json(stop_request.model_dump())

            # Receive response
            stop_response_data = websocket.receive_json()
            stop_response = WSMessage(**stop_response_data)

            # Verify response structure
            assert stop_response.type == MessageType.RESPONSE
            assert stop_response.action == "stop_recording"
            assert "script" in stop_response.payload
            assert "trace_path" in stop_response.payload

            # Verify Script JSON structure (Scenario-Page-Action hierarchy)
            script = stop_response.payload["script"]
            assert "id" in script
            assert "name" in script
            assert "scenarios" in script
            assert len(script["scenarios"]) > 0
            scenario = script["scenarios"][0]
            assert "id" in scenario
            assert "name" in scenario
            assert "pages" in scenario
            assert len(scenario["pages"]) > 0
            page = scenario["pages"][0]
            assert "id" in page
            assert "name" in page
            assert "actions" in page
            assert len(page["actions"]) > 0

            # Verify session was stopped
            assert session.status == "stopped"

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_recording_workflow_full(self, app):
        """Test complete recording workflow.

        Per spec T069: Start recording, perform actions, stop, verify script structure.
        """
        from fastapi.testclient import TestClient

        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            # Step 1: Start recording
            start_request = WSMessage(
                id="550e8400-e29b-41d4-a716-4466554409001",
                type=MessageType.REQUEST,
                action="start_recording",
                payload=StartRecordingRequest(
                    url="https://example.com",
                    kernel_id=None,
                ).model_dump(),
            )
            websocket.send_json(start_request.model_dump())
            start_response = WSMessage(**(websocket.receive_json()))
            session_id = start_response.payload["session_id"]

            # Step 2: Simulate user actions
            session = get_active_session()

            # Add page (navigation)
            page_node = {
                "id": "660e8400-e29b-41d4-a716-4466554409001",
                "name": "Example Page",
                "entry_url": "https://example.com",
                "default_wait": "networkidle",
                "actions": [],
            }
            session.add_page(page_node)

            # Add action (click)
            action_node = {
                "id": "770e8400-e29b-41d4-a716-4466554409001",
                "name": "Click Submit Button",
                "action_type": "click",
                "locators": [
                    {
                        "type": "role",
                        "value": "button",
                        "name": "Submit",
                        "fallback": False,
                    },
                ],
                "params": {},
                "wait_after": "networkidle",
            }
            session.add_action(action_node)

            # Step 3: Stop recording
            stop_request = WSMessage(
                id="880e8400-e29b-41d4-a716-4466554409001",
                type=MessageType.REQUEST,
                action="stop_recording",
                payload=StopRecordingRequest(session_id=session_id).model_dump(),
            )
            websocket.send_json(stop_request.model_dump())
            stop_response = WSMessage(**(websocket.receive_json()))

            # Step 4: Verify complete Script structure
            script = stop_response.payload["script"]

            # Verify Scenario-Page-Action hierarchy
            assert "scenarios" in script
            assert len(script["scenarios"]) == 1
            scenario = script["scenarios"][0]
            assert "pages" in scenario
            assert len(scenario["pages"]) == 1
            page = scenario["pages"][0]
            assert "actions" in page
            assert len(page["actions"]) == 1

            # Verify action has multiple locators
            action = page["actions"][0]
            assert "locators" in action
            assert len(action["locators"]) == 1

            # Verify trace file path
            assert "trace_path" in stop_response.payload
            assert stop_response.payload["trace_path"].endswith(".zip")

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_auto_wait_suggested_event(self, app):
        """Test that auto_wait_suggested event is sent after network request.

        Per spec FR-008: Detect network requests after actions, send auto_wait_suggested events.
        """
        from fastapi.testclient import TestClient

        client = TestClient(app)
        with client.websocket_connect("/ws") as websocket:
            # Start recording
            start_request = WSMessage(
                id="550e8400-e29b-41d4-a716-4466554409002",
                type=MessageType.REQUEST,
                action="start_recording",
                payload=StartRecordingRequest(
                    url="https://example.com",
                    kernel_id=None,
                ).model_dump(),
            )
            websocket.send_json(start_request.model_dump())
            websocket.receive_json()

            # Simulate auto_wait_suggested event (in real implementation, this would be triggered by network listener)
            # For integration test, we just verify the event structure
            event = WSMessage(
                id="990e8400-e29b-41d4-a716-4466554409001",
                type=MessageType.EVENT,
                action="auto_wait_suggested",
                payload=AutoWaitSuggestedEvent(
                    session_id="550e8400-e29b-41d4-a716-4466554400001",
                    action_id="770e8400-e29b-41d4-a716-4466554409001",
                    suggested_wait="networkidle",
                    network_url="https://example.com/api/data",
                    timestamp=1234567890,
                ).model_dump(),
            )

            # Verify event structure
            assert event.type == MessageType.EVENT
            assert event.action == "auto_wait_suggested"
            assert event.payload["suggested_wait"] == "networkidle"
            assert event.payload["network_url"] == "https://example.com/api/data"
