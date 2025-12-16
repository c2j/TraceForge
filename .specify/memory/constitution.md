<!--
SYNC IMPACT REPORT - TraceForge Constitution v1.0.0
====================================================

Version Change: N/A (initial creation) → 1.0.0

Modified Principles:
- N/A (all new)

Added Sections:
- I. Code Repository & Branching Strategy (Git Flow Variant)
- II. Interface Contract First (NON-NEGOTIABLE)
- III. Version Management & Compatibility Commitment
- IV. Technology Stack & Dependency Locking
- V. Unified CI/CD Pipeline
- VI. Testing Strategy & Coverage Requirements
- VII. Observability, Logging & Error Tracking
- VIII. Communication & Decision Making Framework
- IX. Documentation Standards
- X. Quality Gates & Release Process
- Additional Constraints (Multi-Team Coordination, Security, Performance, Compliance)
- Development Workflow (Code Review, Testing Gates, Deployment Approval, Documentation)
- Governance (Constitution Authority, Amendment Process, Versioning Policy, Compliance Review, Guidance Integration, Enforcement)

Removed Sections:
- N/A (initial creation)

Templates Updated:
✅ .specify/templates/plan-template.md - Added TraceForge-specific Constitution Check items
✅ .specify/templates/spec-template.md - No changes needed (already generic)
✅ .specify/templates/tasks-template.md - No changes needed (already generic)

Documentation Updated:
✅ docs/design.md - Added constitution reference

Deferred Items:
- None

Key Compliance Gates Established:
- Interface Contract First (Principle II) - blocks all API development
- Technology Stack Locking (Principle IV) - prevents version drift
- Testing Coverage >80% (Principle VI) - ensures quality
- CI/CD Pipeline (Principle V) - enforces automation
- Quality Gates (Principle X) - prevents risky releases
-->

# TraceForge Constitution

## Core Principles

### I. Code Repository & Branching Strategy (Git Flow Variant)

Single monorepo structure with main (production) and develop (integration) branches. Feature branches follow `feature/xxx` pattern from develop. Release branches use `release/v1.0.x` with hotfix branches for critical fixes. **MANDATORY**: All pull requests require 2+ approvals and passing CI before merge. This ensures code quality, knowledge sharing, and prevents single points of failure across the multi-team, multi-technology-stack architecture (Tauri Desktop + Python Engine + Java Server).

### II. Interface Contract First (NON-NEGOTIABLE)

ForgeWS protocol defined via JSON schema with OpenAPI/asyncAPI specifications in a dedicated repository. Server REST interfaces use Spring Contract or OpenAPI to generate client/server stubs. **VIOLATION FORBIDDEN**: No interface changes permitted without first updating contracts, incrementing version numbers, and completing comprehensive review. This prevents integration failures across Rust/React/TS, Python, and Java boundaries.

### III. Version Management & Compatibility Commitment

Product follows Semantic Versioning: v1.0.0 overall. Sub-modules maintain independent versions (Desktop v1.0, Engine v1.1, Server v1.0). Maintain backward compatibility for at least 2 minor versions. Breaking changes require major version increments. Desktop must configure Engine/Server URLs to support older server versions. Ensures smooth upgrades across distributed teams and minimizes deployment friction.

### IV. Technology Stack & Dependency Locking

**MANDATORY VERSIONS**: Tauri 2.x, React 18, Playwright 1.48+, Spring Boot 3.2+, Python 3.12. Dependency management via npm lock (frontend), poetry lock (Python), Maven (Java). New technology adoption requires Architecture Group approval. Prevents version drift and compatibility issues across language boundaries (Rust/React/TS/Python/Java).

### V. Unified CI/CD Pipeline

GitHub Actions or GitLab CI with mandatory stages: PR requires lint + unit tests + build. Develop branch merge triggers integration tests with Engine + Server mocks. Main branch release produces Desktop installer + Docker Server + PyInstaller Engine. **ZERO TOLERANCE**: Red CI status blocks all merges. Ensures consistent quality across all components and automated deployment readiness.

### VI. Testing Strategy & Coverage Requirements

