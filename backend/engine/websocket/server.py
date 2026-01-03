"""WebSocket server endpoints for ForgeEngine.

Handles Desktop mode (/ws) and Agent mode (/ws/agent) connections.
"""

import time
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends

from models.websocket import (
    WSMessage,
    MessageType,
    HealthCheckRequest,
    GetKernelsRequest,
    HealthCheckResponse,
    GetKernelsResponse,
)
from config import Config
from database import get_session
from database.kernel_repo import KernelRepository
from database.models import Kernel
from websocket.manager import get_manager
from utils.logging import Logger, set_correlation_id
from websocket.handlers import (
    validate_script_json,
    handle_start_recording,
    handle_stop_recording,
    handle_execute_script,
)

# Import auth for Agent mode
try:
    from agent.auth import AuthManager

    auth_manager = None
except ImportError:
    AuthManager = None


router = APIRouter()
logger = Logger.get(__name__)


@router.websocket("/ws")
async def websocket_desktop(websocket: WebSocket):
    """Desktop mode WebSocket endpoint - single connection only.

    Per spec FR-030: Reject concurrent recording or execution requests (single-task mode).
    """
    client_id = str(uuid.uuid4())
    correlation_id = str(uuid.uuid4())
    set_correlation_id(correlation_id)
    manager = get_manager()

    # Check if there's already an active connection (Desktop mode single-task)
    if manager.get_active_count() > 0:
        await websocket.close(code=4000, reason="Desktop mode allows only one active connection")
        logger.warning(f"Rejected connection {client_id}: Desktop mode single-task limit reached")
        return

    # Accept connection
    await manager.connect(websocket, client_id)
    logger.info(f"Desktop client connected: {client_id}")

    try:
        while True:
            # Receive message with error handling
            try:
                data = await websocket.receive_json()
            except Exception as e:
                # Invalid JSON or parse error - send error response
                logger.error(f"Failed to parse message: {e}")
                try:
                    await websocket.send_json(
                        {
                            "id": str(uuid.uuid4()),
                            "type": MessageType.RESPONSE,
                            "action": "error",
                            "error": f"Invalid message format: {str(e)}",
                        }
                    )
                except Exception:
                    pass
                continue

            try:
                message = WSMessage(**data)
            except Exception as e:
                # Invalid message structure - send error response
                logger.error(f"Failed to parse message structure: {e}")
                await websocket.send_json(
                    {
                        "id": data.get("id", str(uuid.uuid4())),
                        "type": MessageType.RESPONSE,
                        "action": data.get("action", "unknown"),
                        "error": f"Invalid message structure: {str(e)}",
                    }
                )
                continue

            # Set correlation ID
            set_correlation_id(message.id)

            # Route to handler
            if message.action == "health_check":
                await handle_health_check(websocket, message)
            elif message.action == "get_kernels":
                await handle_get_kernels(websocket, message)
            elif message.action == "start_recording":
                await handle_start_recording(websocket, message)
            elif message.action == "stop_recording":
                await handle_stop_recording(websocket, message)
            elif message.action == "execute_script":
                await handle_execute_script(websocket, message)
            else:
                await websocket.send_json(
                    {
                        "id": message.id,
                        "type": MessageType.RESPONSE,
                        "action": message.action,
                        "error": f"Unknown action: {message.action}",
                    }
                )

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Desktop client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(client_id)


@router.websocket("/ws/agent")
async def websocket_agent(websocket: WebSocket):
    """Agent mode WebSocket endpoint - supports concurrent connections.

    Per spec FR-028, FR-031: Agent mode requires API Key authentication and supports up to 5 concurrent tasks.
    """
    client_id = str(uuid.uuid4())
    correlation_id = str(uuid.uuid4())
    set_correlation_id(correlation_id)
    manager = get_manager()

    # Authenticate WebSocket connection (T058, T059)
    if AuthManager:
        global auth_manager
        if auth_manager and auth_manager.is_configured():
            authenticated = await auth_manager.authenticate_websocket(websocket)
            if not authenticated:
                return
        else:
            await websocket.close(code=4001, reason="No API Key configured on Agent")
            logger.warning("Agent connection rejected: No API Key configured")
            return

    # TODO: Check concurrent task limit (T062)

    await manager.connect(websocket, client_id)
    logger.info(f"Agent client connected: {client_id}")

    try:
        while True:
            # Receive message with error handling
            try:
                data = await websocket.receive_json()
            except Exception as e:
                # Invalid JSON or parse error - send error response
                logger.error(f"Failed to parse message: {e}")
                try:
                    await websocket.send_json(
                        {
                            "id": str(uuid.uuid4()),
                            "type": MessageType.RESPONSE,
                            "action": "error",
                            "error": f"Invalid message format: {str(e)}",
                        }
                    )
                except Exception:
                    pass
                continue

            try:
                message = WSMessage(**data)
            except Exception as e:
                # Invalid message structure - send error response
                logger.error(f"Failed to parse message structure: {e}")
                await websocket.send_json(
                    {
                        "id": data.get("id", str(uuid.uuid4())),
                        "type": MessageType.RESPONSE,
                        "action": data.get("action", "unknown"),
                        "error": f"Invalid message structure: {str(e)}",
                    }
                )
                continue

            # Set correlation ID
            set_correlation_id(message.id)

            # Route to handler
            if message.action == "health_check":
                await handle_health_check(websocket, message)
            elif message.action == "get_kernels":
                await handle_get_kernels(websocket, message)
            elif message.action == "execute_script":
                await handle_execute_script(websocket, message)
            else:
                await websocket.send_json(
                    {
                        "id": message.id,
                        "type": MessageType.RESPONSE,
                        "action": message.action,
                        "error": f"Unknown action: {message.action}",
                    }
                )

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Agent client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(client_id)


async def handle_health_check(websocket: WebSocket, message: WSMessage) -> None:
    """Handle health_check request.

    Per spec SC-001: Respond within 100ms in 99% of cases.
    """
    start_time = time.time()

    # Check active connections and mode
    manager = get_manager()
    mode = "agent" if manager.get_active_count() > 1 else "desktop"

    response = WSMessage(
        id=message.id,
        type=MessageType.RESPONSE,
        action="health_check",
        payload=HealthCheckResponse(
            status="ok",
            mode=mode,
            active_sessions=manager.get_active_count(),
        ).model_dump(),
    )

    await websocket.send_json(response.model_dump())

    elapsed_ms = (time.time() - start_time) * 1000
    if elapsed_ms > 100:
        logger.warning(f"health_check took {elapsed_ms}ms (target: <100ms)")


async def handle_get_kernels(websocket: WebSocket, message: WSMessage) -> None:
    """Handle get_kernels request.

    Query kernel repository and return list of available kernels.
    """
    session = get_session()
    kernel_repo = KernelRepository(session)

    try:
        kernels = kernel_repo.get_all()
        kernel_list = [
            {
                "id": k.id,
                "name": k.name,
                "type": "chrome",  # Default type for Chrome kernels
                "browser_path": k.executable_path,  # Alias for compatibility
                "executable_path": k.executable_path,
                "version": k.version,
                "is_default_record": k.is_default_record,
                "is_default_agent": k.is_default_agent,
                "created_at": k.created_at.isoformat() if k.created_at else None,
            }
            for k in kernels
        ]

        response = WSMessage(
            id=message.id,
            type=MessageType.RESPONSE,
            action="get_kernels",
            payload=GetKernelsResponse(
                kernels=kernel_list,
            ).model_dump(),
        )

        await websocket.send_json(response.model_dump())
        logger.info(f"Returned {len(kernel_list)} kernels")

    finally:
        session.close()
