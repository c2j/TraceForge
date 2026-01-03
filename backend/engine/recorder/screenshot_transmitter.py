"""Screenshot transmission for ForgeEngine recording.

Handles screenshot capture on hover and binary WebSocket transmission.
Per spec FR-027: Limit screenshot transmission size by compressing to JPEG and sending in chunks if needed.
"""

import io
import base64
from typing import Optional

from PIL import Image
from utils.logging import Logger


class ScreenshotTransmitter:
    """Handles screenshot capture and transmission.

    Per spec FR-027: Limit screenshot transmission size by compressing to JPEG and sending in chunks if needed.
    """

    # JPEG quality per settings
    JPEG_QUALITY = 85

    # Maximum chunk size (1MB)
    MAX_CHUNK_SIZE = 1024 * 1024

    def __init__(self):
        """Initialize screenshot transmitter."""
        self.logger = Logger.get(__name__)

    async def capture_screenshot(self, page) -> bytes:
        """Capture screenshot from page.

        Returns:
            Screenshot as bytes (JPEG)
        """
        try:
            # Capture screenshot as PNG
            screenshot_bytes = await page.screenshot(type="png")
            self.logger.debug("Screenshot captured as PNG")

            # Convert to JPEG with compression
            image = Image.open(io.BytesIO(screenshot_bytes))
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=self.JPEG_QUALITY)
            jpeg_bytes = output.getvalue()
            self.logger.debug(f"Screenshot compressed to JPEG: {len(jpeg_bytes)} bytes")

            return jpeg_bytes

        except Exception as e:
            self.logger.error(f"Failed to capture screenshot: {e}")
            raise

    def split_into_chunks(self, data: bytes, chunk_size: int = MAX_CHUNK_SIZE) -> list:
        """Split data into chunks for transmission.

        Per spec FR-027: Send in chunks if >1MB to avoid message size limits.
        """
        chunks = []
        for i in range(0, len(data), chunk_size):
            chunks.append(data[i : i + chunk_size])
        self.logger.debug(f"Split data into {len(chunks)} chunks")
        return chunks

    def encode_base64(self, data: bytes) -> str:
        """Encode data to base64 for transmission."""
        return base64.b64encode(data).decode("utf-8")
