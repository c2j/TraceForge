# ForgeEngine

ForgeEngine is a standalone Python executable that provides browser automation capabilities via WebSocket communication. It supports two operating modes:

- **Desktop Mode**: Single-task execution with headful browsers, no authentication (localhost-only)
- **Agent Mode**: Concurrent headless execution with Server authentication, distributed task execution

## Installation

### Option 1: Use Pre-built Executable (Production)

1. Download `forgeengine` executable for your platform:
   - Windows: `forgeengine.exe`
   - macOS: `forgeengine` (or `forgeengine.app` bundle)
   - Linux: `forgeengine`

2. Make executable (Linux/macOS):
   ```bash
   chmod +x forgeengine
   ```

3. Verify installation:
   ```bash
   ./forgeengine --version
   ```

### Option 2: Build from Source (Development)

1. Install Python 3.11+ and clone repository:
   ```bash
   cd TraceForge/backend/engine
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Install Playwright browsers:
   ```bash
   playwright install chromium
   ```

4. Run Engine directly:
   ```bash
   python main.py --help
   ```

5. Build standalone executable:
   ```bash
   pyinstaller --onefile --add-data "playwright/driver:/playwright/driver" main.py
   ```

## Usage

### Desktop Mode

Start Engine in Desktop mode:

```bash
# Start with random port (default)
./forgeengine

# Specify port explicitly
./forgeengine --port 8765

# Specify custom kernel
./forgeengine --kernel /path/to/chrome
```

Engine will output:
```
INFO: Starting ForgeEngine in Desktop mode
INFO: WebSocket server listening on ws://localhost:8765/ws
INFO: Loaded 1 kernel: chrome86
```

Connect your Desktop application to: `ws://localhost:8765/ws`

### Agent Mode

Start Engine in Agent mode:

```bash
# Start with Agent mode
./forgeengine --agent --port 8765

# With custom kernel and Server URL
./forgeengine --agent --port 8765 --server-url https://forge-server.example.com --api-key YOUR_API_KEY
```

Engine will:
1. Open WebSocket endpoint `/ws/agent`
2. POST registration to Server
3. Start sending heartbeats every 30 seconds

## Configuration

### Command Line Options

```bash
# Display help
./forgeengine --help

# Desktop mode
./forgeengine --port 8765 --kernel /path/to/chrome

# Agent mode
./forgeengine --agent --port 8765 --server-url https://... --api-key YOUR_KEY

# Logging
./forgeengine --log-level debug --log-file engine.log
```

### Configuration File

Create `forgeengine.conf`:

```ini
[engine]
mode = desktop
port = 0
log_level = info
log_file = engine.log

[desktop]
default_kernel = chrome86
reconnect_timeout = 30

[agent]
server_url = https://forge-server.example.com
api_key = YOUR_API_KEY
heartbeat_interval = 30
max_concurrent_tasks = 5

[kernel.chrome86]
executable_path = /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
version = 120.0.6099.109
is_default_record = true
is_default_agent = true
```

Run with config:
```bash
./forgeengine --config forgeengine.conf
```

## WebSocket API

### Desktop Mode Endpoint: `/ws`

### Agent Mode Endpoint: `/ws/agent`

#### Health Check

Request:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "request",
  "action": "health_check"
}
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "response",
  "action": "health_check",
  "payload": {
    "status": "ok",
    "mode": "desktop",
    "active_sessions": 0
  }
}
```

#### Get Kernels

Request:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "type": "request",
  "action": "get_kernels"
}
```

Response:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "type": "response",
  "action": "get_kernels",
  "payload": {
    "kernels": [...]
  }
}
```

#### Start Recording

Request:
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "type": "request",
  "action": "start_recording",
  "payload": {
    "url": "https://example.com",
    "kernel_id": "chrome86"
  }
}
```

Response:
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "type": "response",
  "action": "start_recording",
  "payload": {
    "session_id": "880e8400-e29b-41d4-a716-446655440003"
  }
}
```

#### Stop Recording

Request:
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "type": "request",
  "action": "stop_recording",
  "payload": {
    "session_id": "880e8400-e29b-41d4-a716-446655440003"
  }
}
```

Response:
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "type": "response",
  "action": "stop_recording",
  "payload": {
    "script": { ... },
    "trace_path": "/path/to/trace.zip"
  }
}
```

#### Execute Script

Request:
```json
{
  "id": "aa0e8400-e29b-41d4-a716-4466554405",
  "type": "request",
  "action": "execute_script",
  "payload": {
    "script": { ... },
    "data_rows": [...],
    "kernel_id": "chrome86",
    "headless": false
  }
}
```

Response: Events streamed back to WebSocket
- `step_start`: Before each action execution
- `step_complete`: After each action (with success/error)
- `screenshot`: After action (if configured)
- `visual_diff`: On visual assertion failure
- `log`: Informational messages
- `execution_complete`: Final result

## Performance Tuning

### Desktop Mode (Single Task)
- Enable Playwright tracing for debugging (small performance impact)
- Use `networkidle` wait for complex pages
- Screenshot quality: 85 (balance quality and size)

### Agent Mode (Concurrent Tasks)
- Increase `max_concurrent_tasks` based on available RAM (default: 5)
- Use headless mode for faster execution
- Reuse BrowserContext for multiple tasks (automatic)
- Disable Playwright tracing in production (for performance)

## Troubleshooting

### Engine fails to start

**Error**: `Cannot find Chrome executable`

**Solution**:
```bash
# Use bundled Chrome (default)
./forgeengine --kernel bundled

# Or specify custom Chrome path
./forgeengine --kernel /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
```

### WebSocket connection fails

**Error**: `Connection refused`

**Solution**:
- Verify Engine is running: `./forgeengine --version`
- Check port is not in use: `lsof -i :8765`
- Desktop mode uses `/ws`, Agent mode uses `/ws/agent`

### Recording session hangs

**Error**: Browser window opens but no events received

**Solution**:
- Check Engine logs: `./forgeengine --log-level debug`
- Verify URL is accessible
- Check Playwright trace: `playwright show-trace /path/to/trace.zip`

## Development

### Project Structure

```
backend/engine/
├── agent/          # Agent mode components
│   ├── client.py   # Server client
│   ├── auth.py     # API Key authentication
│   ├── heartbeat.py # Heartbeat manager
│   └── task_queue.py # Task queue
├── browser/        # Browser management
│   ├── manager.py  # BrowserContext manager
│   └── kernel.py   # Kernel loading
├── database/       # SQLite database
│   ├── models.py   # SQLAlchemy models
│   └── *_repo.py  # Repository classes
├── executor/       # Script execution
│   ├── engine.py   # Execution engine
│   ├── fallback.py # Locator fallback
│   └── visual.py  # Visual assertions
├── models/         # Pydantic models
│   ├── websocket.py # WebSocket messages
│   ├── script.py   # Script structure
│   └── kernel.py   # Kernel/Execution models
├── recorder/       # Scenario recording
│   ├── session.py  # Recording session
│   ├── listener.py # Playwright event listener
│   └── action_capturer.py # Action capture
├── websocket/      # WebSocket server
│   ├── server.py   # FastAPI endpoints
│   ├── manager.py  # Connection manager
│   └── handlers.py # Request handlers
├── utils/          # Utilities
│   ├── logging.py  # Structured logging
│   └── artifacts.py # Artifact management
├── config.py       # Configuration
├── main.py         # Entry point
└── requirements.txt # Dependencies
```

## License

See LICENSE file for details.
