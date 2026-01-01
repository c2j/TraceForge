# Research: ForgeEngine & ForgeAgent Technology Decisions

**Feature**: 002-engine-agent | **Date**: 2026-01-01

## Overview

This document captures research findings and technology decisions for the ForgeEngine & ForgeAgent implementation. All decisions are based on the feature specification and design document requirements.

---

## Decision 1: WebSocket Communication Framework

**Decision**: FastAPI + WebSockets

**Rationale**:
- Native async support, excellent for I/O-bound WebSocket operations
- Built-in connection management and middleware
- Automatic API documentation generation
- Performance: Easily handles 50+ messages/second requirement
- Industry standard with strong community support
- Integrates seamlessly with Pydantic for request/response validation

**Alternatives Considered**:
1. **aiohttp + websockets**:
   - Pros: Lightweight, mature
   - Cons: More boilerplate for connection management, no built-in validation

2. **Custom WebSocket server (asyncio only)**:
   - Pros: Maximum control
   - Cons: Reimplements middleware, error handling, connection management - high risk

**Best Practices**:
- Use single WebSocket connection per Desktop client
- Implement connection manager for broadcasting (if needed in future)
- Add graceful shutdown handler
- Use JSON serialization with compression for binary data (screenshots)

---

## Decision 2: Browser Automation Framework

**Decision**: Playwright (Python)

**Rationale**:
- Auto-waiting mechanisms reduce flaky tests (matches spec fault tolerance requirement)
- Built-in tracing capabilities for debugging (spec requirement)
- Multi-locator strategy support (role, text, css, xpath, id)
- Headful/headless mode support (spec requirement)
- Chrome 86+ custom kernel support (spec requirement)
- Network event listeners for auto-wait detection
- Excellent Python API and documentation

**Alternatives Considered**:
1. **Selenium WebDriver**:
   - Pros: Mature, widespread use
   - Cons: No built-in auto-waiting, weaker tracing, flakier tests

2. **Puppeteer (via Pyppeteer)**:
   - Pros: Node.js port, good performance
   - Cons: Python bindings less mature, less documentation

**Best Practices**:
- Use BrowserContext persistence for performance (spec requirement)
- Enable Playwright trace for all recording and execution sessions
- Implement locator fallback strategy: role → text → css → xpath → id
- Use networkidle wait condition as default
- Handle browser crashes with retry logic

---

## Decision 3: Database Technology

**Decision**: SQLite3 (embedded)

**Rationale**:
- Zero-configuration, embedded database (spec requirement for standalone executable)
- Sufficient scale: 100-1000 execution records, kernel configs, settings
- Fast for read-heavy workloads
- Cross-platform support
- No external dependencies
- Easy to backup/restore (single file)

**Alternatives Considered**:
1. **PostgreSQL**:
   - Pros: More powerful, concurrent writes
   - Cons: Requires separate process,部署复杂, overkill for local caching

2. **DuckDB**:
   - Pros: Fast analytics
   - Cons: Less mature, not optimized for OLTP

**Best Practices**:
- Use SQLAlchemy ORM for type-safe queries
- Implement connection pooling (single connection for SQLite)
- Add foreign key constraints for data integrity
- Implement automatic cleanup of old execution records (Desktop: 100, Agent: 1000)
- Add indexes on frequently queried fields (created_at, script_id)

---

## Decision 4: Packaging and Distribution

**Decision**: PyInstaller --onefile

**Rationale**:
- Industry standard for Python executables
- Single executable deployment (spec requirement)
- Supports bundling dependencies (Playwright, Chrome)
- Cross-platform support (Windows, macOS, Linux)
- Mature and stable

**Alternatives Considered**:
1. **cx_Freeze**:
   - Pros: Similar functionality
   - Cons: Less maintained, smaller community

2. **Nuitka**:
   - Pros: Compiles to C for performance
   - Cons: Slower build, less stable, not necessary for I/O-bound app

**Best Practices**:
- Use --onefile for standalone executable
- Include Playwright bundled Chrome to avoid user dependency issues
- Add UPX compression (optional, smaller executable)
- Test on all target platforms (Windows, macOS, Linux)
- Include executable metadata (version, icon)

---

## Decision 5: Authentication Mechanism

**Decision**: API Key/Token (Agent mode only)

**Rationale**:
- Simple to implement (from clarification: Desktop mode no auth, Agent mode API Key)
- Sufficient for trusted environment
- Easy to revoke and rotate
- No dependency on external auth services
- Meets spec requirement: Server API Key/Token authentication

**Alternatives Considered**:
1. **mTLS (Mutual TLS)**:
   - Pros: Production-grade security
   - Cons: Complex certificate management, overkill for current scope

2. **OAuth2**:
   - Pros: Standard protocol
   - Cons: Requires authorization server, overkill for Server-Agent communication

**Best Practices**:
- Store API Key in environment variable or config file
- Include API Key in WebSocket handshake headers
- Implement key validation on Server side (Agent client responsibility)
- Support key rotation without restart
- Log authentication failures (without exposing keys)

---

## Decision 6: Testing Framework

