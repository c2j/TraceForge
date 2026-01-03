"""Script structure models for ForgeEngine.

Script, Scenario, Page, Action, LocatorStrategy classes.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class LocatorStrategy(BaseModel):
    """Represents a specific way to find an element."""

    type: str = Field(..., description="Locator type: role, text, css, xpath, or id")
    value: str = Field(..., description="Locator value")
    name: Optional[str] = Field(None, description="Accessible name (role locator only)")
    fallback: bool = Field(..., description="Fallback flag")


class Action(BaseModel):
    """Represents a single user interaction."""

    id: str = Field(..., description="Unique action identifier")
    name: str = Field(..., description="Action name")
    action_type: str = Field(
        ...,
        description="Type of action: navigate, click, fill, hover, wait_for, assert_text, screenshot, press",
    )
    locators: List[LocatorStrategy] = Field(
        default_factory=list, description="List of locator strategies"
    )
    params: dict = Field(default_factory=dict, description="Action-specific parameters")
    wait_after: Optional[str] = Field(
        None, description="Post-action wait condition: networkidle, load, or domcontentloaded"
    )


class Page(BaseModel):
    """Represents a single web page with entry URL and default wait condition."""

    id: str = Field(..., description="Unique page identifier")
    name: str = Field(..., description="Page name")
    entry_url: Optional[str] = Field(None, description="URL where page is first detected")
    default_wait: str = Field(
        "networkidle", description="Default wait condition: networkidle, load, or domcontentloaded"
    )
    actions: List[Action] = Field(..., description="List of actions on this page")


class Scenario(BaseModel):
    """Represents a logical grouping of test steps."""

    id: str = Field(..., description="Unique scenario identifier")
    name: str = Field(..., description="Scenario name")
    description: Optional[str] = Field(None, description="Human-readable description")
    pages: List[Page] = Field(..., description="List of pages in this scenario")


class Script(BaseModel):
    """Represents a test script with hierarchical structure."""

    id: str = Field(..., description="Unique script identifier")
    name: str = Field(..., description="Script name")
    scenarios: List[Scenario] = Field(..., description="List of scenarios")
    data_driven: Optional[List[dict]] = Field(None, description="Data-driven test rows")
    target_kernels: Optional[List[str]] = Field(
        None, description="Target kernel IDs for this script"
    )
