# Quickstart Guide: ForgeEngine & ForgeAgent

**Feature**: 002-engine-agent | **Date**: 2026-01-01

## Overview

ForgeEngine is a standalone Python executable that provides browser automation capabilities via WebSocket communication. It supports two operating modes:
- **Desktop Mode**: Single-task execution with headful browsers, no authentication (localhost-only)
- **Agent Mode**: Concurrent headless execution with Server authentication, distributed task execution

This guide helps you quickly get started with ForgeEngine.

---

## Prerequisites

- Python 3.11+ (for development)
- Chrome 86+ or bundled Chrome
- WebSocket client (for Desktop application integration)
- Server application (for Agent mode only)

---

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

1. Clone repository and install dependencies:
   ```bash
   cd TraceForge/backend/engine
   pip install -r requirements.txt
   ```

2. Install Playwright browsers:
   ```bash
   playwright install chromium
   ```

3. Run Engine directly (development mode):
   ```bash
   python main.py --help
   ```

4. Build standalone executable:
   ```bash
   pyinstaller --onefile --add-data "playwright/driver:/playwright/driver" main.py
   ```

---

## Quickstart: Desktop Mode

### Step 1: Start Engine in Desktop Mode

```bash
# Start Engine with random port (default)
./forgeengine

# Or specify port explicitly
./forgeengine --port 8765

# Or specify custom kernel
./forgeengine --kernel /path/to/chrome
```

Engine will output:
```
INFO: Starting ForgeEngine in Desktop mode
INFO: WebSocket server listening on ws://localhost:8765/ws
INFO: Loaded 1 kernel: chrome86
```

### Step 2: Connect via WebSocket

Connect your Desktop application or WebSocket client to:
```
ws://localhost:8765/ws
```

### Step 3: Health Check

Send health check to verify Engine is responsive:

**Request**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "request",
  "action": "health_check"
}
```

**Response**:
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

### Step 4: Start Recording

Start a recording session to capture browser interactions:

**Request**:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "type": "request",
  "action": "start_recording",
  "payload": {
    "url": "https://example.com",
    "kernel_id": "chrome86"
  }
}
```

**Response**:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "type": "response",
  "action": "start_recording",
  "payload": {
    "session_id": "770e8400-e29b-41d4-a716-446655440001"
  }
}
```

Engine will now:
1. Open Chrome browser (headful)
2. Navigate to `https://example.com`
3. Start sending events (navigation_detected, action_recorded, auto_wait_suggested, screenshot)

### Step 5: Perform Actions

In the opened Chrome browser:
1. Click buttons
2. Fill forms
3. Navigate to new pages
4. Hover over elements

Engine will capture all actions with multiple locator strategies and send events in real-time.

### Step 6: Stop Recording

Stop recording and receive generated script:

**Request**:
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440002",
  "type": "request",
  "action": "stop_recording",
  "payload": {
    "session_id": "770e8400-e29b-41d4-a716-446655440001"
  }
}
```

**Response**:
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440002",
  "type": "response",
  "action": "stop_recording",
  "payload": {
    "script": {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "name": "Recording - 2026-01-01",
      "scenarios": [...]
    },
    "trace_path": "/path/to/trace.zip"
  }
}
```

Close Chrome browser automatically.

### Step 7: Execute Script

Execute the recorded script:

**Request**:
```json
{
  "id": "a10e8400-e29b-41d4-a716-446655440003",
  "type": "request",
  "action": "execute_script",
  "payload": {
    "script": { /* from stop_recording response */ },
    "kernel_id": "chrome86",
    "headless": false
  }
}
```

Engine will:
1. Start headful Chrome
2. Execute all actions in order
3. Send step_start, step_complete, screenshot events
4. Send execution_complete event with results

---

## Quickstart: Agent Mode

### Step 1: Start Engine in Agent Mode

```bash
# Start Engine with Agent mode
./forgeengine --agent --port 8765

# With custom kernel and Server URL
./forgeengine --agent --port 8765 --kernel /path/to/chrome --server-url https://forge-server.example.com --api-key YOUR_API_KEY
```

Engine will:
1. Open WebSocket endpoint `/ws/agent` (not `/ws`)
2. POST registration to Server
3. Start sending heartbeats every 30 seconds

### Step 2: Verify Registration

Engine logs:
```
INFO: Starting ForgeEngine in Agent mode
INFO: WebSocket server listening on ws://0.0.0.0:8765/ws/agent
INFO: Registered with Server: https://forge-server.example.com
INFO: Sending heartbeat every 30 seconds
```

### Step 3: Receive Tasks from Server

Server will push tasks via WebSocket:

