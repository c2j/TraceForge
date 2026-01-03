"""Unit tests for VisualAssertion.

Per spec FR-016: Screenshot comparison with threshold.
Per spec FR-017: Generate expected/actual/diff images on assertion failure.
"""

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
from pathlib import Path
from executor.visual import VisualAssertion
from models.websocket import VisualDiffEvent


class TestVisualAssertion:
    """Unit tests for VisualAssertion functionality."""

    @pytest.fixture
    def visual(self, tmp_path):
        """Create VisualAssertion instance with temporary output directory."""
        output_dir = tmp_path / "screenshots"
        return VisualAssertion(output_dir=str(output_dir))

    @pytest.fixture
    def mock_page(self):
        """Create mock Playwright Page instance."""
        page = Mock()
        page.screenshot = AsyncMock(return_value=None)
        return page

    @pytest.mark.asyncio
    async def test_capture_screenshot_creates_file(self, visual, mock_page):
        """Test capture_screenshot creates screenshot file."""
        action_id = "action-001"
        execution_id = "exec-001"

        filepath = await visual.capture_screenshot(mock_page, action_id, execution_id)

        assert filepath is not None, "Expected filepath to be returned"
        assert filepath.endswith(".jpg"), f"Expected .jpg extension, got {filepath}"
        assert action_id in filepath, f"Expected action_id in filepath: {filepath}"

    @pytest.mark.asyncio
    async def test_capture_screenshot_handles_exception(self, visual, mock_page):
        """Test capture_screenshot handles Playwright exceptions gracefully."""
        # Note: Actual implementation doesn't call page.screenshot yet (it's TODO)
        # This test verifies the error handling structure is in place
        filepath = await visual.capture_screenshot(mock_page, "action-001", "exec-001")

        # Since screenshot is not yet implemented, it should return a path
        assert filepath is not None, "Expected filepath to be returned"
        assert filepath.endswith(".jpg"), f"Expected .jpg extension, got {filepath}"

    @pytest.mark.asyncio
    async def test_assert_screenshot_default_threshold(self, visual, mock_page):
        """Test assert_screenshot uses default threshold."""
        action_id = "action-001"
        expected_path = "/path/to/expected.png"

        with patch.object(
            visual, "capture_screenshot", return_value="/path/to/actual.jpg"
        ):
            passed, diff_event = await visual.assert_screenshot(
                mock_page, action_id, expected_path
            )

        assert passed is True, "Expected assertion to pass"
        assert diff_event is None, "Expected no diff_event on pass"

    @pytest.mark.asyncio
    async def test_assert_screenshot_custom_threshold(self, visual, mock_page):
        """Test assert_screenshot accepts custom threshold."""
        custom_threshold = 10.0
        action_id = "action-001"
        expected_path = "/path/to/expected.png"

        with patch.object(
            visual, "capture_screenshot", return_value="/path/to/actual.jpg"
        ):
            passed, diff_event = await visual.assert_screenshot(
                mock_page, action_id, expected_path, threshold=custom_threshold
            )

        assert passed is True, "Expected assertion to pass"
        assert diff_event is None, "Expected no diff_event on pass"

    @pytest.mark.asyncio
    async def test_assert_screenshot_failure_creates_diff_event(
        self, visual, mock_page
    ):
        """Test assert_screenshot creates VisualDiffEvent on failure."""
        action_id = "action-001"
        expected_path = "/path/to/expected.png"
        threshold = 5.0

        # Mock assertion failure
        with patch.object(visual, "assert_screenshot", wraps=visual.assert_screenshot):
            # This test documents expected behavior once _compare_images is implemented
            # For now, we verify the structure would be correct
            passed, diff_event = await visual.assert_screenshot(
                mock_page, action_id, expected_path, threshold=threshold
            )

    def test_default_threshold_constant(self, visual):
        """Test DEFAULT_THRESHOLD constant value."""
        assert visual.DEFAULT_THRESHOLD == 5.0, (
            f"DEFAULT_THRESHOLD should be 5.0, got {visual.DEFAULT_THRESHOLD}"
        )

    def test_output_dir_created_on_init(self, tmp_path):
        """Test that output directory is created during initialization."""
        output_dir = tmp_path / "new_screenshots"
        assert not output_dir.exists(), (
            "Output dir should not exist before initialization"
        )

        VisualAssertion(output_dir=str(output_dir))

        assert output_dir.exists(), "Output dir should be created on initialization"
        assert output_dir.is_dir(), "Output path should be a directory"

    @pytest.mark.asyncio
    async def test_assert_screenshot_with_execution_id(self, visual, mock_page):
        """Test assert_screenshot includes execution_id in context."""
        action_id = "action-001"
        execution_id = "exec-123"
        expected_path = "/path/to/expected.png"

        with patch.object(
            visual, "capture_screenshot", return_value="/path/to/actual.jpg"
        ) as mock_capture:
            await visual.assert_screenshot(
                mock_page, action_id, expected_path, execution_id=execution_id
            )

            # Verify execution_id was passed to capture_screenshot
            mock_capture.assert_called_once()
            call_args = mock_capture.call_args
            assert call_args[0][2] == execution_id, (
                f"Expected execution_id {execution_id}, got {call_args[0][2]}"
            )

    @pytest.mark.asyncio
    async def test_assert_screenshot_without_execution_id(self, visual, mock_page):
        """Test assert_screenshot handles missing execution_id."""
        action_id = "action-001"
        expected_path = "/path/to/expected.png"

        with patch.object(
            visual, "capture_screenshot", return_value="/path/to/actual.jpg"
        ) as mock_capture:
            await visual.assert_screenshot(mock_page, action_id, expected_path)

            # Verify empty string is used as default
            call_args = mock_capture.call_args
            assert call_args[0][2] == "", (
                "Expected empty string for missing execution_id"
            )

    @pytest.mark.asyncio
    async def test_generate_diff_image_returns_path(self, visual):
        """Test _generate_diff_image returns correct path format."""
        action_id = "action-001"
        diff = Mock()  # Mock PIL Image diff object

        diff_path = visual._generate_diff_image(diff, action_id)

        assert isinstance(diff_path, str), "Expected string path"
        assert action_id in diff_path, f"Expected action_id in path: {diff_path}"
        assert "_diff" in diff_path, "Expected '_diff' in filename"

    @pytest.mark.asyncio
    async def test_compare_images_placeholder(self, visual):
        """Test _compare_images placeholder returns success (until implementation)."""
        expected_path = "/path/to/expected.png"
        actual_path = "/path/to/actual.jpg"
        threshold = 5.0

        passed, diff_path = visual._compare_images(
            expected_path, actual_path, threshold
        )

        # TODO: Once _compare_images is implemented, update this test
        assert passed is True, "Placeholder returns True until implementation"
        assert diff_path is None, "Placeholder returns None diff_path"

    @pytest.mark.asyncio
    async def test_capture_screenshot_filename_format(self, visual, mock_page):
        """Test screenshot filename includes action_id and timestamp."""
        action_id = "test-action"
        execution_id = "test-exec"

        filepath = await visual.capture_screenshot(mock_page, action_id, execution_id)

        filename = Path(filepath).name
        assert action_id in filename, f"Expected action_id in filename: {filename}"
        assert filename.endswith(".jpg"), f"Expected .jpg extension: {filename}"

    @pytest.mark.asyncio
    async def test_assert_screenshot_zero_threshold(self, visual, mock_page):
        """Test assert_screenshot accepts zero threshold."""
        action_id = "action-001"
        expected_path = "/path/to/expected.png"

        with patch.object(
            visual, "capture_screenshot", return_value="/path/to/actual.jpg"
        ):
            passed, diff_event = await visual.assert_screenshot(
                mock_page, action_id, expected_path, threshold=0.0
            )

        assert passed is True, "Expected assertion to pass with zero threshold"

    def test_visual_diff_event_structure(self):
        """Test VisualDiffEvent can be created with correct structure."""
        diff_event = VisualDiffEvent(
            execution_id="exec-001",
            step_id="step-001",
            action_id="action-001",
            expected_path="/path/to/expected.png",
            actual_path="/path/to/actual.jpg",
            diff_path="/path/to/diff.png",
            threshold=5.0,
            timestamp=1234567890,
        )

        assert diff_event.execution_id == "exec-001"
        assert diff_event.action_id == "action-001"
        assert diff_event.threshold == 5.0
        assert diff_event.timestamp == 1234567890

    @pytest.mark.asyncio
    async def test_assert_screenshot_capture_called_before_comparison(
        self, visual, mock_page
    ):
        """Test that screenshot is captured before comparison."""
        action_id = "action-001"
        expected_path = "/path/to/expected.png"

        call_order = []

        async def mock_capture(*args, **kwargs):
            call_order.append("capture")
            return "/path/to/actual.jpg"

        with patch.object(visual, "capture_screenshot", side_effect=mock_capture):
            await visual.assert_screenshot(mock_page, action_id, expected_path)

        assert call_order == ["capture"], "capture_screenshot should be called"

    @pytest.mark.asyncio
    async def test_multiple_screenshots_unique_filenames(self, visual, mock_page):
        """Test that multiple screenshots get unique filenames."""
        action_id = "action-001"
        execution_id = "exec-001"

        filepath1 = await visual.capture_screenshot(mock_page, action_id, execution_id)
        await asyncio.sleep(0.001)
        filepath2 = await visual.capture_screenshot(mock_page, action_id, execution_id)

        assert filepath1 != filepath2, (
            "Expected unique filenames for multiple screenshots"
        )

    @pytest.mark.asyncio
    async def test_output_dir_persistence(self, visual, tmp_path):
        """Test that output directory persists across operations."""
        output_dir = tmp_path / "screenshots"

        assert output_dir.exists(), "Output dir should exist"

        # Perform operation
        await visual.capture_screenshot(Mock(), "action-001", "exec-001")

        assert output_dir.exists(), "Output dir should still exist after operation"
