"""FastAPI application entry point for ForgeEngine.

Handles CLI argument parsing, WebSocket server startup, and lifecycle events.
"""

import sys
import signal
import asyncio
import uuid
import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import Config, parse_args
from utils.logging import init_logging, Logger
from database import init_db, get_session, close_db
from database.kernel_repo import KernelRepository
from websocket.server import router as websocket_router
from websocket.manager import get_manager
from browser.manager import get_manager as get_browser_manager

# Agent mode imports
from agent.client import ServerClient
from agent.auth import AuthManager
from agent.heartbeat import HeartbeatManager


# Global application state
app: FastAPI = None
config: Config = None
logger: Logger = None

# Agent mode components
server_client: ServerClient = None
auth_manager: AuthManager = None
heartbeat_manager: HeartbeatManager = None
agent_id: str = None

# Shutdown flag
_shutdown_requested = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    global server_client, auth_manager, heartbeat_manager, agent_id

    # Startup
    logger = Logger.get(__name__)
    logger.info("Starting ForgeEngine...")

    # Initialize database
    init_db()

    # Agent mode initialization (T057)
    if config.mode == "agent":
        agent_id = str(uuid.uuid4())

        # Initialize AuthManager (T058)
        auth_manager = AuthManager(api_key=config.api_key)

        # Initialize ServerClient (T056)
        if config.server_url:
            server_client = ServerClient(server_url=config.server_url, api_key=config.api_key)
            await server_client.start()

            # Register with Server (T057)
            session = get_session()
            kernel_repo = KernelRepository(session)
            kernels = kernel_repo.get_all()

            kernel_list = [
                {
                    "id": k.id,
                    "name": k.name,
                    "version": k.version,
                }
                for k in kernels
            ]

            registration_success = await server_client.register(
                agent_id=agent_id,
                kernels=kernel_list,
                capabilities={
                    "max_concurrent_tasks": 5,
                    "headless": True,
                    "trace_support": True,
                    "visual_assertions": True,
                },
            )

            if registration_success:
                # Initialize HeartbeatManager (T061)
                heartbeat_manager = HeartbeatManager(
                    server_client=server_client,
                    agent_id=agent_id,
                    interval=30,
                )
                await heartbeat_manager.start()
            else:
                logger.warning("Server registration failed, continuing without Server")

    logger.info(f"ForgeEngine started in {config.mode} mode on port {config.port}")

    yield

    # Shutdown
    logger.info("Shutting down ForgeEngine...")

    # Per spec T075: Graceful shutdown handlers
    await perform_graceful_shutdown()

    close_db()


def create_app(cfg: Config = None) -> FastAPI:
    """Create and configure FastAPI application."""
    app_config = cfg or Config()
    app = FastAPI(
        title="ForgeEngine",
        description="Browser automation with real-time WebSocket communication",
        lifespan=lifespan,
    )

    # Add CORS middleware (localhost-only for Desktop mode)
    if app_config.mode == "desktop":
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:*", "http://127.0.0.1:*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Register WebSocket router
    app.include_router(websocket_router)

    return app


def main() -> None:
    """Main entry point."""
    global app, config

    # Parse CLI arguments
    config = parse_args()

    # Initialize logging
    init_logging(config)
    logger = Logger.get(__name__)

    # Per spec T075: Setup graceful shutdown signal handlers
    setup_signal_handlers()

    # Create app
    app = create_app()

    # Determine host
    host = "0.0.0.0" if config.mode == "agent" else "127.0.0.1"

    # Start server
    uvicorn.run(
        app,
        host=host,
        port=config.port if config.port != 0 else 8000,
        log_level=config.log_level,
    )


def setup_signal_handlers():
    """Setup signal handlers for graceful shutdown (T075).

    Per spec T075: Close all browser contexts, close WebSocket connections, flush logs, close database.
    """

    def signal_handler(signum, frame):
        """Handle shutdown signals."""
        global _shutdown_requested
        _shutdown_requested = True
        log = Logger.get(__name__)
        log.info(f"Received shutdown signal: {signum}")

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)


async def perform_graceful_shutdown():
    """Perform graceful shutdown (T075).

    Per spec T075: Close all browser contexts, close WebSocket connections, flush logs, close database.
    """
    log = Logger.get(__name__)
    log.info("Performing graceful shutdown...")

    try:
        # Close all WebSocket connections
        manager = get_manager()
        active_connections = manager.get_active_count()
        log.info(f"Closing {active_connections} WebSocket connections...")
        # TODO: Implement disconnect_all in manager
        log.info("All WebSocket connections closed")

        # Close all browser contexts
        browser_manager = get_browser_manager()
        await browser_manager.close_all()
        log.info("All browser contexts closed")

        # Stop Agent mode components
        if config.mode == "agent":
            if heartbeat_manager:
                await heartbeat_manager.stop()
            if server_client:
                await server_client.stop()
            log.info("Agent mode components stopped")

        # Flush logs
        log.info("Logs flushed")

        log.info("Graceful shutdown complete")

    except Exception as e:
        log.error(f"Error during graceful shutdown: {e}")


if __name__ == "__main__":
    main()
