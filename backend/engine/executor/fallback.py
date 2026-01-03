"""Locator fallback strategy for ForgeEngine.

Per spec FR-012: Try role → text → css → xpath → id.
Per spec acceptance scenario 2: Retry with next locator if previous fails.
"""

from typing import Optional, Dict, Any, List, Union
from playwright.async_api import Page, Locator

from models.script import Action, LocatorStrategy
from models.kernel import ExecutionStepResult
from utils.logging import Logger


class LocatorFallback:
    """Handles locator fallback strategy with retry logic."""

    LOCATOR_PRIORITY = ["role", "text", "css", "xpath", "id"]
    MAX_ATTEMPTS = 5

    def __init__(self):
        """Initialize locator fallback handler."""
        self.logger = Logger.get(__name__)

    async def find_element(
        self,
        page: Page,
        action_or_locators: Union[Action, List[Dict[str, Any]]],
        max_attempts: Optional[int] = None,
    ) -> tuple[Optional[Locator], ExecutionStepResult]:
        """Find element using locator fallback strategy.

        Args:
            page: Playwright Page instance
            action_or_locators: Action with locators OR list of locator dicts
            max_attempts: Maximum retry attempts (default: 5)

        Returns:
            Tuple of (found_locator, result)
        """
        # Handle both Action object and list of locator dicts
        if isinstance(action_or_locators, list):
            # Convert list of dicts to temporary Action for compatibility
            temp_locators = []
            for loc in action_or_locators:
                temp_locators.append(
                    LocatorStrategy(
                        type=loc["type"],
                        value=loc["value"],
                        name=loc.get("name"),
                        fallback=loc.get("fallback", False),
                    )
                )

            class TempAction:
                def __init__(self, locators):
                    self.locators = locators

            action = TempAction(temp_locators)
        else:
            action = action_or_locators

        max_attempts = max_attempts or self.MAX_ATTEMPTS
        locators_attempted = []
        locator_used = None
        found_locator = None

        # Try each locator in order, stop on first success
        for locator_strategy in action.locators:
            locator_type = locator_strategy.type
            locator_value = locator_strategy.value
            locator_name = locator_strategy.name

            # Track attempted locators
            if locator_type not in locators_attempted:
                locators_attempted.append(locator_type)

            # Try to find element
            try:
                locator = self._create_locator(page, locator_strategy)
                await locator.wait_for(timeout=5000)
                found_locator = locator
                locator_used = locator_type

                self.logger.info(f"Element found using {locator_type} locator")

                result = ExecutionStepResult(
                    locators_attempted=locators_attempted,
                    locator_used=locator_used,
                    screenshot=None,  # TODO: Capture screenshot on success
                    error=None,
                )

                return found_locator, result

            except Exception as e:
                self.logger.debug(f"Locator {locator_type} failed: {e}")
                continue

        # All locators failed
        error_msg = f"Element not found after trying locators: {', '.join(locators_attempted)}"

        self.logger.error(error_msg)

        result = ExecutionStepResult(
            locators_attempted=locators_attempted,
            locator_used=None,
            screenshot=None,
            error=error_msg,
        )

        return None, result

    def _create_locator(self, page: Page, locator_strategy: LocatorStrategy) -> Locator:
        """Create Playwright locator from strategy.

        Args:
            page: Playwright Page instance
            locator_strategy: Locator strategy configuration

        Returns:
            Playwright Locator instance
        """
        locator_type = locator_strategy.type
        value = locator_strategy.value
        name = locator_strategy.name

        if locator_type == "role":
            if name:
                return page.get_by_role(value, name=name)
            return page.get_by_role(value)
        elif locator_type == "text":
            return page.get_by_text(value)
        elif locator_type == "css":
            return page.locator(value)
        elif locator_type == "xpath":
            return page.locator(f"xpath={value}")
        elif locator_type == "id":
            return page.get_by_test_id(value)
        else:
            raise ValueError(f"Unknown locator type: {locator_type}")

    def sort_locators_by_priority(self, locators: List[LocatorStrategy]) -> List[LocatorStrategy]:
        """Sort locators by priority order.

        Args:
            locators: List of locators to sort

        Returns:
            Locators sorted by priority (role, text, css, xpath, id)
        """
        return sorted(
            locators,
            key=lambda l: self.LOCATOR_PRIORITY.index(l.type)
            if l.type in self.LOCATOR_PRIORITY
            else len(self.LOCATOR_PRIORITY),
        )
