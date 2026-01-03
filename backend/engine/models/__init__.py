"""Models package for ForgeEngine."""

from models.websocket import (
    WSMessage,
    MessageType,
    HealthCheckRequest,
    GetKernelsRequest,
    StartRecordingRequest,
    StopRecordingRequest,
    ExecuteScriptRequest,
    HealthCheckResponse,
    StartRecordingResponse,
    StopRecordingResponse,
    GetKernelsResponse,
    NavigationDetectedEvent,
    ActionRecordedEvent,
    AutoWaitSuggestedEvent,
    LogEvent,
    StepStartEvent,
    StepCompleteEvent,
    VisualDiffEvent,
    ExecutionCompleteEvent,
)

from models.script import (
    Script,
    Scenario,
    Page,
    Action,
    LocatorStrategy,
)

from models.kernel import (
    KernelConfig,
    ExecutionStepResult,
    ExecutionStepError,
    ExecutionStepStatus,
    ExecutionArtifacts,
    ExecutionResult,
)

__all__ = [
    # WebSocket models
    "WSMessage",
    "MessageType",
    "HealthCheckRequest",
    "GetKernelsRequest",
    "StartRecordingRequest",
    "StopRecordingRequest",
    "ExecuteScriptRequest",
    "HealthCheckResponse",
    "StartRecordingResponse",
    "StopRecordingResponse",
    "GetKernelsResponse",
    "NavigationDetectedEvent",
    "ActionRecordedEvent",
    "AutoWaitSuggestedEvent",
    "LogEvent",
    "StepStartEvent",
    "StepCompleteEvent",
    "VisualDiffEvent",
    "ExecutionCompleteEvent",
    # Script models
    "Script",
    "Scenario",
    "Page",
    "Action",
    "LocatorStrategy",
    # Kernel models
    "KernelConfig",
    "ExecutionStepResult",
    "ExecutionStepError",
    "ExecutionStepStatus",
    "ExecutionArtifacts",
    "ExecutionResult",
]
