"""Page detector for ForgeEngine recording.

Auto-detects navigation events and creates new Page nodes.
Per spec FR-006: Automatically detect navigation events and create new Page nodes with entry_url.
"""

import uuid
from typing import Optional

from utils.logging import Logger


class PageDetector:
    """Detects navigation events and manages Page node creation."""

    def __init__(self):
        """Initialize page detector."""
        self.logger = Logger.get(__name__)
        self.current_url: Optional[str] = None

    def detect_navigation(self, page, url: str) -> dict:
        """Detect navigation and create new Page node.

        Per spec FR-006: Detect navigation events and create new Page node with entry_url.
        """
        if self.current_url and self.current_url != url:
            page_id = str(uuid.uuid4())
            new_page = {
                "id": page_id,
                "name": f"Page {page_id[:8]}",
                "entry_url": url,
                "default_wait": "networkidle",
                "actions": [],
            }
            self.current_url = url
            self.logger.info(f"Navigation detected: {url} -> Page {page_id}")
            return new_page

        return None

    def reset(self) -> None:
        """Reset page detector state."""
        self.current_url = None
        self.logger.debug("Page detector reset")
