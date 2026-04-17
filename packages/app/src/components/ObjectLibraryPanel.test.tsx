import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { ObjectLibraryPanel } from './ObjectLibraryPanel';
import { useDocumentStore } from '../stores/documentStore';

vi.mock('../stores/documentStore');

const makeStore = (overrides = {}) => ({
  document: {
    id: 'doc-1',
    content: { elements: {}, spaces: {} },
    organization: { layers: { 'layer-1': { id: 'layer-1', name: 'Layer 1', color: '#000', visible: true, locked: false, order: 0 } }, levels: {} },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
    versions: [],
    vectorClock: {},
  },
  selectedIds: [],
  addElement: vi.fn().mockReturnValue('new-el-id'),
  pushHistory: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDocumentStore).mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
});

describe('T-OBJ-001: ObjectLibraryPanel', () => {
  it('renders the Object Library header', () => {
    render(<ObjectLibraryPanel />);
    expect(screen.getByText(/object library/i)).toBeInTheDocument();
  });

  it('shows a category filter', () => {
    render(<ObjectLibraryPanel />);
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
  });

  it('shows a search input', () => {
    render(<ObjectLibraryPanel />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('shows object cards', () => {
    render(<ObjectLibraryPanel />);
    const cards = screen.getAllByTestId('object-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('each object card has a Place button', () => {
    render(<ObjectLibraryPanel />);
    const buttons = screen.getAllByRole('button', { name: /place/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('filters objects by search text', () => {
    render(<ObjectLibraryPanel />);
    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: 'chair' } });
    const cards = screen.getAllByTestId('object-card');
    cards.forEach((card) => {
      expect(card.textContent?.toLowerCase()).toMatch(/chair/i);
    });
  });

  it('filters by category', () => {
    render(<ObjectLibraryPanel />);
    const select = screen.getByRole('combobox', { name: /category/i });
    fireEvent.change(select, { target: { value: 'Furniture' } });
    const cards = screen.getAllByTestId('object-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('shows empty state when search has no matches', () => {
    render(<ObjectLibraryPanel />);
    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: 'xyznothing123' } });
    expect(screen.getByText(/no objects found/i)).toBeInTheDocument();
  });

  it('calls addElement when Place is clicked', () => {
    const store = makeStore();
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<ObjectLibraryPanel />);
    const btn = screen.getAllByRole('button', { name: /place/i })[0]!;
    fireEvent.click(btn);
    expect(store.addElement).toHaveBeenCalled();
  });

  it('calls pushHistory after placing an object', () => {
    const store = makeStore();
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<ObjectLibraryPanel />);
    const btn = screen.getAllByRole('button', { name: /place/i })[0]!;
    fireEvent.click(btn);
    expect(store.pushHistory).toHaveBeenCalledWith(expect.stringMatching(/place/i));
  });

  it('shows object dimensions', () => {
    render(<ObjectLibraryPanel />);
    // dimensions shown as e.g. "900×850" or "W: 900"
    expect(screen.getAllByText(/\d+\s*[×x]\s*\d+|\bW\b.*\d+/i).length).toBeGreaterThan(0);
  });
});
