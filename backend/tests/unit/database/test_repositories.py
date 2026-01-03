"""Unit tests for Database layer - Kernel, Script, Execution, Settings repositories.

Per spec T006-T011: Database schema and repository implementations.

P0改进：使用tmp_path隔离数据库测试，避免测试间干扰。
"""

import pytest
import sys
import os
import tempfile
import shutil

# Add parent directories to path for imports
test_file = os.path.abspath(__file__)
unit_dir = os.path.dirname(test_file)
tests_dir = os.path.dirname(unit_dir)
backend_dir = os.path.dirname(tests_dir)
parent_dir = os.path.dirname(backend_dir)
engine_dir = os.path.join(parent_dir, "engine")
sys.path.insert(0, engine_dir)

from database.models import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from database.kernel_repo import KernelRepository
from database.script_repo import ScriptRepository
from database.execution_repo import ExecutionRepository
from database.settings_repo import SettingsRepository


@pytest.fixture(autouse=True)
def reset_global_state():
    """Reset global database state before each test.

    Per pytest principle: Isolated & Repeatable.
    """
    import database

    database._engine = None
    database._session_factory = None
    yield


@pytest.fixture
def test_db(tmp_path):
    """Create isolated test database.

    Per pytest principle: Isolated & Repeatable.
    Uses tmp_path to ensure each test gets fresh database.

    Args:
        tmp_path: pytest fixture for temporary directory

    Yields:
        SQLAlchemy session
    """
    # Create temporary database file
    db_path = tmp_path / "test.db"
    db_uri = f"sqlite:///{db_path}"

    # Create engine with test settings
    engine = create_engine(
        db_uri,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    # Enable SQLite optimizations
    with engine.connect() as conn:
        from sqlalchemy import text

        conn.execute(text("PRAGMA journal_mode=WAL"))
        conn.execute(text("PRAGMA foreign_keys=ON"))
        conn.execute(text("PRAGMA synchronous=NORMAL"))

    # Create tables
    Base.metadata.create_all(bind=engine, checkfirst=True)

    # Create session factory
    session_factory = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

    session = session_factory()
    yield session

    # Cleanup: close session and delete database file
    session.close()
    engine.dispose()
    if db_path.exists():
        db_path.unlink()


class TestKernelRepository:
    """Unit tests for Kernel repository.

    Per spec T007: Kernel repository CRUD operations.

    Per pytest principle: Isolated - each test uses fresh database via tmp_path.
    """

    @pytest.fixture
    def repo(self, test_db):
        """Create KernelRepository instance."""
        return KernelRepository(test_db)

    def test_create_kernel(self, repo, test_db):
        """Test creating a kernel.

        Per spec T007: Create kernel in database.
        Per pytest principle: Single Responsibility - only tests creation.
        """
        kernel_id = "test-kernel-001"
        kernel = {
            "id": kernel_id,
            "name": "Test Kernel",
            "type": "chrome",
            "browser_path": "/usr/bin/google-chrome",
            "version": "86.0.4240.111",
        }
        repo.create(kernel)
        test_db.commit()

        # Verify kernel was created
        retrieved = repo.get(kernel_id)
        assert retrieved is not None, f"Kernel {kernel_id} should be found"
        assert retrieved["id"] == kernel_id
        assert retrieved["name"] == "Test Kernel"

    def test_get_kernel(self, repo, test_db):
        """Test getting a kernel.

        Per spec T007: Get kernel from database.
        """
        kernel_id = "test-get-kernel-001"
        kernel = {
            "id": kernel_id,
            "name": "Get Test Kernel",
            "type": "chrome",
            "browser_path": "/usr/bin/chrome",
            "version": "87.0.4280.88",
        }
        repo.create(kernel)
        test_db.commit()

        retrieved = repo.get(kernel_id)
        assert retrieved is not None
        assert retrieved["id"] == kernel_id
        assert retrieved["name"] == "Get Test Kernel"

    def test_get_nonexistent_kernel(self, repo):
        """Test getting non-existent kernel returns None.

        Per pytest principle: Expressive Assertions with message.
        """
        kernel = repo.get("non-existent-kernel")
        assert kernel is None, "Non-existent kernel should return None"

    def test_update_kernel(self, repo, test_db):
        """Test updating a kernel.

        Per spec T007: Update kernel in database.
        """
        kernel_id = "test-update-kernel-001"
        kernel = {
            "id": kernel_id,
            "name": "Update Test Kernel",
            "type": "chrome",
            "browser_path": "/usr/bin/chrome",
            "version": "86.0.4240.111",
        }
        repo.create(kernel)
        test_db.commit()

        # Update
        kernel["name"] = "Updated Kernel Name"
        kernel["version"] = "88.0.4324.182"
        repo.update(kernel_id, kernel)
        test_db.commit()

        # Verify update
        updated = repo.get(kernel_id)
        assert updated is not None
        assert updated["name"] == "Updated Kernel Name", "Name should be updated"
        assert updated["version"] == "88.0.4324.182", "Version should be updated"

    def test_delete_kernel(self, repo, test_db):
        """Test deleting a kernel.

        Per spec T007: Delete kernel from database.
        """
        kernel_id = "test-delete-kernel-001"
        kernel = {
            "id": kernel_id,
            "name": "Delete Test Kernel",
            "type": "chrome",
            "browser_path": "/usr/bin/chrome",
            "version": "86.0.4240.111",
        }
        repo.create(kernel)
        test_db.commit()

        # Delete
        repo.delete(kernel_id)
        test_db.commit()

        # Verify deletion
        deleted = repo.get(kernel_id)
        assert deleted is None, "Deleted kernel should not be found"

    def test_list_kernels(self, repo, test_db):
        """Test listing all kernels.

        Per spec T007: List kernels from database.
        """
        # Create test kernels
        repo.create(
            {
                "id": "list-test-001",
                "name": "List Test 1",
                "type": "chrome",
                "browser_path": "/usr/bin/chrome1",
                "version": "86.0.4240.111",
            }
        )
        repo.create(
            {
                "id": "list-test-002",
                "name": "List Test 2",
                "type": "chrome",
                "browser_path": "/usr/bin/chrome2",
                "version": "87.0.4280.88",
            }
        )
        test_db.commit()

        # List
        kernels = repo.list()
        assert isinstance(kernels, list), "Kernels should be a list"
        assert len(kernels) >= 2, f"Expected at least 2 kernels, got {len(kernels)}"


class TestScriptRepository:
    """Unit tests for Script repository.

    Per spec T008: Script repository CRUD operations.
    """

    @pytest.fixture
    def repo(self, test_db):
        """Create ScriptRepository instance."""
        return ScriptRepository(test_db)

    def test_create_script(self, repo, test_db):
        """Test creating a script.

        Per spec T008: Create script in database.
        """
        script_id = "test-script-001"
        script = {
            "id": script_id,
            "name": "Test Script",
            "scenarios": [],
            "data_driven": [],
            "target_kernels": [],
        }
        repo.create(script)
        test_db.commit()

        # Verify script was created
        retrieved = repo.get(script_id)
        assert retrieved is not None
        assert retrieved["id"] == script_id
        assert retrieved["name"] == "Test Script"

    def test_get_script(self, repo, test_db):
        """Test getting a script.

        Per spec T008: Get script from database.
        """
        script_id = "test-get-script-001"
        script = {
            "id": script_id,
            "name": "Get Test Script",
            "scenarios": [],
            "data_driven": [],
            "target_kernels": [],
        }
        repo.create(script)
        test_db.commit()

        retrieved = repo.get(script_id)
        assert retrieved is not None
        assert retrieved["id"] == script_id

    def test_update_script(self, repo, test_db):
        """Test updating a script.

        Per spec T008: Update script in database.
        """
        script_id = "test-update-script-001"
        script = {
            "id": script_id,
            "name": "Update Test Script",
            "scenarios": [],
            "data_driven": [],
            "target_kernels": [],
        }
        repo.create(script)
        test_db.commit()

        # Update
        script["name"] = "Updated Script Name"
        repo.update(script_id, script)
        test_db.commit()

        # Verify update
        updated = repo.get(script_id)
        assert updated is not None
        assert updated["name"] == "Updated Script Name"

    def test_delete_script(self, repo, test_db):
        """Test deleting a script.

        Per spec T008: Delete script from database.
        """
        script_id = "test-delete-script-001"
        script = {
            "id": script_id,
            "name": "Delete Test Script",
            "scenarios": [],
            "data_driven": [],
            "target_kernels": [],
        }
        repo.create(script)
        test_db.commit()

        # Delete
        repo.delete(script_id)
        test_db.commit()

        # Verify deletion
        deleted = repo.get(script_id)
        assert deleted is None

    def test_list_scripts(self, repo):
        """Test listing all scripts.

        Per spec T008: List scripts from database.
        """
        scripts = repo.list()
        assert isinstance(scripts, list), "Scripts should be a list"


class TestExecutionRepository:
    """Unit tests for Execution repository.

    Per spec T009: Execution repository CRUD operations with cleanup logic.
    """

    @pytest.fixture
    def repo(self, test_db):
        """Create ExecutionRepository instance."""
        return ExecutionRepository(test_db)

    def test_create_execution(self, repo, test_db):
        """Test creating an execution.

        Per spec T009: Create execution in database.
        """
        execution_id = "test-execution-001"
        execution = {
            "id": execution_id,
            "script_id": "test-script-001",
            "kernel_id": "test-kernel-001",
            "status": "completed",
            "start_time": "2026-01-01T00:00:00Z",
            "end_time": "2026-01-01T00:01:00Z",
            "result": {"pass_count": 10, "fail_count": 0},
        }
        repo.create(execution)
        test_db.commit()

        # Verify execution was created
        retrieved = repo.get(execution_id)
        assert retrieved is not None
        assert retrieved["id"] == execution_id

    def test_get_execution(self, repo, test_db):
        """Test getting an execution.

        Per spec T009: Get execution from database.
        """
        execution_id = "test-get-execution-001"
        execution = {
            "id": execution_id,
            "script_id": "test-script-002",
            "kernel_id": "test-kernel-002",
            "status": "running",
            "start_time": "2026-01-01T00:00:00Z",
        }
        repo.create(execution)
        test_db.commit()

        retrieved = repo.get(execution_id)
        assert retrieved is not None
        assert retrieved["id"] == execution_id

    def test_update_execution_status(self, repo, test_db):
        """Test updating execution status.

        Per spec T009: Update execution in database.
        """
        execution_id = "test-update-execution-001"
        execution = {
            "id": execution_id,
            "script_id": "test-script-003",
            "kernel_id": "test-kernel-003",
            "status": "running",
            "start_time": "2026-01-01T00:00:00Z",
        }
        repo.create(execution)
        test_db.commit()

        # Update
        execution["status"] = "completed"
        execution["end_time"] = "2026-01-01T00:01:00Z"
        repo.update(execution_id, execution)
        test_db.commit()

        # Verify update
        updated = repo.get(execution_id)
        assert updated is not None
        assert updated["status"] == "completed"
        assert updated["end_time"] is not None

    def test_delete_execution(self, repo, test_db):
        """Test deleting an execution.

        Per spec T009: Delete execution from database.
        """
        execution_id = "test-delete-execution-001"
        execution = {
            "id": execution_id,
            "script_id": "test-script-004",
            "kernel_id": "test-kernel-004",
            "status": "completed",
            "start_time": "2026-01-01T00:00:00Z",
        }
        repo.create(execution)
        test_db.commit()

        # Delete
        repo.delete(execution_id)
        test_db.commit()

        # Verify deletion
        deleted = repo.get(execution_id)
        assert deleted is None

    def test_list_executions_by_script(self, repo, test_db):
        """Test listing executions by script.

        Per spec T009: List executions from database.
        """
        script_id = "test-list-script-001"
        repo.create(
            {
                "id": "list-exec-001",
                "script_id": script_id,
                "kernel_id": "kernel-001",
                "status": "completed",
                "start_time": "2026-01-01T00:00:00Z",
            }
        )
        repo.create(
            {
                "id": "list-exec-002",
                "script_id": script_id,
                "kernel_id": "kernel-002",
                "status": "completed",
                "start_time": "2026-01-01T00:01:00Z",
            }
        )
        test_db.commit()

        executions = repo.list_by_script(script_id)
        assert isinstance(executions, list)
        assert len(executions) >= 2, (
            f"Expected at least 2 executions, got {len(executions)}"
        )


class TestSettingsRepository:
    """Unit tests for Settings repository.

    Per spec T010: Settings repository key-value operations.
    """

    @pytest.fixture
    def repo(self, test_db):
        """Create SettingsRepository instance."""
        return SettingsRepository(test_db)

    def test_set_setting(self, repo, test_db):
        """Test setting a key-value pair.

        Per spec T010: Set setting in database.
        """
        key = "test-setting-001"
        value = "test-value"

        repo.set(key, value)
        test_db.commit()

        # Verify setting was set
        retrieved = repo.get(key)
        assert retrieved == value

    def test_get_setting(self, repo, test_db):
        """Test getting a setting.

        Per spec T010: Get setting from database.
        """
        key = "test-get-setting-001"
        value = {"nested": "value"}

        repo.set(key, value)
        test_db.commit()

        retrieved = repo.get(key)
        assert retrieved == value
        assert retrieved["nested"] == "value"

    def test_get_nonexistent_setting(self, repo):
        """Test getting non-existent setting returns None.

        Per pytest principle: Expressive assertion with message.
        """
        setting = repo.get("non-existent-setting")
        assert setting is None, "Non-existent setting should return None"

    def test_delete_setting(self, repo, test_db):
        """Test deleting a setting.

        Per spec T010: Delete setting from database.
        """
        key = "test-delete-setting-001"
        value = "to-be-deleted"

        repo.set(key, value)
        test_db.commit()

        repo.delete(key)
        test_db.commit()

        # Verify deletion
        deleted = repo.get(key)
        assert deleted is None

    def test_update_setting(self, repo, test_db):
        """Test updating a setting.

        Per spec T010: Update setting in database.
        """
        key = "test-update-setting-001"
        repo.set(key, "old-value")
        test_db.commit()

        # Update
        repo.set(key, "new-value")
        test_db.commit()

        # Verify update
        updated = repo.get(key)
        assert updated == "new-value"
