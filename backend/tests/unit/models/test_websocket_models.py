"""Unit tests for WebSocket message models."""

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
from models.websocket import (
    MessageType,
    WSMessage,
    HealthCheckRequest,
    GetKernelsRequest,
    StartRecordingRequest,
    StopRecordingRequest,
    ExecuteScriptRequest,
    StartRecordingResponse,
    StopRecordingResponse,
    GetKernelsResponse,
    HealthCheckResponse,
    NavigationDetectedEvent,
    ActionRecordedEvent,
    AutoWaitSuggestedEvent,
    LogEvent,
    StepStartEvent,
    StepCompleteEvent,
    VisualDiffEvent,
    ExecutionCompleteEvent,
)


class TestMessageType:
    """Unit tests for MessageType enum."""

    @pytest.mark.parametrize(
        "attribute,expected_value",
        [
            ("REQUEST", "request"),
            ("RESPONSE", "response"),
            ("EVENT", "event"),
        ],
        ids=["request-type", "response-type", "event-type"],
    )
    def test_message_type_values(self, attribute, expected_value):
        """Test MessageType enum values."""
        assert getattr(MessageType, attribute) == expected_value, (
            f"Expected MessageType.{attribute}={expected_value}"
        )


class TestWSMessage:
    """Unit tests for WSMessage model."""

    @pytest.mark.parametrize(
        "msg_type,action,error_expected",
        [
            (MessageType.REQUEST, "execute_script", False),
            (MessageType.RESPONSE, "execute_script", False),
            (MessageType.RESPONSE, "execute_script", True),
            (MessageType.EVENT, "step_complete", False),
        ],
        ids=["request-message", "response-message", "error-message", "event-message"],
    )
    def test_create_ws_message_variations(self, msg_type, action, error_expected):
        """Test creating WSMessage with various types."""
        payload = {"script": {"id": "script-001"}}

        message_data = {"id": "msg-001", "type": msg_type, "action": action}

        if error_expected:
            message_data["error"] = "Script validation failed"
        else:
            message_data["payload"] = payload

        message = WSMessage(**message_data)

        assert message.id == "msg-001", f"Expected id='msg-001', got {message.id}"
        assert message.type == msg_type, f"Expected type={msg_type}, got {message.type}"
        assert message.action == action, (
            f"Expected action={action}, got {message.action}"
        )

        if error_expected:
            assert message.error == "Script validation failed", (
                f"Expected error message"
            )
            assert message.payload is None, "Expected no payload with error"
        else:
            assert message.error is None, "Expected no error"
            assert message.payload is not None, "Expected payload"


class TestHealthCheckRequest:
    """Unit tests for HealthCheckRequest model."""

    def test_health_check_request(self):
        """Test HealthCheckRequest (empty model)."""
        request = HealthCheckRequest()
        assert request is not None, "Expected HealthCheckRequest to be created"


class TestGetKernelsRequest:
    """Unit tests for GetKernelsRequest model."""

    def test_get_kernels_request(self):
        """Test GetKernelsRequest (empty model)."""
        request = GetKernelsRequest()
        assert request is not None, "Expected GetKernelsRequest to be created"


class TestStartRecordingRequest:
    """Unit tests for StartRecordingRequest model."""

    @pytest.mark.parametrize(
        "url,kernel_id,kernel_id_expected",
        [
            ("https://example.com", "kernel-001", "kernel-001"),
            ("https://example.com", None, None),
        ],
        ids=["with-kernel-id", "without-kernel-id"],
    )
    def test_start_recording_request(self, url, kernel_id, kernel_id_expected):
        """Test StartRecordingRequest with and without kernel_id."""
        request = StartRecordingRequest(url=url, kernel_id=kernel_id)
        assert request.url == url, f"Expected url={url}, got {request.url}"
        assert request.kernel_id == kernel_id_expected, (
            f"Expected kernel_id={kernel_id_expected}, got {request.kernel_id}"
        )


class TestStopRecordingRequest:
    """Unit tests for StopRecordingRequest model."""

    def test_stop_recording_request(self):
        """Test StopRecordingRequest."""
        request = StopRecordingRequest(session_id="session-001")
        assert request.session_id == "session-001", "Expected session_id='session-001'"


class TestExecuteScriptRequest:
    """Unit tests for ExecuteScriptRequest model."""

    @pytest.mark.parametrize(
        "has_data_rows,headless",
        [
            (True, True),
            (False, True),
            (True, False),
        ],
        ids=[
            "with-data-and-headless",
            "without-data-headless",
            "with-data-not-headless",
        ],
    )
    def test_execute_script_request(self, has_data_rows, headless):
        """Test ExecuteScriptRequest with various configurations."""
        request_data = {
            "script": {"id": "script-001", "name": "Test Script", "scenarios": []},
            "kernel_id": "kernel-001",
        }

        if has_data_rows:
            request_data["data_rows"] = [{"username": "user1"}, {"username": "user2"}]

        if headless:
            request_data["headless"] = True

        request = ExecuteScriptRequest(**request_data)

        assert request.script["id"] == "script-001", "Expected script id='script-001'"
        assert request.kernel_id == "kernel-001", "Expected kernel_id='kernel-001'"

        if has_data_rows:
            assert len(request.data_rows) == 2, (
                f"Expected 2 data rows, got {len(request.data_rows)}"
            )
        else:
            assert request.data_rows is None, "Expected no data rows"

        if headless:
            assert request.headless is True, "Expected headless=True"
        else:
            assert request.headless is False, "Expected headless=False"


