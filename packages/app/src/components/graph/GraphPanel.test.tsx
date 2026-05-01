import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GraphPanel } from './GraphPanel';
import type { GraphDefinition } from '@opencad/document';

expect.extend(jestDomMatchers);

// @xyflow/react needs ResizeObserver as a constructor
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

function makeGraph(overrides: Partial<GraphDefinition> = {}): GraphDefinition {
  return {
    id: 'g1',
    name: 'Test Graph',
    nodes: [],
    edges: [],
    ...overrides,
  };
}

describe('T-EXT-02: GraphPanel', () => {
  let onSave: ReturnType<typeof vi.fn>;
  beforeEach(() => { onSave = vi.fn(); });

  it('renders the graph panel region', () => {
    render(<GraphPanel graph={makeGraph()} onSave={onSave} />);
    expect(screen.getByRole('region', { name: /visual programming graph/i })).toBeInTheDocument();
  });

  it('shows category buttons in toolbar', () => {
    render(<GraphPanel graph={makeGraph()} onSave={onSave} />);
    expect(screen.getByRole('button', { name: /geometry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transforms/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /boolean/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /parametric/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /document/i })).toBeInTheDocument();
  });

  it('opens palette when category button clicked', () => {
    render(<GraphPanel graph={makeGraph()} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /^geometry$/i }));
    expect(screen.getByRole('listbox', { name: /geometry nodes/i })).toBeInTheDocument();
  });

  it('closes palette when category button clicked again', () => {
    render(<GraphPanel graph={makeGraph()} onSave={onSave} />);
    const btn = screen.getByRole('button', { name: /^geometry$/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.queryByRole('listbox', { name: /geometry nodes/i })).not.toBeInTheDocument();
  });

  it('palette lists geometry nodes', () => {
    render(<GraphPanel graph={makeGraph()} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /^geometry$/i }));
    expect(screen.getByRole('option', { name: /Point/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Box/i })).toBeInTheDocument();
  });

  it('palette lists parametric nodes', () => {
    render(<GraphPanel graph={makeGraph()} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /^parametric$/i }));
    expect(screen.getByRole('option', { name: /Number Slider/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Expression/i })).toBeInTheDocument();
  });
});
