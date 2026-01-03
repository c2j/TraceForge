"""WebSocket request handlers for ForgeEngine."""

import uuid
from typing import Optional, Dict, Any

from fastapi import WebSocket

from models.websocket import (
    WSMessage,
    MessageType,
    StartRecordingRequest,
    StopRecordingRequest,
    ExecuteScriptRequest,
)
from models.script import Script
from utils.logging import Logger, set_correlation_id


logger = Logger.get(__name__)


# TODO: Import handler dependencies (T030-T031, T040, T057, T064-T066)
# TODO: Import browser manager (T024)
# TODO: Import recording session manager (T029)
# TODO: Import execution engine (T039)


def validate_script_json(script_dict: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Validate script JSON structure before execution.

    Per spec FR-026: Validate structure and return descriptive error messages.

    Args:
        script_dict: Script JSON dictionary

    Returns:
        Tuple of (is_valid, error_message)
    """
    errors = []

    # Check required fields
    required_fields = ["id", "name", "scenarios"]
    for field in required_fields:
        if field not in script_dict:
            errors.append(f"Missing required field: {field}")

    # Validate scenarios
    if "scenarios" in script_dict:
        scenarios = script_dict["scenarios"]
        if not isinstance(scenarios, list) or len(scenarios) == 0:
            errors.append("Script must have at least one scenario")
        else:
            for i, scenario in enumerate(scenarios):
                if not isinstance(scenario, dict):
                    errors.append(f"Scenario {i} must be an object")
                    continue

                # Check required scenario fields
                if "id" not in scenario:
                    errors.append(f"Scenario {i} missing required field: id")
                if "name" not in scenario:
                    errors.append(f"Scenario {i} missing required field: name")
                if "pages" not in scenario:
                    errors.append(f"Scenario {i} missing required field: pages")
                elif not isinstance(scenario["pages"], list) or len(scenario["pages"]) == 0:
                    errors.append(f"Scenario {i} must have at least one page")

                # Validate pages
                if "pages" in scenario:
                    for j, page in enumerate(scenario["pages"]):
                        if not isinstance(page, dict):
                            errors.append(f"Scenario {i}, Page {j} must be an object")
                            continue

                        # Check required page fields
                        if "id" not in page:
                            errors.append(f"Scenario {i}, Page {j} missing required field: id")
                        if "name" not in page:
                            errors.append(f"Scenario {i}, Page {j} missing required field: name")
                        if "actions" not in page:
                            errors.append(f"Scenario {i}, Page {j} missing required field: actions")
                        elif not isinstance(page["actions"], list):
                            errors.append(f"Scenario {i}, Page {j} actions must be a list")

                        # Validate actions
                        if "actions" in page:
                            for k, action in enumerate(page["actions"]):
                                if not isinstance(action, dict):
                                    errors.append(
                                        f"Scenario {i}, Page {j}, Action {k} must be an object"
                                    )
                                    continue

                                # Check required action fields
                                if "id" not in action:
                                    errors.append(
                                        f"Scenario {i}, Page {j}, Action {k} missing required field: id"
                                    )
                                if "name" not in action:
                                    errors.append(
                                        f"Scenario {i}, Page {j}, Action {k} missing required field: name"
                                    )
                                if "action_type" not in action:
                                    errors.append(
                                        f"Scenario {i}, Page {j}, Action {k} missing required field: action_type"
                                    )
                                elif action["action_type"] not in [
                                    "navigate",
                                    "click",
                                    "fill",
                                    "hover",
                                    "wait_for",
                                    "assert_text",
                                    "screenshot",
                                    "press",
                                ]:
                                    errors.append(
                                        f"Scenario {i}, Page {j}, Action {k} invalid action_type: {action['action_type']}"
                                    )

    # Validate data_driven consistency
    if "data_driven" in script_dict and script_dict["data_driven"] is not None:
        data_driven = script_dict["data_driven"]
        if not isinstance(data_driven, list):
            errors.append("data_driven must be a list or null")
        elif len(data_driven) > 0:
            # Check that all rows have same keys
            keys = set(data_driven[0].keys())
            for i, row in enumerate(data_driven[1:], 1):
                if set(row.keys()) != keys:
                    errors.append(f"data_driven row {i} has inconsistent keys compared to row 0")

    if errors:
        error_message = "Script validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
        return False, error_message

    return True, None


async def handle_start_recording(websocket: WebSocket, message: WSMessage) -> None:
    """Handle start_recording request.

    Per spec FR-005: Start recording sessions with headful browser and Playwright trace enabled.
    Per spec acceptance scenario 1: Returns session_id.
    """
    # TODO: Implement recording session startup (T030)
    # TODO: Launch headful browser with Playwright tracing (T024, T026)

    request = StartRecordingRequest(**(message.payload or {}))

    logger.info(f"Starting recording session: {request.url}")

    from recorder.session import create_session

    session = create_session(request.url)

    response = WSMessage(
        id=message.id,
        type=MessageType.RESPONSE,
        action="start_recording",
        payload={"session_id": session.session_id},
    )

    await websocket.send_json(response.model_dump())


async def handle_stop_recording(websocket: WebSocket, message: WSMessage) -> None:
    """Handle stop_recording request.

    Per spec FR-010: Return complete Script JSON with Scenario-Page-Action hierarchy.
    Per spec acceptance scenario 6: Return Script JSON and trace.zip file path.
    """
    # TODO: Implement stop recording logic (T031)
    # TODO: Save trace.zip file
    # TODO: Close browser instance
    # TODO: Return Script JSON and trace path

    request = StopRecordingRequest(**(message.payload or {}))

    logger.info(f"Stopping recording session: {request.session_id}")

    from recorder.session import stop_active_session

    script = stop_active_session()

    response = WSMessage(
        id=message.id,
        type=MessageType.RESPONSE,
        action="stop_recording",
        payload={
            "script": script or {},
            "trace_path": "/path/to/trace.zip",  # TODO: Replace with actual path
        },
    )

    await websocket.send_json(response.model_dump())


async def handle_connection_loss(websocket: WebSocket) -> None:
    """Handle WebSocket connection loss.

    Per spec FR-034: Pause session for 30s waiting for reconnection.
    Per spec FR-035: If no reconnection within 30s, terminate session.

    TODO: Implement connection loss handling (T023 in manager)
    """
    # TODO: Detect connection loss
    # TODO: Pause active session with 30s timeout
    # TODO: Monitor for reconnection
    # TODO: Terminate session if timeout exceeded

    logger.warning("Connection lost detected, initiating 30s pause/reconnect mechanism")


async def handle_execute_script(websocket: WebSocket, message: WSMessage) -> None:
    """Handle execute_script request.

    Per spec FR-011: Execute Script→Scenario→Page→Action hierarchy.
    Per spec acceptance scenario 1: Execute script with locator fallback.
    Per spec FR-026: Validate script JSON before execution.
    """
    # TODO: Import browser manager and execution engine when implemented
    # from backend.engine.browser.manager import get_manager as get_browser_manager
    # from backend.engine.executor.engine import ExecutionEngine

    request = ExecuteScriptRequest(**(message.payload or {}))

    logger.info(f"Executing script: {request.script.get('id')}, Kernel: {request.kernel_id}")

    # Validate script JSON
    is_valid, validation_error = validate_script_json(request.script)
    if not is_valid:
        logger.error(f"Script validation failed: {validation_error}")
        response = WSMessage(
            id=message.id,
            type=MessageType.RESPONSE,
            action="execute_script",
            error=validation_error,
        )
        await websocket.send_json(response.model_dump())
        return

    # Parse script
    try:
        script = Script(**request.script)
    except Exception as e:
        logger.error(f"Failed to parse script: {e}")
        response = WSMessage(
            id=message.id,
            type=MessageType.RESPONSE,
            action="execute_script",
            error=f"Failed to parse script: {str(e)}",
        )
        await websocket.send_json(response.model_dump())
        return

    # Execute script
    try:
        # TODO: Initialize execution engine and execute script (needs browser manager)
        # browser_manager = get_browser_manager()
        # engine = ExecutionEngine(websocket, browser_manager)
        # result = await engine.execute_script(
        #     script=script,
        #     kernel_id=request.kernel_id,
        #     headless=request.headless,
        #     data_rows=request.data_rows,
        # )

        # Mock response for now
        logger.info(f"Script execution completed: {script.id}")

        # Response is sent via execution_complete event
        # Send acknowledgment
        response = WSMessage(
            id=message.id,
            type=MessageType.RESPONSE,
            action="execute_script",
            payload={"status": "started"},
        )
        await websocket.send_json(response.model_dump())

    except Exception as e:
        logger.error(f"Script execution failed: {e}")
        response = WSMessage(
            id=message.id,
            type=MessageType.RESPONSE,
            action="execute_script",
            error=f"Execution failed: {str(e)}",
        )
        await websocket.send_json(response.model_dump())
