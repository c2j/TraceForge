# Data Model: ForgeEngine & ForgeAgent

**Feature**: 002-engine-agent | **Date**: 2026-01-01

## Overview

This document defines the data entities and relationships for ForgeEngine & ForgeAgent implementation, derived from feature specification and design document.

---

## Entity: Kernel

**Description**: Represents a browser engine configuration with executable path, version, and default flags.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Unique kernel identifier | Required, unique |
| name | string | Human-readable kernel name | Required, non-empty |
| executable_path | string | Full path to browser executable | Required, must exist |
| version | string | Browser version (e.g., "86.0.4240") | Required, format "X.Y.Z" |
| is_default_record | boolean | Default kernel for recording | Default: false |
| is_default_agent | boolean | Default kernel for Agent mode | Default: false |
| created_at | datetime | Creation timestamp | Auto-generated |

**Relationships**:
- One-to-Many: Kernel → Session (many recording/execution sessions use this kernel)
- One-to-Many: Kernel → Execution (many executions run with this kernel)

**Constraints**:
- Minimum Chrome version: 86.0 (per spec FR-002)
- Executable path must be valid on startup
- Only one kernel can have is_default_record = true
- Only one kernel can have is_default_agent = true

**State Transitions**:
- Created → Active (valid executable)
- Active → Disabled (removed from system)

---

## Entity: Script

**Description**: Represents a test script with hierarchical structure containing Scenarios, Pages, Actions, and optional data-driven rows.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Unique script identifier | Required, unique |
| name | string | Script name | Required, non-empty |
| project_id | string (UUID) | Associated project ID | Optional |
| script_json | JSON | Complete Script structure (Scenario-Page-Action) | Required, valid JSON |
| updated_at | datetime | Last update timestamp | Auto-generated |
| synced_at | datetime | Last synchronization timestamp | Optional (null if not synced) |

**Relationships**:
- One-to-Many: Script → Scenario (script contains multiple scenarios)
- One-to-Many: Script → Execution (multiple executions can run same script)

**Script JSON Structure**:
```json
{
  "id": "uuid",
  "name": "E-commerce Checkout Flow",
  "scenarios": [
    {
      "id": "uuid",
      "name": "Add to Cart",
      "description": "Add product to shopping cart",
      "pages": [
        {
          "id": "uuid",
          "name": "Product Page",
          "entry_url": "https://example.com/product/123",
          "default_wait": "networkidle",
          "actions": [
            {
              "id": "uuid",
              "name": "Click Add to Cart",
              "action_type": "click",
              "locators": [
                {"type": "role", "value": "button", "name": "Add to Cart", "fallback": false},
                {"type": "text", "value": "Add to Cart", "fallback": true}
              ],
              "params": {},
              "wait_after": "networkidle"
            }
          ]
        }
      ]
    }
  ],
  "data_driven": [
    {"user": "user1@example.com", "product": "123"},
    {"user": "user2@example.com", "product": "456"}
  ],
  "target_kernels": ["chrome86", "chrome120"]
}
```

---

## Entity: Scenario

**Description**: Represents a logical grouping of test steps with multiple Pages and a description.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Unique scenario identifier | Required, unique within Script |
| name | string | Scenario name | Required, non-empty |
| description | string | Human-readable description | Optional |
| pages | array | List of Page objects | Required, non-empty |

**Relationships**:
- Many-to-One: Scenario → Script (scenario belongs to one script)
- One-to-Many: Scenario → Page (scenario contains multiple pages)

---

## Entity: Page

**Description**: Represents a single web page with entry URL, default wait condition, and list of Actions.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Unique page identifier | Required, unique within Scenario |
| name | string | Page name | Required, non-empty |
| entry_url | string | URL where page is first detected | Optional (null for initial page) |
| default_wait | string | Default wait condition | Required, enum: "networkidle", "load", "domcontentloaded" |
| actions | array | List of Action objects | Required, non-empty |

**Relationships**:
- Many-to-One: Page → Scenario (page belongs to one scenario)
- One-to-Many: Page → Action (page contains multiple actions)

**State Detection**:
- Engine detects navigation events and creates new Page node
- Entry URL captured from navigation event
- Default wait applied to all actions unless overridden

---

## Entity: Action

**Description**: Represents a single user interaction (click, fill, navigate, etc.) with multiple locator strategies, parameters, and optional wait conditions.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Unique action identifier | Required, unique within Page |
| name | string | Action name | Required, non-empty |
| action_type | string | Type of action | Required, enum: "navigate", "click", "fill", "hover", "wait_for", "assert_text", "screenshot", "press" |
| locators | array | List of LocatorStrategy objects | Optional (for navigate, wait_for) |
| params | object | Action-specific parameters | Required, schema varies by action_type |
| wait_after | string or null | Post-action wait condition | Optional, enum: "networkidle", "load", "domcontentloaded" |

