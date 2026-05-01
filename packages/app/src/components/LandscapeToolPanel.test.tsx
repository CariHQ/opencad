import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LandscapeToolPanel } from './LandscapeToolPanel';
import { useDocumentStore, isDocumentReadOnly } from '../stores/documentStore';

expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../stores/documentStore')>();
  return {
    ...actual,
    useDocumentStore: vi.fn(),
    isDocumentReadOnly: vi.fn().mockReturnValue(false),
  };
});

const MOCK_MANIFEST = {
  version: '1.0.0',
  assets: [
    {
      id: 'tree_oak',
      displayNameKey: 'landscape.species.oakTree',
      tab: 'trees',
      path: 'assets/landscape/starter/tree_oak',
      lods: { hi: 'hi.glb', mid: 'mid.glb', lo: 'lo.glb' },
      impostor: null,
      triangleBudget: { hi: 12000, mid: 6000, lo: 1800 },
      license: 'CC0',
      source: 'Poly Haven',
      author: 'Poly Haven Contributors',
      thumbnail: null,
    },
    {
      id: 'tree_pine',
      displayNameKey: 'landscape.species.pineTree',
      tab: 'trees',
      path: 'assets/landscape/starter/tree_pine',
      lods: { hi: 'hi.glb', mid: 'mid.glb', lo: 'lo.glb' },
      impostor: null,
      triangleBudget: { hi: 10000, mid: 5000, lo: 1500 },
      license: 'CC0',
      source: 'Poly Haven',
      author: 'Poly Haven Contributors',
      thumbnail: null,
    },
    {
      id: 'rock_granite',
      displayNameKey: 'landscape.species.graniteRock',
      tab: 'rocks',
      path: 'assets/landscape/starter/rock_granite',
      lods: { hi: 'hi.glb', mid: 'mid.glb', lo: 'lo.glb' },
      impostor: null,
      triangleBudget: { hi: 4000, mid: 2000, lo: 600 },
      license: 'CC0',
      source: 'Poly Haven',
      author: 'Poly Haven Contributors',
      thumbnail: null,
    },
  ],
};

function makeStore(overrides = {}) {
  return {
    document: {
      id: 'doc1',
      organization: { layers: { l1: { id: 'l1', name: 'Default', color: '#888', visible: true, locked: false, order: 0 } }, levels: {} },
      content: { elements: {} },
      library: {},
    },
    addElement: vi.fn().mockReturnValue('el-1'),
    pushHistory: vi.fn(),
    ...overrides,
  };
}

describe('T-SITE-02: LandscapeToolPanel', () => {
  beforeEach(() => {
    vi.mocked(useDocumentStore).mockImplementation((selector: (s: ReturnType<typeof makeStore>) => unknown) =>
      selector(makeStore())
    );
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(MOCK_MANIFEST),
    } as Response);
  });

  it('renders the panel region', () => {
    render(<LandscapeToolPanel />);
    expect(screen.getByRole('region', { name: /landscape/i })).toBeInTheDocument();
  });

  it('shows all 5 tab buttons', () => {
    render(<LandscapeToolPanel />);
    expect(screen.getByRole('tab', { name: /trees/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /shrubs/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /rocks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /furniture/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /people/i })).toBeInTheDocument();
  });

  it('trees tab is active by default', () => {
    render(<LandscapeToolPanel />);
    expect(screen.getByRole('tab', { name: /trees/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('loads and renders tree thumbnails from manifest', async () => {
    render(<LandscapeToolPanel />);
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    expect(screen.getByRole('option', { name: /oak/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /pine/i })).toBeInTheDocument();
  });

  it('switching to rocks tab shows rock assets', async () => {
    render(<LandscapeToolPanel />);
    await waitFor(() => screen.getAllByRole('option'));
    fireEvent.click(screen.getByRole('tab', { name: /rocks/i }));
    await waitFor(() => expect(screen.getByRole('option', { name: /granite/i })).toBeInTheDocument());
  });

  it('clicking a thumbnail arms the place tool', async () => {
    render(<LandscapeToolPanel />);
    await waitFor(() => screen.getAllByRole('option'));
    fireEvent.click(screen.getByRole('option', { name: /oak/i }));
    expect(screen.getByRole('option', { name: /oak/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows status bar when armed', async () => {
    render(<LandscapeToolPanel />);
    await waitFor(() => screen.getAllByRole('option'));
    fireEvent.click(screen.getByRole('option', { name: /oak/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('clicking armed thumbnail again disarms it', async () => {
    render(<LandscapeToolPanel />);
    await waitFor(() => screen.getAllByRole('option'));
    fireEvent.click(screen.getByRole('option', { name: /oak/i }));
    fireEvent.click(screen.getByRole('option', { name: /oak/i }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('R key rotates by +45 degrees', async () => {
    render(<LandscapeToolPanel />);
    await waitFor(() => screen.getAllByRole('option'));
    fireEvent.click(screen.getByRole('option', { name: /oak/i }));
    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByRole('status').textContent).toContain('45°');
  });

  it('Shift+R rotates by −45 degrees', async () => {
    render(<LandscapeToolPanel />);
    await waitFor(() => screen.getAllByRole('option'));
    fireEvent.click(screen.getByRole('option', { name: /oak/i }));
    fireEvent.keyDown(window, { key: 'R', shiftKey: true });
    expect(screen.getByRole('status').textContent).toContain('315°');
  });

  it('Esc key disarms the place tool', async () => {
    render(<LandscapeToolPanel />);
    await waitFor(() => screen.getAllByRole('option'));
    fireEvent.click(screen.getByRole('option', { name: /oak/i }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('is disabled in read-only mode — hides tab bar', () => {
    vi.mocked(isDocumentReadOnly).mockReturnValue(true);
    render(<LandscapeToolPanel />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('shows empty state when no document', () => {
    vi.mocked(useDocumentStore).mockImplementation((selector: (s: ReturnType<typeof makeStore>) => unknown) =>
      selector(makeStore({ document: null }))
    );
    render(<LandscapeToolPanel />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
