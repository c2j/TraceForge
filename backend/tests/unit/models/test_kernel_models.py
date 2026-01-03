"""Unit tests for kernel models (KernelConfig, ExecutionResult, etc.)."""

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
from datetime import datetime
from models.kernel import (
    KernelConfig,
    ExecutionStepResult,
    ExecutionStepError,
    ExecutionStepStatus,
    ExecutionArtifacts,
    ExecutionResult,
)


class TestKernelConfig:
    """Unit tests for KernelConfig model."""

    def test_create_kernel_config_minimal(self):
        """Test creating KernelConfig with minimal fields."""
        config = KernelConfig(
            id="kernel-001",
            name="Test Kernel",
            executable_path="/usr/bin/chrome",
            version="86.0.4240.111",
        )
        assert config.id == "kernel-001", f"Expected id='kernel-001', got {config.id}"
        assert config.name == "Test Kernel", (
            f"Expected name='Test Kernel', got {config.name}"
        )
        assert config.executable_path == "/usr/bin/chrome", (
            "Expected executable_path='/usr/bin/chrome'"
        )
        assert config.version == "86.0.4240.111", "Expected version='86.0.4240.111'"
        assert config.is_default_record is False, "Expected is_default_record=False"
        assert config.is_default_agent is False, "Expected is_default_agent=False"
        assert config.created_at is None, "Expected created_at=None"

    @pytest.mark.parametrize(
        "is_default_record,is_default_agent",
        [
            (True, True),
            (False, True),
            (True, False),
        ],
        ids=["both-default", "only-agent-default", "only-record-default"],
    )
    def test_create_kernel_config_with_defaults(
        self, is_default_record, is_default_agent
    ):
        """Test creating KernelConfig with default flags."""
        created_at = "2026-01-01T00:00:00Z"
        config = KernelConfig(
            id="kernel-002",
            name="Full Kernel",
            executable_path="/usr/bin/firefox",
            version="87.0.4280.88",
            is_default_record=is_default_record,
            is_default_agent=is_default_agent,
            created_at=created_at,
        )
        assert config.is_default_record == is_default_record, (
            f"Expected is_default_record={is_default_record}"
        )
        assert config.is_default_agent == is_default_agent, (
            f"Expected is_default_agent={is_default_agent}"
        )
        assert config.created_at == created_at, f"Expected created_at={created_at}"

    def test_kernel_config_model_dump(self):
        """Test serializing KernelConfig to dict."""
        config = KernelConfig(
            id="kernel-003",
            name="Dump Test",
            executable_path="/usr/bin/chrome",
            version="86.0.4240.111",
        )
        data = config.model_dump()
        assert isinstance(data, dict), "Expected data to be a dict"
        assert data["id"] == "kernel-003", f"Expected id='kernel-003', got {data['id']}"
        assert data["name"] == "Dump Test", (
            f"Expected name='Dump Test', got {data['name']}"
        )

    def test_kernel_config_missing_required_field(self):
        """Test KernelConfig validation with missing required field."""
        with pytest.raises(ValueError):
            KernelConfig(
                name="Test",
                executable_path="/path",
                version="1.0",
            )


