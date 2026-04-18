/**
 * T-MEP-001: ClashPanel component tests
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClashPanel } from './ClashPanel';
import type { Clash } from '../lib/clashDetection';
expect.extend(jestDomMatchers);

const MOCK_CLASHES: Clash[] = [
  {
    elementAId: 'wall-1',
    elementBId: 'duct-1',
    severity: 'hard',
    overlapVolume: 0.25,
  },
  {
    elementAId: 'column-1',
    elementBId: 'pipe-1',
    severity: 'soft',
    overlapVolume: 0,
  },
];

describe('T-MEP-001: ClashPanel', () => {
  const onRunDetection = vi.fn().mockReturnValue(MOCK_CLASHES);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Run Clash Detection button', () => {
    render(<ClashPanel onRunDetection={onRunDetection} />);
    expect(screen.getByTestId('run-clash-btn')).toBeInTheDocument();
  });

  it('renders clash table after running detection', () => {
    render(<ClashPanel onRunDetection={onRunDetection} />);
    fireEvent.click(screen.getByTestId('run-clash-btn'));
    expect(screen.getByTestId('clash-table')).toBeInTheDocument();
  });

  it('clash-count shows correct number of clashes', () => {
    render(<ClashPanel onRunDetection={onRunDetection} />);
    fireEvent.click(screen.getByTestId('run-clash-btn'));
    const count = screen.getByTestId('clash-count');
    expect(count.textContent).toMatch(/2/);
  });

  it('hard clashes are visually distinguished (red row)', () => {
    render(<ClashPanel onRunDetection={onRunDetection} />);
    fireEvent.click(screen.getByTestId('run-clash-btn'));
    const table = screen.getByTestId('clash-table');
    const hardRows = table.querySelectorAll('.clash-hard');
    expect(hardRows.length).toBeGreaterThan(0);
  });

  it('soft clashes are visually distinguished (amber row)', () => {
    render(<ClashPanel onRunDetection={onRunDetection} />);
    fireEvent.click(screen.getByTestId('run-clash-btn'));
    const table = screen.getByTestId('clash-table');
    const softRows = table.querySelectorAll('.clash-soft');
    expect(softRows.length).toBeGreaterThan(0);
  });

  it('Export CSV button is present after detection', () => {
    render(<ClashPanel onRunDetection={onRunDetection} />);
    fireEvent.click(screen.getByTestId('run-clash-btn'));
    expect(screen.getByTestId('export-clash-csv')).toBeInTheDocument();
  });
});
