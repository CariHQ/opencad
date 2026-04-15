import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { APIKeyPanel, type APIKey } from './APIKeyPanel';

describe('T-API-001: APIKeyPanel', () => {
  const onCreate = vi.fn();
  const onRevoke = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  const keys: APIKey[] = [
    { id: 'k1', name: 'CI/CD Pipeline', prefix: 'oc_live_xxxx', scopes: ['read', 'write'], createdAt: '2024-01-10', lastUsed: '2024-01-20' },
    { id: 'k2', name: 'Read-only Analytics', prefix: 'oc_live_yyyy', scopes: ['read'], createdAt: '2024-01-05', lastUsed: null },
  ];

  it('renders API Keys header', () => {
    render(<APIKeyPanel keys={keys} onCreate={onCreate} onRevoke={onRevoke} />);
    expect(screen.getByText(/api keys/i)).toBeInTheDocument();
  });

  it('shows key names', () => {
    render(<APIKeyPanel keys={keys} onCreate={onCreate} onRevoke={onRevoke} />);
    expect(screen.getByText('CI/CD Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Read-only Analytics')).toBeInTheDocument();
  });

  it('shows key prefixes (masked)', () => {
    render(<APIKeyPanel keys={keys} onCreate={onCreate} onRevoke={onRevoke} />);
    expect(screen.getAllByText(/oc_live/i).length).toBeGreaterThan(0);
  });

  it('shows scopes for each key', () => {
    render(<APIKeyPanel keys={keys} onCreate={onCreate} onRevoke={onRevoke} />);
    expect(screen.getAllByText(/read|write/i).length).toBeGreaterThan(0);
  });

  it('shows Revoke button for each key', () => {
    render(<APIKeyPanel keys={keys} onCreate={onCreate} onRevoke={onRevoke} />);
    expect(screen.getAllByRole('button', { name: /revoke/i }).length).toBe(2);
  });

  it('calls onRevoke with key id when Revoke clicked', () => {
    render(<APIKeyPanel keys={keys} onCreate={onCreate} onRevoke={onRevoke} />);
    fireEvent.click(screen.getAllByRole('button', { name: /revoke/i })[0]!);
    expect(onRevoke).toHaveBeenCalledWith('k1');
  });

  it('shows Create New Key button', () => {
    render(<APIKeyPanel keys={keys} onCreate={onCreate} onRevoke={onRevoke} />);
    expect(screen.getByRole('button', { name: /create.*key|new.*key/i })).toBeInTheDocument();
  });

  it('shows key name input when creating', () => {
    render(<APIKeyPanel keys={keys} onCreate={onCreate} onRevoke={onRevoke} />);
    fireEvent.click(screen.getByRole('button', { name: /create.*key|new.*key/i }));
    expect(screen.getByPlaceholderText(/key name/i)).toBeInTheDocument();
  });

  it('calls onCreate with name and scopes', () => {
    render(<APIKeyPanel keys={keys} onCreate={onCreate} onRevoke={onRevoke} />);
    fireEvent.click(screen.getByRole('button', { name: /create.*key|new.*key/i }));
    fireEvent.change(screen.getByPlaceholderText(/key name/i), { target: { value: 'My App' } });
    fireEvent.click(screen.getByRole('button', { name: /generate key/i }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'My App' }));
  });
});
