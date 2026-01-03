# ForgeEngine Architecture

**Feature**: 002-engine-agent | **Date**: 2026-01-02

## Overview

ForgeEngine is a standalone Python executable that provides browser automation capabilities via WebSocket communication. It supports two operating modes with different characteristics:

- **Desktop Mode**: Single-task execution with headful browsers, no authentication (localhost-only)
- **Agent Mode**: Concurrent headless execution with Server authentication, distributed task execution

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Desktop Application                           │
│                    (Forge Frontend - Tauri)                        │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ WebSocket
                             │ ws://localhost:8765/ws
┌────────────────────────────▼────────────────────────────────────────────┐
│                           FastAPI Server                           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │           WebSocket Server (FastAPI + WebSockets)         │  │
│  │  ┌──────────────┐  ┌──────────────────────────────────┐   │  │
│  │  │  /ws        │  │  /ws/agent (API Key auth)    │   │  │
│  │  └──────────────┘  └──────────────────────────────────┘   │  │
│  │         │                        │                          │  │
│  └─────────┼────────────────────────┼──────────────────────────┘  │
│            │                        │                             │
│  ┌─────────▼────────────────────────▼──────────────────────────┐  │
│  │           WebSocket Connection Manager                        │  │
│  │  - Track active connections                                │  │
│  │  - Single-session lock (Desktop mode)                      │  │
│  │  - Binary message transmission (screenshots)                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
    ┌────────────────────────┼────────────────────────────────────┐
    │                        │                                │
┌───▼────────────────┐  ┌───▼───────────────────┐  ┌────▼───────────┐
│  Request Handlers   │  │   Recording System   │  │  Execution      │
│  - health_check    │  │   - Session state   │  │  System        │
│  - get_kernels     │  │   - Event listener  │  │  - Engine      │
│  - start_recording │  │   - Action capture  │  │  - Fallback    │
│  - stop_recording  │  │   - Page detector   │  │  - Visual      │
│  - execute_script   │  │   - Screenshot     │  │  - Data-driven │
└─────────────────────┘  └───────────────────────┘  └────────────────┘
                              │                              │
                    ┌─────────▼──────────────────────────────▼─────┐
                    │          Browser Manager (Playwright)       │
                    │  - BrowserContext persistence              │
                    │  - Kernel loading (Chrome 86+)           │
                    │  - Tracing support (trace.zip)          │
                    │  - Crash detection & recovery             │
                    └──────────────────────────────────────────────┘
                                     │
                    ┌────────────────────▼──────────────────────┐
                    │            SQLite Database                │
                    │  - Kernels (browser configs)           │
                    │  - Scripts (recorded scenarios)         │
                    │  - Executions (results, artifacts)      │
                    │  - Settings (config values)             │
                    └────────────────────────────────────────────┘

Agent Mode Extension:
┌────────────────────────────────────────────────────────────────┐
│                   Forge Server (Central)                     │
└────────────────────────────┬───────────────────────────────────┘
                             │ HTTPS (REST API + WebSocket)
                             │ ws://server.com/ws/agent
┌────────────────────────────▼───────────────────────────────────┐
│                    Agent Mode Components                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Server Client (httpx)                              │  │
│  │  - POST registration on startup                      │  │
│  │  - Heartbeat every 30s                             │  │
│  │  - Reconnection logic                                 │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Auth Manager                                      │  │
│  │  - API Key validation                             │  │
│  │  - WebSocket handshake authentication                │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Task Queue                                       │  │
│  │  - Semaphore (max 5 concurrent tasks)             │  │
│  │  - Queue tasks beyond limit                        │  │
│  │  - Execute when slot available                     │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Artifact Chunker                                 │  │
│  │  - Compress (zlib)                               │  │
│  │  - Chunk if >1MB                                 │  │
│  │  - Reconstruct on receiver                         │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Recording Workflow (Desktop Mode)

