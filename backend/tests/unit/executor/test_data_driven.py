"""Unit tests for data-driven executor."""

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
from executor.data_driven import DataDrivenExecutor


class TestDataDrivenExecutor:
    """Unit tests for DataDrivenExecutor."""

    @pytest.fixture
    def data_driven_executor(self):
        """Create DataDrivenExecutor instance."""
        return DataDrivenExecutor()

    def test_substitute_parameters_basic(self, data_driven_executor):
        """Test basic parameter substitution."""
        params = {
            "username": "${username}",
            "password": "${password}",
            "url": "https://example.com",
        }
        row_data = {
            "username": "testuser",
            "password": "testpass",
        }

        result = data_driven_executor.substitute_parameters(params, row_data)

        assert result["username"] == "testuser"
        assert result["password"] == "testpass"
        assert result["url"] == "https://example.com"

    def test_substitute_parameters_partial(self, data_driven_executor):
        """Test partial parameter substitution."""
        params = {
            "username": "${username}",
            "message": "Hello ${username}",
        }
        row_data = {
            "username": "john",
        }

        result = data_driven_executor.substitute_parameters(params, row_data)

        assert result["username"] == "john"
        assert result["message"] == "Hello john"

    def test_substitute_parameters_no_match(self, data_driven_executor):
        """Test substitution when no matches found."""
        params = {
            "username": "john",
            "password": "doe",
        }
        row_data = {
            "name": "Jane",
        }

        result = data_driven_executor.substitute_parameters(params, row_data)

        assert result["username"] == "john"
        assert result["password"] == "doe"

    def test_substitute_parameters_empty_row_data(self, data_driven_executor):
        """Test substitution with empty row data."""
        params = {
            "username": "${username}",
            "password": "${password}",
        }
        row_data = {}

        result = data_driven_executor.substitute_parameters(params, row_data)

        assert result["username"] == "${username}"
        assert result["password"] == "${password}"

    def test_substitute_parameters_nested(self, data_driven_executor):
        """Test substitution with nested objects."""
        params = {
            "user": {
                "name": "${name}",
                "email": "${email}",
            },
        }
        row_data = {
            "name": "Alice",
            "email": "alice@example.com",
        }

        result = data_driven_executor.substitute_parameters(params, row_data)

        assert result["user"]["name"] == "Alice"
        assert result["user"]["email"] == "alice@example.com"

    def test_substitute_parameters_list_values(self, data_driven_executor):
        """Test substitution in list values."""
        params = {
            "items": ["${item1}", "${item2}", "fixed"],
        }
        row_data = {
            "item1": "Apple",
            "item2": "Banana",
        }

        result = data_driven_executor.substitute_parameters(params, row_data)

        assert result["items"] == ["Apple", "Banana", "fixed"]

    def test_substitute_parameters_multiple_placeholders(self, data_driven_executor):
        """Test substitution with multiple placeholders in one value."""
        params = {
            "message": "Hello ${first_name} ${last_name}",
        }
        row_data = {
            "first_name": "John",
            "last_name": "Doe",
        }

        result = data_driven_executor.substitute_parameters(params, row_data)

        assert result["message"] == "Hello John Doe"

    def test_substitute_parameters_special_chars(self, data_driven_executor):
        """Test substitution with special characters."""
        params = {
            "value": "${special}",
        }
        row_data = {
            "special": "test@#$%^&*()",
        }

        result = data_driven_executor.substitute_parameters(params, row_data)

        assert result["value"] == "test@#$%^&*()"

    def test_substitute_parameters_numbers(self, data_driven_executor):
        """Test substitution with numeric values."""
        params = {
            "age": "${age}",
            "score": "${score}",
        }
        row_data = {
            "age": "25",
            "score": "100",
        }

        result = data_driven_executor.substitute_parameters(params, row_data)

        assert result["age"] == "25"
        assert result["score"] == "100"

    def test_substitute_parameters_none_value(self, data_driven_executor):
        """Test substitution with None value in row data."""
        params = {
            "value": "${value}",
        }
        row_data = {
            "value": None,
        }

        result = data_driven_executor.substitute_parameters(params, row_data)

        assert result["value"] == "None"
