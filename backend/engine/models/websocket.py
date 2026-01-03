"""WebSocket message types for ForgeEngine communication.

Based on ForgeWS schema from spec.
"""

from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from enum import Enum


class MessageType(str, Enum):
    """WebSocket message types."""

    REQUEST = "request"
    RESPONSE = "response"
    EVENT = "event"


class WSMessage(BaseModel):
    """Base WebSocket message structure."""

    id: str = Field(..., description="Unique message identifier (UUID)")
    type: MessageType = Field(..., description="Message type: request, response, or event")
    action: str = Field(..., description="Action or event name")
    payload: Optional[Dict[str, Any]] = Field(None, description="Request or response payload")
    error: Optional[str] = Field(None, description="Error message if request failed")


# Request types
class HealthCheckRequest(BaseModel):
    """Health check request (no payload needed)."""

    pass


class GetKernelsRequest(BaseModel):
    """Get kernels request (no payload needed)."""

    pass


class StartRecordingRequest(BaseModel):
    """Start recording session request."""

    url: str = Field(..., description="Starting URL for recording")
    kernel_id: Optional[str] = Field(
        None, description="Kernel ID to use (optional, uses default if not specified)"
    )


class StopRecordingRequest(BaseModel):
    """Stop recording session request."""

    session_id: str = Field(..., description="Recording session ID to stop")


class ExecuteScriptRequest(BaseModel):
    """Execute script request."""

    script: Dict[str, Any] = Field(..., description="Script to execute")
    data_rows: Optional[List[Dict[str, Any]]] = Field(
        None, description="Data-driven test rows (optional)"
    )
    kernel_id: str = Field(..., description="Kernel ID to use")
    headless: bool = Field(
        False, description="Run headless (default: false for Desktop mode, true for Agent mode)"
    )


# Response types
class StartRecordingResponse(BaseModel):
    """Start recording response."""

    session_id: str = Field(..., description="Recording session ID")


class StopRecordingResponse(BaseModel):
    """Stop recording response."""

    script: Dict[str, Any] = Field(
        ..., description="Complete script with Scenario-Page-Action hierarchy"
    )
    trace_path: str = Field(..., description="Path to trace.zip file")


class GetKernelsResponse(BaseModel):
    """Get kernels response."""

    kernels: List[Dict[str, Any]] = Field(..., description="List of available browser kernels")


class HealthCheckResponse(BaseModel):
    """Health check response."""

    status: str = Field("ok", description="Always 'ok' if Engine is healthy")
    mode: str = Field(..., description="Current operating mode: desktop or agent")
    active_sessions: int = Field(..., description="Number of active sessions")


# Event types
class NavigationDetectedEvent(BaseModel):
    """Navigation detected event."""

    session_id: str = Field(..., description="Recording session ID")
    page_id: str = Field(..., description="New page ID")
    url: str = Field(..., description="Navigation URL")
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")


class ActionRecordedEvent(BaseModel):
    """Action recorded event."""

    session_id: str = Field(..., description="Recording session ID")
    page_id: str = Field(..., description="Page ID where action occurred")
    action: Dict[str, Any] = Field(..., description="Recorded action with locators")
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")


class AutoWaitSuggestedEvent(BaseModel):
    """Auto wait suggested event."""

    session_id: str = Field(..., description="Recording session ID")
    action_id: str = Field(..., description="Action ID that triggered network request")
    suggested_wait: str = Field(
        ..., description="Suggested wait condition: networkidle, load, or domcontentloaded"
    )
    network_url: Optional[str] = Field(
        None, description="Network request URL that triggered suggestion"
    )
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")


class LogEvent(BaseModel):
    """Log event."""

    level: str = Field(..., description="Log level: debug, info, warning, or error")
    message: str = Field(..., description="Log message")
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")


class StepStartEvent(BaseModel):
    """Step start event."""

    execution_id: str = Field(..., description="Execution ID")
    step_id: str = Field(..., description="Step ID")
    action: Dict[str, Any] = Field(..., description="Action being executed")
    data_row_index: Optional[int] = Field(
        None, description="Data-driven row index (0-based, null if not data-driven)"
    )
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")


class StepCompleteEvent(BaseModel):
    """Step complete event."""

    execution_id: str = Field(..., description="Execution ID")
    step_id: str = Field(..., description="Step ID")
    status: str = Field(..., description="Step completion status: completed or failed")
    result: Optional[Dict[str, Any]] = Field(None, description="Step result details")
    error: Optional[str] = Field(None, description="Error message if failed")
    duration_ms: int = Field(..., description="Step duration in milliseconds")
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")


class VisualDiffEvent(BaseModel):
    """Visual diff event."""

    execution_id: str = Field(..., description="Execution ID")
    step_id: str = Field(..., description="Step ID")
    action_id: str = Field(..., description="Action ID that failed visual assertion")
    expected_path: str = Field(..., description="Expected screenshot path")
    actual_path: str = Field(..., description="Actual screenshot path")
    diff_path: str = Field(..., description="Diff image path")
    threshold: float = Field(..., description="Pixel difference threshold")
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")


class ExecutionCompleteEvent(BaseModel):
    """Execution complete event."""

    execution_id: str = Field(..., description="Execution ID")
    result: Dict[str, Any] = Field(..., description="Execution result with artifacts")
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")
