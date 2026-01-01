# Feature Specification: ForgeEngine & ForgeAgent Implementation

**Feature Branch**: `002-engine-agent`  
**Created**: 2026-01-01  
**Status**: Draft  
**Input**: User description: "现在开始002号任务，请按照design-engine_agent.md文档的要求，实现Engine和Agent的功能。由于Engine和Agent存在复用的部分，所以主代码存入Engine目录，仅与Agent相关的内容存入Agent目录。注意现阶段不要动Desktop下已有的代码"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Engine WebSocket Server and Browser Management (Priority: P1)

As a developer integrating with ForgeEngine, I need a WebSocket server that accepts connections from Desktop clients and manages browser instances with customizable kernels, so that I can execute browser automation tasks through real-time communication.

**Why this priority**: This is the foundational infrastructure - without WebSocket communication and browser management, no other features (recording, execution, agent mode) can function. This provides the core connectivity and browser control capabilities.

**Independent Test**: Can be fully tested by starting the Engine, connecting via WebSocket, sending kernel management commands, and verifying browser instances are created/destroyed correctly. Delivers the ability to control browsers programmatically.

**Acceptance Scenarios**:

1. **Given** Engine starts with --port 0, **When** Desktop connects to the WebSocket endpoint, **Then** Engine accepts the connection and sends a welcome message
2. **Given** Engine is running, **When** Desktop sends get_kernels request, **Then** Engine responds with list of available browser kernels
3. **Given** Engine is running, **When** Desktop requests browser startup with kernel_id "chrome86", **Then** Engine launches Chrome 86 browser instance and returns a session_id
4. **Given** Browser session is active, **When** Desktop sends stop_session command, **Then** Engine gracefully closes the browser instance and frees resources
5. **Given** Engine receives health_check ping, **When** processing the message, **Then** Engine responds with pong within 100ms

---

### User Story 2 - Scenario Recording with Auto Page Detection (Priority: P1)

As a QA engineer, I need to record browser interactions as they happen during a complex business flow, with automatic grouping of actions into pages and navigation detection, so that I can generate structured test scripts without manual organization.

**Why this priority**: This is the primary value proposition of TraceForge - enabling users to quickly create test scripts by simply performing actions. Auto page detection makes the scripts organized and maintainable. Can deliver immediate value in the first iteration.

**Independent Test**: Can be fully tested by starting a recording session, performing navigation and actions, and verifying the output is a properly structured Scenario-Page-Action hierarchy. Delivers automated script generation capabilities.

**Acceptance Scenarios**:

1. **Given** Recording session started with URL, **When** user navigates to a new page, **Then** Engine detects navigation and creates a new Page node with entry_url
2. **Given** User is recording on a page, **When** user clicks a button, **Then** Engine captures action with multiple locator strategies (role, text, css) and sends action_recorded event
3. **Given** User performs action that triggers network request, **When** Engine detects the request completes, **Then** Engine sends auto_wait_suggested event with recommended wait condition
4. **Given** Recording is active, **When** user types into an input field, **Then** Engine captures the fill action with input value and multiple locators
5. **Given** User hovers over an element, **When** hover is complete, **Then** Engine sends screenshot (binary via WebSocket) of the current page state
6. **Given** Recording session is stopped, **When** stop_recording command is sent, **Then** Engine returns complete Script JSON with Scenario-Pages-Actions hierarchy and trace.zip file

---

### User Story 3 - Script Execution with Fault Tolerance (Priority: P2)

As a test automation engineer, I need to execute recorded scripts with automatic retry and locator fallback, so that flaky UI changes don't cause test failures and I get reliable test results.

**Why this priority**: Once scripts are created, execution reliability is critical for continuous integration. Fault tolerance reduces false positives and maintenance overhead. Depends on recorded scripts from Story 2 but provides standalone value.

**Independent Test**: Can be fully tested by executing a script with deliberate locator changes and verifying the script completes successfully using fallback strategies. Delivers robust script execution capabilities.

**Acceptance Scenarios**:

