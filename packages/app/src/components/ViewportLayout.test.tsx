/**
 * T-VP-001: Multi-viewport split view (1–4 viewports)
 * Tests for ViewportLayout and ViewportSplitControl
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewportLayout } from './ViewportLayout';
import { ViewportSplitControl } from './ViewportSplitControl';
import type { ViewportCount } from './ViewportLayout';
expect.extend(jestDomMatchers);

describe('T-VP-001: ViewportLayout', () => {
  it('T-VP-001-001: renders 1 child when count=1', () => {
    render(
      <ViewportLayout count={1}>
        {(index) => <div data-testid={`pane-${index}`}>Pane {index}</div>}
      </ViewportLayout>,
    );
    expect(screen.getAllByTestId(/^pane-/)).toHaveLength(1);
  });

  it('T-VP-001-002: renders 2 children when count=2', () => {
    render(
      <ViewportLayout count={2}>
        {(index) => <div data-testid={`pane-${index}`}>Pane {index}</div>}
      </ViewportLayout>,
    );
    expect(screen.getAllByTestId(/^pane-/)).toHaveLength(2);
  });

  it('T-VP-001-003: renders 4 children when count=4', () => {
    render(
      <ViewportLayout count={4}>
        {(index) => <div data-testid={`pane-${index}`}>Pane {index}</div>}
      </ViewportLayout>,
    );
    expect(screen.getAllByTestId(/^pane-/)).toHaveLength(4);
  });

  it('T-VP-001-004: each child slot receives its index (0-based)', () => {
    render(
      <ViewportLayout count={4}>
        {(index) => <div data-testid={`pane-${index}`}>Pane {index}</div>}
      </ViewportLayout>,
    );
    expect(screen.getByTestId('pane-0')).toBeInTheDocument();
    expect(screen.getByTestId('pane-1')).toBeInTheDocument();
    expect(screen.getByTestId('pane-2')).toBeInTheDocument();
    expect(screen.getByTestId('pane-3')).toBeInTheDocument();
  });
});

describe('T-VP-001: ViewportSplitControl', () => {
  it('T-VP-001-005: renders 3 buttons', () => {
    render(<ViewportSplitControl activeCount={1} onCountChange={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByTestId('split-1')).toBeInTheDocument();
    expect(screen.getByTestId('split-2')).toBeInTheDocument();
    expect(screen.getByTestId('split-4')).toBeInTheDocument();
  });

  it('T-VP-001-006: clicking split-2 calls onCountChange(2)', () => {
    const onCountChange = vi.fn();
    render(<ViewportSplitControl activeCount={1} onCountChange={onCountChange} />);
    fireEvent.click(screen.getByTestId('split-2'));
    expect(onCountChange).toHaveBeenCalledWith(2);
  });

  it('T-VP-001-007: clicking split-4 calls onCountChange(4)', () => {
    const onCountChange = vi.fn();
    render(<ViewportSplitControl activeCount={1} onCountChange={onCountChange} />);
    fireEvent.click(screen.getByTestId('split-4'));
    expect(onCountChange).toHaveBeenCalledWith(4);
  });

  it('T-VP-001-008: active button has aria-pressed="true"', () => {
    render(<ViewportSplitControl activeCount={2 as ViewportCount} onCountChange={vi.fn()} />);
    expect(screen.getByTestId('split-2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('split-1')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('split-4')).toHaveAttribute('aria-pressed', 'false');
  });
});
