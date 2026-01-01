# TraceForge Desktop

A powerful desktop application for test automation using Playwright, built with Tauri and React.

## Features

- **Offline Recording & Editing**: Record test scripts completely offline with our built-in recorder
- **Multi-Kernel Testing**: Run tests across multiple Chrome kernel versions for compatibility assurance
- **Visual Debugging**: Built-in trace viewer and screenshot comparison for easy debugging
- **Team Collaboration**: Sync scripts and results with your team server
- **Local-First Architecture**: Full offline capability with optional server synchronization

## Tech Stack

- **Backend**: Rust 1.75 with Tauri 1.8
- **Frontend**: React 18 + TypeScript 5.x
- **Styling**: Tailwind CSS + Shadcn/ui components
- **State Management**: Zustand
- **Database**: SQLite (via rusqlite)
- **Test Engine**: Playwright 1.48+ (via ForgeEngine)

## Prerequisites

- Node.js 20+
- Rust 1.75+
- Chrome 86+ (for test execution)

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/traceforge-desktop.git
cd traceforge-desktop/Desktop

# Install dependencies
npm install

# Install Rust dependencies (if not already installed)
cd src-tauri
cargo build
```

### Development

⚠️ **Important**: TraceForge is a Tauri desktop application and **must** be run with Tauri development server, not in browser mode.

```bash
# Start Tauri development server (includes backend + frontend) - CORRECT ✅
npm run tauri:dev

# OR using npx
npx tauri dev

# This will:
# 1. Start Rust backend (Tauri)
# 2. Start React frontend (Vite on port 1421)
# 3. Open desktop application window

# ❌ DO NOT USE (frontend only, no backend):
npm run dev
# This will cause "Tauri Environment Not Detected" error

# Run tests
npm test                    # Run unit tests
npm run test:coverage       # Run with coverage
npm run test:e2e            # Run E2E tests with Playwright
```

**See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed troubleshooting and common issues.**

### Building

```bash
# Build for production
npm run tauri:build

# Build for specific platform
npm run tauri:build -- --target universal-app-darwin    # macOS
npm run tauri:build -- --target nsis                  # Windows
npm run tauri:build -- --target deb                   # Linux
```

## Project Structure

```
Desktop/
├── src/                          # Frontend source
│   ├── components/              # React components
│   │   ├── ErrorBoundary.tsx   # Error handling
│   │   ├── TreeView.tsx        # Hierarchical tree view
│   │   ├── KernelSelector.tsx  # Kernel selection
│   │   └── ...
│   ├── pages/                   # Page components
│   │   ├── ForgeDashboard.tsx  # Dashboard
│   │   ├── ForgeRecorder.tsx   # Test recorder
│   │   ├── ForgeEditor.tsx     # Script editor
│   │   ├── ForgeResults.tsx    # Results viewer
│   │   ├── ForgeKernels.tsx    # Kernel management
│   │   └── ForgeSettings.tsx   # Settings
│   ├── services/                # Frontend services
│   │   ├── engineClient.ts     # WebSocket client
│   │   └── logger.ts           # Logging service
│   ├── stores/                  # Zustand state stores
│   │   ├── useForgeStore.ts    # Main application store
│   │   └── useSyncStore.ts     # Server sync store
│   ├── hooks/                   # Custom React hooks
│   ├── locales/                 # i18n translations
│   ├── lib/                     # Utilities and types
│   └── test/                    # Test utilities
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── commands/           # Tauri commands
│   │   │   ├── db.rs           # Database operations
│   │   │   ├── engine.rs       # Engine management
│   │   │   └── mod.rs          # Command module exports
│   │   ├── database/           # Database schema
│   │   ├── lib.rs              # Library entry point
│   │   └── main.rs             # Application entry
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Tauri configuration
│   └── icons/                  # Application icons
├── tests/                       # Test files
│   ├── unit/                   # Unit tests (Vitest)
│   ├── e2e/                    # E2E tests (Playwright)
│   └── contract/               # Contract tests
└── vitest.config.ts            # Vitest configuration
```

## Database Schema

The application uses SQLite with the following main entities:

- **Projects**: Top-level containers for test scripts
- **Scripts**: Test automation scripts
- **Scenarios**: Logical groupings of test steps
- **Pages**: Web pages being tested
- **Actions**: Individual test steps (click, type, wait, etc.)
- **Locators**: Element locator strategies
- **Kernels**: Chrome kernel versions for testing
- **Executions**: Test run results
- **ExecutionSteps**: Individual step results
- **DataTables**: Test data for data-driven testing

## Configuration

### Application Settings

Settings are stored in:
- **Windows**: `%APPDATA%\traceforge\`
- **macOS**: `~/Library/Application Support/traceforge/`
- **Linux**: `~/.local/share/traceforge/`

### Environment Variables

```bash
# Tauri
TAURI_DEV_HOST=localhost     # Development host for HMR

# Testing
VITE_TEST_TIMEOUT=10000     # Test timeout in ms
```

## Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- useForgeStore.test
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run specific test file
npx playwright test smoke.spec.ts

# Run with UI
npx playwright test --ui

# Run in headed mode
npx playwright test --headed
```

### Rust Tests

```bash
cd src-tauri
cargo test                  # Run all tests
cargo test --lib           # Run library tests only
cargo test -- --nocapture  # Show test output
```

## Troubleshooting

### Common Issues

**Application won't start**
- Ensure Rust and Node.js are properly installed
- Check that port 1420 is available
- Verify Tauri CLI is installed: `npm install -g @tauri-apps/cli`

**Tests fail to run**
- Make sure the dev server is running: `npm run tauri:dev`
- Check that Playwright browsers are installed: `npx playwright install`

**Kernel not detected**
- Verify Chrome is installed and in your PATH
- Check Chrome version is 86 or higher
- Try adding kernel manually in Settings

### Getting Help

- Check the [documentation](https://docs.traceforge.example.com)
- Report issues on [GitHub](https://github.com/your-org/traceforge-desktop/issues)
- Join our [Discord community](https://discord.gg/traceforge)

## Contributing

We welcome contributions! Please see our [contributing guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and write tests
4. Ensure all tests pass: `npm test && cargo test`
5. Commit your changes: `git commit -m "Add my feature"`
6. Push to the branch: `git push origin feature/my-feature`
7. Open a Pull Request

### Code Style

- **Rust**: Follow standard `cargo fmt` formatting
- **TypeScript/React**: Follow Prettier formatting
- Run `npm run format` before committing

## License

MIT License - see LICENSE file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Acknowledgments

- [Tauri](https://tauri.app/) - Cross-platform desktop framework
- [Playwright](https://playwright.dev/) - Test automation framework
- [React](https://react.dev/) - UI library
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

**Made with ❤️ by the TraceForge Team**
