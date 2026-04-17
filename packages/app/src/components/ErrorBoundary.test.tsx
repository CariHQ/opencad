/**
 * ErrorBoundary component tests
 * T-UI-010: Error boundary catches rendering errors
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, PanelErrorBoundary } from './ErrorBoundary';

// Component that throws on demand
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render error');
  return <div>Healthy content</div>;
}

describe('T-UI-010: ErrorBoundary', () => {
  // Suppress expected console.error output from React error boundaries
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('shows default fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('shows the error message in the fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Test render error/i)).toBeInTheDocument();
  });

  it('shows a Retry button when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('uses custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test render error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('Retry button resets to showing children', () => {
    // After Retry, the ErrorBoundary resets — if the child no longer throws it renders normally
    // We render a stateful wrapper so we can control the throw after reset
    let toggleThrow: (v: boolean) => void;

    function Wrapper() {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      toggleThrow = setShouldThrow;
      return (
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }

    render(<Wrapper />);
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    // Fix the throwing component and click Retry
    toggleThrow!(false);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText('Healthy content')).toBeInTheDocument();
  });

  it('shows warning icon in default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('⚠')).toBeInTheDocument();
  });
});

describe('PanelErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <PanelErrorBoundary>
        <span>Panel content</span>
      </PanelErrorBoundary>
    );
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('shows panel error fallback when child throws', () => {
    render(
      <PanelErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </PanelErrorBoundary>
    );
    expect(screen.getByText(/Panel failed to load/i)).toBeInTheDocument();
  });
});
