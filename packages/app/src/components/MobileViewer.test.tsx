import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileViewer } from './MobileViewer';
expect.extend(jestDomMatchers);

describe('T-MOB-001: MobileViewer', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders mobile viewer container', () => {
    render(<MobileViewer projectName="Test Project" />);
    expect(document.querySelector('.mobile-viewer')).toBeInTheDocument();
  });

  it('shows project name in header', () => {
    render(<MobileViewer projectName="My Building" />);
    expect(screen.getByText('My Building')).toBeInTheDocument();
  });

  it('shows read-only badge', () => {
    render(<MobileViewer projectName="Test Project" />);
    expect(screen.getByText(/read.only|view only/i)).toBeInTheDocument();
  });

  it('shows view mode tabs (floor plan, 3D)', () => {
    render(<MobileViewer projectName="Test Project" />);
    expect(screen.getByRole('button', { name: /floor plan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3d/i })).toBeInTheDocument();
  });

  it('switches active view on tab click', () => {
    render(<MobileViewer projectName="Test Project" />);
    fireEvent.click(screen.getByRole('button', { name: /floor plan/i }));
    expect(screen.getByRole('button', { name: /floor plan/i })).toHaveClass('active');
  });

  it('shows level selector', () => {
    const levels = [{ id: 'l1', name: 'Ground Floor' }, { id: 'l2', name: 'First Floor' }];
    render(<MobileViewer projectName="Test Project" levels={levels} />);
    expect(screen.getAllByText(/ground floor|first floor/i).length).toBeGreaterThan(0);
  });

  it('shows touch-friendly zoom controls', () => {
    render(<MobileViewer projectName="Test Project" />);
    expect(screen.getAllByRole('button', { name: /zoom in|zoom out|\+|−/i }).length).toBeGreaterThan(0);
  });

  it('shows element count', () => {
    render(<MobileViewer projectName="Test Project" elementCount={42} />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
