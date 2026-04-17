import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SiteImportPanel } from './SiteImportPanel';
expect.extend(jestDomMatchers);

describe('T-GIS-001: SiteImportPanel', () => {
  const onImport = vi.fn();
  const onSearch = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders Site Import header', () => {
    render(<SiteImportPanel onImport={onImport} onSearch={onSearch} />);
    expect(screen.getByText(/site import/i)).toBeInTheDocument();
  });

  it('shows address/coordinate search input', () => {
    render(<SiteImportPanel onImport={onImport} onSearch={onSearch} />);
    expect(screen.getByPlaceholderText(/address|coordinates|location/i)).toBeInTheDocument();
  });

  it('shows Search button', () => {
    render(<SiteImportPanel onImport={onImport} onSearch={onSearch} />);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('calls onSearch with query when Search clicked', () => {
    render(<SiteImportPanel onImport={onImport} onSearch={onSearch} />);
    fireEvent.change(screen.getByPlaceholderText(/address|coordinates|location/i), { target: { value: 'London, UK' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(onSearch).toHaveBeenCalledWith('London, UK');
  });

  it('shows OpenStreetMap source option', () => {
    render(<SiteImportPanel onImport={onImport} onSearch={onSearch} />);
    expect(screen.getAllByText(/openstreetmap|osm/i).length).toBeGreaterThan(0);
  });

  it('shows data layer checkboxes', () => {
    render(<SiteImportPanel onImport={onImport} onSearch={onSearch} />);
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('shows Import Site Data button', () => {
    render(<SiteImportPanel onImport={onImport} onSearch={onSearch} />);
    expect(screen.getByRole('button', { name: /import site/i })).toBeInTheDocument();
  });

  it('calls onImport with selected layers when Import clicked', () => {
    render(<SiteImportPanel onImport={onImport} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: /import site/i }));
    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({ layers: expect.any(Array) }));
  });

  it('shows terrain and buildings layer options', () => {
    render(<SiteImportPanel onImport={onImport} onSearch={onSearch} />);
    expect(screen.getAllByText(/terrain|buildings|roads/i).length).toBeGreaterThan(0);
  });
});
