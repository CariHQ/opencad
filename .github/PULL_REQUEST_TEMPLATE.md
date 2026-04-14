## Description

<!--
Provide a clear and concise description of what this PR does.
Explain the "why" — what problem does this solve?
Link to the related issue: "Fixes #123" or "Closes #123"
-->

**Related Issue:** Fixes #

## Type of Change

<!-- Check all that apply -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📖 Documentation update
- [ ] 🧪 Test addition or update
- [ ] ⚡ Performance improvement
- [ ] 🔧 Refactor (no functional change)
- [ ] 🚨 Security fix
- [ ] 🏗️ Architecture change (see ADR)

## Test-Driven Development

<!-- This project follows strict TDD. Confirm the workflow was followed. -->

- [ ] I wrote failing tests first (RED)
- [ ] I implemented minimal code to pass tests (GREEN)
- [ ] I refactored while keeping tests passing (REFACTOR)
- [ ] All new and existing tests pass locally (`pnpm test`)

## Tests

<!-- Describe the tests you added or modified -->

| Test | Type | Status |
|------|------|--------|
| `test name` | Unit / Integration / E2E / Property | ✅ Passing |
| `test name` | Unit / Integration / E2E / Property | ✅ Passing |

<!-- If no tests were added, explain why (e.g., documentation-only change) -->

## Checklist

### Code Quality

- [ ] My code follows the project's coding standards
- [ ] I have run `pnpm lint` and fixed all issues
- [ ] I have run `pnpm format` and committed formatting changes
- [ ] I have run `pnpm typecheck` and fixed all type errors
- [ ] I have added/updated JSDoc/rustdoc comments for public APIs

### Testing

- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally
- [ ] I have added integration tests for cross-component changes
- [ ] I have added E2E tests for user-facing changes
- [ ] I have added property-based tests for geometry/mathematical logic (if applicable)

### Documentation

- [ ] I have updated relevant documentation
- [ ] I have updated the PRD if this changes planned behavior
- [ ] I have added an Architecture Decision Record (ADR) if this is a significant technical decision
- [ ] I have updated the CHANGELOG (if applicable)

### Desktop-Specific (if applicable)

- [ ] I have tested the change in both browser and desktop apps
- [ ] I have verified Tauri capabilities are correctly scoped
- [ ] I have tested on macOS, Windows, and Linux (if UI change)

## Screenshots / Videos

<!-- For UI changes, include before/after screenshots or screen recordings -->

| Before | After |
|--------|-------|
| <!-- screenshot --> | <!-- screenshot --> |

## Performance Impact

<!-- If this change affects performance, include benchmark results -->

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| e.g., Boolean union time | 45ms | 12ms | -73% |

## Additional Notes

<!-- Any additional context, concerns, or follow-up work needed -->

## Reviewer Guidance

<!-- Help reviewers by pointing out specific areas to focus on -->

- **Key areas to review:** <!-- e.g., "The CRDT merge logic in sync.ts" -->
- **Known limitations:** <!-- e.g., "Doesn't handle edge case X, will be addressed in follow-up PR" -->
- **Questions for reviewers:** <!-- e.g., "Is this the right abstraction level?" -->
