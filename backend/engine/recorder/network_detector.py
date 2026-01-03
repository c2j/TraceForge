"""Network and wait detection for ForgeEngine recording.

Detects post-action network requests and suggests wait conditions.
Per spec FR-008: Detect post-action network requests and suggest wait conditions via auto_wait_suggested events.
"""

from typing import Optional

from utils.logging import Logger


class NetworkDetector:
    """Detects network requests and suggests wait conditions.

    Per spec FR-008: Detect post-action network requests and suggest wait conditions.
    """

    def __init__(self):
        """Initialize network detector."""
        self.logger = Logger.get(__name__)
        self.active_requests: set = set()

    async def on_request(self, request) -> Optional[str]:
        """Handle network request start."""
        self.active_requests.add(request)
        self.logger.debug(f"Network request started: {request.url}")
        return None

    async def on_response(self, response) -> Optional[dict]:
        """Handle network response and suggest wait condition."""
        if response.url not in self.active_requests:
            return None

        # Check if response was successful
        if response.status == 200:
            self.active_requests.remove(response.url)
            self.logger.info(f"Network request completed: {response.url}")

            # Suggest wait condition
            # TODO: Send auto_wait_suggested event via WebSocket
            return {
                "suggested_wait": "networkidle",
                "network_url": response.url,
            }

        return None

    def reset(self) -> None:
        """Reset network detector state."""
        self.active_requests.clear()
        self.logger.debug("Network detector reset")