**Locators Strategy**:
- Primary locator (fallback: false) tried first
- Fallback locators (fallback: true) tried in order if primary fails
- Priority order: role → text → css → xpath → id

**Action Types and Parameters**:

| action_type | params | locators | wait_after |
|-------------|--------|----------|------------|
| navigate | { url: string } | Not used | Optional |
| click | {} | Required | Optional |
| fill | { input_value: string } | Required | Optional |
| hover | {} | Required | Optional |
| wait_for | { timeout: number } | Not used | Not used |
| assert_text | { text: string } | Optional | Optional |
| screenshot | { path: string } | Not used | Optional |
| press | { key: string } | Optional | Optional |

---

## Entity: LocatorStrategy

**Description**: Represents a specific way to find an element (role, text, css, xpath, id) with a value and fallback flag.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| type | string | Locator type | Required, enum: "role", "text", "css", "xpath", "id" |
| value | string | Locator value | Required, non-empty |
| name | string | Accessible name (role locator only) | Optional |
| fallback | boolean | Fallback flag | Required |

**Locator Examples**:
```json
{
  "type": "role",
  "value": "button",
  "name": "Submit",
  "fallback": false
}
{
  "type": "css",
  "value": "#submit-button",
  "fallback": true
}
{
  "type": "text",
  "value": "Submit",
  "fallback": true
}
```

---

## Entity: Session

**Description**: Represents a recording session with unique ID, active state, and associated browser instance.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Unique session identifier | Required, unique |
| session_type | string | Session type | Required, enum: "recording" |
| status | string | Session status | Required, enum: "active", "paused", "stopped" |
| kernel_id | string (UUID) | Kernel used for this session | Required, must exist |
| start_url | string | Initial URL for recording | Required |
| browser_context_id | string | Playwright BrowserContext ID | Required when active |
| created_at | datetime | Session creation timestamp | Auto-generated |
| updated_at | datetime | Last update timestamp | Auto-generated |

**Relationships**:
- Many-to-One: Session → Kernel (session uses one kernel)
- One-to-Many: Session → Page (recording generates multiple pages)
- One-to-One: Session → BrowserContext (session has one browser context)

**State Transitions**:
- Created → Active (recording started)
- Active → Paused (connection lost, 30s reconnection window per spec)
- Paused → Active (reconnected within 30s)
- Paused → Stopped (30s timeout, resources released)
- Active → Stopped (user stops recording)

**Events Generated**:
- navigation_detected: When user navigates to new page
- action_recorded: When user performs action
- auto_wait_suggested: When post-action network request detected
- screenshot: After hover action (binary via WebSocket)
- log: Informational messages

---

## Entity: Execution

**Description**: Represents a script execution run with results per-action, overall status, duration, and artifact paths.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Unique execution identifier | Required, unique |
| script_id | string (UUID) | Script being executed | Required, must exist |
| kernel_id | string (UUID) | Kernel used for execution | Required, must exist |
| status | string | Execution status | Required, enum: "running", "completed", "failed", "cancelled" |
| duration_ms | integer | Execution duration in milliseconds | Required (0 for running) |
| trace_path | string | Playwright trace file path | Required on completion |
| artifacts | JSON | JSON object with artifact paths | Required on completion |
| created_at | datetime | Execution start timestamp | Auto-generated |
| updated_at | datetime | Last update timestamp | Auto-generated |

**Relationships**:
- Many-to-One: Execution → Script (execution runs one script)
- Many-to-One: Execution → Kernel (execution uses one kernel)
- One-to-Many: Execution → ExecutionStep (execution has multiple steps)

**Artifacts Structure**:
```json
{
  "screenshots": [
    {
      "action_id": "uuid",
      "path": "/path/to/screenshot.jpg"
    }
  ],
  "diffs": [
    {
      "action_id": "uuid",
      "actual": "/path/to/actual.jpg",
      "expected": "/path/to/expected.jpg",
      "diff": "/path/to/diff.jpg",
      "threshold": 5.0
    }
  ]
}
```

**State Transitions**:
- Created → Running (execution started)
- Running → Completed (all actions completed)
- Running → Failed (critical error or timeout)
- Running → Cancelled (user cancelled)
- Failed → Running (retry after locator fallback)

**Events Generated**:
- step_start: Before each action execution
- step_complete: After each action (with success/error)
- screenshot: After action (if configured)
- visual_diff: On visual assertion failure
- log: Informational messages
- execution_complete: Final result with Execution object

---

## Entity: ExecutionStep