**Server → Agent**:
```json
{
  "id": "b20e8400-e29b-41d4-a716-446655440004",
  "type": "request",
  "action": "execute_script",
  "payload": {
    "script": { /* script to execute */ },
    "data_rows": [...],
    "kernel_id": "chrome86",
    "headless": true
  }
}
```

Agent will:
1. Accept task (if concurrent slots available, max 5)
2. Execute script headlessly
3. Send progress events to Server
4. Send execution_complete event with results
5. Upload artifacts (trace, screenshots, diffs) in chunks

### Step 4: Monitor Heartbeat

Engine sends heartbeat every 30 seconds:

**Agent → Server**:
```json
{
  "id": "c30e8400-e29b-41d4-a716-446655440005",
  "type": "request",
  "action": "heartbeat",
  "payload": {
    "status": "available",
    "active_tasks": 2,
    "available_slots": 3,
    "kernels": ["chrome86", "chrome120"]
  }
}
```

---

## Common Workflows

### Recording a Complex E-commerce Flow

1. Start recording: `start_recording {url: "https://shop.example.com"}`
2. Navigate to product category (Engine creates new Page)
3. Search for product (Engine suggests wait after search)
4. Add to cart (Engine captures click with multiple locators)
5. Checkout (Engine captures form fill)
6. Stop recording
7. Receive structured script with Scenario-Page-Action hierarchy

### Data-Driven Testing

1. Prepare script with parameter placeholders: `${user}`, `${product}`
2. Create data_rows:
   ```json
   [
     {"user": "user1@example.com", "product": "123"},
     {"user": "user2@example.com", "product": "456"}
   ]
   ```
3. Execute script with data_rows
4. Engine executes script 2 times, substituting parameters
5. Receive execution_complete with per-row results

### Fault Tolerance with Locator Fallback

1. Record script using role locator: `role=button, name=Submit`
2. UI changes, role locator no longer works
3. Execute script
4. Engine tries role → fails → tries text "Submit" → succeeds
5. Script passes despite UI change

### Visual Regression Testing

1. Add `screenshot` action after key interactions
2. Add `assert_text` or `assert_screenshot` with expected baseline
3. Execute script
4. On mismatch, Engine generates diff image
5. Receive visual_diff event with expected/actual/diff paths

---

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

**Error**: `Connection refused` or `WebSocket handshake failed`

**Solution**:
- Verify Engine is running: `./forgeengine --version`
- Check port is not in use: `lsof -i :8765` (macOS/Linux) or `netstat -ano | findstr :8765` (Windows)
- Desktop mode uses `/ws`, Agent mode uses `/ws/agent`

### Recording session hangs

**Error**: Browser window opens but no events received

**Solution**:
- Check Engine logs: `./forgeengine --log-level debug`
- Verify URL is accessible
- Check Playwright trace: `playwright show-trace /path/to/trace.zip`

### Script execution fails

**Error**: `Element not found after 3 locator attempts`

**Solution**:
- Increase timeout: add `wait_after: "load"` to action
- Record script again with latest UI state
- Check visual diff: open diff image to see what changed

### Agent mode registration fails

**Error**: `Registration failed: Invalid API Key`

**Solution**:
- Verify API Key is correct
- Check Server is accessible: `curl https://forge-server.example.com/health`
- Use correct WebSocket endpoint: `/ws/agent` not `/ws`

---

## Configuration

### Command Line Options

```bash
# Display help
./forgeengine --help

# Desktop mode (default)
./forgeengine --port 0                    # Random port (default)
./forgeengine --port 8765                 # Specific port
./forgeengine --kernel /path/to/chrome     # Custom kernel

# Agent mode
./forgeengine --agent                      # Enable Agent mode
./forgeengine --port 8765                  # Fixed port (required for Agent)
./forgeengine --server-url https://...    # Server URL
./forgeengine --api-key YOUR_KEY          # API Key for authentication

# Logging
./forgeengine --log-level debug           # debug, info, warning, error
./forgeengine --log-file engine.log       # Log to file
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

---

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

### Network
- Use WSS (WebSocket Secure) for Agent mode production
- Compress screenshots (JPEG, quality 85)
- Chunk large binary messages (screenshots > 1MB)

---

## Next Steps

- **Read Full Documentation**: See [data-model.md](./data-model.md) for entity details
- **WebSocket Protocol**: See [contracts/forgews-schema.json](./contracts/forgews-schema.json) for message format
- **Architecture**: See [architecture.md](./architecture.md) (TODO) for design overview
- **API Reference**: See [API documentation](./api.md) (TODO) for all WebSocket actions

---

## Support

- **Issues**: Report bugs via project issue tracker
- **Documentation**: Check `docs/002-engine-agent/` for detailed guides
- **Examples**: See `examples/` directory for sample scripts and workflows
