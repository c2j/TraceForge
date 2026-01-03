"""Kernel and execution models for ForgeEngine."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, List


class KernelConfig(BaseModel):
    """Represents a browser kernel configuration."""

    id: str = Field(..., description="Unique kernel identifier")
    name: str = Field(..., description="Human-readable kernel name")
    executable_path: str = Field(..., description="Full path to browser executable")
    version: str = Field(..., description="Browser version (e.g., '86.0.4240')")
    is_default_record: bool = Field(False, description="Default kernel for recording")
    is_default_agent: bool = Field(False, description="Default kernel for Agent mode")
    created_at: Optional[str] = Field(None, description="Creation timestamp")


class ExecutionStepResult(BaseModel):
    """Represents a single action execution result."""

    locators_attempted: List[str] = Field(
        default_factory=list, description="Locator types attempted"
    )
    locator_used: Optional[str] = Field(None, description="Locator type that succeeded")
    screenshot: Optional[str] = Field(None, description="Screenshot path")
    error: Optional[str] = Field(None, description="Error message if failed")


class ExecutionStepError(BaseModel):
    """Error structure for failed step."""

    error_type: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    stack_trace: Optional[str] = Field(None, description="Stack trace")


class ExecutionStepStatus(BaseModel):
    """Represents execution step tracking."""

    id: str = Field(..., description="Unique step identifier")
    execution_id: str = Field(..., description="Parent execution ID")
    action_id: str = Field(..., description="Action from script being executed")
    status: str = Field(..., description="Step status: pending, running, completed, or failed")
    result: Optional[ExecutionStepResult] = Field(None, description="Step result details")
    duration_ms: int = Field(..., description="Step duration in milliseconds")
    error: Optional[str] = Field(None, description="Error message if failed")


class ExecutionArtifacts(BaseModel):
    """Represents execution artifacts."""

    screenshots: List[dict] = Field(default_factory=list, description="Screenshot artifacts")
    diffs: List[dict] = Field(default_factory=list, description="Visual diff artifacts")


class ExecutionResult(BaseModel):
    """Represents script execution result."""

    id: str = Field(..., description="Unique execution identifier")
    script_id: str = Field(..., description="Script being executed")
    kernel_id: str = Field(..., description="Kernel used for execution")
    status: str = Field(
        ..., description="Execution status: running, completed, failed, or cancelled"
    )
    duration_ms: int = Field(..., description="Execution duration in milliseconds")
    trace_path: Optional[str] = Field(None, description="Playwright trace file path")
    artifacts: Optional[ExecutionArtifacts] = Field(None, description="Artifacts JSON object")
    created_at: Optional[str] = Field(None, description="Execution start timestamp")
    updated_at: Optional[str] = Field(None, description="Last update timestamp")
