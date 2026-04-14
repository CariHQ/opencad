/**
 * Three.js Viewport Lazy Loader
 * Uses React.lazy + Suspense to defer the Three.js bundle until 3D view is first shown.
 * Issue #6: Code splitting for Three.js
 */

import React, { Suspense, lazy } from 'react';
import type { ViewPreset } from '../hooks/useThreeViewport';

const LazyThreeViewportInner = lazy(() =>
  import('./ThreeViewportInner').then((m) => ({ default: m.ThreeViewportInner }))
);

interface ThreeViewportLoaderProps {
  onViewChange?: (preset: ViewPreset) => void;
  fallback?: React.ReactNode;
}

export function ThreeViewportLoader({ onViewChange, fallback }: ThreeViewportLoaderProps) {
  const loadingFallback = fallback ?? (
    <div
      className="viewport-loading"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        color: 'var(--color-text-muted)',
      }}
    >
      Loading 3D view…
    </div>
  );

  return (
    <Suspense fallback={loadingFallback}>
      <LazyThreeViewportInner onViewChange={onViewChange} />
    </Suspense>
  );
}
