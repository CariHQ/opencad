# CONTRIBUTING.md

Thank you for your interest in contributing to OpenCAD! 🏗️

OpenCAD is an open-source, browser-native, AI-powered BIM platform that combines the accessibility of Figma with the feature depth of Archicad. We welcome contributions from architects, engineers, developers, designers, and anyone passionate about making professional architectural tools accessible to everyone.

This document provides guidelines and expectations for contributing to the project. Please read it before submitting your first contribution.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Development Environment](#development-environment)
  - [Project Structure](#project-structure)
  - [Building the Project](#building-the-project)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Contributing Code](#contributing-code)
  - [Contributing Documentation](#contributing-documentation)
  - [Contributing Tests](#contributing-tests)
- [Test-Driven Development](#test-driven-development)
  - [The TDD Workflow](#the-tdd-workflow)
  - [Writing Tests](#writing-tests)
  - [Test Categories](#test-categories)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
  - [TypeScript](#typescript)
  - [Rust](#rust)
  - [Commit Messages](#commit-messages)
- [Architecture Decision Records](#architecture-decision-records)
- [Community](#community)
- [Recognition](#recognition)

---

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms. In short: be respectful, be inclusive, and focus on the work.

---

## Getting Started

### Development Environment

**Prerequisites:**

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22+ | JavaScript runtime |
| pnpm | 10+ | Package manager |
| Rust | 1.80+ | Geometry kernel, desktop backend |
| wasm-pack | 0.13+ | WASM builds |
| Tauri CLI | 2.0+ | Desktop development |
| Git | 2.40+ | Version control |

**Quick Start:**

```bash
# Clone the repository
git clone https://github.com/CariHQ/opencad.git
cd opencad

# Install dependencies
pnpm install

# Build WASM geometry kernel
pnpm build:wasm

# Start browser development server
pnpm dev:browser

# Start desktop development (in another terminal)
pnpm dev:desktop

# Run all tests
pnpm test
```

### Project Structure

```
opencad/
├── packages/
│   ├── ui/                 # React components (shared browser + desktop)
│   ├── geometry/           # WASM geometry kernel (Rust → WASM)
│   ├── document/           # CRDT document model
│   ├── rendering/          # 2D/3D rendering engine
│   ├── ai/                 # AI orchestration layer
│   ├── sync/               # Cloud sync engine
│   ├── import-export/      # File format parsers
│   └── plugin-sdk/         # Plugin development kit
├── apps/
│   ├── browser/            # Browser app (Vite + PWA)
│   └── desktop/            # Desktop app (Tauri v2)
│       └── src-tauri/      # Rust backend for desktop
├── e2e/                    # End-to-end tests (Playwright)
├── benchmarks/             # Performance benchmarks
├── docs/                   # Documentation
│   ├── architecture/       # Architecture decision records
│   ├── api/                # API documentation
│   └── guides/             # User and developer guides
├── scripts/                # Build and utility scripts
└── PRD.md                  # Product Requirements Document
```

### Building the Project

```bash
# Full build (all packages + both apps)
pnpm build

# Build specific package
pnpm --filter @opencad/geometry build

# Build browser app only
pnpm --filter @opencad/browser build

# Build desktop app (produces .dmg/.exe/.deb)
pnpm --filter @opencad/desktop tauri build

# Check everything compiles
pnpm check
```

---

## How to Contribute

### Reporting Bugs

Before reporting a bug:

1. **Search existing issues** — check [GitHub Issues](https://github.com/CariHQ/opencad/issues) to avoid duplicates
2. **Reproduce on latest** — verify the bug exists on the `main` branch
3. **Gather information** — collect steps to reproduce, environment details, screenshots

**File a bug report** using our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md):

- Clear title: `[component] Brief description of the bug`
- Steps to reproduce (numbered, specific)
- Expected vs. actual behavior
- Environment (OS, browser, version)
- Screenshots/screen recordings if applicable
- Severity assessment (blocks workflow / annoying / cosmetic)

**Example:**

```
Title: [geometry] Boolean union fails on overlapping boxes with shared faces

Steps to Reproduce:
1. Create Box A: 10x10x10 at origin
2. Create Box B: 10x10x10 at (5, 0, 0)
3. Select both → Boolean → Union

Expected: Single manifold solid with volume = 1500
Actual: Error "Non-manifold topology" in console

Environment: macOS 14.2, Chrome 120, OpenCAD 0.3.1
Severity: Blocks workflow (cannot merge overlapping volumes)
```

### Suggesting Features

1. **Check the PRD** — review [PRD.md](PRD.md) to see if the feature is already planned
2. **Search existing issues** — check if someone already suggested it
3. **Consider scope** — is this core functionality or a plugin?

**File a feature request** using our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md):

- Clear problem statement (what pain point does this solve?)
- Proposed solution
- Alternatives considered
- Impact (who benefits? how many users?)
- Complexity estimate (small/medium/large)

### Contributing Code

#### Finding Work

| Where | What |
|-------|------|
| [`good first issue`](https://github.com/CariHQ/opencad/labels/good%20first%20issue) | Beginner-friendly tasks |
| [`help wanted`](https://github.com/CariHQ/opencad/labels/help%20wanted) | Areas where we need contributors |
| [`test: missing`](https://github.com/CariHQ/opencad/labels/test:%20missing) | Write tests for existing code |
| [`docs`](https://github.com/CariHQ/opencad/labels/docs) | Documentation improvements |
| [PRD.md](PRD.md) | Planned features with test specifications |

#### Claiming an Issue

1. Comment on the issue: `"I'd like to work on this"`
2. A maintainer will assign it to you
3. Create a branch: `feature/your-feature-name` or `fix/bug-description`
4. Reference the issue in your branch name: `fix/123-boolean-union-manifold`

#### The Golden Rule: Tests First

**We do not accept production code without tests.** Every PR must:

1. Include failing tests first (TDD)
2. Implement code to pass tests
3. Maintain or improve coverage

See [Test-Driven Development](#test-driven-development) below.

### Contributing Documentation

Documentation is as important as code. We welcome:

- **API docs** — JSDoc for TypeScript, rustdoc for Rust
- **User guides** — How to use features
- **Developer guides** — How to contribute, architecture
- **Tutorials** — Step-by-step walkthroughs
- **PRD updates** — Clarifications, new sections

Documentation lives in `docs/`. Use Markdown with clear headings.

### Contributing Tests

If you're not ready to contribute features, writing tests is the best way to help:

- Find untested code paths
- Add property-based tests with `fast-check`
- Write E2E tests for user workflows
- Create geometry stress tests
- Add visual regression tests

See [Test Categories](#test-categories) for details.

---

## Test-Driven Development

### The TDD Workflow

OpenCAD follows strict TDD. The workflow for every change is:

```
1. RED:   Write a failing test that describes the desired behavior
2. GREEN: Write the minimal code to make the test pass
3. REFACTOR: Clean up the code while keeping tests passing
4. REPEAT
```

**No exceptions.** Even for bug fixes:
1. Write a test that reproduces the bug (should fail)
2. Fix the bug (test should pass)
3. Refactor if needed

### Writing Tests

**Test file location:** Next to the source file with `.test.ts` or `.test.rs` suffix.

```
packages/geometry/src/
├── boolean.ts
├── boolean.test.ts        # Unit tests
├── boolean.integration.test.ts  # Integration tests
└── boolean.bench.ts       # Performance benchmarks
```

**Test naming:** Descriptive, behavior-focused names.

```typescript
// ✅ Good: describes the behavior
test('union of two overlapping boxes produces a manifold solid')

// ❌ Bad: implementation detail
test('testBooleanUnion')

// ✅ Good: includes edge case
test('extrude with zero height returns empty solid')

// ❌ Bad: vague
test('extrude works')
```

### Test Categories

| Category | Framework | Location | When to Run |
|----------|-----------|----------|-------------|
| **Unit Tests** | Vitest (TS) / cargo test (Rust) | `*.test.ts`, `*_test.rs` | Every commit |
| **Integration Tests** | Vitest + Testing Library | `*.integration.test.ts` | Every PR |
| **E2E Tests** | Playwright | `e2e/**/*.spec.ts` | Every PR |
| **Property Tests** | fast-check | Alongside unit tests | Every PR |
| **Performance Tests** | Custom benchmarks | `benchmarks/**/*.bench.ts` | Nightly |
| **Visual Regression** | Playwright + Percy | `e2e/visual/**/*.spec.ts` | Every PR |
| **Accessibility Tests** | axe-core + Playwright | `e2e/a11y/**/*.spec.ts` | Every PR |

**Coverage Requirements:**

| Module | Minimum | Critical Paths |
|--------|---------|----------------|
| Document Model | 95% | 100% |
| Geometry Kernel | 90% | 100% (topological ops) |
| Sync Engine | 95% | 100% (conflict resolution) |
| Storage Layer | 90% | 100% (data persistence) |
| AI Services | 80% | 95% (code compliance rules) |
| UI Components | 85% | 90% |
| Plugin Runtime | 95% | 100% (sandbox enforcement) |
| Import/Export | 90% | 95% (IFC schema compliance) |

---

## Pull Request Process

### Before Submitting

- [ ] Tests written and passing (`pnpm test`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Code formatted (`pnpm format`)
- [ ] Commit messages follow [Conventional Commits](#commit-messages)
- [ ] PR description explains the "why" (not just the "what")
- [ ] Screenshots included for UI changes
- [ ] Documentation updated if behavior changed

### PR Size

| Size | Lines Changed | Review Time | Guidance |
|------|---------------|-------------|----------|
| **Small** | < 200 | < 30 min | ✅ Preferred |
| **Medium** | 200–500 | 30–60 min | ✅ Acceptable |
| **Large** | 500–1000 | 60–120 min | ⚠️ Consider splitting |
| **Very Large** | > 1000 | > 120 min | ❌ Must split |

**If your PR is large:**
- Split into stacked PRs (each independently reviewable)
- Use draft PRs for work-in-progress
- Ask maintainers for guidance early

### Review Process

1. **Automated checks** — CI runs tests, lint, typecheck
2. **Maintainer review** — At least one maintainer approves
3. **Address feedback** — Make requested changes, re-request review
4. **Merge** — Maintainer merges (squash merge preferred)
5. **Cleanup** — Delete branch after merge

### Review Expectations

- **Response time:** Maintainers aim to review within 48 hours
- **Feedback:** Be open to constructive criticism
- **Disagreements:** Discuss respectfully; maintainer has final say
- **Abandoned PRs:** If no activity for 30 days, maintainer may reassign

---

## Coding Standards

### TypeScript

- **Strict mode** — `strict: true` in `tsconfig.json`
- **No `any`** — Use `unknown` if type is truly unknown
- **Explicit return types** — On public functions
- **Interfaces over types** — For object shapes
- **Functional style** — Prefer immutable data, pure functions
- **Error handling** — Use `Result<T, E>` pattern, not throw/catch for expected errors

```typescript
// ✅ Good
interface WallProps {
  readonly length: Millimeters;
  readonly height: Millimeters;
  readonly thickness: Millimeters;
  readonly material: MaterialId;
}

function createWall(props: WallProps): Result<Wall, GeometryError> { ... }

// ❌ Bad
function createWall(props: any): any { ... }
```

### Rust

- **Edition 2024** — Latest Rust edition
- **Clippy** — `cargo clippy -- -D warnings`
- **rustfmt** — `cargo fmt` before committing
- **Error handling** — `thiserror` for library errors, `anyhow` for apps
- **No `unwrap()`** — Use `expect("clear reason")` or proper error handling
- **Documentation** — `///` doc comments on all public items

```rust
// ✅ Good
/// Represents a topological error in boolean operations.
#[derive(Debug, thiserror::Error)]
pub enum TopologyError {
    #[error("Result is non-manifold: {reason}")]
    NonManifold { reason: String },
    #[error("Euler-Poincaré formula violated: V-E+F={actual}, expected 2")]
    EulerViolation { actual: i64 },
}

// ❌ Bad
fn do_thing() {
    let result = thing.unwrap(); // Why would this fail?
}
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, no logic change) |
| `refactor` | Code refactor (no behavior change) |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `ci` | CI/CD changes |
| `chore` | Maintenance tasks |

**Examples:**

```
feat(geometry): add fillet operation for edge rounding

fix(sync): prevent stale changes from overwriting server state

test(document): add property-based tests for CRDT merge

docs(contributing): clarify TDD workflow for bug fixes

perf(rendering): use BVH spatial index for 10x faster picking
```

---

## Architecture Decision Records

Significant technical decisions are documented as Architecture Decision Records (ADRs) in `docs/architecture/`.

**Template:**

```markdown
# ADR-NNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Context:** What is the issue that we're seeing that is motivating this decision?
**Decision:** What is the change that we're proposing and/or doing?
**Consequences:** What becomes easier or more difficult to do because of this change?
**Alternatives Considered:** What other options did we consider?
```

Before creating a new ADR, discuss in a GitHub Issue first.

---

## Community

### Communication Channels

| Channel | Purpose |
|---------|---------|
| [GitHub Discussions](https://github.com/CariHQ/opencad/discussions) | Questions, ideas, showcase |
| [GitHub Issues](https://github.com/CariHQ/opencad/issues) | Bugs, feature requests |
| [Discord](https://discord.gg/opencad) | Real-time chat |
| [Community Calls](https://calendar.opencad.archi) | Monthly video meetup |

### Governance

OpenCAD follows a [meritocratic governance model](GOVERNANCE.md). In brief:

- **Contributors** — Anyone who contributes code, docs, or community support
- **Maintainers** — Contributors with merge access, chosen by existing maintainers
- **Lead Maintainer** — Coordinates releases, roadmap, community communication
- **Technical Steering Committee** — Maintainers who make architecture decisions

Decisions are made through consensus. If consensus cannot be reached, maintainers vote (simple majority).

### Becoming a Maintainer

Contributors who demonstrate consistent, high-quality contributions may be invited as maintainers:

- 10+ merged PRs of good quality
- Active in code review and discussions
- Understanding of project architecture and goals
- Endorsed by 2+ existing maintainers

---

## Recognition

All contributors are recognized in:

- **CONTRIBUTORS.md** — List of all contributors
- **Release notes** — Contributors mentioned in each release
- **Project website** — Hall of fame page
- **Annual report** — Yearly community summary

We follow [all-contributors](https://allcontributors.org/) specification to recognize all types of contributions:

| Type | Emoji | Description |
|------|-------|-------------|
| Code | 💻 | Code contributions |
| Tests | 🧪 | Test contributions |
| Docs | 📖 | Documentation |
| Design | 🎨 | Visual/UX design |
| Ideas | 💡 | Feature ideas |
| Review | 👀 | Pull request reviews |
| Bug Reports | 🐛 | Bug reports |
| Question | 💬 | Answering questions |
| Talk | 📢 | Giving talks about OpenCAD |
| Infrastructure | 🚇 | CI/CD, devops |

---

## Questions?

If you have questions not covered here:

1. Check [GitHub Discussions](https://github.com/CariHQ/opencad/discussions)
2. Ask in [Discord](https://discord.gg/opencad)
3. Open a [Discussion Issue](https://github.com/CariHQ/opencad/issues/new?template=discussion.md)

Thank you for contributing to OpenCAD! 🏗️
