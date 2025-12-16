# Implementation Plan: TraceForge Desktop

**Branch**: `001-traceforge-desktop` | **Date**: 2025-12-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-traceforge-desktop/spec.md`

## Summary

Build a cross-platform desktop application (Windows priority) using Tauri 2 + React 18 that enables test engineers to record, edit, and execute web automation scripts offline. The application communicates with a Python ForgeEngine via WebSocket, stores data locally in SQLite, and optionally syncs with a Java Spring Boot server. Key capabilities include full-screen recording with real-time interaction capture, hierarchical script editing, multi-kernel Chrome support (86+), visual regression testing, trace debugging, and server synchronization.

## Technical Context

**Language/Version**: Rust 1.75 (Tauri core) + TypeScript 5.x (React frontend)
**Primary Dependencies**: Tauri 2.x, React 18, TypeScript, Tailwind CSS, Shadcn/ui, Zustand (state), tauri-plugin-sql (SQLite), Playwright 1.48+ (via ForgeEngine)
**Storage**: SQLite (local offline-first) via tauri-plugin-sql
**Testing**: Jest + React Testing Library (unit), Playwright (E2E), custom WebSocket contract tests
**Target Platform**: Windows 10/11 (primary), macOS 12+, Ubuntu 20.04+ (secondary)
**Project Type**: Desktop application with embedded web frontend
**Performance Goals**: App startup <5s, script recording <3min for 10 steps, WebSocket events <200ms latency, handle 100+ step scripts without lag
**Constraints**: Must work fully offline, support Chrome 86.0.4240.198 minimum, <300MB total size, Windows-first distribution
**Scale/Scope**: Single-user desktop app, support 1000+ scripts, 10,000+ executions, local SQLite database with pruning/archiving

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**TraceForge Constitution Compliance** (TraceForge Constitution v1.0.0):

✅ **II. Interface Contract First**: ForgeWS WebSocket protocol specification defined in contracts/forgews-schema.json with versioned message schemas, JSON Schema validation, and examples
✅ **III. Version Management**: Desktop v1.0 (Semantic Versioning), backward compatibility with Engine v1.x and Server v1.x maintained for 2 minor versions
✅ **IV. Technology Stack**: Tauri 2.x ✓, React 18 ✓, TypeScript 5.x ✓, Playwright 1.48+ ✓ - all mandatory versions confirmed and locked
✅ **VI. Testing Strategy**: Multi-layer testing defined - Jest/RTL (unit, 85% target) + cargo test (Rust, 80% target) + Playwright (E2E) + custom WS contract tests with schema validation
✅ **VII. Observability**: tauri-plugin-log with JSON format + trace_id correlation, Sentry integration via tauri-plugin-sentry, structured logging in both Rust backend and TypeScript frontend
✅ **IX. Documentation Standards**: Comprehensive documentation suite created - README.md (user/dev guide), API documentation (ForgeWS schema), architecture diagrams, contributing guide, deployment guide, quickstart.md

*GATE STATUS*: ✅ **FULL COMPLIANCE** - All constitution requirements satisfied. Design phase complete, ready for task generation.

## Project Structure

### Documentation (this feature)

```text
specs/001-traceforge-desktop/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── forgews-schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
Desktop/
├── src-tauri/           # Rust Tauri backend
│   ├── src/
│   │   ├── commands/    # Tauri commands (file dialog, DB, spawn_engine)
│   │   ├── database/    # SQLite schema & migrations
│   │   ├── ws_client/   # WebSocket client for Engine communication
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json  # Tauri configuration, bundler settings
│
├── src/                 # React frontend
│   ├── components/      # Reusable UI components
│   │   ├── ui/          # Shadcn/ui components
│   │   ├── TreeView/    # Hierarchical script tree
│   │   ├── ScreenshotViewer/
│   │   └── KernelSelector/
│   ├── pages/           # Main application pages
│   │   ├── Dashboard.tsx
│   │   ├── Recorder.tsx
│   │   ├── Editor.tsx
│   │   ├── Results.tsx
│   │   ├── Kernels.tsx
│   │   ├── Nodes.tsx
│   │   ├── Tracer.tsx
│   │   └── Settings.tsx
│   ├── stores/          # Zustand state management
│   │   ├── engineStore.ts
│   │   ├── dbStore.ts
│   │   └── syncStore.ts
│   ├── lib/             # Utilities
│   │   ├── ws-client.ts
│   │   ├── db-client.ts
│   │   └── types.ts
│   └── main.tsx
│
├── public/              # Static assets
│   └── logo-traceforge.svg
│
├── tests/               # Test suites
│   ├── unit/            # Jest unit tests
│   ├── e2e/             # Playwright E2E tests
│   └── contract/        # WebSocket contract tests
│
└── README.md
```

**Structure Decision**: Tauri desktop application with Rust backend (commands, database, WebSocket) and React TypeScript frontend (UI, state management). Modular structure separating backend commands, frontend pages, shared utilities, and test suites.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: No constitution violations identified. All design decisions align with TraceForge Constitution v1.0.0 requirements.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