class TestExecutionStepResult:
    """Unit tests for ExecutionStepResult model."""

    def test_create_execution_step_result_empty(self):
        """Test creating ExecutionStepResult with empty defaults."""
        result = ExecutionStepResult()
        assert result.locators_attempted == [], "Expected empty locators_attempted list"
        assert result.locator_used is None, "Expected locator_used=None"
        assert result.screenshot is None, "Expected screenshot=None"
        assert result.error is None, "Expected error=None"

    @pytest.mark.parametrize(
        "locators_count,locator_used",
        [
            (1, "role"),
            (2, "css"),
            (3, "xpath"),
        ],
        ids=["single-locator", "two-locators", "three-locators"],
    )
    def test_create_execution_step_result_with_locators(
        self, locators_count, locator_used
    ):
        """Test creating ExecutionStepResult with multiple locators."""
        locators = [f"locator-{i}" for i in range(locators_count)]
        result = ExecutionStepResult(
            locators_attempted=locators,
            locator_used=locator_used,
            screenshot="/path/to/screenshot.jpg",
            error=None,
        )
        assert len(result.locators_attempted) == locators_count, (
            f"Expected {locators_count} locators, got {len(result.locators_attempted)}"
        )
        assert result.locator_used == locator_used, (
            f"Expected locator_used={locator_used}"
        )
        assert result.screenshot == "/path/to/screenshot.jpg", (
            "Expected screenshot='/path/to/screenshot.jpg'"
        )
        assert result.error is None, "Expected no error"

    def test_create_execution_step_result_with_error(self):
        """Test creating ExecutionStepResult with error."""
        result = ExecutionStepResult(
            locators_attempted=["role", "css"],
            locator_used=None,
            screenshot=None,
            error="Element not found",
        )
        assert result.error == "Element not found", "Expected error='Element not found'"
        assert result.locator_used is None, "Expected locator_used=None"


class TestExecutionStepError:
    """Unit tests for ExecutionStepError model."""

    @pytest.mark.parametrize(
        "error_type,message",
        [
            ("TimeoutError", "Action timed out after 300 seconds"),
            ("ElementNotFoundError", "Element not found"),
            ("NetworkError", "Network request failed"),
        ],
        ids=["timeout-error", "element-not-found", "network-error"],
    )
    def test_create_execution_step_error(self, error_type, message):
        """Test creating ExecutionStepError."""
        error = ExecutionStepError(
            error_type=error_type,
            message=message,
            stack_trace="Traceback...",
        )
        assert error.error_type == error_type, f"Expected error_type={error_type}"
        assert error.message == message, f"Expected message='{message}'"
        assert error.stack_trace == "Traceback...", (
            "Expected stack_trace='Traceback...'"
        )

    def test_create_execution_step_error_minimal(self):
        """Test creating ExecutionStepError with minimal fields."""
        error = ExecutionStepError(
            error_type="ElementNotFoundError",
            message="Element not found",
        )
        assert error.error_type == "ElementNotFoundError", (
            "Expected error_type='ElementNotFoundError'"
        )
        assert error.message == "Element not found", (
            "Expected message='Element not found'"
        )
        assert error.stack_trace is None, "Expected stack_trace=None"


class TestExecutionStepStatus:
    """Unit tests for ExecutionStepStatus model."""

    @pytest.mark.parametrize(
        "status,result_expected,error_expected",
        [
            ("completed", True, None),
            ("running", False, None),
            ("failed", False, "Element not found"),
        ],
        ids=["completed-status", "running-status", "failed-status"],
    )
    def test_create_execution_step_status_variations(
        self, status, result_expected, error_expected
    ):
        """Test creating ExecutionStepStatus with different statuses."""
        step_result = ExecutionStepResult(
            locators_attempted=["role"],
            locator_used="role",
            screenshot="/path.jpg",
        )

        status_data = {
            "id": "step-001",
            "execution_id": "exec-001",
            "action_id": "action-001",
            "status": status,
            "duration_ms": 1234,
            "timestamp": 1704067207000,
        }

        if result_expected:
            status_data["result"] = step_result
            status_data["error"] = None
        else:
            status_data["result"] = None
            status_data["error"] = error_expected

        step_status = ExecutionStepStatus(**status_data)

        assert step_status.status == status, f"Expected status={status}"
        assert step_status.duration_ms == 1234, "Expected duration_ms=1234"

        if result_expected:
            assert step_status.result is not None, "Expected result"
        else:
            assert step_status.result is None, "Expected no result"

        if error_expected:
            assert step_status.error == error_expected, (
                f"Expected error='{error_expected}'"
            )
        else:
            assert step_status.error is None, "Expected no error"


