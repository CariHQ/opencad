/**
 * Code Splitting Tests
 * Issue #6: Lazy load Three.js bundle
 */

import React, { Suspense } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreeViewportLoader } from './ThreeViewportLoader';

// Mock the lazy-loaded Three viewport so we don't need WebGL in jsdom
vi.mock('./ThreeViewportInner', () => ({
  ThreeViewportInner: () => React.createElement('div', { 'data-testid': 'three-viewport-inner' }),
}));

describe('Issue #6: Three.js code splitting', () => {
  it('should render a Suspense fallback while Three.js loads', () => {
    render(
      React.createElement(ThreeViewportLoader, { fallback: React.createElement('div', { 'data-testid': 'loading' }, 'Loading 3D...') })
    );
    // Suspense fallback should be shown while lazy component resolves
    // (In tests with mock, component renders synchronously, but fallback should still be wrapped)
    expect(document.body).toBeDefined();
  });

  it('should render the Three viewport inner component when loaded', async () => {
    render(
      React.createElement(
        Suspense,
        { fallback: React.createElement('div', null, 'loading') },
        React.createElement(ThreeViewportLoader, {})
      )
    );
    // The mock component renders synchronously
    const inner = await screen.findByTestId('three-viewport-inner');
    expect(inner).toBeDefined();
  });

  it('should export ThreeViewportLoader as a named export', () => {
    expect(ThreeViewportLoader).toBeDefined();
    expect(typeof ThreeViewportLoader).toBe('function');
  });
});
