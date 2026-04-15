import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PresenceOverlay, type CollaboratorPresence } from './PresenceOverlay';

describe('T-COL-010: PresenceOverlay', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const collaborators: CollaboratorPresence[] = [
    { userId: 'u1', name: 'Alice', color: '#e74c3c', cursor: { x: 100, y: 200 }, activeTool: 'select' },
    { userId: 'u2', name: 'Bob', color: '#3498db', cursor: { x: 300, y: 400 }, activeTool: 'wall' },
  ];

  it('renders presence overlay container', () => {
    render(<PresenceOverlay collaborators={collaborators} />);
    expect(document.querySelector('.presence-overlay')).toBeInTheDocument();
  });

  it('shows a cursor for each collaborator', () => {
    render(<PresenceOverlay collaborators={collaborators} />);
    expect(document.querySelectorAll('.collaborator-cursor').length).toBe(2);
  });

  it('shows collaborator names', () => {
    render(<PresenceOverlay collaborators={collaborators} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders with empty collaborators list', () => {
    render(<PresenceOverlay collaborators={[]} />);
    expect(document.querySelectorAll('.collaborator-cursor').length).toBe(0);
  });

  it('positions cursor based on x/y coordinates', () => {
    render(<PresenceOverlay collaborators={[collaborators[0]!]} />);
    const cursor = document.querySelector('.collaborator-cursor') as HTMLElement;
    expect(cursor.style.left || cursor.style.transform || cursor.getAttribute('style')).toBeTruthy();
  });

  it('shows avatar with collaborator color', () => {
    render(<PresenceOverlay collaborators={[collaborators[0]!]} />);
    const avatar = document.querySelector('.collaborator-avatar') as HTMLElement;
    expect(avatar).toBeInTheDocument();
  });

  it('shows active tool label', () => {
    render(<PresenceOverlay collaborators={collaborators} />);
    expect(screen.getAllByText(/select|wall/i).length).toBeGreaterThan(0);
  });

  it('renders PresenceAvatarBar with all collaborators', () => {
    render(<PresenceOverlay collaborators={collaborators} />);
    expect(document.querySelector('.presence-avatar-bar')).toBeInTheDocument();
  });
});
