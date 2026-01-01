# Implementation Plan: ForgeEngine & ForgeAgent Implementation

**Branch**: `002-engine-agent` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-engine-agent/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

ForgeEngine is a standalone Python executable that provides browser automation capabilities via WebSocket communication. It supports two operating modes: Desktop mode (single-task, headful browsers, no authentication) and Agent mode (concurrent execution, headless browsers, Server authentication with API Key). The Engine provides core functionality: scenario recording with auto page detection, script execution with fault tolerance (locator fallback, retry logic), data-driven testing, and local SQLite caching. The Agent mode extends this with distributed execution capabilities, registering with a central Server and accepting push tasks.

Technical approach: FastAPI + WebSockets for real-time communication, Playwright for browser automation (supporting Chrome 86+ custom kernels), SQLite3 for local data storage (kernels, scripts, executions, settings), PyInstaller for standalone executable packaging. The design separates shared Engine functionality from Agent-specific components to maximize code reuse.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: FastAPI (WebSockets), Playwright (browser automation), Pydantic (data validation), PyInstaller (packaging)
**Storage**: SQLite3 (local database for kernels, scripts, executions, settings) + filesystem (Playwright traces, screenshots)
**Testing**: pytest (unit), pytest-asyncio (async tests), pytest-mock (mocking)
**Target Platform**: Cross-platform (Windows, macOS, Linux) - standalone Python executable
**Project Type**: single (standalone executable with embedded browser automation)
**Performance Goals**: 100ms health_check response (99%), 50 WebSocket messages/second, 5 concurrent browser sessions (Agent mode), 95% script execution success rate
**Constraints**: <200ms p95 health_check, <100MB SQLite database, <30s pause on disconnection, 30s heartbeat interval (Agent mode)
**Scale/Scope**: 100 execution records (Desktop mode) / 1000 records (Agent mode), 5 concurrent sessions (Agent), 10k+ trace files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Note: No constitution file found in `.specify/memory/constitution.md`. Using industry best practices as default gates.

### Quality Gates

- [x] **Gate 1 - Test Coverage**: All core Engine functionality must have >80% unit test coverage
  - *Status*: **PASSED** - Test framework (pytest + pytest-asyncio) defined, unit/integration tests planned in project structure
- [x] **Gate 2 - API Documentation**: All WebSocket message types must be documented in ForgeWS schema
  - *Status*: **PASSED** - Complete ForgeWS schema created at `contracts/forgews-schema.json` with all message types defined
- [x] **Gate 3 - Error Handling**: All async operations must have proper timeout and error recovery
  - *Status*: **PASSED** - Timeout handling defined (30s reconnect, 300s execution timeout), error recovery strategies in design
- [x] **Gate 4 - Resource Cleanup**: All browser instances and WebSocket connections must have cleanup handlers
  - *Status*: **PASSED** - Browser lifecycle management defined, cleanup handlers in Session/Execution entities
- [x] **Gate 5 - Backward Compatibility**: WebSocket protocol changes must be versioned
  - *Status*: **PASSED** - Protocol versioning included in ForgeWS schema (version: "1.0.0")

**Status**: ✅ All gates pass - No violations

## Project Structure

### Documentation (this feature)

```text
specs/002-engine-agent/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── forgews-schema.json  # WebSocket message schema
└── checklists/
    └── requirements.md   # Specification quality checklist
```

### Source Code (repository root)