1. **Given** Script with role locator is provided, **When** execution attempts the action and role locator fails, **Then** Engine automatically tries text locator, then css locator
2. **Given** Script Page has default_wait="networkidle", **When** Engine starts executing actions on that Page, **Then** Engine waits for network idle state before proceeding
3. **Given** Action fails after all locator attempts, **When** failure occurs, **Then** Engine sends step_complete event with error details and continues to next action (if configured)
4. **Given** Script execution is running, **When** each action completes, **Then** Engine sends step_start event before execution and step_complete event after (with success/error status)
5. **Given** Script completes all actions, **When** execution finishes, **Then** Engine sends execution_complete event with Execution result, trace file path, and artifacts (screenshots, diffs)

---

### User Story 4 - Data-Driven Test Execution (Priority: P2)

As a test automation engineer, I need to execute the same script with multiple data sets (e.g., different users, products, inputs), so that I can validate the application works correctly across various scenarios without creating duplicate scripts.

**Why this priority**: Data-driven testing is a common requirement for comprehensive test coverage. This feature reuses the script execution engine from Story 3 but adds parameterization. Independent value in running bulk tests efficiently.

**Independent Test**: Can be fully tested by providing a script with parameters and a data_rows array, then verifying each row executes independently with substituted values. Delivers parameterized testing capabilities.

**Acceptance Scenarios**:

1. **Given** Script with parameterized placeholders and data_rows array is provided, **When** execution starts, **Then** Engine executes script once per data row with values substituted
2. **Given** Row 1 of data_rows is executing, **When** action with ${user} parameter is encountered, **Then** Engine replaces ${user} with value from current row's "user" field
3. **Given** Execution fails on row 3 of 10, **When** error occurs, **Then** Engine marks row 3 as failed but continues executing rows 4-10
4. **Given** All data rows complete execution, **When** execution finishes, **Then** Engine sends execution_complete event with per-row results showing pass/fail status for each
5. **Given** Data-driven execution is in progress, **When** Engine reports progress, **Then** Events indicate which row and action is currently executing

---

### User Story 5 - Agent Mode for Distributed Execution (Priority: P3)

As a DevOps engineer, I need to run ForgeEngine in agent mode that registers with a central server and accepts tasks for headless execution, so that I can distribute browser automation jobs across multiple machines for parallel testing.

**Why this priority**: Distributed execution enables scalability and resource optimization. This is an advanced feature that depends on the core Engine from Stories 1-3 but provides separate value for large-scale deployment. Lower priority as it's not needed for initial value delivery.

**Independent Test**: Can be fully tested by starting Engine in --agent mode, registering with a mock server, receiving a task, executing headlessly, and returning results. Delivers distributed execution capabilities.

**Acceptance Scenarios**:

1. **Given** Engine starts with --agent --port 8765 flag, **When** Engine initializes, **Then** Engine creates WebSocket endpoint /ws/agent instead of /ws
2. **Given** Engine is in agent mode, **When** Engine completes startup, **Then** Engine POSTs registration to Server URL with kernel list and capabilities
3. **Given** Server pushes a task via WebSocket, **When** Engine receives task, **Then** Engine starts headless execution of the provided script
4. **Given** Agent is executing a task, **When** execution completes, **Then** Agent sends results back to Server via WebSocket
5. **Given** Agent is running, **When** Server sends heartbeat request, **Then** Agent responds with current status, available kernels, and active task count
6. **Given** Agent produces large artifacts, **When** sending results, **Then** Agent sends artifacts in chunks to avoid message size limits

---

### Edge Cases