**Description**: Represents a single action execution with result and timing.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Unique step identifier | Required, unique |
| execution_id | string (UUID) | Parent execution ID | Required |
| action_id | string (UUID) | Action from script being executed | Required |
| status | string | Step status | Required, enum: "pending", "running", "completed", "failed" |
| result | JSON | Step result details | Optional |
| duration_ms | integer | Step duration in milliseconds | Required on completion |
| error | string | Error message if failed | Optional |

**Result Structure** (on completion):
```json
{
  "locators_attempted": ["role", "text", "css"],
  "locator_used": "text",
  "screenshot": "/path/to/screenshot.jpg"
}
```

**Error Structure** (on failure):
```json
{
  "error_type": "ElementNotFoundError",
  "message": "Element not found after 3 locator attempts",
  "stack_trace": "..."
}
```

---

## Entity: Settings

**Description**: Represents Engine configuration settings stored in database.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| key | string | Setting key | Required, unique, primary key |
| value | string | Setting value (JSON for complex types) | Required |

**Default Settings**:
| key | value | Description |
|-----|--------|-------------|
| agent.server_url | "" | Server URL for Agent mode |
| agent.api_key | "" | API Key for Agent authentication |
| agent.heartbeat_interval | "30" | Heartbeat interval in seconds |
| agent.max_concurrent_tasks | "5" | Max concurrent tasks in Agent mode |
| desktop.reconnect_timeout | "30" | Reconnection timeout in seconds |
| execution.max_timeout | "300000" | Max execution timeout in ms |
| visual.assertion_threshold | "5.0" | Pixel difference threshold |
| screenshot.quality | "85" | JPEG quality (0-100) |

---

## Database Schema

```sql
-- Kernels table
CREATE TABLE kernels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    executable_path TEXT NOT NULL,
    version TEXT NOT NULL,
    is_default_record BOOLEAN DEFAULT 0,
    is_default_agent BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scripts table
CREATE TABLE scripts (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    script_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Executions table
CREATE TABLE executions (
    id TEXT PRIMARY KEY,
    script_id TEXT NOT NULL,
    kernel_id TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_ms INTEGER DEFAULT 0,
    trace_path TEXT,
    artifacts TEXT,  -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
    FOREIGN KEY (kernel_id) REFERENCES kernels(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_executions_created_at ON executions(created_at);
CREATE INDEX idx_executions_script_id ON executions(script_id);
CREATE INDEX idx_scripts_project_id ON scripts(project_id);
```

**Note**: Session and ExecutionStep entities are stored in-memory during active recording/execution, not persisted to database. Only final artifacts and Execution records are persisted.

---

## Data Validation Rules

### Kernel
- executable_path must be valid file path on startup
- version must match Chrome format "X.Y.Z" (e.g., "86.0.4240")
- Only one kernel can have is_default_record = true
- Only one kernel can have is_default_agent = true

### Script
- script_json must be valid JSON with required top-level fields
- At least one scenario must be present
- Each scenario must have at least one page
- Each page must have at least one action (except initial page)
- data_driven rows must have consistent keys

### Action
- action_type must be valid enum value
- params must match action_type schema
- For action_types requiring locators (click, fill, hover), at least one locator must be provided
- At least one locator must have fallback = false (primary)

### Execution
- kernel_id must exist in kernels table
- script_id must exist in scripts table
- duration_ms must be >= 0
- status must follow valid transitions

---

## Concurrency Considerations

### Desktop Mode
- Single session only (per spec FR-030)
- No concurrent recording or execution
- Pause/reconnect mechanism on connection loss

### Agent Mode
- Up to 5 concurrent executions (per spec FR-031)
- Semaphore-based task limiting
- Independent execution isolation
- Shared kernel cache

### Database Access
- SQLite uses WAL mode for better concurrency
- Connection pooling (single connection for simplicity)
- Transactions for multi-table operations
- Foreign key constraints for referential integrity

---

## Cleanup and Retention Policies

### Execution History
- **Desktop mode**: Retain 100 most recent execution records
- **Agent mode**: Retain 1000 most recent execution records
- **Cleanup strategy**: Delete oldest records when limit exceeded

### Artifact Files
- Trace files: Retain with execution record
- Screenshots: Retain with execution record
- Diff images: Retain with execution record
- **Cleanup**: Delete artifact files when corresponding execution record is deleted

### Temporary Files
- Temporary trace files: Delete after script export
- In-memory sessions: Release on stop/timeout
- Browser contexts: Close on session stop

---

## Summary

The data model provides a clear separation of concerns:
- **Configuration**: Kernels, Settings
- **Test Artifacts**: Scripts, Scenarios, Pages, Actions, LocatorStrategy
- **Execution State**: Session (recording), Execution, ExecutionStep
- **Persistence**: SQLite for long-term storage (kernels, scripts, executions, settings)

All entities have clear relationships, validation rules, and state transitions defined. The model supports both Desktop (single-task) and Agent (concurrent) modes efficiently.
