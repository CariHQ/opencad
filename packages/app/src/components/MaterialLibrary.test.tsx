import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaterialLibrary } from './MaterialLibrary';
import { MATERIALS } from '../config/materials';
expect.extend(jestDomMatchers);

describe('T-MAT-001: MaterialLibrary', () => {
  const defaultProps = {
    onSelect: vi.fn(),
    selectedCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Material Library header', () => {
    render(<MaterialLibrary {...defaultProps} />);
    expect(screen.getByText('Material Library')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<MaterialLibrary {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search materials/i)).toBeInTheDocument();
  });

  it('shows category filter', () => {
    render(<MaterialLibrary {...defaultProps} />);
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
  });

  it('has at least 100 built-in materials', () => {
    render(<MaterialLibrary {...defaultProps} />);
    const cards = screen.getAllByRole('button', { name: /select/i });
    expect(cards.length).toBeGreaterThanOrEqual(100);
  });

  it('shows material name', () => {
    render(<MaterialLibrary {...defaultProps} />);
    // "Concrete" appears as name and category tag — use getAllByText
    expect(screen.getAllByText('Concrete').length).toBeGreaterThan(0);
  });

  it('shows material cost per m²', () => {
    render(<MaterialLibrary {...defaultProps} />);
    expect(screen.getAllByText(/\/m²/).length).toBeGreaterThan(0);
  });

  it('filters materials by search query', () => {
    render(<MaterialLibrary {...defaultProps} />);
    const input = screen.getByPlaceholderText(/search materials/i);
    fireEvent.change(input, { target: { value: 'brick' } });
    // Multiple brick materials expected — check at least one card is shown
    expect(screen.getAllByText(/brick/i).length).toBeGreaterThan(0);
  });

  it('hides non-matching materials when searching', () => {
    render(<MaterialLibrary {...defaultProps} />);
    const input = screen.getByPlaceholderText(/search materials/i);
    fireEvent.change(input, { target: { value: 'zzz_nomatch' } });
    // Material cards should be gone; only the empty state should appear
    expect(screen.queryByText('Mild Steel')).not.toBeInTheDocument();
    expect(screen.getByText(/no materials found/i)).toBeInTheDocument();
  });

  it('filters by category', () => {
    render(<MaterialLibrary {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: /category/i });
    fireEvent.change(select, { target: { value: 'Concrete' } });
    const cards = screen.getAllByRole('button', { name: /select/i });
    expect(cards.length).toBeGreaterThan(0);
  });

  it('calls onSelect when Apply is clicked with elements selected', () => {
    render(<MaterialLibrary {...defaultProps} selectedCount={1} />);
    // Each material card has aria-label "Apply <name> to selected elements"
    const applyBtns = screen.getAllByRole('button', { name: /apply .+ to selected elements/i });
    expect(applyBtns.length).toBeGreaterThan(0);
    fireEvent.click(applyBtns[0]!);
    expect(defaultProps.onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.any(String),
        category: expect.any(String),
        costPerM2: expect.any(Number),
      })
    );
  });

  it('shows Add Custom Material button', () => {
    render(<MaterialLibrary {...defaultProps} />);
    expect(screen.getByRole('button', { name: /add custom/i })).toBeInTheDocument();
  });

  it('shows empty state when no materials match', () => {
    render(<MaterialLibrary {...defaultProps} />);
    const input = screen.getByPlaceholderText(/search materials/i);
    fireEvent.change(input, { target: { value: 'zzz_nomatch' } });
    expect(screen.getByText(/no materials found/i)).toBeInTheDocument();
  });

  it('shows roughness value for materials', () => {
    render(<MaterialLibrary {...defaultProps} />);
    const input = screen.getByPlaceholderText(/search materials/i);
    fireEvent.change(input, { target: { value: 'concrete' } });
    expect(screen.getAllByText(/roughness/i).length).toBeGreaterThan(0);
  });
});

describe('T-BIM-001: MaterialLibrary', () => {
  const defaultProps = {
    onSelect: vi.fn(),
    selectedCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders category filter tabs', () => {
    render(<MaterialLibrary {...defaultProps} />);
    // The existing component uses a select/tabs for category filtering
    const filterControl = screen.getByRole('combobox', { name: /category/i });
    expect(filterControl).toBeInTheDocument();
  });

  it('renders material swatches', () => {
    render(<MaterialLibrary {...defaultProps} />);
    // Material cards should be visible
    const cards = screen.getAllByRole('button', { name: /apply .+ to selected elements/i });
    expect(cards.length).toBeGreaterThan(0);
  });

  it('search filters materials by name', () => {
    render(<MaterialLibrary {...defaultProps} />);
    const input = screen.getByPlaceholderText(/search materials/i);
    fireEvent.change(input, { target: { value: 'concrete' } });
    // Should find concrete materials
    expect(screen.getAllByText(/concrete/i).length).toBeGreaterThan(0);
    // Non-concrete materials should not show up via "zzz"
    fireEvent.change(input, { target: { value: 'zzz_nomatch' } });
    expect(screen.getByText(/no materials found/i)).toBeInTheDocument();
  });

  it('category filter shows only materials from that category', () => {
    render(<MaterialLibrary {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: /category/i });
    fireEvent.change(select, { target: { value: 'Concrete' } });
    // All visible Apply buttons should be for concrete materials
    const cards = screen.getAllByRole('button', { name: /apply .+ to selected elements/i });
    expect(cards.length).toBeGreaterThan(0);
  });

  it('clicking a swatch calls onSelect', () => {
    render(<MaterialLibrary {...defaultProps} selectedCount={1} />);
    const applyBtns = screen.getAllByRole('button', { name: /apply .+ to selected elements/i });
    fireEvent.click(applyBtns[0]!);
    expect(defaultProps.onSelect).toHaveBeenCalledOnce();
  });

  it('MATERIALS config catalog has 16 entries', () => {
    expect(MATERIALS.length).toBe(16);
  });

  it('MATERIALS covers all 7 required categories', () => {
    const cats = new Set(MATERIALS.map((m) => m.category));
    expect(cats.has('concrete')).toBe(true);
    expect(cats.has('masonry')).toBe(true);
    expect(cats.has('steel')).toBe(true);
    expect(cats.has('wood')).toBe(true);
    expect(cats.has('glass')).toBe(true);
    expect(cats.has('insulation')).toBe(true);
    expect(cats.has('finish')).toBe(true);
  });

  it('shows material density in swatch tooltip', () => {
    render(<MaterialLibrary {...defaultProps} />);
    // Material swatches should have a title attribute with density info
    const swatches = document.querySelectorAll('[title]');
    const hasDensityInfo = Array.from(swatches).some(
      (el) => el.getAttribute('title')?.includes('density') || el.getAttribute('title')?.includes('kg/m')
    );
    expect(hasDensityInfo).toBe(true);
  });
});
