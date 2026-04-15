import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MaterialLibrary } from './MaterialLibrary';

describe('T-MAT-001: MaterialLibrary', () => {
  const defaultProps = {
    onSelect: vi.fn(),
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

  it('calls onSelect when a material is clicked', () => {
    render(<MaterialLibrary {...defaultProps} />);
    const firstSelect = screen.getAllByRole('button', { name: /select/i })[0];
    fireEvent.click(firstSelect!);
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
