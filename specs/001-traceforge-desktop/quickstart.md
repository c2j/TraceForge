# Quick Start Guide: TraceForge Desktop

**Version**: 1.0.0
**Last Updated**: 2025-12-16

## Overview

TraceForge Desktop is a cross-platform application for recording, editing, and executing web automation tests. This guide helps you get started with development, testing, and daily usage.

## For Users

### Installation

1. **Download Installer** (Windows)
   - Download `TraceForge-Setup-1.0.0.exe` from releases
   - Run installer as Administrator
   - Follow installation wizard

2. **First Launch**
   - Launch TraceForge from Start Menu or Desktop
   - Application opens to Dashboard
   - Engine automatically starts on first use

### Quick Recording Workflow

1. **Configure Chrome Kernel** (first time only)
   - Go to `Kernels` page
   - Click `+ Add` and select your Chrome executable
   - Test compatibility and set as default for recording

2. **Record a Script**
   - Click `Quick Record` on Dashboard
   - Select Chrome kernel and target URL
   - Click `Start Recording`
   - Perform actions in browser window
   - Click `Stop` when done
   - Save script to local database

3. **Edit and Debug**
   - Open script in Editor
   - Review hierarchical structure (Scenarios → Pages → Actions)
   - Modify locators, parameters, timing
   - Click `Debug Run` to test changes

4. **Execute and View Results**
   - Run script with `Debug Run` or `Run All`
   - View results in Results page
   - Click execution to see step-by-step screenshots
   - Open ForgeTracer for detailed debugging

### Keyboard Shortcuts

- `Ctrl+N`: New Script
- `Ctrl+R`: Quick Record
- `Ctrl+E`: Open Editor
- `F5`: Execute/Debug Run
- `Ctrl+S`: Save
- `Ctrl+/`: Zoom In/Out (Editor)

## For Developers

### Prerequisites

- **Node.js**: 18.x or higher
- **Rust**: 1.75 or higher (via rustup)
- **Python**: 3.12 (for ForgeEngine development)
- **Chrome**: Version 86+ for testing

### Development Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/traceforge.git
   cd traceforge
   ```

2. **Install Dependencies**
   ```bash
   # Frontend dependencies
   cd Desktop
   npm install

   # Rust dependencies (via Cargo)
   cd src-tauri
   cargo fetch
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit configuration
   nano .env
   ```

4. **Development Server**
   ```bash
   # Start Tauri dev server (includes hot reload)
   npm run tauri dev
   ```

   This launches:
   - Rust backend on random port
   - React dev server on http://localhost:1420
   - Auto-reload on code changes

### Project Structure

```
Desktop/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri command handlers
│   │   │   ├── db.rs       # Database operations
│   │   │   ├── engine.rs   # Engine spawning/management
│   │   │   └── files.rs    # File dialog operations
│   │   ├── database/       # SQLite schema & migrations
│   │   │   └── schema.sql
│   │   ├── ws_client/      # WebSocket communication
│   │   │   └── client.rs
│   │   └── main.rs
│   └── Cargo.toml
│
├── src/                    # React frontend
│   ├── components/
│   │   ├── ui/             # Shadcn/ui components
│   │   ├── TreeView/       # Script hierarchy viewer
│   │   └── ScreenshotViewer/
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Recorder.tsx
│   │   └── Editor.tsx
│   ├── stores/
│   │   ├── engineStore.ts  # Engine connection state
│   │   └── dbStore.ts      # Database operations
│   └── lib/
│       ├── ws-client.ts    # WebSocket client
│       └── types.ts        # TypeScript types
│
└── tests/
    ├── unit/               # Jest unit tests
    ├── e2e/                # Playwright E2E tests
    └── contract/           # WebSocket contract tests
```

### Common Development Tasks

**Add New Tauri Command**:
```rust
// src-tauri/src/commands/db.rs
#[tauri::command]
pub async fn create_project(name: String) -> Result<String, String> {
    // Implementation
}

// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            create_project,
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Add New Frontend Page**:
```typescript
// src/pages/NewFeature.tsx
import { useState } from 'react';

export default function NewFeature() {
  return (
    <div className="p-4">
      {/* Your component */}
    </div>
  );
}

// src/App.tsx - Add route
<Route path="/new-feature" element={<NewFeature />} />
```

**Database Migration**:
```sql
-- src-tauri/database/migrations/002_add_execution_logs.sql
ALTER TABLE executions ADD COLUMN log_output TEXT;
```

