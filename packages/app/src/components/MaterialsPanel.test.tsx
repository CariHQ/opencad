/**
 * MaterialsPanel Tests
 * T-BIM-001: BIM material panel UI
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaterialsPanel } from './MaterialsPanel';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore');

const makeStore = (selectedIds: string[] = []) => ({
  document: {
    id: 'doc-1',
    content: { elements: {}, spaces: {} },
    organization: { layers: {}, levels: {} },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
    versions: [],
    vectorClock: {},
  },
  selectedIds,
  setSelectedIds: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDocumentStore).mockReturnValue(
    makeStore() as ReturnType<typeof useDocumentStore>,
  );
});

describe('T-BIM-001 MaterialsPanel', () => {
  it('renders material list', () => {
    render(<MaterialsPanel />);
    // Should show at least one material item from MATERIAL_LIBRARY
    const items = screen.getAllByTestId(/^material-item-/);
    expect(items.length).toBeGreaterThanOrEqual(10);
  });

  it('filter input narrows visible materials', () => {
    render(<MaterialsPanel />);
    const search = screen.getByTestId('materials-search');
    fireEvent.change(search, { target: { value: 'concrete' } });
    const items = screen.getAllByTestId(/^material-item-/);
    // Only concrete should match; items should be fewer than total 10
    expect(items.length).toBeGreaterThan(0);
    // All remaining should be concrete
    for (const item of items) {
      expect(item.textContent?.toLowerCase()).toContain('concrete');
    }
  });

  it('selecting a material shows its details', () => {
    render(<MaterialsPanel />);
    const items = screen.getAllByTestId(/^material-item-/);
    fireEvent.click(items[0]!);
    // detail panel should appear
    expect(screen.getByTestId('material-detail')).toBeInTheDocument();
  });

  it('assign button is disabled when no elements are selected in store', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore([]) as ReturnType<typeof useDocumentStore>,
    );
    render(<MaterialsPanel />);
    // Select a material first
    const items = screen.getAllByTestId(/^material-item-/);
    fireEvent.click(items[0]!);
    const btn = screen.getByTestId('assign-material-btn');
    expect(btn).toBeDisabled();
  });

  it('material categories are grouped with headings', () => {
    render(<MaterialsPanel />);
    // Should have category group headings
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('search is case-insensitive', () => {
    render(<MaterialsPanel />);
    const search = screen.getByTestId('materials-search');
    // Upper case search
    fireEvent.change(search, { target: { value: 'STEEL' } });
    const itemsUpper = screen.getAllByTestId(/^material-item-/);
    // lower case search
    fireEvent.change(search, { target: { value: 'steel' } });
    const itemsLower = screen.getAllByTestId(/^material-item-/);
    expect(itemsUpper.length).toBe(itemsLower.length);
    expect(itemsUpper.length).toBeGreaterThan(0);
  });
});
