"""Unit tests for script models (Script, Scenario, Page, Action, LocatorStrategy)."""

import sys
import os

# Add parent directories to path for imports
test_file = os.path.abspath(__file__)
unit_dir = os.path.dirname(test_file)
tests_dir = os.path.dirname(unit_dir)
backend_dir = os.path.dirname(tests_dir)
parent_dir = os.path.dirname(backend_dir)
engine_dir = os.path.join(parent_dir, "engine")
sys.path.insert(0, engine_dir)

import pytest
from models.script import LocatorStrategy, Action, Page, Scenario, Script


class TestLocatorStrategy:
    """Unit tests for LocatorStrategy model."""

    @pytest.mark.parametrize(
        "locator_type,value,name,fallback",
        [
            ("role", "button", "Submit", False),
            ("text", "Click me", None, True),
            ("css", ".submit-button", None, True),
            ("xpath", "//button[@type='submit']", None, True),
            ("id", "submit-button", None, True),
        ],
        ids=[
            "role-locator",
            "text-locator",
            "css-locator",
            "xpath-locator",
            "id-locator",
        ],
    )
    def test_create_locator_strategy(self, locator_type, value, name, fallback):
        """Test creating locator strategy with all types."""
        locator = LocatorStrategy(
            type=locator_type,
            value=value,
            name=name,
            fallback=fallback,
        )
        assert locator.type == locator_type, (
            f"Expected type={locator_type}, got {locator.type}"
        )
        assert locator.value == value, f"Expected value={value}, got {locator.value}"
        assert locator.name == name, f"Expected name={name}, got {locator.name}"
        assert locator.fallback is fallback, (
            f"Expected fallback={fallback}, got {locator.fallback}"
        )

    def test_locator_strategy_invalid_type(self):
        """Test LocatorStrategy with invalid type (Pydantic doesn't validate str types)."""
        # Pydantic doesn't validate string-based type fields without explicit constraints
        # This test just verifies that the model accepts any string value
        locator = LocatorStrategy(
            type="invalid_type",
            value="value",
            fallback=False,
        )
        assert locator.type == "invalid_type", "Expected type to be 'invalid_type'"


class TestAction:
    """Unit tests for Action model."""

    def test_create_action_minimal(self):
        """Test creating an Action with minimal fields."""
        action = Action(
            id="action-001",
            name="Click submit button",
            action_type="click",
            locators=[],
            params={},
        )
        assert action.id == "action-001", f"Expected id='action-001', got {action.id}"
        assert action.name == "Click submit button", (
            f"Expected name='Click submit button', got {action.name}"
        )
        assert action.action_type == "click", (
            f"Expected action_type='click', got {action.action_type}"
        )
        assert action.locators == [], "Expected empty locators list"
        assert action.params == {}, "Expected empty params dict"
        assert action.wait_after is None, "Expected wait_after to be None"

    def test_create_action_with_locators(self):
        """Test creating an Action with multiple locators."""
        action = Action(
            id="action-002",
            name="Fill form",
            action_type="fill",
            locators=[
                LocatorStrategy(
                    type="role", value="textbox", name="Username", fallback=False
                ),
                LocatorStrategy(type="id", value="username-input", fallback=True),
            ],
            params={"value": "testuser"},
        )
        assert len(action.locators) == 2, (
            f"Expected 2 locators, got {len(action.locators)}"
        )
        assert action.locators[0].type == "role", (
            f"Expected first locator type='role', got {action.locators[0].type}"
        )
        assert action.locators[1].type == "id", (
            f"Expected second locator type='id', got {action.locators[1].type}"
        )
        assert action.params["value"] == "testuser", (
            f"Expected params value='testuser', got {action.params['value']}"
        )

    @pytest.mark.parametrize(
        "wait_after",
        ["networkidle", "load", "domcontentloaded"],
        ids=["networkidle-wait", "load-wait", "domcontentloaded-wait"],
    )
    def test_create_action_with_wait_after(self, wait_after):
        """Test creating an Action with wait_after condition."""
        action = Action(
            id=f"action-{wait_after}",
            name="Test action",
            action_type="click",
            locators=[],
            params={},
            wait_after=wait_after,
        )
        assert action.wait_after == wait_after, (
            f"Expected wait_after={wait_after}, got {action.wait_after}"
        )

    @pytest.mark.parametrize(
        "action_type",
        [
            "navigate",
            "click",
            "fill",
            "hover",
            "wait_for",
            "assert_text",
            "screenshot",
            "press",
        ],
        ids=[
            "navigate-action",
            "click-action",
            "fill-action",
            "hover-action",
            "wait-for-action",
            "assert-text-action",
            "screenshot-action",
            "press-action",
        ],
    )
    def test_action_valid_types(self, action_type):
        """Test all valid action types."""
        action = Action(
            id=f"action-{action_type}",
            name=f"Test {action_type}",
            action_type=action_type,
            locators=[],
            params={},
        )
        assert action.action_type == action_type, (
            f"Expected action_type={action_type}, got {action.action_type}"
        )


