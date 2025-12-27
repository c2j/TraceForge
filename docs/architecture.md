# TraceForge Desktop Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TraceForge Desktop                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                           Frontend (React 18)                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │   │
│  │  │   Pages/Views   │  │   Components    │  │    Stores       │       │   │
│  │  │  - Dashboard    │  │  - TreeView     │  │  - useForgeStore│       │   │
│  │  │  - Recorder     │  │  - Virtualized  │  │  - useSyncStore │       │   │
│  │  │  - Editor       │  │  - LazyLoader   │  │  - useEngineStore│      │   │
│  │  │  - Results      │  │  - Screenshot   │  │                 │       │   │
│  │  │  - Kernels      │  │  - ErrorBoundary│  │                 │       │   │
│  │  │  - Settings     │  │                 │  │                 │       │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘       │   │
│  │           └───────────────────┼───────────────────┘                   │   │
│  │                               │                                       │   │
│  │  ┌─────────────────────────────▼─────────────────────────────────┐   │   │
│  │  │                    Services Layer                              │   │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │   │   │
│  │  │  │              WebSocket Client (engineClient)              │  │   │   │
│  │  │  │  - Connection Management (auto-reconnect)                │  │   │   │
│  │  │  │  - Request/Response (async with timeout)                 │  │   │   │
│  │  │  │  - Message Handlers (ENGINE_STATUS, STEP_CAPTURED, etc.) │  │   │   │
│  │  │  │  - Heartbeat & Keep-Alive                                │  │   │   │
│  │  │  └───────────────────────────┬─────────────────────────────┘  │   │   │
│  │  │                              │                                 │   │   │
│  │  │  ┌───────────────────────────▼─────────────────────────────┐  │   │   │
│  │  │  │              Tauri IPC Bridge (invoke)                   │  │   │   │
│  │  │  └───────────────────────────┬─────────────────────────────┘  │   │   │
│  │  └─────────────────────────────┼─────────────────────────────────┘   │   │
│  └────────────────────────────────┼─────────────────────────────────────┘   │
│                                   │                                            │
└───────────────────────────────────┼────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
    ┌───────────────▼────────────────┐  ┌───────────▼───────────────┐
    │         Backend (Rust)          │  │      ForgeEngine          │
    │  ┌────────────────────────┐    │  │  (Playwright Process)     │
    │  │   Tauri Commands       │    │  │                            │
    │  │  - db.rs (CRUD)        │    │  │  ┌──────────────────────┐  │
    │  │  - engine.rs (spawn)   │    │◄─┼──┤  WebSocket Server     │  │
    │  └───────────┬────────────┘    │  │  └──────────┬───────────┘  │
    │              │                  │  │             │              │
    │  ┌───────────▼────────────┐    │  │  ┌──────────▼───────────┐  │
    │  │    Database (SQLite)   │    │  │  │  Playwright Control  │  │
    │  │  - Projects            │    │  │  │  - Browser Launch    │  │
    │  │  - Scripts/Scenarios   │    │  │  │  - Page Navigation   │  │
    │  │  - Actions/Locators    │    │  │  │  - Element Actions   │  │
    │  │  - Executions          │    │  │  │  - Screenshots        │  │
    │  │  - Kernels             │    │  │  │  - Traces            │  │
    │  │  - Data Tables         │    │  │  └──────────────────────┘  │
    │  └────────────────────────┘    │  │                            │
    │                                │  │  Messages:                 │
    │                                │  │  - START_SCRIPT            │
    │                                │  │  - STOP_SCRIPT             │
    │                                │  │  - STEP_CAPTURED           │
    │                                │  │  - SCREENSHOT              │
    │                                │  │  - EXECUTION_UPDATE        │
    │                                │  └────────────────────────────┘
    └────────────────────────────────┘
                                        ▲
                                        │
                    ┌─────────────────────┴─────────────────────┐
                    │                Optional                   │
                    │         Team Server Sync                  │
                    │  ┌──────────────────────────────────────┐ │
                    │  │  HTTP API + WebSocket                 │ │
                    │  │  - Script push/pull                  │ │
                    │  │  - Conflict resolution                │ │
                    │  │  - Execution results upload           │ │
                    │  │  - Team collaboration                 │ │
                    │  └──────────────────────────────────────┘ │
                    └──────────────────────────────────────────┘
```

## Component Communication Flow

### 1. Script Execution Flow

```
User Action (Frontend) → Tauri IPC → Rust Backend
                          │
                          ├── spawn_engine() → Start ForgeEngine Process
                          │                   │
                          │                   └── WebSocket Server (random port)
                          │
                          └── engineClient.connect()
                                                │
                                                ├── WebSocket Handshake
                                                │
                                                └── START_SCRIPT message
                                                    │
                                                    └── ForgeEngine executes Playwright script
                                                        │
                                                        ├── EXECUTION_UPDATE events
                                                        ├── STEP_CAPTURED events
                                                        ├── SCREENSHOT events
                                                        └── TRACE_READY event
                                                            │
                                                            └── Frontend updates UI
