# Tasks: ForgeEngine & ForgeAgent Implementation

**Input**: Design documents from `/specs/002-engine-agent/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/
**Tests**: The examples below DO NOT include test tasks. Tests are NOT included as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.
## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `backend/engine/`, `backend/tests/` at repository root
- Paths shown below assume single project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create backend/engine/ project structure per implementation plan
- [ ] T002 Initialize Python 3.11+ project with requirements.txt (FastAPI, Playwright, Pydantic, PyInstaller, pytest, pytest-asyncio, pytest-mock)
- [ ] T003 [P] Configure ruff for linting and black for formatting in .ruff.toml and pyproject.toml
- [ ] T004 [P] Create backend/tests/ directory structure (unit, contract, integration)
- [ ] T005 Install Playwright browsers (playwright install chromium)

**Checkpoint**: Project structure ready, dependencies installed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Layer
- [ ] T006 Create SQLite database schema in backend/engine/database/models.py (kernels, scripts, executions, settings tables)
- [ ] T007 [P] Implement kernel repository in backend/engine/database/kernel_repo.py (CRUD operations for Kernel entity)
- [ ] T008 [P] Implement script repository in backend/engine/database/script_repo.py (CRUD operations for Script entity)
- [ ] T009 [P] Implement execution repository in backend/engine/database/execution_repo.py (CRUD operations for Execution entity, cleanup logic for 100/1000 records)
- [ ] T010 [P] Implement settings repository in backend/engine/database/settings_repo.py (key-value operations for Settings entity)
- [ ] T011 Create database connection pool in backend/engine/database/__init__.py (SQLite with WAL mode)

### Configuration & Logging
- [ ] T012 [P] Create configuration management in backend/engine/config.py (parse CLI args, load from config file, environment variables)
- [ ] T013 [P] Create structured logging infrastructure in backend/engine/utils/logging.py (JSON logging, log rotation, correlation IDs)

### Pydantic Models
- [ ] T014 [P] Create WebSocket message models in backend/engine/models/websocket.py (WSMessage, StartRecordingRequest, StopRecordingRequest, ExecuteScriptRequest, etc.)
- [ ] T015 [P] Create script structure models in backend/engine/models/script.py (Script, Scenario, Page, Action, LocatorStrategy)
- [ ] T016 [P] Create kernel and execution models in backend/engine/models/kernel.py and backend/engine/models/execution.py (Kernel, Execution, ExecutionStep)
- [ ] T017 [P] Create settings model in backend/engine/models/__init__.py (Settings key-value pairs)

### FastAPI Application
- [ ] T018 Create FastAPI application entry point in backend/engine/main.py (app instance, CLI argument parsing, startup/shutdown events)
- [ ] T019 [P] Create WebSocket connection manager in backend/engine/websocket/manager.py (track connections, broadcasting, disconnect handling)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Engine WebSocket Server and Browser Management (Priority: P1) 🎯 MVP

**Goal**: WebSocket server that accepts connections, manages browser kernels, launches browser instances, and responds to health_check/get_kernels requests

**Independent Test**: Start Engine in Desktop mode, connect via WebSocket client, send health_check request, verify pong response within 100ms, send get_kernels request, verify kernel list returned

### Implementation for User Story 1

#### WebSocket Endpoints
- [ ] T020 [P] [US1] Implement /ws WebSocket endpoint in backend/engine/websocket/server.py (Desktop mode endpoint, single connection only)
- [ ] T021 [US1] Implement health_check handler in backend/engine/websocket/handlers.py (respond within 100ms, return mode and active_sessions)
- [ ] T022 [US1] Implement get_kernels handler in backend/engine/websocket/handlers.py (query kernel_repo, return list of available kernels)
- [ ] T023 [US1] Implement connection loss handling in backend/engine/websocket/manager.py (30s pause/reconnect mechanism per spec FR-034)

#### Browser Management
- [ ] T024 [P] [US1] Create browser manager in backend/engine/browser/manager.py (launch/close browser instances, BrowserContext persistence per spec FR-003)
- [ ] T025 [P] [US1] Create kernel loader in backend/engine/browser/kernel.py (load custom Chrome paths, validate Chrome 86+ version per spec FR-002)
- [ ] T026 [US1] Create Playwright tracing support in backend/engine/browser/tracing.py (enable/disable tracing, trace.zip generation)
- [ ] T027 [US1] Implement kernel registration in backend/engine/browser/manager.py (register default kernels on startup per kernel_repo)

#### Session Management
- [ ] T028 [US1] Implement single-session lock in backend/engine/websocket/server.py (reject concurrent requests per spec FR-030)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (Desktop mode: WebSocket server, kernel management, browser launch/stop, health_check, single-session mode)

---

## Phase 4: User Story 2 - Scenario Recording with Auto Page Detection (Priority: P1)

**Goal**: Recording sessions with headful browsers, auto page detection, action capture with multiple locators, network event detection, screenshot transmission

**Independent Test**: Start recording session with URL, perform navigation and actions (click, fill, hover) in opened browser, verify navigation_detected, action_recorded, auto_wait_suggested events received, stop recording and verify Script JSON returned with Scenario-Page-Action hierarchy

### Implementation for User Story 2

#### Recording Session
- [ ] T029 [P] [US2] Create recording session manager in backend/engine/recorder/session.py (session state machine: active/paused/stopped per Session entity)
- [ ] T030 [US2] Implement start_recording handler in backend/engine/websocket/handlers.py (launch headful browser, start tracing, return session_id)
- [ ] T031 [US2] Implement stop_recording handler in backend/engine/websocket/handlers.py (generate Script JSON from in-memory pages/actions, save trace.zip, close browser)

#### Playwright Event Listener
- [ ] T032 [P] [US2] Create Playwright event listener in backend/engine/recorder/listener.py (listen for navigation, click, fill, hover events)
- [ ] T033 [US2] Implement navigation event handling in backend/engine/recorder/page_detector.py (detect navigation, create Page node with entry_url per spec FR-006)
- [ ] T034 [US2] Implement action capture in backend/engine/recorder/action_capturer.py (capture click/fill/hover with multiple locators: role, text, css, xpath, id per spec FR-007)

#### Network & Wait Detection
- [ ] T035 [US2] Implement post-action network request detection in backend/engine/recorder/listener.py (detect network requests after actions, send auto_wait_suggested events per spec FR-008)

#### Screenshot Transmission
- [ ] T036 [US2] Implement screenshot capture on hover in backend/engine/recorder/action_capturer.py (after hover action, capture page screenshot)
- [ ] T037 [US2] Implement binary WebSocket message sending in backend/engine/websocket/manager.py (send screenshot as binary JPEG, compress and chunk if >1MB per spec FR-027)

#### Event Broadcasting
- [ ] T038 [US2] Implement real-time event broadcasting in backend/engine/recorder/session.py (send navigation_detected, action_recorded, auto_wait_suggested, log events per spec FR-009)

**Checkpoint**: At this point, User Story 2 should be fully functional - recording sessions capture actions with multi-locators, auto page detection, network wait suggestions, and screenshot transmission

---

## Phase 5: User Story 3 - Script Execution with Fault Tolerance (Priority: P2)

**Goal**: Execute recorded scripts with locator fallback, automatic waiting, visual assertions, step-by-step progress events, and fault tolerance

**Independent Test**: Execute a script with deliberate locator changes (role fails, text succeeds), verify locator fallback works, verify step_start/step_complete events received, verify execution_complete event with Execution result and artifacts

### Implementation for User Story 3

#### Execution Engine
- [ ] T039 [P] [US3] Create execution engine in backend/engine/executor/engine.py (traverse Script→Scenario→Page→Action hierarchy per spec FR-011)
- [ ] T040 [US3] Implement execute_script handler in backend/engine/websocket/handlers.py (launch browser (headful/headless per request), execute script, send step events)
- [ ] T041 [US3] Implement execution state tracking in backend/engine/executor/engine.py (create/update ExecutionStep, track status: pending/running/completed/failed)

#### Locator Fallback
- [ ] T042 [P] [US3] Create locator fallback strategy in backend/engine/executor/fallback.py (try role → text → css → xpath → id per spec FR-012)
- [ ] T043 [US3] Implement retry logic in backend/engine/executor/fallback.py (retry with next locator if previous fails, max 5 attempts)

#### Wait Conditions
- [ ] T044 [US3] Implement page wait handling in backend/engine/executor/engine.py (wait_for_load_state with networkidle/load/domcontentloaded per spec FR-013, FR-014)

#### Visual Assertions
- [ ] T045 [P] [US3] Create visual assertion module in backend/engine/executor/visual.py (screenshot comparison with threshold per spec FR-016)
- [ ] T046 [US3] Implement visual_diff event generation in backend/engine/executor/visual.py (generate expected/actual/diff images on assertion failure)

#### Event Broadcasting
- [ ] T047 [US3] Implement execution event broadcasting in backend/engine/executor/engine.py (send step_start, step_complete, screenshot, visual_diff, log, execution_complete events per spec FR-018)

#### Artifact Generation
- [ ] T048 [US3] Implement artifact management in backend/engine/utils/artifacts.py (generate trace.zip, capture screenshots per action, save to filesystem per spec FR-017)

#### Validation
- [ ] T049 [US3] Implement script JSON validation in backend/engine/websocket/handlers.py (validate structure before execution per spec FR-026, return descriptive error messages)

**Checkpoint**: At this point, User Story 3 should be fully functional - scripts execute with locator fallback, automatic waiting, visual assertions, and progress events

---

## Phase 6: User Story 4 - Data-Driven Test Execution (Priority: P2)

**Goal**: Execute scripts with data_rows parameter substitution, support per-row results, continue on row failure

**Independent Test**: Execute script with data_rows (5 rows with ${user} and ${product} placeholders), verify each row executes independently with parameters substituted, verify row 3 failure doesn't stop rows 4-5, verify execution_complete shows per-row pass/fail status

### Implementation for User Story 4

#### Parameter Substitution
- [ ] T050 [P] [US4] Create data-driven module in backend/engine/executor/data_driven.py (substitute ${variable} placeholders with row values per spec FR-015)
- [ ] T051 [US4] Implement data-driven execution loop in backend/engine/executor/engine.py (iterate through data_rows, execute script per row)

#### Result Tracking
- [ ] T052 [US4] Implement per-row result tracking in backend/engine/executor/engine.py (track pass/fail status per data row, continue on failure per spec acceptance scenario 3)
- [ ] T053 [US4] Add data_row_index to step events in backend/engine/executor/engine.py (include data_row_index in step_start/step_complete events per spec acceptance scenario 5)

**Checkpoint**: At this point, User Story 4 should be fully functional - scripts execute with parameter substitution, per-row results tracked, execution continues on row failures

---

## Phase 7: User Story 5 - Agent Mode for Distributed Execution (Priority: P3)

**Goal**: Agent mode with headless execution, Server registration, API Key authentication, heartbeat, concurrent task execution (max 5), task push from Server

**Independent Test**: Start Engine in --agent mode, verify /ws/agent endpoint created, verify POST registration to Server (mock), verify heartbeat sent every 30s, receive task from Server via WebSocket push, execute headlessly, return results with artifact chunks

### Implementation for User Story 5

#### Agent Mode Setup
- [ ] T054 [P] [US5] Create /ws/agent WebSocket endpoint in backend/engine/websocket/server.py (Agent mode endpoint, separate from /ws per spec acceptance scenario 1)
- [ ] T055 [US5] Add --agent CLI flag handling in backend/engine/main.py (detect agent mode, use fixed port, default headless per spec FR-004)

#### Server Registration
- [ ] T056 [P] [US5] Create Server client in backend/engine/agent/client.py (POST registration on startup with kernel list and capabilities per spec FR-020)
- [ ] T057 [US5] Implement registration logic in backend/engine/main.py startup event (call Server client registration after WebSocket server starts per spec acceptance scenario 2)

#### Authentication
- [ ] T058 [P] [US5] Create API Key authentication module in backend/engine/agent/auth.py (validate API Key from WebSocket handshake or headers per spec FR-028, FR-036)
- [ ] T059 [US5] Implement authentication middleware for Agent mode in backend/engine/websocket/server.py (require API Key for /ws/agent connections per clarification: Desktop mode no auth, Agent mode API Key)

#### Heartbeat
- [ ] T060 [P] [US5] Create heartbeat module in backend/engine/agent/heartbeat.py (send heartbeat every 30s with status, kernels, active_tasks per spec FR-036)
- [ ] T061 [US5] Implement heartbeat scheduling in backend/engine/main.py (start heartbeat task after Server registration per spec acceptance scenario 5)

#### Concurrent Task Execution
- [ ] T062 [P] [US5] Implement task semaphore in backend/engine/executor/engine.py (limit to 5 concurrent tasks per spec FR-031)
- [ ] T063 [US5] Implement task queue for Agent mode in backend/engine/websocket/handlers.py (queue tasks beyond semaphore limit, execute when slot available per spec acceptance scenario 6)

#### Task Reception & Execution
- [ ] T064 [US5] Implement task push handling in backend/engine/websocket/handlers.py (accept execute_script tasks from Server via WebSocket per spec FR-021)
- [ ] T065 [US5] Implement headless execution for Agent tasks in backend/engine/executor/engine.py (force headless mode per spec FR-004)
- [ ] T066 [US5] Implement result transmission to Server in backend/engine/websocket/handlers.py (send execution_complete event back to Server per spec acceptance scenario 4)

#### Artifact Chunking
- [ ] T067 [US5] Implement artifact chunking in backend/engine/websocket/manager.py (send large artifacts in chunks to avoid message size limits per spec FR-027, acceptance scenario 6)

#### Reconnection Handling
- [ ] T068 [US5] Implement Server reconnection logic in backend/engine/agent/client.py (reconnect on disconnection, re-register on reconnect)

**Checkpoint**: At this point, User Story 5 should be fully functional - Agent mode registers with Server, sends heartbeats, accepts push tasks, executes headlessly with concurrency limit, returns results with chunked artifacts

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Integration Tests (Optional - not explicitly requested in spec)
- [ ] T069 [P] Create recording workflow integration test in backend/tests/integration/test_recording_workflow.py (start recording, perform actions, stop, verify script structure)
- [ ] T070 [P] Create execution workflow integration test in backend/tests/integration/test_execution_workflow.py (execute script, verify events, check results)

### Documentation
- [ ] T071 [P] Create PyInstaller spec file in backend/engine/engine.spec (--onefile, bundled Playwright and Chrome, metadata per spec FR-023)
- [ ] T072 [P] Add README.md in backend/engine/ (installation, usage, configuration examples)
- [ ] T073 [P] Create architecture documentation in docs/002-engine-agent/architecture.md (component diagram, data flow, mode comparison)

### Error Handling & Resource Cleanup
- [ ] T074 [P] Add browser crash handling in backend/engine/browser/manager.py (detect crashes, restart browser, log event per spec edge case)
- [ ] T075 [P] Add graceful shutdown handlers in backend/engine/main.py (close all browser contexts, close WebSocket connections, flush logs, close database)
- [ ] T076 [P] Add timeout handling for long-running actions in backend/engine/executor/engine.py (timeout after 300s per spec performance goals)

### Performance Optimization
- [ ] T077 [P] Optimize screenshot compression in backend/engine/recorder/action_capturer.py (tune JPEG quality for size vs clarity, default 85 per settings)
- [ ] T078 [P] Optimize WebSocket message throughput in backend/engine/websocket/manager.py (batch events where possible, optimize JSON serialization)
- [ ] T079 [P] Add kernel configuration caching in backend/engine/database/kernel_repo.py (cache kernel configs to avoid repeated DB queries)

### Security Hardening
- [ ] T080 [P] Add input validation for all WebSocket messages in backend/engine/websocket/handlers.py (validate message structure, sanitize inputs per spec security considerations)
- [ ] T081 [P] Add rate limiting in backend/engine/websocket/server.py (limit to 50 messages/second per spec SC-007)
- [ ] T082 [P] Add API Key logging protection in backend/engine/agent/auth.py (never log API Keys, use secure storage per spec research security considerations)

### Packaging & Distribution
- [ ] T083 [P] Build standalone executable with PyInstaller in backend/engine/ (python -m PyInstaller --onefile --add-data "playwright/driver:/playwright/driver" main.py)
- [ ] T084 [P] Test executable on target platforms (Windows, macOS, Linux) in backend/engine/ (verify Playwright and Chrome bundled, verify startup)
- [ ] T085 [P] Validate quickstart.md examples in backend/engine/ (run all quickstart commands, verify they work as documented)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - T006-T011 must complete before any user story work
  - Database, configuration, logging, Pydantic models, FastAPI app, connection manager all required
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3) can start after Phase 2 completes
  - US2 (Phase 4) can start after Phase 2 completes (depends on US1 infrastructure but independently testable)
  - US3 (Phase 5) can start after Phase 2 completes (depends on US2 scripts but independently testable with mock scripts)
  - US4 (Phase 6) can start after Phase 3 completes (depends on US3 execution engine)
  - US5 (Phase 7) can start after Phase 3 completes (depends on US3 execution engine for headless tasks)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Phase 3)**: Can start after Foundational (Phase 2) - No dependencies on other stories. Foundation for all other stories.
- **User Story 2 (P1 - Phase 4)**: Can start after Foundational (Phase 2) - Depends on US1 WebSocket infrastructure and browser management. Independently testable once US1 session management works.
- **User Story 3 (P2 - Phase 5)**: Can start after Foundational (Phase 2) - Depends on US2 for recorded scripts, but can execute manually created scripts. Independently testable with mock script JSON.
- **User Story 4 (P2 - Phase 6)**: Can start after Phase 3 (US3 execution engine) completes - Directly extends execution engine with data-driven logic.
- **User Story 5 (P3 - Phase 7)**: Can start after Phase 3 (US3 execution engine) completes - Reuses execution engine for headless tasks, adds Server communication.

### Within Each User Story

- Models before services (all [P] tasks can run in parallel within story)
- Services before endpoints (sequential dependency)
- Core implementation before integration (sequential dependency)
- Story complete before moving to next priority

### Parallel Opportunities

#### Setup (Phase 1)
- T003 (linting) can run in parallel with T002 (dependencies)
- T004 (test structure) can run in parallel with T002, T003

#### Foundational (Phase 2)
- Database layer (T006-T011): T007, T008, T009, T010 [P] can run in parallel after T006, T011
- Configuration & logging (T012-T013) [P] can run in parallel with database layer
- Pydantic models (T014-T017) [P] can all run in parallel after T011, T013
- FastAPI application (T018-T019) depends on T012, T014-T017

#### User Story 1 (Phase 3)
- WebSocket endpoints (T020-T023): T021, T022 [P] can run in parallel after T019
- Browser management (T024-T027): T025, T026 [P] can run in parallel after T024
- Session management (T028) depends on T019, T024

#### User Story 2 (Phase 4)
- Recording session (T029-T031): T029, T030 [P] can run in parallel after T019, T024
- Event listener (T032-T034) [P] can all run in parallel after T029
- Network & wait detection (T035) depends on T032
- Screenshot transmission (T036-T037) [P] can run in parallel after T029
- Event broadcasting (T038) depends on T029, T030, T032

#### User Story 3 (Phase 5)
- Execution engine (T039-T041): T040 depends on T039, T024
- Locator fallback (T042-T043) [P] can run in parallel after T039
- Wait conditions (T044) [P] can run in parallel after T039
- Visual assertions (T045-T046) [P] can run in parallel after T039
- Event broadcasting (T047) depends on T039
- Artifact generation (T048) [P] can run in parallel after T039
- Validation (T049) [P] can run in parallel after T014

#### User Story 4 (Phase 6)
- Parameter substitution (T050-T051) [P] can run in parallel after T039
- Result tracking (T052-T053) [P] can run in parallel after T039

#### User Story 5 (Phase 7)
- Agent mode setup (T054-T055) [P] can run in parallel after T012, T024
- Server registration (T056-T057) [P] can run in parallel after T055
- Authentication (T058-T059) [P] can run in parallel after T014
- Heartbeat (T060-T061) [P] can run in parallel after T057
- Concurrent execution (T062-T063) [P] can run in parallel after T039
- Task reception (T064-T066) [P] can run in parallel after T039
- Artifact chunking (T067) [P] can run in parallel after T019
- Reconnection (T068) [P] can run in parallel after T056

#### Polish (Phase 8)
- Integration tests (T069-T070) [P] can run in parallel after all user stories complete
- Documentation (T071-T073) [P] can run in parallel after all implementation complete
- Error handling (T074-T076) [P] can run in parallel
- Performance (T077-T079) [P] can run in parallel
- Security (T080-T082) [P] can run in parallel
- Packaging (T083-T085) [P] can run in parallel (except T085 which depends on T084)

---

## Parallel Example: User Story 1 (Phase 3)

```bash
# Launch all WebSocket endpoint tasks together:
Task: "Implement /ws WebSocket endpoint in backend/engine/websocket/server.py"
Task: "Implement health_check handler in backend/engine/websocket/handlers.py"
Task: "Implement get_kernels handler in backend/engine/websocket/handlers.py"

