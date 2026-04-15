import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarketplacePanel, type MarketplaceItem } from './MarketplacePanel';

describe('T-MKTPL-001: MarketplacePanel', () => {
  const onInstall = vi.fn();
  const onPublish = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  const items: MarketplaceItem[] = [
    { id: 'pkg-1', name: 'Steel Column Library', author: 'StructuralCo', description: 'Standard steel column profiles.', version: '1.2.0', category: 'Structural', downloads: 1200, installed: false },
    { id: 'pkg-2', name: 'Door Families Pack', author: 'DoorWorks', description: 'Over 50 parametric door families.', version: '2.0.1', category: 'Architectural', downloads: 890, installed: true },
    { id: 'pkg-3', name: 'MEP Symbols', author: 'MEPLib', description: 'Complete set of MEP symbols.', version: '1.0.0', category: 'MEP', downloads: 500, installed: false },
  ];

  it('renders Marketplace header', () => {
    render(<MarketplacePanel items={items} onInstall={onInstall} onPublish={onPublish} />);
    expect(screen.getByText(/marketplace/i)).toBeInTheDocument();
  });

  it('shows component names', () => {
    render(<MarketplacePanel items={items} onInstall={onInstall} onPublish={onPublish} />);
    expect(screen.getByText('Steel Column Library')).toBeInTheDocument();
    expect(screen.getByText('Door Families Pack')).toBeInTheDocument();
  });

  it('shows Install button for uninstalled items', () => {
    render(<MarketplacePanel items={items} onInstall={onInstall} onPublish={onPublish} />);
    expect(screen.getAllByRole('button', { name: /install/i }).length).toBeGreaterThan(0);
  });

  it('shows Installed badge for installed items', () => {
    render(<MarketplacePanel items={items} onInstall={onInstall} onPublish={onPublish} />);
    expect(screen.getByText(/installed/i)).toBeInTheDocument();
  });

  it('calls onInstall with item when Install clicked', () => {
    render(<MarketplacePanel items={items} onInstall={onInstall} onPublish={onPublish} />);
    fireEvent.click(screen.getAllByRole('button', { name: /install/i })[0]!);
    expect(onInstall).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }));
  });

  it('shows search input', () => {
    render(<MarketplacePanel items={items} onInstall={onInstall} onPublish={onPublish} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('filters items by search', () => {
    render(<MarketplacePanel items={items} onInstall={onInstall} onPublish={onPublish} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'column' } });
    expect(screen.getByText('Steel Column Library')).toBeInTheDocument();
    expect(screen.queryByText('Door Families Pack')).not.toBeInTheDocument();
  });

  it('shows download count', () => {
    render(<MarketplacePanel items={items} onInstall={onInstall} onPublish={onPublish} />);
    expect(screen.getAllByText(/1,200|1200|downloads/i).length).toBeGreaterThan(0);
  });

  it('shows Publish button', () => {
    render(<MarketplacePanel items={items} onInstall={onInstall} onPublish={onPublish} />);
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
  });

  it('calls onPublish when Publish clicked', () => {
    render(<MarketplacePanel items={items} onInstall={onInstall} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(onPublish).toHaveBeenCalled();
  });
});
