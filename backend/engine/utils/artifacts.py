"""Artifact management for ForgeEngine.

Per spec FR-017: Generate trace.zip, capture screenshots per action.
"""

import asyncio
import uuid
import zipfile
from pathlib import Path
from typing import Optional, List, Dict, Any

from models.kernel import ExecutionArtifacts
from utils.logging import Logger


class ArtifactManager:
    """Manages execution artifacts (traces, screenshots, diffs)."""

    def __init__(self, output_dir: str = "artifacts"):
        """Initialize artifact manager.

        Args:
            output_dir: Directory to save artifacts
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.logger = Logger.get(__name__)

    def generate_trace_zip(self, trace_files: List[str], execution_id: str) -> str:
        """Generate trace.zip from Playwright trace files.

        Args:
            trace_files: List of trace file paths
            execution_id: Execution ID for filename

        Returns:
            Path to generated trace.zip
        """
        timestamp = int(asyncio.get_event_loop().time() * 1000)
        filename = f"{execution_id}_trace.zip"
        zip_path = self.output_dir / filename

        try:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for trace_file in trace_files:
                    if Path(trace_file).exists():
                        arcname = Path(trace_file).name
                        zipf.write(trace_file, arcname)
                        self.logger.debug(f"Added to trace.zip: {trace_file}")

            self.logger.info(f"Generated trace.zip: {zip_path}")
            return str(zip_path)

        except Exception as e:
            self.logger.error(f"Failed to generate trace.zip: {e}")
            return ""

    def save_screenshot(self, image_data: bytes, action_id: str, execution_id: str) -> str:
        """Save screenshot image to filesystem.

        Args:
            image_data: Image binary data
            action_id: Action ID for filename
            execution_id: Execution ID for filename

        Returns:
            Path to saved screenshot
        """
        timestamp = int(asyncio.get_event_loop().time() * 1000)
        filename = f"{action_id}_{timestamp}.jpg"
        filepath = self.output_dir / filename

        try:
            with open(filepath, "wb") as f:
                f.write(image_data)

            self.logger.info(f"Saved screenshot: {filepath}")
            return str(filepath)

        except Exception as e:
            self.logger.error(f"Failed to save screenshot: {e}")
            return ""

    def save_diff_images(
        self, expected: bytes, actual: bytes, diff: bytes, action_id: str
    ) -> Dict[str, str]:
        """Save expected, actual, and diff images.

        Args:
            expected: Expected screenshot data
            actual: Actual screenshot data
            diff: Diff image data
            action_id: Action ID for filename

        Returns:
            Dict with paths to expected, actual, diff images
        """
        timestamp = int(asyncio.get_event_loop().time() * 1000)

        paths = {
            "expected": self.output_dir / f"{action_id}_expected_{timestamp}.png",
            "actual": self.output_dir / f"{action_id}_actual_{timestamp}.png",
            "diff": self.output_dir / f"{action_id}_diff_{timestamp}.png",
        }

        try:
            paths["expected"].write_bytes(expected)
            paths["actual"].write_bytes(actual)
            paths["diff"].write_bytes(diff)

            self.logger.info(f"Saved diff images for action: {action_id}")

            return {k: str(v) for k, v in paths.items()}

        except Exception as e:
            self.logger.error(f"Failed to save diff images: {e}")
            return {k: "" for k in paths.keys()}

    def cleanup_old_artifacts(self, keep_count: int = 100) -> None:
        """Clean up old artifacts to manage disk space.

        Args:
            keep_count: Number of recent artifacts to keep
        """
        try:
            # Get all artifact files sorted by modification time
            all_files = list(self.output_dir.rglob("*"))
            files = [f for f in all_files if f.is_file()]
            files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

            # Delete old files beyond keep_count
            for old_file in files[keep_count:]:
                old_file.unlink()
                self.logger.debug(f"Deleted old artifact: {old_file}")

            self.logger.info(f"Cleaned up old artifacts (kept {keep_count})")

        except Exception as e:
            self.logger.error(f"Failed to cleanup artifacts: {e}")

    def get_execution_artifacts(self, execution_id: str) -> ExecutionArtifacts:
        """Get all artifacts for an execution.

        Args:
            execution_id: Execution ID

        Returns:
            ExecutionArtifacts with screenshots and diffs
        """
        screenshots = []
        diffs = []

        # Find all files matching execution_id
        for file in self.output_dir.glob(f"{execution_id}_*.jpg"):
            screenshots.append(
                {
                    "action_id": file.stem.split("_")[0],
                    "path": str(file),
                }
            )

        for file in self.output_dir.glob(f"{execution_id}_*_diff.png"):
            action_id = file.stem.split("_diff")[0]
            diffs.append(
                {
                    "action_id": action_id,
                    "actual": str(self.output_dir / f"{action_id}_actual_{file.stem}.png"),
                    "expected": str(self.output_dir / f"{action_id}_expected_{file.stem}.png"),
                    "diff": str(file),
                    "threshold": 5.0,
                }
            )

        return ExecutionArtifacts(screenshots=screenshots, diffs=diffs)
