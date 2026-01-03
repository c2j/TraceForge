"""Simple unit test for database imports.

Tests that database modules can be imported.
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


def test_database_import():
    """Test that database modules can be imported."""
    from database import init_db, get_session

    assert init_db is not None
    assert get_session is not None


def test_kernel_repo_import():
    """Test that KernelRepository can be imported."""
    from database.kernel_repo import KernelRepository

    assert KernelRepository is not None


def test_script_repo_import():
    """Test that ScriptRepository can be imported."""
    from database.script_repo import ScriptRepository

    assert ScriptRepository is not None


def test_execution_repo_import():
    """Test that ExecutionRepository can be imported."""
    from database.execution_repo import ExecutionRepository

    assert ExecutionRepository is not None


def test_settings_repo_import():
    """Test that SettingsRepository can be imported."""
    from database.settings_repo import SettingsRepository

    assert SettingsRepository is not None


def test_models_import():
    """Test that database models can be imported."""
    from database.models import Kernel, Script, Execution, Settings

    assert Kernel is not None
    assert Script is not None
    assert Execution is not None
    assert Settings is not None