# Launch all browser management tasks together:
Task: "Create browser manager in backend/engine/browser/manager.py"
Task: "Create kernel loader in backend/engine/browser/kernel.py"
Task: "Create Playwright tracing support in backend/engine/browser/tracing.py"
```

---

## Parallel Example: User Story 2 (Phase 4)

```bash
# Launch all recording session tasks together:
Task: "Create recording session manager in backend/engine/recorder/session.py"
Task: "Implement start_recording handler in backend/engine/websocket/handlers.py"

# Launch all event listener tasks together:
Task: "Create Playwright event listener in backend/engine/recorder/listener.py"
Task: "Implement navigation event handling in backend/engine/recorder/page_detector.py"
Task: "Implement action capture in backend/engine/recorder/action_capturer.py"
```

---

## Parallel Example: User Story 3 (Phase 5)

```bash
# Launch all execution engine components together:
Task: "Create locator fallback strategy in backend/engine/executor/fallback.py"
Task: "Implement wait conditions in backend/engine/executor/engine.py"
Task: "Create visual assertion module in backend/engine/executor/visual.py"
Task: "Implement artifact management in backend/engine/utils/artifacts.py"
Task: "Implement script JSON validation in backend/engine/websocket/handlers.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T019) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T020-T028)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Start Engine, connect via WebSocket, send health_check, get_kernels
   - Verify browser instances launch/close correctly
   - Verify single-session mode works
