# CONTRIBUTING.md

# Contributing to OpenCAD

Thank you for your interest in contributing to OpenCAD! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Setup

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/opencad.git
   cd opencad
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Build all packages:

   ```bash
   pnpm build
   ```

5. Run tests to verify setup:
   ```bash
   pnpm test
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

### TDD Workflow

We follow Test-Driven Development. See [TDD_GUIDE.md](docs/TDD_GUIDE.md) for details.

**Quick Summary:**

1. Write a failing test (Red)
2. Write minimal code to pass (Green)
3. Refactor while keeping tests passing (Blue)
4. Repeat

### Commit Messages

Follow conventional commits:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `test: add tests`
- `refactor: restructure code`
- `chore: update dependencies`

### Pull Request Process

1. Create a new branch from `develop`
2. Write tests for your changes
3. Ensure all tests pass
4. Update documentation if needed
5. Submit a pull request

## Package Structure

```
packages/
├── shared/       # Shared types and utilities
├── document/     # CRDT document model
├── geometry/     # WASM geometry kernel
├── ai/           # AI orchestration
├── sync/         # Cloud sync
├── app/          # Browser application
└── desktop/      # Tauri desktop app
```

## Testing

```bash
# Run all tests
pnpm test

# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

## Code Style

- Use TypeScript strict mode
- Follow existing code conventions
- Run linting before committing:

  ```bash
  pnpm lint
  ```

- Format code before committing:
  ```bash
  pnpm format
  ```

## Documentation

- Update relevant documentation for new features
- Add JSDoc comments for public APIs
- Include test coverage for new functionality

## Reporting Issues

When reporting issues, include:

- OpenCAD version
- Browser/OS information
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
