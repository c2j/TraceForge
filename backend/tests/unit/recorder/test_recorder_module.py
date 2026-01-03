"""Unit tests for recorder module (action_capturer, listener, etc.)."""

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
from recorder.action_capturer import ActionCapturer


class TestActionCapturer:
    """Unit tests for ActionCapturer."""

    @pytest.fixture
    def action_capturer(self):
        """Create ActionCapturer instance."""
        return ActionCapturer()

    @pytest.mark.asyncio
    async def test_action_capturer_initialization(self, action_capturer):
        """Test ActionCapturer initialization."""
        assert action_capturer.LOCATOR_PRIORITY == [
            "role",
            "text",
            "css",
            "xpath",
            "id",
        ]
        assert action_capturer.logger is not None

    @pytest.mark.asyncio
    async def test_generate_locators_with_role(self, action_capturer):
        """Test generating locators when element has role."""
        mock_element = Mock()
        mock_element.get_attribute = AsyncMock(return_value="button")

        locators = await action_capturer.generate_locators(mock_element)

        assert len(locators) >= 1
        assert locators[0]["type"] == "role"
        assert locators[0]["value"] == "button"
        assert locators[0]["fallback"] is False

    @pytest.mark.asyncio
    async def test_generate_locators_with_text(self, action_capturer):
        """Test generating locators when element has text content."""
        mock_element = Mock()
        mock_element.get_attribute = AsyncMock(return_value=None)
        mock_element.inner_text = AsyncMock(return_value="Click me")

        locators = await action_capturer.generate_locators(mock_element)

        assert len(locators) >= 1
        text_locator = [l for l in locators if l["type"] == "text"][0]
        assert text_locator["value"] == "Click me"
        assert text_locator["fallback"] is True

    @pytest.mark.asyncio
    async def test_get_role_name(self, action_capturer):
        """Test getting role name from element."""
        mock_element = Mock()
        mock_element.get_attribute = AsyncMock(return_value="button")

        role_name = await action_capturer._get_role_name(mock_element)
        assert role_name == "button"

    @pytest.mark.asyncio
    async def test_get_role_name_error(self, action_capturer):
        """Test getting role name with error."""
        mock_element = Mock()
        mock_element.get_attribute = AsyncMock(side_effect=Exception("Error"))

        role_name = await action_capturer._get_role_name(mock_element)
        assert role_name is None

    @pytest.mark.asyncio
    async def test_get_text_content(self, action_capturer):
        """Test getting text content from element."""
        mock_element = Mock()
        mock_element.inner_text = AsyncMock(return_value="Sample text")

        text_content = await action_capturer._get_text_content(mock_element)
        assert text_content == "Sample text"

    @pytest.mark.asyncio
    async def test_get_text_content_error(self, action_capturer):
        """Test getting text content with error."""
        mock_element = Mock()
        mock_element.inner_text = AsyncMock(side_effect=Exception("Error"))

        text_content = await action_capturer._get_text_content(mock_element)
        assert text_content is None

    @pytest.mark.asyncio
    async def test_get_css_selector(self, action_capturer):
        """Test getting CSS selector (not implemented yet)."""
        mock_element = Mock()

        css_selector = await action_capturer._get_css_selector(mock_element)
        assert css_selector is None

    @pytest.mark.asyncio
    async def test_get_xpath(self, action_capturer):
        """Test getting XPath (not implemented yet)."""
        mock_element = Mock()

        xpath = await action_capturer._get_xpath(mock_element)
        assert xpath is None

    @pytest.mark.asyncio
    async def test_get_id(self, action_capturer):
        """Test getting element ID (not implemented yet)."""
        mock_element = Mock()

        element_id = await action_capturer._get_id(mock_element)
        assert element_id is None

    @pytest.mark.asyncio
    async def test_generate_locators_empty_element(self, action_capturer):
        """Test generating locators for element with no attributes."""
        mock_element = Mock()
        mock_element.get_attribute = AsyncMock(return_value=None)
        mock_element.inner_text = AsyncMock(return_value=None)

        locators = await action_capturer.generate_locators(mock_element)
        assert len(locators) == 0

    @pytest.mark.asyncio
    async def test_generate_locators_multiple_strategies(self, action_capturer):
        """Test generating locators with multiple strategies."""
        mock_element = Mock()
        mock_element.get_attribute = AsyncMock(return_value="button")
        mock_element.inner_text = AsyncMock(return_value="Submit")

        locators = await action_capturer.generate_locators(mock_element)

        assert len(locators) >= 1
        types = [l["type"] for l in locators]
        assert "role" in types