class TestPage:
    """Unit tests for Page model."""

    def test_create_page_minimal(self):
        """Test creating a Page with minimal fields."""
        action = Action(
            id="action-001",
            name="Test action",
            action_type="click",
            locators=[],
            params={},
        )
        page = Page(
            id="page-001",
            name="Homepage",
            default_wait="networkidle",
            actions=[action],
        )
        assert page.id == "page-001", f"Expected id='page-001', got {page.id}"
        assert page.name == "Homepage", f"Expected name='Homepage', got {page.name}"
        assert page.entry_url is None, "Expected entry_url to be None"
        assert page.default_wait == "networkidle", (
            f"Expected default_wait='networkidle', got {page.default_wait}"
        )
        assert len(page.actions) == 1, f"Expected 1 action, got {len(page.actions)}"

    @pytest.mark.parametrize(
        "entry_url,default_wait",
        [
            ("https://example.com/login", "domcontentloaded"),
            ("https://example.com", "load"),
            (None, "networkidle"),
        ],
        ids=["with-entry-url-domcontentloaded", "with-entry-url-load", "no-entry-url"],
    )
    def test_create_page_variations(self, entry_url, default_wait):
        """Test creating Page with various entry URLs and wait conditions."""
        page = Page(
            id="page-002",
            name="Login Page",
            entry_url=entry_url,
            default_wait=default_wait,
            actions=[],
        )
        assert page.entry_url == entry_url, (
            f"Expected entry_url={entry_url}, got {page.entry_url}"
        )
        assert page.default_wait == default_wait, (
            f"Expected default_wait={default_wait}, got {page.default_wait}"
        )


class TestScenario:
    """Unit tests for Scenario model."""

    def test_create_scenario_minimal(self):
        """Test creating a Scenario with minimal fields."""
        page = Page(
            id="page-001",
            name="Homepage",
            actions=[],
        )
        scenario = Scenario(
            id="scenario-001",
            name="User Login Flow",
            pages=[page],
        )
        assert scenario.id == "scenario-001", (
            f"Expected id='scenario-001', got {scenario.id}"
        )
        assert scenario.name == "User Login Flow", (
            f"Expected name='User Login Flow', got {scenario.name}"
        )
        assert scenario.description is None, "Expected description to be None"
        assert len(scenario.pages) == 1, f"Expected 1 page, got {len(scenario.pages)}"

    @pytest.mark.parametrize(
        "description,pages_count",
        [
            ("Tests complete checkout process", 1),
            ("Simple test scenario", 2),
            ("Complex multi-page flow", 3),
        ],
        ids=["with-description", "multi-page-2", "multi-page-3"],
    )
    def test_create_scenario_variations(self, description, pages_count):
        """Test creating Scenario with various descriptions and page counts."""
        pages = [
            Page(id=f"page-{i}", name=f"Page {i}", actions=[])
            for i in range(pages_count)
        ]
        scenario = Scenario(
            id="scenario-002",
            name="Test Scenario",
            description=description,
            pages=pages,
        )
        assert scenario.description == description, (
            f"Expected description='{description}', got {scenario.description}"
        )
        assert len(scenario.pages) == pages_count, (
            f"Expected {pages_count} pages, got {len(scenario.pages)}"
        )


class TestScript:
    """Unit tests for Script model."""

    def test_create_script_minimal(self):
        """Test creating a Script with minimal fields."""
        scenario = Scenario(
            id="scenario-001",
            name="Test Scenario",
            pages=[],
        )
        script = Script(
            id="script-001",
            name="Test Script",
            scenarios=[scenario],
        )
        assert script.id == "script-001", f"Expected id='script-001', got {script.id}"
        assert script.name == "Test Script", (
            f"Expected name='Test Script', got {script.name}"
        )
        assert len(script.scenarios) == 1, (
            f"Expected 1 scenario, got {len(script.scenarios)}"
        )
        assert script.data_driven is None, "Expected data_driven to be None"
        assert script.target_kernels is None, "Expected target_kernels to be None"

    @pytest.mark.parametrize(
        "data_driven_count,target_kernels_count",
        [
            (2, None),
            (None, 2),
            (3, 2),
        ],
        ids=[
            "with-data-driven",
            "with-target-kernels",
            "both-data-driven-and-target-kernels",
        ],
    )
    def test_create_script_with_options(self, data_driven_count, target_kernels_count):
        """Test creating Script with data_driven and/or target_kernels."""
        scenario = Scenario(
            id="scenario-001",
            name="Test Scenario",
            pages=[],
        )

        script_data = {
            "id": "script-002",
            "name": "Test Script",
            "scenarios": [scenario],
        }

        if data_driven_count is not None:
            script_data["data_driven"] = [
                {"username": f"user{i}", "password": f"pass{i}"}
                for i in range(data_driven_count)
            ]

        if target_kernels_count is not None:
            script_data["target_kernels"] = [
                f"kernel-{i}" for i in range(target_kernels_count)
            ]

        script = Script(**script_data)

        if data_driven_count is not None:
            assert len(script.data_driven) == data_driven_count, (
                f"Expected {data_driven_count} data rows, got {len(script.data_driven)}"
            )
        else:
            assert script.data_driven is None, "Expected data_driven to be None"

        if target_kernels_count is not None:
            assert len(script.target_kernels) == target_kernels_count, (
                f"Expected {target_kernels_count} target kernels, got {len(script.target_kernels)}"
            )
        else:
            assert script.target_kernels is None, "Expected target_kernels to be None"

    def test_script_model_dump(self):
        """Test serializing Script to dict."""
        scenario = Scenario(
            id="scenario-001",
            name="Test Scenario",
            pages=[],
        )
        script = Script(
            id="script-001",
            name="Test Script",
            scenarios=[scenario],
        )
        data = script.model_dump()
        assert isinstance(data, dict), "Expected data to be a dict"
        assert data["id"] == "script-001", f"Expected id='script-001', got {data['id']}"
        assert data["name"] == "Test Script", (
            f"Expected name='Test Script', got {data['name']}"
        )
