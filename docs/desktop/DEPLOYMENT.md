# TraceForge Desktop - Deployment & Release Process

## Overview

This document describes the deployment and release process for TraceForge Desktop application.

## Prerequisites

### Development Environment
- Node.js 20+
- Rust 1.75+ with Cargo
- Git
- GitHub CLI (gh) - for creating releases

### Production Build Environment
- **Windows**: Visual Studio Build Tools + NSIS
- **macOS**: Xcode Command Line Tools + Xcode
- **Linux**: GCC, libwebkit2gtk, libssl-dev

### Code Signing (Optional)
- **Windows**: Code signing certificate from a CA
- **macOS**: Apple Developer certificate
- **Linux**: GPG key for signing

## Release Process

### 1. Version Bumping

Follow semantic versioning: `MAJOR.MINOR.PATCH`

```bash
# Example: Bump from 0.1.0 to 0.2.0
cd Desktop
npm version minor
```

Update version in:
- `Desktop/package.json`
- `Desktop/src-tauri/tauri.conf.json`
- `Desktop/src-tauri/Cargo.toml`

### 2. Update CHANGELOG.md

```markdown
## [0.2.0] - 2024-XX-XX

### Added
- New feature description

### Changed
- What changed

### Fixed
- Bug fix description

### Security
- Security fixes
```

### 3. Create Release Branch

```bash
git checkout -b release/v0.2.0
git add .
git commit -m "Release v0.2.0"
git push origin release/v0.2.0
```

### 4. Pull Request & Merge

1. Create PR from `release/v0.2.0` to `main`
2. Ensure all CI checks pass
3. Get code review approval
4. Merge PR

### 5. Tag Release