```

### 2. Offline Recording Flow

```
1. User clicks "Record" in Frontend
2. Frontend → Tauri → spawn_engine(kernel_id)
3. engineClient → WebSocket → ForgeEngine
4. ForgeEngine launches browser with recorder
5. User actions in browser captured by ForgeEngine
6. Real-time updates via WebSocket:
   - STEP_CAPTURED → Update tree view
   - SCREENSHOT → Update screenshot viewer
7. User clicks "Save"
8. Frontend → Tauri → create_script() + related CRUD
9. Data persisted to local SQLite DB
```

### 3. Server Synchronization Flow

```
1. User connects to server (Settings → Network)
2. useSyncStore → test_connection(server_url)
3. On sync:
   ├── Local-only scripts → push_to_server()
   ├── Server-only scripts → pull_from_server()
   └── Conflicts → conflict resolution UI
        ├── Keep local
        ├── Use server
        └── Manual merge
4. Sync status tracked in useSyncStore
```

## Data Models

### Core Entities

```
Project
├── id
├── name
├── version
├── description
├── created_at
├── updated_at
├── sync_enabled
└── last_sync_at
    │
    ├── Scripts (1:N)
    │   ├── id
    │   ├── project_id
    │   ├── name
    │   ├── version
    │   ├── priority (P0-P3)
    │   ├── status (DRAFT/ACTIVE/ARCHIVED)
    │   └── Scenarios (1:N)
    │       ├── id
    │       ├── script_id
    │       ├── name
    │       ├── priority
    │       └── Pages (1:N)
    │           ├── id
    │           ├── scenario_id
    │           ├── name
    │           ├── entry_url
    │           └── Actions (1:N)
    │               ├── id
    │               ├── page_id
    │               ├── action_type (NAVIGATE/CLICK/...)
    │               ├── timeout_ms
    │               └── Locators (1:N)
    │                   ├── id
    │                   ├── action_id
    │                   ├── locator_type (CSS/XPATH/...)
    │                   ├── value
    │                   └── priority
    │
    └── Executions (1:N)
        ├── id
        ├── script_id
        ├── kernel_id
        ├── status (RUNNING/COMPLETED/FAILED)
        ├── started_at
        ├── completed_at
        ├── trace_path
        └── ExecutionSteps (1:N)
            ├── id
            ├── execution_id
            ├── action_id
            ├── status
            ├── screenshot_path
            └── error_message
```

## WebSocket Protocol (ForgeWS)

### Client → Server Messages

```typescript
// Handshake
{
  type: "HANDSHAKE",
  payload: {
    client_id: string,
    timestamp: string
  }
}

// Start Script Execution
{
  type: "START_SCRIPT",
  payload: {
    script_id: string,
    kernel_id: string,
    request_id: string,
    options?: {
      headless?: boolean,
      dataRowIndex?: number
    }
  }
}

// Control Commands
{
  type: "STOP_SCRIPT" | "PAUSE_SCRIPT" | "RESUME_SCRIPT" | "STEP_OVER",
  payload: {
    execution_id: string,
    request_id: string
  }
}
```

### Server → Client Messages

```typescript
// Response (with request correlation)
{
  type: "RESPONSE",
  payload: {
    request_id: string,
    success: boolean,
    data?: any,
    error?: string
  }
}

// Engine Status Update
{
  type: "ENGINE_STATUS",
  payload: {
    engine_id: string,
    kernel_id: string,
    status: "IDLE" | "BUSY" | "STOPPED" | "ERROR",
    connected: boolean,
    uptime_ms: number
  }
}

// Execution Progress
{
  type: "EXECUTION_UPDATE",
  payload: {
    execution_id: string,
    status: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED",
    step_index?: number,
    total_steps?: number,
    error?: string
  }
}

// Step Captured (Recording)
{
  type: "STEP_CAPTURED",
  payload: {
    execution_id: string,
    step_index: number,
    action_type: string,
    element: string,
    screenshot?: string // base64
  }
}

// Screenshot Available
{
  type: "SCREENSHOT",
  payload: {
    execution_id: string,
    step_index: number,
    image: string, // base64 data URL
    timestamp: string
  }
}
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend Framework** | React 18 + TypeScript 5.x |
| **Desktop Framework** | Tauri 1.8 |
| **Backend Language** | Rust 1.75 |
| **Styling** | Tailwind CSS + Shadcn/ui |
| **State Management** | Zustand |
| **Database** | SQLite (rusqlite) |
| **Test Engine** | Playwright 1.48+ (ForgeEngine) |
| **WebSocket** | Native WebSocket + Custom protocol |
| **Testing** | Vitest + Playwright E2E |
| **Build** | Vite + Tauri CLI |

## Performance Optimizations

1. **Virtualization**: react-window for large tree views and lists
2. **Lazy Loading**: Code splitting and lazy component loading
3. **Debouncing**: Search and filter inputs
4. **Database Pruning**: Automatic cleanup of old executions
5. **Connection Pooling**: Reuse WebSocket connections
6. **Memoization**: React.memo and useMemo for expensive components

## Security Considerations

1. **Content Security**: Tauri allowlist for all commands
2. **SQL Injection**: Parameterized queries in rusqlite
3. **Path Traversal**: Validated file paths for kernel/executable detection
4. **WebSocket Validation**: Message contract validation
5. **Local-First**: All data stored locally by default; server sync optional