class TestStartRecordingResponse:
    """Unit tests for StartRecordingResponse model."""

    def test_start_recording_response(self):
        """Test StartRecordingResponse."""
        response = StartRecordingResponse(session_id="session-001")
        assert response.session_id == "session-001", "Expected session_id='session-001'"


class TestStopRecordingResponse:
    """Unit tests for StopRecordingResponse model."""

    def test_stop_recording_response(self):
        """Test StopRecordingResponse."""
        response = StopRecordingResponse(
            script={"id": "script-001", "name": "Recorded Script", "scenarios": []},
            trace_path="/traces/trace.zip",
        )
        assert response.script["id"] == "script-001", "Expected script id='script-001'"
        assert response.trace_path == "/traces/trace.zip", (
            "Expected trace_path='/traces/trace.zip'"
        )


class TestGetKernelsResponse:
    """Unit tests for GetKernelsResponse model."""

    @pytest.mark.parametrize(
        "kernel_count", [1, 2, 3], ids=["single-kernel", "two-kernels", "three-kernels"]
    )
    def test_get_kernels_response(self, kernel_count):
        """Test GetKernelsResponse with various kernel counts."""
        kernels = [
            {
                "id": f"kernel-{i:03d}",
                "name": f"Kernel {i}",
                "executable_path": f"/usr/bin/browser{i}",
                "version": f"86.0.{i}",
            }
            for i in range(kernel_count)
        ]
        response = GetKernelsResponse(kernels=kernels)

        assert len(response.kernels) == kernel_count, (
            f"Expected {kernel_count} kernels, got {len(response.kernels)}"
        )
        assert response.kernels[0]["id"] == "kernel-000", (
            "Expected first kernel id='kernel-000'"
        )


class TestHealthCheckResponse:
    """Unit tests for HealthCheckResponse model."""

    @pytest.mark.parametrize(
        "mode,expected_mode",
        [
            ("desktop", "desktop"),
            ("agent", "agent"),
        ],
        ids=["desktop-mode", "agent-mode"],
    )
    def test_health_check_response_modes(self, mode, expected_mode):
        """Test HealthCheckResponse for different modes."""
        response = HealthCheckResponse(
            status="ok",
            mode=mode,
            active_sessions=5,
        )
        assert response.status == "ok", "Expected status='ok'"
        assert response.mode == expected_mode, (
            f"Expected mode={expected_mode}, got {response.mode}"
        )
        assert response.active_sessions == 5, "Expected active_sessions=5"


class TestLogEvent:
    """Unit tests for LogEvent model."""

    @pytest.mark.parametrize(
        "level,message",
        [
            ("debug", "Debug message"),
            ("info", "Info message"),
            ("warning", "Warning message"),
            ("error", "Error message"),
        ],
        ids=["debug-log", "info-log", "warning-log", "error-log"],
    )
    def test_log_event_levels(self, level, message):
        """Test LogEvent with all valid log levels."""
        event = LogEvent(
            level=level,
            message=message,
            timestamp=1704067206000,
        )
        assert event.level == level, f"Expected level={level}, got {event.level}"
        assert event.message == message, (
            f"Expected message='{message}', got {event.message}"
        )


class TestStepCompleteEvent:
    """Unit tests for StepCompleteEvent model."""

    @pytest.mark.parametrize(
        "status,expected_error,expected_result",
        [
            ("completed", None, True),
            ("failed", "Element not found", None),
        ],
        ids=["completed-status", "failed-status"],
    )
    def test_step_complete_event_statuses(
        self, status, expected_error, expected_result
    ):
        """Test StepCompleteEvent with different statuses."""
        event_data = {
            "execution_id": "exec-001",
            "step_id": "step-001",
            "status": status,
            "duration_ms": 1234,
            "timestamp": 1704067209000,
        }

        if expected_result:
            event_data["result"] = {
                "locators_attempted": ["role"],
                "locator_used": "role",
            }
            event_data["error"] = None
        else:
            event_data["result"] = None
            event_data["error"] = expected_error

        event = StepCompleteEvent(**event_data)

        assert event.status == status, f"Expected status={status}, got {event.status}"
        assert event.duration_ms == 1234, "Expected duration_ms=1234"


class TestVisualDiffEvent:
    """Unit tests for VisualDiffEvent model."""

    def test_visual_diff_event(self):
        """Test VisualDiffEvent."""
        event = VisualDiffEvent(
            execution_id="exec-001",
            step_id="step-001",
            action_id="action-001",
            expected_path="/expected.png",
            actual_path="/actual.png",
            diff_path="/diff.png",
            threshold=5.0,
            timestamp=1704067211000,
        )
        assert event.execution_id == "exec-001", "Expected execution_id='exec-001'"
        assert event.threshold == 5.0, "Expected threshold=5.0"


class TestExecutionCompleteEvent:
    """Unit tests for ExecutionCompleteEvent model."""

    def test_execution_complete_event(self):
        """Test ExecutionCompleteEvent."""
        event = ExecutionCompleteEvent(
            execution_id="exec-001",
            result={
                "id": "exec-001",
                "script_id": "script-001",
                "kernel_id": "kernel-001",
                "status": "completed",
                "duration_ms": 15000,
                "artifacts": {"screenshots": [], "diffs": []},
            },
            timestamp=1704067212000,
        )
        assert event.execution_id == "exec-001", "Expected execution_id='exec-001'"
        assert event.result["status"] == "completed", (
            "Expected result status='completed'"
        )
        assert event.result["duration_ms"] == 15000, "Expected duration_ms=15000"
