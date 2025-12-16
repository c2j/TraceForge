# Research Phase: TraceForge Desktop Implementation

**Date**: 2025-12-16
**Feature**: 001-traceforge-desktop

## Research Objectives

Resolve gaps identified in Constitution Check for testing strategy, logging implementation, and documentation standards.

## Research Tasks

### 1. Testing Strategy for Tauri + React Desktop Application

**Research Question**: How to achieve >80% code coverage with comprehensive testing across Rust backend, React frontend, WebSocket communication, and E2E workflows?

**Decision**: Multi-layered testing approach:
- **Unit Tests (Jest + React Testing Library)**: Test React components, Zustand stores, utility functions, TypeScript logic - target 85% coverage
- **Rust Backend Tests (cargo test)**: Test Tauri commands, database operations, WebSocket client logic - target 80% coverage
- **Contract Tests (Custom)**: Validate WebSocket message schemas against ForgeWS specification using JSON schema validation
- **E2E Tests (Playwright)**: Full user workflows - recording, editing, execution, debugging - focused smoke tests, not exhaustive

**Rationale**: Desktop apps require testing at multiple levels. Unit tests catch logic errors early, contract tests prevent integration failures, E2E tests validate real user workflows. The 80%+ coverage target ensures quality while acknowledging that some Tauri internals and browser interactions are difficult to unit test.

**Implementation Plan**:
```typescript
// Example contract test structure
describe('ForgeWS Contract Tests', () => {
  test('start_recording message matches schema', () => {
    const message = { type: 'request', action: 'start_recording', ... };
    expect(validateForgeWS(message)).toBe(true);
  });
});
```

### 2. Observability & Logging Implementation for Desktop Application

**Research Question**: How to implement unified JSON logging with trace_id correlation and Sentry integration in a Tauri desktop application?

**Decision**: Structured logging with three layers:
- **Tauri Backend (Rust)**: Use `tauri-plugin-log` with JSON formatting, each log entry includes timestamp, level, message, module, and trace_id
- **Frontend (TypeScript)**: Log to backend via Tauri invoke calls, maintain trace_id in Zustand stores, propagate via WebSocket messages
- **Error Tracking**: Integrate Sentry via `tauri-plugin-sentry` for crash reporting and error aggregation

**Rationale**: Centralized logging enables end-to-end debugging across frontend and backend. JSON format allows structured queries and analysis. trace_id correlation links user actions across WebSocket boundaries. Sentry provides production error visibility.

**Implementation Plan**:
```rust
// Rust backend logging example
#[tauri::command]
async fn spawn_engine(port: String, trace_id: String) -> Result<String, String> {
    log::info!(target: "forge-engine", "Spawning engine";
        "port" => port, "trace_id" => trace_id);
    // ... implementation
}
```

### 3. Documentation Standards for Desktop Module

**Research Question**: What documentation structure ensures compliance with TraceForge Constitution while being useful for developers and users?

**Decision**: Comprehensive documentation suite:
- **README.md**: Installation, quick start, architecture overview, development setup
- **API Documentation**: ForgeEngine WebSocket interface specification (auto-generated from contracts/)
- **Architecture Diagram**: Updated draw.io diagram showing Desktop ↔ Engine ↔ Server flow
- **Contributing Guide**: Development workflow, testing requirements, coding standards
- **Deployment Guide**: Building installers, code signing, distribution

**Rationale**: Desktop module sits at intersection of multiple teams (Rust, React, Python). Clear documentation reduces onboarding time and prevents integration mistakes. Architecture diagram is critical for understanding the multi-component system.

**Documentation Structure**:
```
Desktop/README.md              # Main entry point
Desktop/docs/
├── architecture/              # System design
├── api/                       # WebSocket API reference
├── development/               # Dev setup, testing, contributing
└── deployment/                # Build & distribution guide
```

## Additional Research: WebSocket Communication Pattern

**Research Question**: Best practices for maintaining stable WebSocket connection between Tauri desktop and Python ForgeEngine with automatic reconnection?

**Decision**: Connection management strategy:
- Single WebSocket connection managed by Rust backend
- Exponential backoff reconnection (1s, 2s, 4s, 8s, max 30s)
- Heartbeat ping/pong every 30s
- Offline queue for commands when disconnected
- Frontend receives updates via Tauri event listeners

**Rationale**: Recording and execution are real-time workflows. Connection stability is critical. Automatic reconnection hides network issues from users. Offline queue ensures no commands are lost.

## Resolution Summary

✅ **Testing Strategy**: Defined multi-layer approach with specific coverage targets and tools
✅ **Logging Implementation**: Structured JSON logging with trace_id and Sentry integration
✅ **Documentation Standards**: Comprehensive suite covering user, developer, and deployment needs
✅ **WebSocket Pattern**: Stable connection management with reconnection and offline support

All Constitution Check gaps resolved. Implementation can proceed to Phase 1 Design.