1. **Start Recording**: Desktop app sends `start_recording` request
2. **Browser Launch**: Engine launches headful Chrome with tracing enabled
3. **Navigation**: User navigates → Engine creates new Page node
4. **Actions**: User clicks/fills/hovers → Engine captures with multiple locators
5. **Events**: Real-time events sent to Desktop:
   - `navigation_detected`: New page detected
   - `action_recorded`: Action captured with locators
   - `auto_wait_suggested`: Network request detected (suggest wait)
   - `screenshot`: After hover action (binary JPEG)
6. **Stop Recording**: Desktop app sends `stop_recording` request
7. **Script Export**: Engine returns Script JSON (Scenario-Page-Action hierarchy) + trace.zip

### Execution Workflow (Desktop Mode)

1. **Execute Script**: Desktop app sends `execute_script` request
2. **Browser Launch**: Engine launches Chrome (headful/headless per request)
3. **Traversal**: Engine traverses Script→Scenario→Page→Action hierarchy
4. **Locator Fallback**: For each action:
   - Try primary locator (e.g., role=button)
   - If fails, try fallback locators (text, css, xpath, id)
   - Max 5 attempts
5. **Wait Conditions**: After each action:
   - `networkidle`: Wait until no network requests
   - `load`: Wait until page load
   - `domcontentloaded`: Wait until DOM ready
6. **Events**: Real-time events sent to Desktop:
   - `step_start`: Before action execution
   - `step_complete`: After action (success/error)
   - `screenshot`: After action (if configured)
   - `visual_diff`: On visual assertion failure
   - `log`: Informational messages
7. **Completion**: Send `execution_complete` with results and artifacts

### Agent Mode Workflow

1. **Startup**: Engine starts with `--agent` flag
2. **Registration**: POST to Server with kernel list and capabilities
3. **Authentication**: API Key required for `/ws/agent` connections
4. **Heartbeat**: Send heartbeat every 30s with:
   - Status (available/busy)
   - Active tasks count
   - Available slots
   - Kernel list
5. **Task Reception**: Server pushes `execute_script` via WebSocket
6. **Concurrent Execution**:
   - Semaphore limits to 5 concurrent tasks
   - Queue tasks beyond limit
   - Execute when slot available
7. **Headless Mode**: Force headless execution (per spec FR-004)
8. **Artifact Chunking**:
   - Compress screenshots/traces (zlib)
   - Chunk if >1MB
   - Send chunks sequentially
9. **Result Transmission**: Send `execution_complete` back to Server

## Mode Comparison

| Feature | Desktop Mode | Agent Mode |
|---------|--------------|-------------|
| **Purpose** | Interactive recording/execution | Distributed test execution |
| **Connections** | Single (localhost-only) | Multiple (Server push) |
| **Authentication** | None | API Key required |
| **Browser Mode** | Headful (default) | Headless (forced) |
| **Concurrency** | 1 session | 5 concurrent tasks |
| **WebSocket Endpoint** | `/ws` | `/ws/agent` |
| **Registration** | N/A | POST to Server on startup |
| **Heartbeat** | N/A | Every 30s to Server |
| **Task Queue** | N/A | Queue beyond semaphore limit |
| **Artifact Handling** | Direct transmission | Chunked if >1MB |
| **BrowserContext** | Persistent per session | Reused across tasks |
| **Tracing** | Always enabled | Configurable |

## Technology Stack

- **Language**: Python 3.11+
- **Web Framework**: FastAPI (async WebSocket support)
- **Browser Automation**: Playwright (Chrome 86+ custom kernels)
- **Database**: SQLite3 (local caching)
- **Data Validation**: Pydantic v2
- **HTTP Client**: httpx (Agent mode Server communication)
- **Packaging**: PyInstaller (--onefile)
- **Testing**: pytest + pytest-asyncio

## Key Design Decisions

### 1. Two-Mode Architecture

**Decision**: Separate Desktop and Agent modes with distinct WebSocket endpoints.

**Rationale**:
- Desktop mode focuses on interactive, single-session recording
- Agent mode focuses on distributed, concurrent execution
- Different authentication requirements (none vs API Key)
- Clear separation simplifies testing and deployment

### 2. BrowserContext Persistence

**Decision**: Reuse BrowserContext across sessions in Agent mode.

