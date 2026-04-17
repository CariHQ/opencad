/// <reference types="@testing-library/jest-dom" />

// Re-export jest-dom matchers into Vitest's Assertion interface so TypeScript
// recognises toBeInTheDocument, toHaveValue, toHaveClass, etc. in all test files.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Assertion<T = unknown> extends TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, void> {}
}