class TestExecutionArtifacts:
    """Unit tests for ExecutionArtifacts model."""

    @pytest.mark.parametrize(
        "screenshot_count,diff_count",
        [
            (0, 0),
            (2, 0),
            (0, 1),
            (2, 2),
        ],
        ids=["empty-artifacts", "two-screenshots", "one-diff", "mixed-artifacts"],
    )
    def test_create_execution_artifacts_variations(self, screenshot_count, diff_count):
        """Test creating ExecutionArtifacts with various content."""
        artifacts_data = {}

        if screenshot_count > 0:
            artifacts_data["screenshots"] = [
                {"action_id": f"action-{i}", "path": f"/screenshot{i}.jpg"}
                for i in range(screenshot_count)
            ]
        else:
            artifacts_data["screenshots"] = []

        if diff_count > 0:
            artifacts_data["diffs"] = [
                {
                    "action_id": "action-001",
                    "expected": "/expected.png",
                    "actual": "/actual.png",
                    "diff": "/diff.png",
                    "threshold": 5.0,
                }
                for i in range(diff_count)
            ]
        else:
            artifacts_data["diffs"] = []

        artifacts = ExecutionArtifacts(**artifacts_data)

        assert len(artifacts.screenshots) == screenshot_count, (
            f"Expected {screenshot_count} screenshots"
        )
        assert len(artifacts.diffs) == diff_count, f"Expected {diff_count} diffs"


class TestExecutionResult:
    """Unit tests for ExecutionResult model."""

    @pytest.mark.parametrize(
        "status",
        ["running", "completed", "failed", "cancelled"],
        ids=["running-status", "completed-status", "failed-status", "cancelled-status"],
    )
    def test_create_execution_result_statuses(self, status):
        """Test creating ExecutionResult with different statuses."""
        result = ExecutionResult(
            id=f"exec-{status}",
            script_id="script-001",
            kernel_id="kernel-001",
            status=status,
            duration_ms=1000,
        )
        assert result.status == status, f"Expected status={status}"

    @pytest.mark.parametrize(
        "has_artifacts,has_trace_path",
        [
            (True, True),
            (False, True),
            (True, False),
            (False, False),
        ],
        ids=["both-artifacts-and-trace", "only-trace", "only-artifacts", "neither"],
    )
    def test_create_execution_result_variations(self, has_artifacts, has_trace_path):
        """Test creating ExecutionResult with various fields."""
        result_data = {
            "id": "exec-001",
            "script_id": "script-001",
            "kernel_id": "kernel-001",
            "status": "completed",
            "duration_ms": 15000,
        }

        if has_artifacts:
            result_data["artifacts"] = ExecutionArtifacts(
                screenshots=[{"action_id": "action-001", "path": "/screenshot.jpg"}],
                diffs=[],
            )
        else:
            result_data["artifacts"] = None

        if has_trace_path:
            result_data["trace_path"] = "/traces/trace.zip"
        else:
            result_data["trace_path"] = None

        result = ExecutionResult(**result_data)

        assert result.id == "exec-001", "Expected id='exec-001'"
        assert result.duration_ms == 15000, "Expected duration_ms=15000"

        if has_artifacts:
            assert result.artifacts is not None, "Expected artifacts"
            assert len(result.artifacts.screenshots) == 1, "Expected 1 screenshot"
        else:
            assert result.artifacts is None, "Expected no artifacts"

        if has_trace_path:
            assert result.trace_path == "/traces/trace.zip", (
                "Expected trace_path='/traces/trace.zip'"
            )
        else:
            assert result.trace_path is None, "Expected no trace_path"

    def test_execution_result_model_dump(self):
        """Test serializing ExecutionResult to dict."""
        result = ExecutionResult(
            id="exec-004",
            script_id="script-004",
            kernel_id="kernel-004",
            status="completed",
            duration_ms=2000,
        )
        data = result.model_dump()
        assert isinstance(data, dict), "Expected data to be a dict"
        assert data["id"] == "exec-004", f"Expected id='exec-004', got {data['id']}"
        assert data["status"] == "completed", (
            f"Expected status='completed', got {data['status']}"
        )