```bash
git checkout main
git pull
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

### 6. Create GitHub Release

```bash
# Using GitHub CLI
gh release create v0.2.0 \
  --title "TraceForge Desktop v0.2.0" \
  --notes "See CHANGELOG.md for details" \
  Desktop/src-tauri/target/release/bundle/*
```

Or create manually via GitHub UI:
1. Go to Releases page
2. Click "Draft a new release"
3. Select tag `v0.2.0`
4. Add release notes
5. Attach build artifacts
6. Click "Publish release"

## CI/CD Pipeline

The GitHub Actions pipeline (`.github/workflows/ci.yml`) automatically:

1. **On every push/PR**:
   - Runs lint checks (ESLint, TSC, cargo fmt, clippy)
   - Runs unit tests (Vitest + cargo test)
   - Runs E2E tests (Playwright)

2. **On release creation**:
   - Builds for all platforms (Windows, macOS, Linux)
   - Builds for all architectures (amd64, arm64)
   - Attaches artifacts to release

### Manual Trigger

You can also trigger builds manually:

```bash
# Via GitHub CLI
gh workflow run ci.yml

# Or via GitHub UI: Actions → CI/CD Pipeline → Run workflow
```

## Code Signing

### Windows Code Signing

```bash
# Install certificate to Windows certificate store
certutil -importPFX my-cert.pfx

# Update tauri.conf.json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
        "digestAlgorithm": "sha256"
      }
    }
  }
}
```

### macOS Code Signing

```bash
# Import Apple Developer certificate
security import certificate.p12 -k ~/Library/Keychains/login.keychain

# Update tauri.conf.json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name",
        "hardenedRuntime": true,
        "entitlements": "entitlements.plist"
      }
    }
  }
}
```

### Linux Package Signing

```bash
# Create GPG key if needed
gpg --gen-key

# Export key
gpg --export --armor your@email.com > public-key.gpg

# Sign package
rpkg --addsign package.rpm
```

## Local Build Process

### Development Build

```bash
cd Desktop
npm run tauri:dev
```

### Production Build

```bash
cd Desktop
npm run tauri build
```

Artifacts are produced in `Desktop/src-tauri/target/release/bundle/`

#### Windows
- `msi/` - Windows installer
- `nsis/` - NSIS installer
- `exe/` - Standalone executable

#### macOS
- `dmg/` - Disk image
- `app/` - Application bundle
- `macos/` - Raw binary

#### Linux
- `deb/` - Debian package
- `appimage/` - AppImage
- `bundle/` - AppImage

### Cross-Compilation

To build for other platforms:

```bash
# Set up cross-compilation environment
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Build for specific target
npm run tauri build -- --target x86_64-pc-windows-msvc
```

## Deployment Strategies

### Direct Download

Host built artifacts on GitHub Releases or a CDN:

```
https://github.com/org/repo/releases/latest/download/TraceForge-setup.exe
```

### Auto-Update (Future)

Configure Tauri updater:

```json
// tauri.conf.json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.your-domain.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

### Package Managers

#### Homebrew (macOS)
Create tap for formula:

```ruby
# Formula/traceforge.rb
class Traceforge < Formula
  desc "Test automation desktop application"
  homepage "https://github.com/org/traceforge"
  url "https://github.com/org/traceforge/releases/download/v0.2.0/TraceForge_0.2.0_amd64.dmg"
  sha256 "HASH"

  def install
    # Copy .app to /Applications
  end
end
```

#### Chocolatey (Windows)
Create package:

```xml
<!-- tools/chocolateyinstall.ps1 -->
$packageArgs = @{
  packageName   = 'traceforge'
  fileType      = 'msi'
  url           = 'https://github.com/org/traceforge/releases/download/v0.2.0/TraceForge_0.2.0_x64_en-US.msi'
  checksum      = 'HASH'
  checksumType  = 'sha256'
  silentArgs    = "/qn /norestart"
}

Install-ChocolateyPackage @packageArgs
```

#### Snap (Linux)
Create snapcraft.yaml:

```yaml
name: traceforge
version: '0.2.0'
summary: Test automation desktop app
description: |
  Automated testing with offline recording and multi-kernel support.

base: core22
grade: stable

apps:
  traceforge:
    command: bin/traceforge
    plugs:
      - network
      - network-bind

parts:
  traceforge:
    plugin: dump
    source: ./bundle/appimage
```

## Monitoring & Analytics

### Sentry Integration (Optional)

```bash
npm install @sentry/electron @sentry/tracing
```

```typescript
import * as Sentry from "@sentry/electron";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
  release: `traceforge@${APP_VERSION}`,
});
```

### Usage Analytics (Optional)

Track anonymous usage metrics:

```typescript
// PostHog, Plausible, or similar
analytics.track('app_started', {
  version: APP_VERSION,
  platform: os.platform(),
});
```

## Rollback Procedure

If a critical issue is found:

1. **Yank the release**: Remove from GitHub Releases
2. **Hotfix branch**: Create from previous tag
3. **Fix and test**: Apply fix, run full test suite
4. **New release**: Patch version (e.g., 0.2.1)
5. **Announcement**: Notify users of critical update

## Troubleshooting

### Build Failures

```bash
# Clean build artifacts
cd Desktop
rm -rf node_modules
rm -rf src-tauri/target
npm install

# Try again
npm run tauri build
```

### Code Signing Issues

```bash
# Verify certificate
# macOS
security find-identity -v -p codesigning

# Windows
certutil -store My

# Linux
gpg --list-keys
```

### Platform-Specific Issues

**macOS "unidentified developer"**:
- Right-click app → Open
- Or: `xattr -cr /path/to/TraceForge.app`

**Windows SmartScreen**:
- Click "More info" → "Run anyway"

**Linux permission denied**:
- `chmod +x TraceForge`
- Or install via .deb/.rpm package

## Release Checklist

- [ ] All tests passing
- [ ] Version bumped in all files
- [ ] CHANGELOG.md updated
- [ ] Commit messages follow conventional commits
- [ ] Tag created and pushed
- [ ] GitHub release created
- [ ] Artifacts attached
- [ ] Release notes published
- [ ] Documentation updated
- [ ] Users notified (email, Discord, etc.)