```text
backend/
├── engine/              # Shared Engine functionality (Core)
│   ├── __init__.py
│   ├── main.py           # FastAPI application entry point
│   ├── config.py         # Configuration and settings
│   ├── models/           # Pydantic models
│   │   ├── __init__.py
│   │   ├── websocket.py  # WS message types
│   │   ├── script.py     # Script structure (Scenario/Page/Action)
│   │   ├── kernel.py     # Kernel configuration
│   │   └── execution.py # Execution results
│   ├── websocket/        # WebSocket server
│   │   ├── __init__.py
│   │   ├── server.py     # FastAPI WebSocket endpoints
│   │   ├── manager.py    # Connection manager
│   │   └── handlers.py   # Request/action handlers
│   ├── browser/          # Playwright browser management
│   │   ├── __init__.py
│   │   ├── manager.py    # BrowserContext manager
│   │   ├── kernel.py     # Kernel loading
│   │   └── tracing.py    # Playwright tracing
│   ├── recorder/         # Scenario recording
│   │   ├── __init__.py
│   │   ├── session.py    # Recording session
│   │   ├── listener.py   # Playwright event listener
│   │   ├── page_detector.py  # Auto page detection
│   │   └── action_capturer.py # Action capture with locators
│   ├── executor/        # Script execution
│   │   ├── __init__.py
│   │   ├── engine.py     # Execution engine
│   │   ├── fallback.py   # Locator fallback strategy
│   │   ├── visual.py     # Visual assertions
│   │   └── data_driven.py # Parameter substitution
│   ├── database/         # SQLite database
│   │   ├── __init__.py
│   │   ├── models.py     # SQLAlchemy/SQL models
│   │   ├── kernel_repo.py    # Kernel repository
│   │   ├── script_repo.py    # Script repository
│   │   ├── execution_repo.py # Execution repository
│   │   └── settings_repo.py # Settings repository
│   ├── agent/            # Agent-specific functionality
│   │   ├── __init__.py
│   │   ├── client.py     # Server registration and task pull
│   │   ├── heartbeat.py  # Heartbeat to Server
│   │   └── auth.py       # API Key/Token authentication
│   └── utils/
│       ├── __init__.py
│       ├── logging.py    # Structured logging
│       └── artifacts.py  # Artifact management (screenshots, traces)

└── tests/
    ├── unit/
    │   ├── websocket/
    │   │   ├── test_server.py
    │   │   └── test_manager.py
    │   ├── browser/
    │   │   ├── test_manager.py
    │   │   └── test_kernel.py
    │   ├── recorder/
    │   │   ├── test_session.py
    │   │   └── test_page_detector.py
    │   ├── executor/
    │   │   ├── test_engine.py
    │   │   └── test_fallback.py
    │   └── database/
    │       └── test_repositories.py
    ├── contract/
    │   └── test_websocket_contract.py
    └── integration/
        ├── test_recording_workflow.py
        └── test_execution_workflow.py

docs/
└── 002-engine-agent/
    ├── data-model.md      # Copied from spec contracts
    ├── quickstart.md      # Copied from spec contracts
    └── architecture.md     # Design architecture overview
```

**Structure Decision**: Single standalone Python executable with shared Engine core and Agent-specific extensions. The separation allows code reuse while isolating Agent mode dependencies (Server communication, authentication). All Engine functionality lives in `backend/engine/`, with `backend/engine/agent/` containing only Agent mode specific code.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations found - complexity tracking not required.

## Research Findings

### Phase 0: Research & Technology Decisions

**Research Completed**: All technical decisions were determined from feature specification and design document. No external research required.

**Key Decisions**:
- **FastAPI + WebSockets**: Chosen for async real-time communication, excellent performance with 50+ msg/s throughput
- **Playwright**: Industry standard for browser automation, supports Chrome 86+ custom kernels, excellent tracing capabilities
- **SQLite3**: Lightweight embedded database, sufficient for local caching (100-1000 execution records)
- **PyInstaller --onefile**: Standard for Python standalone executables, includes bundled Playwright and Chrome
- **Pydantic v2**: Type-safe data validation, integrates with FastAPI for request/response models
- **pytest + pytest-asyncio**: Standard async testing framework, excellent for WebSocket testing

**Alternatives Considered**:
- **Selenium instead of Playwright**: Rejected - Selenium lacks Playwright's auto-waiting and tracing capabilities
- **PostgreSQL instead of SQLite**: Rejected - Overkill for local caching, adds deployment complexity
- **Custom WebSocket server instead of FastAPI**: Rejected - FastAPI provides robust async handling, middleware, and OpenAPI docs
- **Multiprocessing instead of asyncio**: Rejected - asyncio provides better performance for I/O-bound WebSocket operations
