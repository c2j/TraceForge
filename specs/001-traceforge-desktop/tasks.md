# Tasks: TraceForge Desktop

**Input**: Design documents from `/specs/001-traceforge-desktop/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/
**Feature**: 001-traceforge-desktop

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Desktop app**: `Desktop/src-tauri/` (Rust backend), `Desktop/src/` (React frontend)
- Backend commands: `Desktop/src-tauri/src/commands/`
- Frontend pages: `Desktop/src/pages/`
- Frontend components: `Desktop/src/components/`
- Frontend stores: `Desktop/src/stores/`
- Tests: `Desktop/tests/` (unit/, e2e/, contract/)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize Tauri 2.x project with Rust 1.75 backend and React 18 frontend
- [ ] T002 Configure TypeScript 5.x, Tailwind CSS, and Shadcn/ui component library
- [ ] T003 [P] Setup package.json with all dependencies (Zustand, tauri-plugin-sql, etc.)
- [ ] T004 [P] Configure Cargo.toml with Tauri dependencies and build configuration
- [ ] T005 [P] Setup tauri.conf.json with application metadata and bundler settings
- [ ] T006 [P] Configure TypeScript strict mode, ESLint, and Prettier formatting
- [ ] T007 Create project directory structure per implementation plan
- [ ] T008 [P] Setup development environment (.env.example, .gitignore, README.md)

**Checkpoint**: Project structure complete and ready for development

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Create SQLite database schema (Projects, Scripts, Scenarios, Pages, Actions, Kernels, Executions)
- [ ] T010 [P] Implement tauri-plugin-sql database initialization and migration system
- [ ] T011 [P] Implement database CRUD operations for all core entities (Project, Script, Kernel)
- [ ] T012 [P] Create TypeScript type definitions for all entities in Desktop/src/lib/types.ts
- [ ] T013 Setup Zustand state stores (engineStore.ts, dbStore.ts, syncStore.ts)
- [ ] T014 Implement WebSocket client library in Desktop/src/lib/ws-client.ts
- [ ] T015 [P] Create Tauri commands for database operations in Desktop/src-tauri/src/commands/db.rs
- [ ] T016 [P] Create Tauri commands for engine management in Desktop/src-tauri/src/commands/engine.rs
- [ ] T017 [P] Implement engine spawning logic with random port allocation
- [ ] T018 Setup tauri-plugin-log with JSON format and trace_id correlation
- [ ] T019 [P] Configure error handling and logging across backend and frontend
- [ ] T020 Create main application layout component (TFLayout) with navigation

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Offline Recording and Editing Workflow (Priority: P1) 🎯 MVP

**Goal**: Enable test engineers to record, edit, and execute automation scripts completely offline

**Independent Test**: A tester can open the desktop app, record a simple login flow against any website, edit the recorded steps, save locally, and execute the script to generate results - all without any server connection

### Implementation for User Story 1

- [ ] T021 [P] [US1] Create Dashboard page component in Desktop/src/pages/Dashboard.tsx
- [ ] T022 [P] [US1] Implement Dashboard KPI metrics (pass rate, failures, coverage, scripts)
- [ ] T023 [P] [US1] Create Recorder page component in Desktop/src/pages/Recorder.tsx
- [ ] T024 [US1] Implement hierarchical tree view component for Scenarios/Pages/Actions
- [ ] T025 [US1] Implement real-time screenshot viewer in Desktop/src/components/ScreenshotViewer.tsx
- [ ] T026 [US1] Create WebSocket message handlers for recording events (step_captured, screenshot)
- [ ] T027 [US1] Implement "Quick Record" functionality from Dashboard
- [ ] T028 [US1] Create Editor page component in Desktop/src/pages/Editor.tsx
- [ ] T029 [US1] Implement three-panel editor layout (tree view, details, preview)
- [ ] T030 [US1] Create Script CRUD operations and state management
- [ ] T031 [US1] Implement script execution via WebSocket (execute_script action)
- [ ] T032 [US1] Create Results page component in Desktop/src/pages/Results.tsx
- [ ] T033 [US1] Implement execution history display with filtering and search
- [ ] T034 [US1] Add support for multiple locator strategies per action (role, text, CSS, XPath)
- [ ] T035 [US1] Implement drag-and-drop reordering for tree view nodes

**Checkpoint**: User Story 1 complete - full offline recording, editing, and execution workflow functional

---

## Phase 4: User Story 2 - Script Debugging with Visual Feedback (Priority: P2)

**Goal**: Provide comprehensive debugging capabilities with visual inspection and trace analysis

**Independent Test**: A user can execute a failing script, view execution results with screenshots at each step, open the trace viewer to examine DOM state at failure points, identify the problematic element, and successfully modify the locator strategy

### Implementation for User Story 2

- [ ] T036 [P] [US2] Create Tracer page component in Desktop/src/pages/Tracer.tsx
- [ ] T037 [US2] Integrate Playwright trace viewer as embedded iframe component
- [ ] T038 [US2] Implement visual regression comparison (side-by-side screenshots)
- [ ] T039 [US2] Create execution step detail view with screenshot highlighting
- [ ] T040 [US2] Implement "Test Locator" functionality in Editor
- [ ] T041 [US2] Add fallback locator management UI (add, reorder, remove locators)
- [ ] T042 [US2] Create element highlighting on live page for locator testing
- [ ] T043 [US2] Implement step-by-step execution with real-time status updates
- [ ] T044 [US2] Add timeline scrubbing in trace viewer with DOM snapshots
- [ ] T045 [US2] Create execution report export (JSON, HTML)
- [ ] T046 [US2] Implement error message display and root cause analysis
- [ ] T047 [US2] Add visual diff calculation and percentage metrics

**Checkpoint**: User Story 2 complete - full debugging and visual feedback capabilities functional

---

## Phase 5: User Story 3 - Multi-Kernel Compatibility Testing (Priority: P2)

**Goal**: Support running scripts across multiple Chrome kernel versions with consolidated reporting

**Independent Test**: A user can select multiple Chrome kernels (e.g., Chrome 86 and Latest) and execute a script against each one, then view a consolidated report showing pass/fail status per kernel with visual comparisons

### Implementation for User Story 3

- [ ] T048 [P] [US3] Create Kernels page component in Desktop/src/pages/Kernels.tsx
- [ ] T049 [US3] Implement Chrome executable detection and version parsing
- [ ] T050 [US3] Create kernel compatibility testing (minimum version 86.0.4240.198)
- [ ] T051 [US3] Implement kernel management (add, remove, set default)
- [ ] T052 [US3] Create KernelSelector component for choosing kernels
- [ ] T053 [US3] Implement multi-kernel execution orchestration
- [ ] T054 [US3] Create consolidated results view with kernel comparison matrix
- [ ] T055 [US3] Implement kernel-specific screenshot comparison
- [ ] T056 [US3] Add kernel selection UI in Editor and Dashboard
- [ ] T057 [US3] Create kernel performance metrics tracking
- [ ] T058 [US3] Implement kernel health monitoring and status display

**Checkpoint**: User Story 3 complete - multi-kernel testing and comparison functional

---

## Phase 6: User Story 4 - Team Collaboration with Server Sync (Priority: P3)

**Goal**: Enable synchronization of local scripts with team server for collaboration

**Independent Test**: A user with offline-created scripts connects to the server, sees a sync dialog showing local-only and server-only scripts, resolves any conflicts, and successfully pushes local scripts to the server while pulling server updates

### Implementation for User Story 4

- [ ] T059 [P] [US4] Create syncStore Zustand store for synchronization state
- [ ] T060 [US4] Implement server connection detection and status display
- [ ] T061 [US4] Create synchronization dialog component
- [ ] T062 [US4] Implement conflict detection (same script modified locally and on server)
- [ ] T063 [US4] Create merge resolution UI (keep local, use server, manual merge)
- [ ] T064 [US4] Implement script push to server with version conflict handling
- [ ] T065 [US4] Implement script pull from server with local cache update
- [ ] T066 [US4] Create project import/export functionality
- [ ] T067 [US4] Add execution results upload to server
- [ ] T068 [US4] Implement offline queue for sync operations
- [ ] T069 [US4] Create Settings page component in Desktop/src/pages/Settings.tsx
- [ ] T070 [US4] Add server URL configuration and sync preferences

**Checkpoint**: User Story 4 complete - server synchronization and collaboration functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T071 [P] Add comprehensive unit tests (Jest + React Testing Library) for all components
- [ ] T072 [P] Add Rust backend unit tests (cargo test) for all commands
- [ ] T073 [P] Create Playwright E2E tests for critical user workflows
- [ ] T074 [P] Implement WebSocket contract tests against ForgeWS schema
- [ ] T075 [P] Optimize performance (lazy loading, virtualization for large scripts)
- [ ] T076 Add database pruning and archiving for old executions
- [ ] T077 Implement proper error boundaries and user-friendly error messages
- [ ] T078 [P] Add keyboard shortcuts and accessibility features
- [ ] T079 Create comprehensive README.md with development and user guides
- [ ] T080 [P] Update architecture diagram showing Desktop ↔ Engine ↔ Server flow
- [ ] T081 [P] Build production installers (Windows MSI, macOS DMG, Linux DEB)
- [ ] T082 Setup CI/CD pipeline with GitHub Actions or GitLab CI
- [ ] T083 [P] Configure code signing for desktop installers
- [ ] T084 Add Sentry integration for crash reporting and error tracking
- [ ] T085 Create deployment documentation and release process

**Checkpoint**: All user stories complete with production-ready polish

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if team capacity allows)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Builds on US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational - Independent of other stories
- **User Story 4 (P3)**: Can start after Foundational - Depends on US1 for basic sync (scripts exist)

### Within Each User Story

- Database models before UI components
- UI components before integration
- Integration before testing
- Story complete before moving to next priority

### Parallel Opportunities

All Setup tasks marked [P] can run in parallel
All Foundational tasks marked [P] can run in parallel (within Phase 2)
Once Foundational is done, all user stories can start in parallel (if team capacity allows)
All [P] tasks within a story can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (MVP)
   - Developer B: User Story 2 (Debugging)
   - Developer C: User Story 3 (Multi-kernel)
   - Developer D: User Story 4 (Sync) + Polish
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
