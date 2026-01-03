"""Action capturer for ForgeEngine recording.

Captures user actions (click, fill, hover, navigate) with multiple locator strategies.
Per spec FR-007: Capture user actions (click, fill, hover, navigate) with multiple locator strategies (role, text, css, xpath, id).
"""

import uuid
from typing import Optional, List

from utils.logging import Logger


class ActionCapturer:
    """Captures user actions with multiple locator strategies.

    Per spec FR-007: Priority order: role → text → css → xpath → id
    """

    LOCATOR_PRIORITY = ["role", "text", "css", "xpath", "id"]

    def __init__(self):
        """Initialize action capturer."""
        self.logger = Logger.get(__name__)

    async def generate_locators(self, element) -> List[dict]:
        """Generate multiple locator strategies for an element.

        Per spec FR-007: Capture with multiple locator strategies (role, text, css, xpath, id).
        """
        locators = []

        # Try role locator
        role_name = await self._get_role_name(element)
        if role_name:
            locators.append(
                {
                    "type": "role",
                    "value": "button",
                    "name": role_name,
                    "fallback": False,
                }
            )

        # Try text locator
        text_content = await self._get_text_content(element)
        if text_content:
            locators.append(
                {
                    "type": "text",
                    "value": text_content,
                    "fallback": True,
                }
            )

        # Try css selector
        css_selector = await self._get_css_selector(element)
        if css_selector:
            locators.append(
                {
                    "type": "css",
                    "value": css_selector,
                    "fallback": True,
                }
            )

        # Try xpath
        xpath = await self._get_xpath(element)
        if xpath:
            locators.append(
                {
                    "type": "xpath",
                    "value": xpath,
                    "fallback": True,
                }
            )

        # Try id
        element_id = await self._get_id(element)
        if element_id:
            locators.append(
                {
                    "type": "id",
                    "value": element_id,
                    "fallback": True,
                }
            )

        return locators

    async def _get_role_name(self, element) -> Optional[str]:
        """Get accessible role name from element."""
        try:
            return await element.get_attribute("role")
        except Exception:
            return None

    async def _get_text_content(self, element) -> Optional[str]:
        """Get text content from element."""
        try:
            return await element.inner_text()
        except Exception:
            return None

    async def _get_css_selector(self, element) -> Optional[str]:
        """Get CSS selector from element."""
        # TODO: Generate CSS selector based on element attributes
        return None

    async def _get_xpath(self, element) -> Optional[str]:
        """Generate XPath for element."""
        # TODO: Generate XPath based on element attributes
        return None

    async def _get_id(self, element) -> Optional[str]:
        """Get element ID from element."""
        # TODO: Get element ID from element
        return None
