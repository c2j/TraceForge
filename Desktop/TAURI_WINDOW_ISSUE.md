# 🔧 Tauri Window Not Opening - Troubleshooting

## Problem

You ran `npm run tauri:dev`, but you see a browser window at `http://localhost:1421/` instead of the Tauri desktop window.

## Symptoms

- Logs show: `Protocol: "http:"` (should be `tauri://`)
- Browser window opens instead of desktop app
- Tauri process is running but no visible window

## Solutions

### Solution 1: Find and Open Tauri Window ✅

**macOS**:
```bash
# Check if Tauri window is running in background
ps aux | grep "TraceForge Desktop"

# Force bring to front (optional)
open -a "TraceForge Desktop"
```

**Windows**:
```bash
# Check running processes
tasklist | findstr "TraceForge"

# Try to find the window
# It might be minimized or in the background
```

**Linux**:
```bash
# Check running processes
ps aux | grep "TraceForge Desktop"

# Try to bring window to front
wmctrl -a "TraceForge Desktop"
```

### Solution 2: Check Tauri Window in Dock (macOS)

1. Look at your macOS Dock
2. Find "TraceForge Desktop" icon
3. Click it to bring window to front
4. The window might be hidden or minimized

### Solution 3: Restart with Clean State

```bash
# Stop current process (Ctrl+C in terminal)

# Kill any lingering Tauri processes
pkill -f "TraceForge Desktop"

# Restart
npm run tauri:dev
```

### Solution 4: Check for Window Configuration Issues

Edit `Desktop/src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "windows": [
      {
        "title": "TraceForge Desktop",
        "width": 1200,
        "height": 800,
        "visible": true,  // ← Make sure this is true
        "center": true,
        "decorations": true
      }
    ]
  }
}
```

### Solution 5: Check for Build Cache Issues

```bash
# Clean Rust build cache
cd src-tauri
cargo clean
cd ..

# Restart
npm run tauri:dev
```

## Verification

Once Tauri window is open, check console logs:

**✅ Correct (Tauri window)**:
```
[Tauri] Protocol: tauri:
[Tauri] ✅ Detected via protocol
```

**❌ Incorrect (Browser window)**:
```
[Tauri] Protocol: http:
[Tauri] ❌ Not detected
```

## Common Issues

### Issue: Window opens but immediately closes

**Cause**: JavaScript error or unhandled exception
**Fix**: Check browser console for errors, check Rust backend logs

### Issue: Window opens but is blank

**Cause**: Vite dev server not running or wrong port
**Fix**: Make sure Vite is running on http://localhost:1421

### Issue: Multiple windows open

**Cause**: Browser window + Tauri window both open
**Fix**: Close the browser window, keep only Tauri window

## Get More Logs

Enable verbose logging:

```bash
RUST_LOG=debug npm run tauri:dev
```

Check Tauri logs:
- **macOS**: `~/Library/Logs/TraceForge Desktop/`
- **Windows**: `%APPDATA%\TraceForge Desktop\logs\`
- **Linux**: `~/.local/share/TraceForge Desktop/logs/`

## Still Having Issues?

1. Check terminal output for any error messages
2. Check browser console (F12) for JavaScript errors
3. Try clean rebuild:
   ```bash
   cargo clean && npm run tauri:dev
   ```
4. Report issue with:
   - Terminal output
   - Browser console logs
   - Tauri logs (from logs folder)
