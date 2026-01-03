"""Configuration management for ForgeEngine.

Handles CLI argument parsing, config file loading, and environment variables.
"""

import argparse
import os
from typing import Optional
from pathlib import Path


class Config:
    """Configuration settings for ForgeEngine."""

    def __init__(
        self,
        mode: str = "desktop",
        port: int = 0,
        agent: bool = False,
        server_url: Optional[str] = None,
        api_key: Optional[str] = None,
        kernel_path: Optional[str] = None,
        db_path: str = "forgeengine.db",
        log_level: str = "info",
        log_file: Optional[str] = None,
    ):
        self.mode = mode  # "desktop" or "agent"
        self.port = port  # 0 for random, specific port for agent
        self.agent = agent
        self.server_url = server_url
        self.api_key = api_key
        self.kernel_path = kernel_path
        self.db_path = db_path
        self.log_level = log_level
        self.log_file = log_file


def parse_args() -> Config:
    """Parse CLI arguments and return Config object."""
    parser = argparse.ArgumentParser(
        description="ForgeEngine - Browser automation with real-time WebSocket communication"
    )

    # Operating mode
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--desktop",
        action="store_true",
        help="Desktop mode (default): single-task, headful browsers, no authentication",
    )
    mode_group.add_argument(
        "--agent",
        action="store_true",
        help="Agent mode: concurrent headless execution, Server authentication",
    )

    # Configuration
    parser.add_argument(
        "--port",
        type=int,
        default=0,
        help="WebSocket port (0 for random, fixed port required for agent mode)",
    )
    parser.add_argument(
        "--config",
        type=str,
        help="Path to configuration file",
    )
    parser.add_argument(
        "--kernel",
        type=str,
        help="Path to custom Chrome executable",
    )
    parser.add_argument(
        "--db",
        type=str,
        default="forgeengine.db",
        help="SQLite database path",
    )

    # Agent-specific
    parser.add_argument(
        "--server-url",
        type=str,
        help="Server URL for Agent mode",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        help="API Key for Agent mode authentication",
    )

    # Logging
    parser.add_argument(
        "--log-level",
        type=str,
        default="info",
        choices=["debug", "info", "warning", "error"],
        help="Log level",
    )
    parser.add_argument(
        "--log-file",
        type=str,
        help="Log file path (default: stdout)",
    )

    args = parser.parse_args()

    # Determine mode
    mode = "agent" if args.agent else "desktop"

    # Load config file if provided
    config_values = {}
    if args.config:
        config_values = load_config_file(args.config)

    # Merge: CLI args > config file > environment > defaults
    config = Config(
        mode=mode,
        port=args.port if args.port != 0 else config_values.get("port", 0),
        agent=args.agent,
        server_url=args.server_url
        or os.environ.get("FORGE_SERVER_URL")
        or config_values.get("server_url"),
        api_key=args.api_key or os.environ.get("FORGE_API_KEY") or config_values.get("api_key"),
        kernel_path=args.kernel or config_values.get("kernel_path"),
        db_path=args.db or os.environ.get("FORGE_DB_PATH", "forgeengine.db"),
        log_level=args.log_level,
        log_file=args.log_file,
    )

    return config


def load_config_file(config_path: str) -> dict:
    """Load configuration from INI file."""
    config_values = {}
    try:
        with open(config_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    if "=" in line:
                        key, value = line.split("=", 1)
                        config_values[key.strip()] = value.strip()
    except FileNotFoundError:
        print(f"Config file not found: {config_path}")
    return config_values
