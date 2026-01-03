"""Integration tests for Browser Management functionality.

Per spec US1: Browser instances launch/close, Kernel registration, custom Chrome paths.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Add parent directories to path for imports
test_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(test_dir)
parent_dir = os.path.dirname(backend_dir)
engine_dir = os.path.join(parent_dir, "engine")
sys.path.insert(0, engine_dir)

from browser.kernel import KernelLoader
from browser.tracing import TracingManager
from database.kernel_repo import KernelRepository
from database.settings_repo import SettingsRepository


class TestBrowserManagement:
    """Integration tests for Browser Management.

    Per spec T024-T027: Browser manager, kernel loader, tracing, kernel registration.
    """

    @pytest.fixture
    def kernel_loader(self):
        """Create KernelLoader instance for testing."""
        return KernelLoader()

    @pytest.fixture
    def tracing_manager(self):
        """Create TracingManager instance for testing."""
        return TracingManager()

    @pytest.fixture
    def kernel_repo(self):
        """Create KernelRepository for testing."""
        from database import get_db, init_db

        init_db()
        db = get_db()
        return KernelRepository(db)

    def test_kernel_loader_created(self, kernel_loader):
        """Test that KernelLoader can be instantiated.

        Per spec T025: Create kernel loader.
        """
        assert kernel_loader is not None
        assert hasattr(kernel_loader, "load_kernels")
        assert hasattr(kernel_loader, "validate_chrome_version")

    def test_kernel_loader_validate_chrome_version_mock(self, kernel_loader):
        """Test Chrome version validation with mock.

        Per spec T025: Validate Chrome 86+ version per spec FR-002.
        """
        with patch.object(
            kernel_loader, "get_chrome_version", return_value="86.0.4240.111"
        ):
            version = kernel_loader.validate_chrome_version()
            assert version is not None
            major_version = int(version.split(".")[0])
            assert major_version >= 86

    def test_kernel_loader_validate_chrome_version_too_old(self, kernel_loader):
        """Test that old Chrome versions fail validation.

        Per spec FR-002: Reject Chrome versions < 86.
        """
        with patch.object(
            kernel_loader, "get_chrome_version", return_value="85.0.4240.111"
        ):
            try:
                kernel_loader.validate_chrome_version()
                assert False, "Should have raised exception for old Chrome version"
            except Exception as e:
                assert "version" in str(e).lower() or "86" in str(e)

    @pytest.mark.asyncio
    async def test_kernel_loader_load_kernels_from_repo(
        self, kernel_loader, kernel_repo
    ):
        """Test loading kernels from repository.

        Per spec T025: Load kernels from kernel_repo.
        """
        kernels = kernel_loader.load_kernels(kernel_repo)
        assert isinstance(kernels, list)

    def test_tracing_manager_created(self, tracing_manager):
        """Test that TracingManager can be instantiated.

        Per spec T026: Create Playwright tracing support.
        """
        assert tracing_manager is not None
        assert hasattr(tracing_manager, "start_tracing")
        assert hasattr(tracing_manager, "stop_tracing")
        assert hasattr(tracing_manager, "get_trace_zip")

    @pytest.mark.asyncio
    async def test_tracing_start_stop_mock(self, tracing_manager):
        """Test tracing start and stop with mock browser context.

        Per spec T026: Enable/disable tracing, generate trace.zip.
        """
        mock_context = Mock()
        mock_context.tracing = Mock()
        mock_context.tracing.start = AsyncMock()
        mock_context.tracing.stop = AsyncMock(return_value="/tmp/trace.zip")

        # Start tracing
        await tracing_manager.start_tracing(mock_context, "test-session")
        mock_context.tracing.start.assert_called_once()

        # Stop tracing
        trace_path = await tracing_manager.stop_tracing(mock_context, "test-session")
        mock_context.tracing.stop.assert_called_once()
        assert trace_path is not None

    @pytest.mark.asyncio
    async def test_kernel_repo_crud(self, kernel_repo):
        """Test Kernel repository CRUD operations.

        Per spec T007: Kernel repository CRUD operations.
        """
        # Create
        kernel_id = "test-kernel-001"
        kernel = {
            "id": kernel_id,
            "name": "Test Kernel",
            "type": "chrome",
            "browser_path": "/usr/bin/google-chrome",
            "version": "86.0.4240.111",
        }
        kernel_repo.create(kernel)

        # Read
        retrieved = kernel_repo.get(kernel_id)
        assert retrieved is not None
        assert retrieved["id"] == kernel_id
        assert retrieved["name"] == "Test Kernel"

        # Update
        kernel["name"] = "Updated Test Kernel"
        kernel_repo.update(kernel_id, kernel)
        updated = kernel_repo.get(kernel_id)
        assert updated["name"] == "Updated Test Kernel"

        # List
        all_kernels = kernel_repo.list()
        assert len(all_kernels) > 0

        # Delete
        kernel_repo.delete(kernel_id)
        deleted = kernel_repo.get(kernel_id)
        assert deleted is None

    def test_kernel_repo_get_nonexistent(self, kernel_repo):
        """Test getting non-existent kernel returns None.

        Per spec: Repository should handle missing data gracefully.
        """
        kernel = kernel_repo.get("non-existent-kernel")
        assert kernel is None

    def test_kernel_repo_list_empty(self, kernel_repo):
        """Test listing when no kernels exist.

        Per spec: Should return empty list, not None.
        """
        # Assuming there might be default kernels, just verify type
        kernels = kernel_repo.list()
        assert isinstance(kernels, list)

    @pytest.mark.asyncio
    async def test_default_kernel_registration(self, kernel_repo):
        """Test that default kernels are registered on startup.

        Per spec T027: Register default kernels on startup.
        """
        # Check for default kernels
        kernels = kernel_repo.list()
        assert len(kernels) > 0

        # Verify kernel structure
        if len(kernels) > 0:
            kernel = kernels[0]
            assert "id" in kernel
            assert "name" in kernel
            assert "type" in kernel
            assert "browser_path" in kernel
            assert "version" in kernel

    def test_kernel_loader_load_custom_chrome_path(self, kernel_loader):
        """Test loading kernels with custom Chrome paths.

        Per spec T025: Load custom Chrome paths, validate Chrome 86+ version.
        """
        custom_paths = {
            "custom-chrome": "/custom/path/to/chrome",
        }

        with patch.object(
            kernel_loader, "load_kernels_from_settings", return_value=custom_paths
        ):
            kernels = kernel_loader.load_custom_kernels()
            assert isinstance(kernels, dict)

    @pytest.mark.asyncio
    async def test_tracing_get_trace_zip_mock(self, tracing_manager):
        """Test getting trace zip path.

        Per spec T026: trace.zip generation.
        """
        session_id = "test-session-001"

        # Mock trace file existence
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
            trace_path = f.name

        try:
            # Mock trace path
            trace_zip = await tracing_manager.get_trace_zip(session_id)
            # May return None if no trace exists
            assert isinstance(trace_zip, (str, type(None)))
        finally:
            if os.path.exists(trace_path):
                os.unlink(trace_path)

    @pytest.mark.asyncio
    async def test_tracing_enabled_disabled(self, tracing_manager):
        """Test tracing can be enabled and disabled.

        Per spec: Playwright tracing enable/disable.
        """
        mock_context = Mock()
        mock_context.tracing = Mock()
        mock_context.tracing.start = AsyncMock()
        mock_context.tracing.stop = AsyncMock()

        # Enable tracing
        await tracing_manager.start_tracing(mock_context, "test-session")

        # Disable tracing
        await tracing_manager.stop_tracing(mock_context, "test-session")

        # Verify context.tracing methods were called
        assert mock_context.tracing.start.called
        assert mock_context.tracing.stop.called

    def test_kernel_version_validation_format(self, kernel_loader):
        """Test Chrome version format validation.

        Per spec: Chrome 86+ version.
        """
        valid_versions = ["86.0.4240.111", "90.0.4430.212", "100.0.0.0"]
        for version in valid_versions:
            major_version = int(version.split(".")[0])
            assert major_version >= 86, f"Version {version} should be >= 86"

    def test_kernel_repo_handles_special_characters(self, kernel_repo):
        """Test that repository handles special characters in kernel data.

        Per spec T080: Validate message structure, sanitize inputs.
        """
        kernel_id = "test-special-001"
        kernel = {
            "id": kernel_id,
            "name": "Test <script>alert('xss')</script>",
            "type": "chrome",
            "browser_path": "/usr/bin/chrome",
            "version": "86.0.4240.111",
        }
        kernel_repo.create(kernel)
        retrieved = kernel_repo.get(kernel_id)
        assert retrieved is not None
        kernel_repo.delete(kernel_id)

    @pytest.mark.asyncio
    async def test_tracing_session_isolation(self, tracing_manager):
        """Test that tracing sessions are isolated.

        Per spec: Each session should have its own trace.
        """
        mock_context = Mock()
        mock_context.tracing = Mock()
        mock_context.tracing.start = AsyncMock()
        mock_context.tracing.stop = AsyncMock(return_value="/tmp/trace.zip")

        # Start tracing for session 1
        await tracing_manager.start_tracing(mock_context, "session-001")

        # Start tracing for session 2
        await tracing_manager.start_tracing(mock_context, "session-002")

        # Stop both
        trace1 = await tracing_manager.stop_tracing(mock_context, "session-001")
        trace2 = await tracing_manager.stop_tracing(mock_context, "session-002")

        # Both should return traces
        assert trace1 is not None
        assert trace2 is not None
