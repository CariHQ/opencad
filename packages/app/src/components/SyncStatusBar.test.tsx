import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncStatusBar } from './SyncStatusBar';
expect.extend(jestDomMatchers);

describe('T-SYNC-012: SyncStatusBar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows connected status', () => {
    render(<SyncStatusBar status="connected" pendingOps={0} lastSynced={Date.now()} />);
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('shows syncing status', () => {
    render(<SyncStatusBar status="syncing" pendingOps={3} lastSynced={null} />);
    expect(screen.getByText(/sync/i)).toBeInTheDocument();
  });

  it('shows offline status', () => {
    render(<SyncStatusBar status="offline" pendingOps={5} lastSynced={null} />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('shows error status', () => {
    render(<SyncStatusBar status="error" pendingOps={0} lastSynced={null} errorMessage="Connection refused" />);
    expect(screen.getAllByText(/error|connection refused/i).length).toBeGreaterThan(0);
  });

  it('shows pending operations count when > 0', () => {
    render(<SyncStatusBar status="syncing" pendingOps={7} lastSynced={null} />);
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it('shows last synced time when connected', () => {
    const ts = Date.now() - 60000;
    render(<SyncStatusBar status="connected" pendingOps={0} lastSynced={ts} />);
    expect(screen.getAllByText(/sync|saved|ago/i).length).toBeGreaterThan(0);
  });

  it('renders status indicator element', () => {
    render(<SyncStatusBar status="connected" pendingOps={0} lastSynced={null} />);
    expect(document.querySelector('.sync-status-bar')).toBeInTheDocument();
  });

  it('renders status dot with correct class', () => {
    render(<SyncStatusBar status="offline" pendingOps={0} lastSynced={null} />);
    expect(document.querySelector('.status-dot')).toBeInTheDocument();
  });
});
