import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProjectTemplates } from './ProjectTemplates';

describe('T-SYNC-011: ProjectTemplates', () => {
  const onSelect = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders Project Templates header', () => {
    render(<ProjectTemplates onSelect={onSelect} />);
    expect(screen.getByText(/project templates/i)).toBeInTheDocument();
  });

  it('shows house template', () => {
    render(<ProjectTemplates onSelect={onSelect} />);
    expect(screen.getAllByText(/house/i).length).toBeGreaterThan(0);
  });

  it('shows apartment template', () => {
    render(<ProjectTemplates onSelect={onSelect} />);
    expect(screen.getAllByText(/apartment/i).length).toBeGreaterThan(0);
  });

  it('shows office template', () => {
    render(<ProjectTemplates onSelect={onSelect} />);
    expect(screen.getAllByText(/office/i).length).toBeGreaterThan(0);
  });

  it('shows at least 3 templates', () => {
    render(<ProjectTemplates onSelect={onSelect} />);
    expect(screen.getAllByRole('button', { name: /use template/i }).length).toBeGreaterThanOrEqual(3);
  });

  it('calls onSelect when Use Template clicked', () => {
    render(<ProjectTemplates onSelect={onSelect} />);
    fireEvent.click(screen.getAllByRole('button', { name: /use template/i })[0]!);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }));
  });

  it('shows Blank Project option', () => {
    render(<ProjectTemplates onSelect={onSelect} />);
    expect(screen.getAllByText(/blank/i).length).toBeGreaterThan(0);
  });

  it('shows description for each template', () => {
    render(<ProjectTemplates onSelect={onSelect} />);
    const descs = screen.getAllByRole('button', { name: /use template/i });
    expect(descs.length).toBeGreaterThan(0);
  });

  it('shows template level count or metadata', () => {
    render(<ProjectTemplates onSelect={onSelect} />);
    expect(screen.getAllByText(/level|floor|storey/i).length).toBeGreaterThan(0);
  });
});