5. Deploy/demo if ready

**MVP delivers**: Desktop mode with WebSocket server, kernel management, browser launch/stop, health_check

### Incremental Delivery

1. Complete Setup (Phase 1) + Foundational (Phase 2) → Foundation ready
2. Add User Story 1 (Phase 3) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Phase 4) → Test independently → Deploy/Demo
   - Delivers: Recording sessions with auto page detection, multi-locators, screenshots
4. Add User Story 3 (Phase 5) → Test independently → Deploy/Demo
   - Delivers: Script execution with locator fallback, visual assertions, progress events
5. Add User Story 4 (Phase 6) → Test independently → Deploy/Demo
   - Delivers: Data-driven testing with parameter substitution
6. Add User Story 5 (Phase 7) → Test independently → Deploy/Demo
   - Delivers: Agent mode with Server communication, headless execution, concurrency
7. Add Polish (Phase 8) → Final production-ready executable
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup (Phase 1) + Foundational (Phase 2) together
2. Once Foundational is done:
   - Developer A: User Story 1 (Phase 3) - WebSocket and browser management
   - Developer B: User Story 2 (Phase 4) - Recording functionality (can start after US1 infrastructure ready)
3. After US1 complete:
   - Developer A: User Story 3 (Phase 5) - Execution engine
   - Developer B continues US2 or moves to User Story 4 (Phase 6)
4. After US3 complete:
   - Developer A: User Story 5 (Phase 7) - Agent mode
   - Developer B continues US4 or moves to Polish (Phase 8)
5. Final integration: Merge all stories, resolve conflicts, deploy

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4, US5)
- Each user story should be independently completable and testable
- No test tasks included - tests were not explicitly requested in feature specification
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All file paths are absolute and specific to backend/engine/ structure
- Tasks are ordered by dependency within each phase
- [P] markers indicate safe parallelization opportunities