**Rationale**:
- Per spec FR-003: Performance optimization
- Reduces browser startup overhead
- Maintains cookies/storage across executions
- Faster concurrent execution

### 3. Locator Fallback Strategy

**Decision**: Try role → text → css → xpath → id (max 5 attempts).

**Rationale**:
- Per spec FR-012: Fault tolerance
- Reduces flaky tests from UI changes
- Prioritizes accessibility (role) over brittle CSS/XPath
- Allows automatic recovery from selector changes

### 4. Playwright Tracing

**Decision**: Enable tracing for all recording and execution sessions.

**Rationale**:
- Per spec FR-016: Debugging support
- Captures screenshots, network requests, console logs
- Trace.zip format for offline analysis
- Minimal performance impact

### 5. Task Queue with Semaphore

**Decision**: Use asyncio.Semaphore(5) + asyncio.Queue for Agent mode.

**Rationale**:
- Per spec FR-031: Max 5 concurrent tasks
- Prevents resource exhaustion
- Queues pending tasks automatically
- Graceful degradation under load

### 6. Artifact Chunking

**Decision**: Compress with zlib, chunk if >1MB.

**Rationale**:
- Per spec FR-027: Avoid message size limits
- Reduces network bandwidth
- Sequential chunk transmission (ordered reconstruction)
- Backward compatible with non-chunked messages

### 7. SQLite for Local Caching

**Decision**: Use SQLite3 with WAL mode for kernels, scripts, executions.

**Rationale**:
- Zero-configuration, embedded database
- Sufficient scale: 100-1000 execution records
- Fast read-heavy workloads
- Single file backup/restore

## Security Considerations

### Desktop Mode
- **Assumption**: Trusted localhost environment
- **Mitigation**: Bind to 127.0.0.1 only
- **Validation**: Validate all WebSocket message types
- **Sanitization**: Validate script JSON before execution

### Agent Mode
- **Authentication**: API Key/Token in WebSocket handshake
- **TLS**: Support WSS (WebSocket Secure)
- **Key Management**: Never log API Keys, rotate periodically
- **Input Validation**: Validate all tasks from Server

### General
- **No Code Execution**: Engine never executes arbitrary code from Desktop/Server
- **Sandbox**: Browser automation only, no file system access beyond artifacts
- **Rate Limiting**: Limit WebSocket message rate (50 msg/s)
- **Resource Limits**: Timeout all Playwright operations (300s)

## Performance Optimization

### Desktop Mode (Single Task)
- Enable Playwright tracing for debugging (small impact)
- Use `networkidle` wait for complex pages
- Screenshot quality: 85 (balance quality and size)

### Agent Mode (Concurrent Tasks)
- Increase `max_concurrent_tasks` based on available RAM (default: 5)
- Use headless mode for faster execution
- Reuse BrowserContext for multiple tasks (automatic)
- Disable Playwright tracing in production (performance)
- Batch WebSocket events where possible
- Kernel configuration caching

## Error Handling & Recovery

### Browser Crashes
- Detect via health monitor (30s interval)
- Restart browser with same configuration
- Send `browser_crash` event to WebSocket
- Re-register with execution engine

### Connection Loss
- Desktop mode: 30s reconnection window per spec FR-034
- Agent mode: Automatic reconnection with retry
- Re-register with Server on reconnect
- Resume pending tasks from queue

### Timeout Handling
- Playwright operations timeout after 300s per spec T076
- Graceful degradation: Mark step as failed, continue execution
- Send timeout event to client

## Future Extensions

1. **Multi-Kernel Support**: Execute scripts across different browsers (Chrome, Firefox, Safari)
2. **Docker Support**: Containerized Agent mode for cloud deployment
3. **Result Streaming**: Stream execution results as they complete (not wait for full completion)
4. **Visual Regression**: Automated baseline management and diff comparison
5. **Custom Actions**: Plugin system for custom action types (e.g., API calls, file uploads)

## References

- [Feature Specification](../spec.md)
- [Data Model](../data-model.md)
- [Quickstart Guide](../quickstart.md)
- [WebSocket Protocol](../contracts/forgews-schema.json)