Unit test coverage: >80% (pytest for Python, JUnit for Java, Jest for TypeScript). Integration testing via contract tests for Engine WS (Pact or custom framework). E2E testing limited to smoke tests using Playwright on real browsers. Flake detection via nightly builds with >5% flakiness alert. Guarantees reliability across complex multi-language integration points.

### VII. Observability, Logging & Error Tracking

Unified JSON log format with trace_id correlation. Desktop: tauri-log to files. Engine: structlog. Server: logback with MDC. Centralized error tracking via Sentry with unified project across all modules. Enables end-to-end debugging across the distributed architecture and rapid incident response.

### VIII. Communication & Decision Making Framework

Weekly cross-team sync meetings for progress/blocker communication. Architecture Decision Records (ADR) required for major technology selections (e.g., "Why WebSocket over gRPC"). Documentation maintained by version in docs/v1, v2... directories. Ensures transparency and prevents knowledge silos across Desktop, Engine, and Server teams.

### IX. Documentation Standards

Each module requires independent README with API documentation (Engine: FastAPI Swagger, Server: SpringDoc). Architecture diagrams (draw.io) kept current. Deployment guides include agent one-click scripts and Desktop installer signing instructions. Critical for onboarding and maintaining velocity across distributed, multi-technology teams.

### X. Quality Gates & Release Process

Release candidates require: all tests green + performance regression <5% + security scan pass. Release approval: Technical Lead + Architect signatures. Gradual rollout: Server supports blue-green deployments, Desktop offers optional user updates. Balances innovation speed with production stability.

## Additional Constraints

**Multi-Team Coordination Requirements**: Separate teams for Desktop (Rust/React/TS), Engine (Python), Server (Java). Clear API boundaries. Regular synchronization points. Shared tooling where possible (testing frameworks, logging). Cross-team pair programming for critical integrations.

**Security Requirements**: All dependencies scanned via automated tools. Secret management via secure vault. Desktop app code signing. Server container image scanning. Regular penetration testing. Incident response plan documented.

**Performance Standards**: Desktop startup <3 seconds. Engine processing <100ms p95 for standard operations. Server response time <200ms p95. Memory footprint monitoring. Load testing for major releases.

**Compliance Standards**: Data retention policies documented. GDPR/CCPA compliance where applicable. Audit logs for sensitive operations. Regular compliance reviews.

## Development Workflow

**Code Review Requirements**: Minimum 2 reviewers per PR. Reviewers must understand affected components. Security-sensitive code requires security team review. 24-hour review window target. Blockers escalated immediately.

**Testing Gates**: Unit tests must pass before PR merge. Integration tests required for API changes. Performance benchmarks for performance-sensitive changes. Manual testing required for UI changes.

**Deployment Approval Process**: Staging deployment automatic on main merge. Production deployment requires approval chain: Developer → Team Lead → Architect. Emergency hotfixes follow expedited but documented approval.

**Documentation Updates**: Documentation must accompany all code changes. API changes require OpenAPI spec updates. Architecture changes require diagram updates. Breaking changes require migration guide.

## Governance

**Constitution Authority**: This constitution supersedes all other development practices. Deviations require Architecture Group approval with documented justification. All teams must verify compliance before feature implementation.

**Amendment Process**: Constitution changes require: (1) Proposal with rationale, (2) Cross-team review, (3) Architecture Group approval, (4) Migration plan for affected teams, (5) Documentation update.

**Versioning Policy**: Constitution follows Semantic Versioning. MAJOR: Backward incompatible governance changes or principle removal. MINOR: New principles or material guidance expansion. PATCH: Clarifications, wording, non-semantic refinements.

**Compliance Review**: Every implementation plan must include Constitution Check. Every feature specification must reference applicable principles. Every task list must include compliance tasks. Regular audits by Architecture Group.

**Guidance Integration**: Use this constitution in conjunction with `.specify/templates/plan-template.md`, `.specify/templates/spec-template.md`, and `.specify/templates/tasks-template.md`. All templates must align with constitution requirements.

**Enforcement**: Constitution violations block: PR merges, releases, deployments. Violations reported to Team Leads and Architecture Group. Repeat violations require team process improvement plan.

**Version**: 1.0.0 | **Ratified**: 2025-12-16 | **Last Amended**: 2025-12-16