- What happens when Engine is started with an invalid or non-existent kernel executable path?
- How does Engine handle WebSocket connection loss from Desktop during recording or execution? (Answer: Pauses session for 30 seconds, then terminates if no reconnection)
- What happens when Playwright browser crashes unexpectedly during recording or execution?
- How does Engine handle simultaneous recording requests from multiple Desktop clients? (Answer: Rejects with "busy" error in Desktop mode)
- What happens when script execution timeout is exceeded for a long-running action?
- How does Agent handle disconnection from Server and reconnection sequence?
- What happens when Engine runs out of disk space for trace files or screenshots?
- How does Engine handle corrupted or malformed script JSON from Desktop?
- What happens when visual assertion fails due to minor pixel differences?
- How does Agent handle task queue overflow when receiving more tasks than it can process?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a WebSocket server that accepts connections from Desktop clients on configurable port (0 for random port, fixed port for agent mode)
- **FR-002**: System MUST support managing multiple browser kernels, including loading custom Chrome executable paths (minimum Chrome version 86.0)
- **FR-003**: System MUST support persistent BrowserContext reuse to optimize performance for multiple tasks
- **FR-004**: System MUST support two operating modes: Desktop mode (--port 0, headful browser priority) and Agent mode (--agent, fixed port, headless)
- **FR-005**: System MUST start recording sessions with headful browser and Playwright trace enabled when Desktop sends start_recording command
- **FR-006**: System MUST automatically detect navigation events and create new Page nodes with entry_url during recording
- **FR-007**: System MUST capture user actions (click, fill, hover, navigate) with multiple locator strategies (role, text, css, xpath, id) in priority order
- **FR-008**: System MUST detect post-action network requests and suggest wait conditions via auto_wait_suggested events
- **FR-009**: System MUST send real-time events during recording: action_recorded, navigation_detected, screenshot (binary), log, auto_wait_suggested
- **FR-010**: System MUST return complete Script JSON with Scenario-Page-Action hierarchy when stop_recording command is received
- **FR-011**: System MUST support executing scripts with Scenario-Page-Action structure by traversing hierarchy sequentially
- **FR-012**: System MUST implement locator fallback strategy: try primary locator, if fails try text locator, then css locator
- **FR-013**: System MUST automatically wait for page load state (default: networkidle) before executing actions on each Page
- **FR-014**: System MUST support optional wait_after parameter on Actions with values: "networkidle", "load", or timeout in milliseconds
- **FR-015**: System MUST support data-driven execution by substituting parameter placeholders (e.g., ${variable}) with values from data_rows array
- **FR-016**: System MUST support visual assertions with configurable threshold for pixel differences
- **FR-017**: System MUST generate Playwright trace files and screenshot artifacts during script execution
- **FR-018**: System MUST send execution events: step_start, step_complete, screenshot, visual_diff, log, execution_complete
- **FR-019**: System MUST support SQLite database for storing: kernel configurations, script caches, execution history, settings
- **FR-020**: In Agent mode, System MUST register with Server on startup via HTTP POST, reporting kernel list and capabilities
- **FR-021**: In Agent mode, System MUST accept tasks from Server via WebSocket push, execute headlessly, and return results
- **FR-022**: In Agent mode, System MUST send periodic heartbeat messages to Server with status and available resources
- **FR-023**: System MUST package as standalone executable via PyInstaller --onefile with bundled Playwright and Chrome
- **FR-024**: System MUST support health_check request with pong response within 100ms
- **FR-025**: System MUST gracefully handle WebSocket connection loss and support reconnection from Desktop clients
- **FR-026**: System MUST validate script JSON structure before execution and return descriptive error messages for invalid scripts
- **FR-027**: System MUST limit screenshot transmission size by compressing to JPEG and sending in chunks if needed
- **FR-028**: In Agent mode, System MUST authenticate with Server using API Key or Token on connection
- **FR-029**: In Desktop mode, System MUST accept connections without authentication (localhost-only trust model)
- **FR-030**: In Desktop mode, System MUST reject concurrent recording or execution requests (single-task mode)
- **FR-031**: In Agent mode, System MUST support up to 5 concurrent headless task executions
- **FR-032**: In Desktop mode, System MUST retain only the most recent 100 execution records in SQLite database
- **FR-033**: In Agent mode, System MUST retain only the most recent 1000 execution records in SQLite database
- **FR-034**: When WebSocket connection from Desktop is lost during recording or execution, System MUST pause the active session for up to 30 seconds waiting for reconnection
- **FR-035**: If Desktop does not reconnect within 30 seconds, System MUST terminate the paused session and release all resources
- **FR-036**: In Agent mode, System MUST send heartbeat messages to Server every 30 seconds with current status, available kernels, and active task count

### Key Entities

