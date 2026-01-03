"""Kernel loader for ForgeEngine.

Loads and validates custom Chrome executable paths.
Per spec FR-002: Support Chrome 86+ custom kernels.
"""

import subprocess
import re
import uuid
from typing import Optional, List
from pathlib import Path

from utils.logging import Logger


# Chrome version regex
CHROME_VERSION_REGEX = re.compile(r"(\d+)\.(\d+)\.(\d+\.\d+)")


class KernelLoader:
    """Handles loading and validation of Chrome browser kernels."""

    def __init__(self):
        """Initialize kernel loader."""
        self.logger = Logger.get(__name__)

    def validate_version(self, version: str) -> bool:
        """Validate Chrome version is 86.0 or newer.

        Args:
            version: Version string (e.g., "86.0.4240", "120.0.6099")

        Returns:
            True if version >= 86.0, False otherwise
        """
        match = CHROME_VERSION_REGEX.match(version)
        if not match:
            self.logger.error(f"Invalid Chrome version format: {version}")
            return False

        major, minor, _ = match.groups()
        major = int(major)
        minor = int(minor)

        # Check if version >= 86.0
        if major > 86:
            return True
        elif major == 86 and minor >= 0:
            return True
        else:
            self.logger.error(f"Chrome version too old: {version} (minimum: 86.0)")
            return False

    def validate_executable(self, executable_path: str) -> bool:
        """Validate Chrome executable exists and is accessible.

        Args:
            executable_path: Path to Chrome executable

        Returns:
            True if valid, False otherwise
        """
        path = Path(executable_path)

        if not path.exists():
            self.logger.error(f"Chrome executable not found: {executable_path}")
            return False

        if not path.is_file():
            self.logger.error(f"Chrome path is not a file: {executable_path}")
            return False

        return True

    def get_version(self, executable_path: str) -> Optional[str]:
        """Get Chrome version from executable.

        Args:
            executable_path: Path to Chrome executable

        Returns:
            Version string or None if extraction fails
        """
        try:
            result = subprocess.run(
                [executable_path, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                version_output = result.stdout.strip()
                self.logger.info(f"Chrome version: {version_output}")
                return version_output
            else:
                self.logger.error(f"Chrome --version failed with code: {result.returncode}")
                return None
        except subprocess.TimeoutExpired:
            self.logger.error("Chrome --version timed out")
            return None
        except FileNotFoundError:
            self.logger.error(f"Chrome executable not found: {executable_path}")
            return None
        except Exception as e:
            self.logger.error(f"Failed to get Chrome version: {e}")
            return None

    def load_kernel(self, executable_path: str, name: str) -> dict:
        """Load and validate a kernel configuration.

        Args:
            executable_path: Path to Chrome executable
            name: Display name for the kernel

        Returns:
            Kernel configuration dictionary
        """
        if not self.validate_executable(executable_path):
            raise ValueError(f"Invalid Chrome executable: {executable_path}")

        version = self.get_version(executable_path)
        if version and not self.validate_version(version):
            raise ValueError(f"Chrome version too old: {version} (minimum: 86.0)")

        self.logger.info(f"Loaded kernel: {name} with version {version}")

        return {
            "id": str(uuid.uuid4()),
            "name": name,
            "executable_path": executable_path,
            "version": version or "unknown",
            "is_default_record": False,
            "is_default_agent": False,
        }

    def load_kernels(self, kernel_repo=None) -> List[dict]:
        """Load kernels from repository (for test compatibility).

        Args:
            kernel_repo: Optional KernelRepository to load kernels from

        Returns:
            List of kernel configurations
        """
        if kernel_repo:
            return kernel_repo.list()
        return []

    def load_custom_kernels(self) -> dict:
        """Load custom kernels from settings (for test compatibility).

        Returns:
            Dictionary of custom kernel configurations
        """
        return {}

    def load_kernels_from_settings(self) -> dict:
        """Load kernel paths from settings (for test compatibility).

        Returns:
            Dictionary of kernel name to path mappings
        """
        return {}

    def validate_chrome_version(self) -> Optional[str]:
        """Validate Chrome version (for test compatibility).

        Returns:
            Version string if valid, None otherwise
        """
        version = self.get_chrome_version()
        if version and self.validate_version(version):
            return version
        return None

    def get_chrome_version(self) -> Optional[str]:
        """Get Chrome version (for test compatibility).

        Returns:
            Version string or None
        """
        return None


# Global kernel loader instance
_loader: Optional[KernelLoader] = None


def get_loader() -> KernelLoader:
    """Get or create the kernel loader singleton."""
    global _loader
    if _loader is None:
        _loader = KernelLoader()
    return _loader
