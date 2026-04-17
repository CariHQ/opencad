/**
 * T-MEP-002: ClashDetectionPanel component tests
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClashDetectionPanel } from './ClashDetectionPanel';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore');
vi.mock('../utils/clashDetection', () => ({
  detectClashes: vi.fn().mockReturnValue([
    {
      id: 'clash-1',
      elementAId: 'wall-1',
      elementBId: 'column-1',
      severity: 'hard',
      description: 'Hard clash between wall "wall-1" and column "column-1"',
      location: { x: 2500, y: 0, z: 1500 },
    },
  ]),
  ClashSeverity: { Hard: 'hard', Soft: 'soft' },
}));

function makeStore(overrides = {}) {
  return {
    document: {
      id: 'proj-1',
      name: 'Test',
      content: {
        elements: {
          'wall-1': {
            id: 'wall-1', type: 'wall', layerId: 'l1',
            geometry: { type: 'wall', startPoint: { x: 0, y: 0, z: 0 }, endPoint: { x: 5000, y: 0, z: 0 }, thickness: 200, height: 3000 },
            properties: {}, metadata: { createdAt: 0, updatedAt: 0, createdBy: 'u', version: 1 },
          },
          'column-1': {
            id: 'column-1', type: 'column', layerId: 'l1',
            geometry: { type: 'column', position: { x: 2500, y: 0, z: 0 }, width: 400, depth: 400, height: 3000 },
            properties: {}, metadata: { createdAt: 0, updatedAt: 0, createdBy: 'u', version: 1 },
          },
        },
        spaces: {},
      },
      organization: { layers: {}, levels: {} },
      presentation: { views: {}, annotations: {} },
      library: { materials: {} },
      version: { clock: {} },
      metadata: { createdAt: 0, updatedAt: 0, createdBy: 'u', schemaVersion: '1.0.0' },
    },
    selectedIds: [],
    setSelectedIds: vi.fn(),
    ...overrides,
  };
}

describe('T-MEP-002: ClashDetectionPanel', () => {
  beforeEach(() => {
    vi.mocked(useDocumentStore).mockReturnValue(makeStore() as never);
  });

  it('renders panel title', () => {
    render(<ClashDetectionPanel />);
    expect(screen.getByText('Clash Detection')).toBeInTheDocument();
  });

  it('renders Run Clash Detection button', () => {
    render(<ClashDetectionPanel />);
    expect(screen.getByRole('button', { name: /run clash detection/i })).toBeInTheDocument();
  });

  it('shows empty state before running detection', () => {
    render(<ClashDetectionPanel />);
    expect(screen.getByText(/no clashes detected|run detection to check/i)).toBeInTheDocument();
  });

  it('shows clash results after running detection', () => {
    render(<ClashDetectionPanel />);
    fireEvent.click(screen.getByRole('button', { name: /run clash detection/i }));
    expect(screen.getByText(/1 clash/i)).toBeInTheDocument();
  });

  it('displays clash description in results', () => {
    render(<ClashDetectionPanel />);
    fireEvent.click(screen.getByRole('button', { name: /run clash detection/i }));
    expect(screen.getByText(/wall.*column|column.*wall/i)).toBeInTheDocument();
  });

  it('shows hard clash severity badge', () => {
    render(<ClashDetectionPanel />);
    fireEvent.click(screen.getByRole('button', { name: /run clash detection/i }));
    expect(screen.getAllByText(/hard/i).length).toBeGreaterThan(0);
  });

  it('clicking clash selects the involved elements', () => {
    const store = makeStore();
    vi.mocked(useDocumentStore).mockReturnValue(store as never);
    render(<ClashDetectionPanel />);
    fireEvent.click(screen.getByRole('button', { name: /run clash detection/i }));
    const clashItem = screen.getByText(/wall.*column|column.*wall/i).closest('[data-clash-id]') ||
      screen.getByText(/hard/i).closest('li') ||
      screen.getByText(/wall.*column|column.*wall/i).closest('li');
    if (clashItem) {
      fireEvent.click(clashItem);
    }
    // setSelectedIds should be called with the two element IDs
    expect(vi.mocked(store.setSelectedIds)).toHaveBeenCalledWith(
      expect.arrayContaining(['wall-1', 'column-1'])
    );
  });

  it('shows 0 clashes message when no clashes found', async () => {
    const mod = await import('../utils/clashDetection');
    vi.mocked(mod.detectClashes).mockReturnValueOnce([]);
    render(<ClashDetectionPanel />);
    fireEvent.click(screen.getByRole('button', { name: /run clash detection/i }));
    expect(screen.getByText(/0 clashes|no clashes/i)).toBeInTheDocument();
  });
});