- **Kernel**: Represents a browser engine configuration with executable path, version, and default flags (for recording, for agent mode)
- **Script**: Represents a test script with hierarchical structure containing Scenarios, Pages, Actions, and optional data-driven rows
- **Scenario**: Represents a logical grouping of test steps with multiple Pages and a description
- **Page**: Represents a single web page with entry URL, default wait condition, and list of Actions
- **Action**: Represents a single user interaction (click, fill, navigate, etc.) with multiple locator strategies, parameters, and optional wait conditions
- **Execution**: Represents a script execution run with results per-action, overall status, duration, and artifact paths
- **Session**: Represents a recording session with unique ID, active state, and associated browser instance
- **LocatorStrategy**: Represents a specific way to find an element (role, text, css, xpath, id) with a value and fallback flag

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Engine WebSocket server accepts Desktop connections and responds to health_check within 100ms in 99% of cases
- **SC-002**: Users can start a recording session, perform 10 actions across 3 pages, and receive a complete Script JSON within 5 seconds of stopping recording
- **SC-003**: Recorded scripts execute with 95% success rate using automatic locator fallback when UI elements change from original recording
- **SC-004**: Data-driven execution with 100 data rows completes within 10 minutes with 90% or higher pass rate
- **SC-005**: Agent mode registers with Server within 2 seconds of startup and successfully executes at least 5 concurrent headless tasks
- **SC-006**: Visual assertions with 5% pixel threshold correctly identify intentional UI changes while ignoring minor rendering differences
- **SC-007**: Engine processes up to 50 WebSocket messages per second without queue buildup or latency increase
- **SC-008**: Single Engine instance in Agent mode can manage up to 5 concurrent headless browser sessions without memory leaks; Desktop mode supports single session only

## Clarifications

### Session 2026-01-01

- Q: Engine的安全认证机制 - Desktop如何认证Engine，Agent如何认证Server？ → A: 仅Agent模式需要认证，Desktop模式无认证
- Q: Engine 对并发请求的处理策略 - 当Engine收到并发请求时应该怎么处理？ → A: 仅Agent模式支持并发，Desktop模式单任务
- Q: SQLite 数据库的执行历史保留策略 - 执行历史数据应该如何保留？ → A: Desktop模式保留100条，Agent模式保留1000条
- Q: WebSocket 连接断开后的恢复策略 - 当Engine与Desktop的WebSocket连接断开后，正在进行的会话应该如何处理？ → A: 暂停会话，等待30秒重连，超时则终止
- Q: Agent 模式下的心跳间隔 - Agent应该多久发送一次心跳到Server？ → A: 30秒间隔

## Dependencies & Assumptions *(mandatory)*

### Dependencies

- **D001**: ForgeEngine is a Python standalone executable that runs independently from Desktop application
- **D002**: Desktop application already exists and is capable of WebSocket client connections
- **D003**: Playwright library is available for browser automation with bundled Chrome
- **D004**: PyInstaller is available for packaging the final executable
- **D005**: SQLite3 is available for local data storage
- **D006**: Server application exists for Agent mode communication (though not required for Desktop mode)

### Assumptions

- **A001**: Desktop application will manage Engine lifecycle (start/stop) and knows the Engine executable location
- **A002**: Chrome 86+ or newer browsers are available on the system or bundled with the executable
- **A003**: WebSocket communication is stable and reliable over localhost for Desktop mode (no authentication required); brief disconnections are handled with 30-second pause/retry mechanism
- **A004**: Server for Agent mode provides a WebSocket endpoint and HTTP registration API, and requires API Key or Token authentication
- **A004**: Server for Agent mode provides a WebSocket endpoint and HTTP registration API
- **A005**: Network latency between Agent and Server is acceptable for remote task distribution
- **A006**: Screenshot transmission via WebSocket binary messages is handled efficiently with chunking/compression
- **A007**: Playwright trace files are compatible with Chrome DevTools for debugging
- **A008**: SQLite database size remains manageable (< 100MB) for local caching (with automatic cleanup of execution history: 100 records in Desktop mode, 1000 in Agent mode)
- **A009**: User-provided custom browser kernels are compatible with Playwright API
- **A010**: Engine runs on an operating system that supports Python execution (Windows, macOS, Linux)

## Out of Scope *(mandatory)*

This feature does NOT include:

- **OS001**: Modification of existing Desktop application code (only Engine/Agent new code)
- **OS002**: Server-side application implementation (only Agent mode client to existing Server)
- **OS003**: Visual regression analysis or diff viewer UI (only generation of diff screenshots)
- **OS004**: Advanced test reporting or dashboard (only basic execution results)
- **OS005**: Parallel execution management (only single sequential execution, though Engine supports concurrent sessions)
- **OS006**: Cloud-based browser farms (only local browser management)
- **OS007**: Test data management systems (only in-memory data_rows parameter)
- **OS008**: Script editing or refactoring tools (only recording and execution)
- **OS009**: Performance profiling or optimization analysis (only basic execution metrics)
- **OS010**: Multi-user permission or access control (only single Desktop client connection)