### Testing

**Run Unit Tests**:
```bash
npm test                    # Frontend tests
cargo test                  # Rust backend tests
```

**Run E2E Tests**:
```bash
npm run test:e2e           # Requires running dev server
```

**Run Contract Tests**:
```bash
npm run test:contract      # WebSocket schema validation
```

**Coverage Report**:
```bash
npm run test:coverage      # Frontend coverage
cargo test --cov          # Rust coverage
```

### Building for Production

**Development Build**:
```bash
npm run tauri build -- --debug
```

**Production Build**:
```bash
npm run tauri build
```

**Output Location**:
- Windows: `src-tauri/target/release/bundle/msi/`
- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: `src-tauri/target/release/bundle/deb/`

### Debugging

**Backend Debugging**:
```bash
# Enable detailed logging
RUST_LOG=trace npm run tauri dev

# Attach Rust debugger (VS Code)
# Add breakpoint in VS Code and press F5
```

**Frontend Debugging**:
```bash
# Open React DevTools
# Press F12 in app window, or use Chrome DevTools

# Component inspection
# Install React Developer Tools extension
```

**WebSocket Debugging**:
```bash
# Enable WS logging in .env
TAURI_WS_DEBUG=true

# View messages in console
# Messages logged to: ~/.local/share/traceforge/logs/
```

### Configuration

**Environment Variables** (`.env`):
```bash
# Engine Configuration
ENGINE_PORT_RANGE=50000-60000
ENGINE_AUTO_RESTART=true

# Database Configuration
DB_PATH=~/.local/share/traceforge/data.db
DB_BACKUP_INTERVAL=24h

# Logging Configuration
LOG_LEVEL=info
LOG_TO_FILE=true

# Server Sync (optional)
SERVER_URL=https://traceforge.company.com
AUTO_SYNC_INTERVAL=1h

# Chrome Configuration
DEFAULT_RECORD_KERNEL_ID=<uuid>
DEFAULT_AGENT_KERNEL_ID=<uuid>
```

**Tauri Configuration** (`src-tauri/tauri.conf.json`):
```json
{
  "bundle": {
    "identifier": "com.traceforge.desktop",
    "publisher": "TraceForge",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

## Troubleshooting

### Engine Won't Start
```bash
# Check if port is available
netstat -an | grep 50000

# View engine logs
cat ~/.local/share/traceforge/logs/engine.log

# Restart with debug
ENGINE_DEBUG=1 npm run tauri dev
```

### Database Errors
```bash
# Backup current database
cp ~/.local/share/traceforge/data.db ~/data.db.backup

# Reset database (deletes all data!)
rm ~/.local/share/traceforge/data.db

# Run migrations
cargo run --bin migrate_db
```

### Chrome Kernel Issues
```bash
# Test kernel compatibility
cd Desktop
npm run test:kernel -- --kernel-path=/path/to/chrome.exe

# View kernel compatibility logs
cat ~/.local/share/traceforge/logs/kernel.log
```

### Performance Issues
```bash
# Check memory usage
# Desktop app should use <500MB RAM

# View performance metrics
# Open Settings → System → Performance Monitor

# Enable performance profiling
PROFILING=1 npm run tauri dev
```

## API Reference

### WebSocket Protocol

**Connection**:
```
ws://127.0.0.1:<port>/ws
```

**Message Format**:
```json
{
  "id": "uuid",
  "type": "request|response|event|error",
  "action": "action_name",
  "timestamp": "2025-12-16T10:30:00.000Z",
  "trace_id": "uuid",
  "payload": { }
}
```

**See**: [ForgeWS Schema](contracts/forgews-schema.json) for full specification

### Tauri Commands

**Database Operations**:
- `db_create_project(name, version)` → Project
- `db_get_scripts(project_id)` → Script[]
- `db_save_script(script)` → String (script_id)
- `db_delete_script(script_id)` → Boolean

**Engine Operations**:
- `engine_spawn(kernel_id, mode)` → String (port)
- `engine_terminate(port)` → Boolean
- `engine_send_message(port, message)` → Boolean

**File Operations**:
- `files_select_chrome()` → String (executable_path)
- `files_export_results(execution_id, format)` → String (file_path)

## Support

- **Documentation**: [docs.traceforge.com](https://docs.traceforge.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/traceforge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/traceforge/discussions)
- **Email**: support@traceforge.com

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, coding standards, and pull request process.