**Decision**: pytest + pytest-asyncio + pytest-mock

**Rationale**:
- Industry standard for Python testing
- Native async test support (pytest-asyncio)
- Excellent mocking capabilities (pytest-mock)
- Plugin ecosystem (coverage, xdist, etc.)
- Clear and readable test syntax

**Alternatives Considered**:
1. **unittest (built-in)**:
   - Pros: No dependency
   - Cons: Verbose, no native async support, less features

2. **pytest + pytest-asyncio (industry standard)**: CHOSEN

**Best Practices**:
- >80% test coverage goal
- Unit tests for all core logic
- Integration tests for WebSocket workflows
- Contract tests for WebSocket message format
- Mock Playwright browser interactions in unit tests
- Use real browser in integration tests (headless)

---

## Decision 7: Logging and Observability

**Decision**: Python logging module + structured JSON logs

**Rationale**:
- Built-in Python logging
- Structured JSON logs for easy parsing
- Separate log levels for production vs development
- Supports log rotation to avoid disk space issues

**Best Practices**:
- Use structured logging with consistent fields (timestamp, level, module, session_id)
- Separate log files for Engine components (WebSocket, Browser, Recorder, Executor)
- Implement log rotation (max 10MB per file, keep 5 files)
- Include correlation_id for tracing WebSocket requests
- Log health_check latency for monitoring
- Log browser session lifecycle (create, close, crash)

---

## Decision 8: Concurrent Execution (Agent Mode)

**Decision**: asyncio with asyncio.Semaphore(5)

**Rationale**:
- Native Python async concurrency
- Semaphore limits to 5 concurrent sessions (spec requirement)
- Non-blocking I/O for WebSocket operations
- Efficient for I/O-bound tasks (browser automation)

**Best Practices**:
- Use asyncio.Semaphore(5) to limit concurrent tasks
- Implement graceful degradation when all slots occupied
- Queue incoming tasks beyond semaphore limit
- Monitor active task count in heartbeat
- Implement task cancellation for graceful shutdown

---

## Dependency Best Practices

### FastAPI
- Use dependency injection for database connections
- Implement middleware for WebSocket connection lifecycle
- Use Pydantic models for request/response validation
- Handle CORS if needed (localhost-only for Desktop mode)

### Playwright
- Always use async context managers for browser contexts
- Implement browser crash detection and restart
- Use browser.new_context() with persistent storage
- Enable tracing for all recording/execution sessions
- Handle playwright.async_timeout exceptions

### SQLite
- Use WAL mode for better concurrency
- Implement connection pooling (single connection for SQLite)
- Add foreign key constraints
- Use parameterized queries to prevent SQL injection
- Implement VACUUM for database compaction

### Pydantic
- Use Pydantic v2 with model_validate() for JSON parsing
- Implement custom validators for complex fields (locators, parameters)
- Use BaseModel for all WebSocket message types
- Add Field() descriptions for API documentation

---

## Security Considerations

### Desktop Mode
- **Assumption**: Trusted localhost environment (no authentication)
- **Mitigation**: Bind to 127.0.0.1 only
- **Validation**: Verify all incoming WebSocket message types
- **Sanitization**: Validate all script JSON structure before execution

### Agent Mode
- **Authentication**: API Key/Token in WebSocket handshake
- **TLS**: Use WSS (WebSocket Secure) if Server requires
- **Key Management**: Never log API Keys, rotate periodically
- **Input Validation**: Validate all tasks from Server

### General
- **No Code Execution**: Engine never executes arbitrary code from Desktop/Server
- **Sandbox**: Browser automation only, no file system access beyond artifacts
- **Rate Limiting**: Limit WebSocket message rate (50 msg/s per connection)
- **Resource Limits**: Timeout all Playwright operations

---

## Performance Targets

From spec success criteria:
- **Health Check**: <100ms p95 (99% success rate)
- **Message Throughput**: 50 WebSocket messages/second
- **Concurrent Sessions**: 5 (Agent mode), 1 (Desktop mode)
- **Execution Success Rate**: 95% with locator fallback
- **Data-Driven**: 100 rows in 10 minutes (6 seconds/row)
- **Registration**: Agent registers with Server within 2 seconds

**Performance Optimization Strategies**:
- Use async I/O throughout
- Cache kernel configurations
- Reuse BrowserContext instances
- Compress screenshots (JPEG) before transmission
- Use binary WebSocket messages for screenshots (chunked if large)
- Implement connection pooling for SQLite
- Lazy load Playwright browser instances

---

## Open Questions Resolved

All technical decisions have been made. No open questions remain.

---

## Conclusion

All technology decisions align with feature specification requirements and follow industry best practices. The chosen stack (FastAPI + Playwright + SQLite + PyInstaller) provides a robust foundation for a standalone browser automation executable with real-time WebSocket communication.

**Next Steps**:
1. Proceed to Phase 1: Design data model and contracts
2. Implement WebSocket message schema (ForgeWS protocol)
3. Define data models for Script, Scenario, Page, Action
4. Create quickstart guide for Engine and Agent modes
