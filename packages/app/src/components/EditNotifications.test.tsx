/**
 * T-COL-005: EditNotifications component tests
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { EditNotifications } from './EditNotifications';
import type { EditingEntry } from '../hooks/useEditNotifications';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<EditingEntry> = {}): EditingEntry {
  return {
    userId: 'user-2',
    userName: 'Ana',
    elementId: 'wall-01',
    elementType: 'wall',
    timestamp: Date.now(),
    ...overrides,
  };
}

function buildMap(entries: EditingEntry[]): Map<string, EditingEntry> {
  return new Map(entries.map((e) => [e.elementId, e]));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('T-COL-005: EditNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders nothing when editingMap is empty', () => {
    const { container } = render(<EditNotifications editingMap={new Map()} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows a toast for an active notification', () => {
    const map = buildMap([makeEntry()]);
    render(<EditNotifications editingMap={map} />);
    // Text may be split across child nodes, check the container text
    const toast = document.querySelector('.edit-notification-toast');
    expect(toast?.textContent).toMatch(/Ana is editing/i);
  });

  it('includes the element identifier in the notification text', () => {
    const map = buildMap([makeEntry({ elementType: 'wall', elementId: 'Wall-01' })]);
    render(<EditNotifications editingMap={map} />);
    // Should contain element type or id
    expect(screen.getByText(/wall/i)).toBeInTheDocument();
  });

  it('shows up to 3 notifications maximum', () => {
    const map = buildMap([
      makeEntry({ userId: 'u1', userName: 'Ana',   elementId: 'wall-01', elementType: 'wall' }),
      makeEntry({ userId: 'u2', userName: 'Bob',   elementId: 'slab-02', elementType: 'slab' }),
      makeEntry({ userId: 'u3', userName: 'Carol', elementId: 'door-03', elementType: 'door' }),
      makeEntry({ userId: 'u4', userName: 'Dave',  elementId: 'win-04',  elementType: 'window' }),
    ]);
    render(<EditNotifications editingMap={map} />);
    // At most 3 toast items should appear
    const toasts = document.querySelectorAll('.edit-notification-toast');
    expect(toasts.length).toBeLessThanOrEqual(3);
    expect(toasts.length).toBeGreaterThan(0);
  });

  it('renders the container with correct class when notifications exist', () => {
    const map = buildMap([makeEntry()]);
    render(<EditNotifications editingMap={map} />);
    expect(document.querySelector('.edit-notifications-container')).toBeInTheDocument();
  });

  it('fades out notification after 4 seconds (adds fade class)', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const map = buildMap([makeEntry({ timestamp: now })]);
    render(<EditNotifications editingMap={map} />);

    // Before 4s — no fade
    const toastBefore = document.querySelector('.edit-notification-toast');
    expect(toastBefore?.classList.contains('fading')).toBe(false);

    // Advance 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const toastAfter = document.querySelector('.edit-notification-toast');
    expect(toastAfter?.classList.contains('fading')).toBe(true);
  });

  it('renders each notification with toast class', () => {
    const map = buildMap([
      makeEntry({ userId: 'u1', userName: 'Ana', elementId: 'wall-01' }),
      makeEntry({ userId: 'u2', userName: 'Bob', elementId: 'slab-02' }),
    ]);
    render(<EditNotifications editingMap={map} />);
    expect(document.querySelectorAll('.edit-notification-toast').length).toBe(2);
  });
});
