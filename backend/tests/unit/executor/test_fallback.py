"""Unit tests for LocatorFallback.

Per spec FR-012: Try role → text → css → xpath → id.
Per spec acceptance scenario 2: Retry with next locator if previous fails.
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
from unittest.mock import Mock, AsyncMock
from executor.fallback import LocatorFallback
from models.script import Action, LocatorStrategy


class TestLocatorFallback:
    """Unit tests for LocatorFallback strategy."""

    @pytest.fixture
    def fallback(self):
        """Create LocatorFallback instance for testing."""
        return LocatorFallback()

    @pytest.fixture
    def mock_page(self):
        """Create mock Playwright Page instance."""
        page = Mock()
        mock_locator = Mock()
        mock_locator.wait_for = AsyncMock()

        # Setup mock methods to return mock locator
        page.get_by_role = Mock(return_value=mock_locator)
        page.get_by_text = Mock(return_value=mock_locator)
        page.locator = Mock(return_value=mock_locator)
        page.get_by_test_id = Mock(return_value=mock_locator)

        return page

    @pytest.mark.parametrize(
        "locator_type,value,expected_method",
        [
            ("role", "button", "get_by_role"),
            ("text", "Submit", "get_by_text"),
            ("css", ".submit-btn", "locator"),
            ("xpath", "//button[@type='submit']", "locator"),
            ("id", "submit-btn", "get_by_test_id"),
        ],
        ids=[
            "role-locator",
            "text-locator",
            "css-locator",
            "xpath-locator",
            "id-locator",
        ],
    )
    @pytest.mark.asyncio
    async def test_find_element_with_all_locator_types(
        self, fallback, mock_page, locator_type, value, expected_method
    ):
        """Test finding elements with various locator types."""
        action = Action(
            id="action-001",
            name="Click button",
            action_type="click",
            locators=[
                LocatorStrategy(
                    type=locator_type, value=value, fallback=False, name=None
                )
            ],
            params={},
            wait_after=None,
        )

        found_locator, result = await fallback.find_element(mock_page, action)

        assert found_locator is not None, (
            f"Failed to find element with {locator_type} locator"
        )
        assert result.locator_used == locator_type, (
            f"Expected locator_used={locator_type}, got {result.locator_used}"
        )
        assert result.error is None, f"Expected no error, got: {result.error}"
        assert len(result.locators_attempted) == 1, (
            f"Expected 1 attempted locator, got {len(result.locators_attempted)}"
        )

    @pytest.mark.asyncio
    async def test_find_element_falls_back_to_next_locator(self, fallback, mock_page):
        """Test fallback to next locator when first fails."""
        call_count = {"role": 0, "text": 0}

        def role_side_effect(*args, **kwargs):
            call_count["role"] += 1
            mock_locator = Mock()
            mock_locator.wait_for = AsyncMock(side_effect=Exception("Not found"))
            return mock_locator

        def text_side_effect(*args, **kwargs):
            call_count["text"] += 1
            mock_locator = Mock()
            mock_locator.wait_for = AsyncMock()
            return mock_locator

        mock_page.get_by_role = Mock(side_effect=role_side_effect)
        mock_page.get_by_text = Mock(side_effect=text_side_effect)

        action = Action(
            id="action-001",
            name="Click button",
            action_type="click",
            locators=[
                LocatorStrategy(type="role", value="button", fallback=False, name=None),
                LocatorStrategy(type="text", value="Submit", fallback=True, name=None),
            ],
            params={},
            wait_after=None,
        )

        found_locator, result = await fallback.find_element(mock_page, action)

        assert found_locator is not None, "Failed to find element after fallback"
        assert result.locator_used == "text", (
            f"Expected fallback to 'text', got {result.locator_used}"
        )
        assert call_count["role"] == 1, "First locator should be attempted once"
        assert call_count["text"] == 1, "Fallback locator should be attempted once"
        assert result.error is None, (
            f"Expected no error after successful fallback, got: {result.error}"
        )

    @pytest.mark.asyncio
    async def test_find_element_all_locators_fail(self, fallback, mock_page):
        """Test behavior when all locators fail."""
        # Make all locator methods fail
        mock_locator = Mock()
        mock_locator.wait_for = AsyncMock(side_effect=Exception("Not found"))

        mock_page.get_by_role = Mock(return_value=mock_locator)
        mock_page.get_by_text = Mock(return_value=mock_locator)
        mock_page.locator = Mock(return_value=mock_locator)
        mock_page.get_by_test_id = Mock(return_value=mock_locator)

        action = Action(
            id="action-001",
            name="Click button",
            action_type="click",
            locators=[
                LocatorStrategy(type="role", value="button", fallback=False, name=None),
                LocatorStrategy(type="text", value="Submit", fallback=True, name=None),
                LocatorStrategy(
                    type="css", value=".submit-btn", fallback=True, name=None
                ),
            ],
            params={},
            wait_after=None,
        )

        found_locator, result = await fallback.find_element(mock_page, action)

        assert found_locator is None, "Expected None when all locators fail"
        assert result.locator_used is None, "Expected no locator to be used"
        assert result.error is not None, "Expected error message when all locators fail"
        assert "Element not found" in result.error, (
            f"Error message should mention element not found: {result.error}"
        )
        assert len(result.locators_attempted) == 3, (
            f"Expected all 3 locators attempted, got {len(result.locators_attempted)}"
        )

    @pytest.mark.asyncio
    async def test_find_element_with_locator_list(self, fallback, mock_page):
        """Test find_element accepts list of locator dicts (for backward compatibility)."""
        locator_dicts = [
            {"type": "role", "value": "button"},
            {"type": "text", "value": "Submit"},
        ]

        found_locator, result = await fallback.find_element(mock_page, locator_dicts)

        assert found_locator is not None, "Failed to find element with locator list"
        assert result.locator_used == "role", (
            f"Expected 'role' locator, got {result.locator_used}"
        )
        assert result.error is None, f"Expected no error, got: {result.error}"

    @pytest.mark.asyncio
    async def test_custom_max_attempts(self, fallback, mock_page):
        """Test custom max_attempts parameter."""
        mock_locator = Mock()
        mock_locator.wait_for = AsyncMock()
        mock_page.get_by_role = Mock(return_value=mock_locator)

        action = Action(
            id="action-001",
            name="Click button",
            action_type="click",
            locators=[
                LocatorStrategy(type="role", value="button", fallback=False, name=None)
            ],
            params={},
            wait_after=None,
        )

        found_locator, result = await fallback.find_element(
            mock_page, action, max_attempts=10
        )

        assert found_locator is not None, (
            "Failed to find element with custom max_attempts"
        )

    @pytest.mark.asyncio
    async def test_create_locator_with_name_parameter(self, fallback, mock_page):
        """Test _create_locator with name parameter for role locator."""
        strategy = LocatorStrategy(
            type="role", value="button", name="submit", fallback=True
        )

        locator = fallback._create_locator(mock_page, strategy)

        assert locator is not None, "Failed to create locator with name parameter"
        mock_page.get_by_role.assert_called_once_with("button", name="submit")

    @pytest.mark.asyncio
    async def test_create_locator_invalid_type(self, fallback, mock_page):
        """Test _create_locator raises ValueError for unknown locator type."""
        strategy = LocatorStrategy(
            type="invalid_type", value="some-value", fallback=False, name=None
        )

        with pytest.raises(ValueError, match="Unknown locator type: invalid_type"):
            fallback._create_locator(mock_page, strategy)

    def test_sort_locators_by_priority(self, fallback):
        """Test sorting locators by priority order."""
        locators = [
            LocatorStrategy(type="xpath", value="//button", fallback=True, name=None),
            LocatorStrategy(type="role", value="button", fallback=True, name=None),
            LocatorStrategy(type="text", value="Submit", fallback=True, name=None),
            LocatorStrategy(type="id", value="submit-btn", fallback=True, name=None),
            LocatorStrategy(type="css", value=".btn", fallback=True, name=None),
        ]

        sorted_locators = fallback.sort_locators_by_priority(locators)

        expected_order = ["role", "text", "css", "xpath", "id"]
        actual_order = [locator.type for locator in sorted_locators]

        assert actual_order == expected_order, (
            f"Expected order {expected_order}, got {actual_order}"
        )

    def test_sort_locators_with_unknown_type(self, fallback):
        """Test sorting with unknown locator type places it at end."""
        locators = [
            LocatorStrategy(type="custom", value="selector", fallback=True, name=None),
            LocatorStrategy(type="role", value="button", fallback=True, name=None),
        ]

        sorted_locators = fallback.sort_locators_by_priority(locators)

        assert sorted_locators[0].type == "role", "Known type should come first"
        assert sorted_locators[1].type == "custom", "Unknown type should be at end"

    @pytest.mark.asyncio
    async def test_duplicate_locator_types_not_repeated(self, fallback, mock_page):
        """Test that duplicate locator types are not counted twice."""
        action = Action(
            id="action-001",
            name="Click button",
            action_type="click",
            locators=[
                LocatorStrategy(type="role", value="button", fallback=True, name=None),
                LocatorStrategy(
                    type="role", value="link", fallback=True, name=None
                ),  # Duplicate type
                LocatorStrategy(type="text", value="Submit", fallback=True, name=None),
            ],
            params={},
            wait_after=None,
        )

        found_locator, result = await fallback.find_element(mock_page, action)

        assert found_locator is not None, "Failed to find element"
        # 'role' should only be counted once in locators_attempted
        role_count = result.locators_attempted.count("role")
        assert role_count == 1, (
            f"'role' should appear once in locators_attempted, got {role_count}"
        )

    @pytest.mark.asyncio
    async def test_empty_locators_list(self, fallback, mock_page):
        """Test behavior with empty locators list."""
        action = Action(
            id="action-001",
            name="Click button",
            action_type="click",
            locators=[],
            params={},
            wait_after=None,
        )

        found_locator, result = await fallback.find_element(mock_page, action)

        assert found_locator is None, "Expected None with empty locators"
        assert result.error is not None, "Expected error with empty locators"
        assert len(result.locators_attempted) == 0, "Expected no attempted locators"

    def test_locator_priority_constant(self, fallback):
        """Test LOCATOR_PRIORITY constant matches spec FR-012."""
        expected_priority = ["role", "text", "css", "xpath", "id"]
        assert fallback.LOCATOR_PRIORITY == expected_priority, (
            f"LOCATOR_PRIORITY should be {expected_priority}"
        )

    def test_max_attempts_constant(self, fallback):
        """Test MAX_ATTEMPTS constant."""
        assert fallback.MAX_ATTEMPTS == 5, (
            f"MAX_ATTEMPTS should be 5, got {fallback.MAX_ATTEMPTS}"
        )
