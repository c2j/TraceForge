# 🚀 Quick Start Guide

## 📦 Prerequisites

Ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Rust** 1.75+ ([Install via rustup](https://rustup.rs/))
- **Chrome** 86+ (for test execution)

## ⚡ Getting Started in 3 Steps

### Step 1: Install Dependencies

```bash
cd Desktop
npm install
```

### Step 2: Start the Application

```bash
npm run tauri:dev
```

This will automatically:
- Start the Rust backend
- Start the React frontend
- Open the desktop application window

### Step 3: Start Using TraceForge

1. **Configure Chrome Kernel**: Go to Settings → Kernels → Add Chrome executable
2. **Record a Script**: Click "Quick Record" on Dashboard
3. **Edit & Execute**: Open script in Editor, make changes, and run

## ❗ Common Mistake

**❌ DO NOT use `npm run dev`**

```bash
npm run dev  # ❌ Wrong! This only starts frontend
```

This will cause:
- "Tauri Environment Not Detected" error
- No database access
- No file system access
- No Chrome integration

**✅ Always use `npm run tauri:dev`**

```bash
npm run tauri:dev  # ✅ Correct! Full desktop application
```

## 🛠️ Development

### Run Tests

```bash
# Unit tests
npm test

# E2E tests (requires app running)
npm run test:e2e

# Code linting
npm run lint
```

### Build for Production

```bash
# Build installers for your platform
npm run tauri:build

# Output locations:
# - Windows: src-tauri/target/release/bundle/msi/
# - macOS: src-tauri/target/release/bundle/dmg/
# - Linux: src-tauri/target/release/bundle/deb/
```

## 📚 More Resources

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Detailed development guide and troubleshooting
- **[README.md](./Desktop/README.md)** - Full project documentation
- **[Tauri Docs](https://tauri.app/v1/guides/)** - Official Tauri documentation
- **[Playwright Docs](https://playwright.dev/)** - Test automation framework

## 🆘 Need Help?

If you encounter issues:

1. **Check console logs** (terminal and browser DevTools)
2. **Read [DEVELOPMENT.md](./DEVELOPMENT.md)** for troubleshooting
3. **Check system requirements**: Node.js 18+, Rust 1.75+, Chrome 86+
4. **Verify dependencies**: Run `npm install` again
5. **Report issue**: Create an issue on GitHub with error details

## 💡 Tips

- First time running? Allow ~2-3 minutes for Rust compilation
- Port 1421 must be available (default Vite port)
- Chrome must be installed and accessible
- Database is stored in `~/Library/Application Support/traceforge/` (macOS)

---

**Happy Testing! 🎯**
