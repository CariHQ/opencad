import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BCFPanel, type BCFTopic } from './BCFPanel';

describe('T-BCF-001: BCFPanel', () => {
  const onImport = vi.fn();
  const onExport = vi.fn();
  const onSelectTopic = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  const topics: BCFTopic[] = [
    {
      guid: 't1',
      title: 'Wall clash at grid A1',
      status: 'open',
      priority: 'high',
      creationDate: '2024-01-15',
      assignedTo: 'alice@example.com',
      description: 'Structural wall clashing with ductwork.',
    },
    {
      guid: 't2',
      title: 'Window sill height',
      status: 'resolved',
      priority: 'normal',
      creationDate: '2024-01-10',
      assignedTo: 'bob@example.com',
      description: 'Window sill is 10mm too low per code.',
    },
  ];

  it('renders BCF Issues header', () => {
    render(<BCFPanel initialTopics={topics} onImport={onImport} onExport={onExport} onSelectTopic={onSelectTopic} />);
    expect(screen.getByText(/bcf issues/i)).toBeInTheDocument();
  });

  it('shows topic titles', () => {
    render(<BCFPanel initialTopics={topics} onImport={onImport} onExport={onExport} onSelectTopic={onSelectTopic} />);
    expect(screen.getByText('Wall clash at grid A1')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    render(<BCFPanel initialTopics={topics} onImport={onImport} onExport={onExport} onSelectTopic={onSelectTopic} />);
    expect(screen.getAllByText(/open|resolved/i).length).toBeGreaterThan(0);
  });

  it('shows priority labels', () => {
    render(<BCFPanel initialTopics={topics} onImport={onImport} onExport={onExport} onSelectTopic={onSelectTopic} />);
    expect(screen.getAllByText(/high|normal/i).length).toBeGreaterThan(0);
  });

  it('shows Import BCF button', () => {
    render(<BCFPanel initialTopics={topics} onImport={onImport} onExport={onExport} onSelectTopic={onSelectTopic} />);
    expect(screen.getByRole('button', { name: /import bcf/i })).toBeInTheDocument();
  });

  it('shows Export BCF button', () => {
    render(<BCFPanel initialTopics={topics} onImport={onImport} onExport={onExport} onSelectTopic={onSelectTopic} />);
    expect(screen.getByRole('button', { name: /export bcf/i })).toBeInTheDocument();
  });

  it('calls onExport when Export BCF clicked', () => {
    render(<BCFPanel initialTopics={topics} onImport={onImport} onExport={onExport} onSelectTopic={onSelectTopic} />);
    fireEvent.click(screen.getByRole('button', { name: /export bcf/i }));
    expect(onExport).toHaveBeenCalledWith(topics);
  });

  it('calls onSelectTopic when topic clicked', () => {
    render(<BCFPanel initialTopics={topics} onImport={onImport} onExport={onExport} onSelectTopic={onSelectTopic} />);
    fireEvent.click(screen.getByText('Wall clash at grid A1'));
    expect(onSelectTopic).toHaveBeenCalledWith(topics[0]);
  });

  it('shows assigned to email', () => {
    render(<BCFPanel initialTopics={topics} onImport={onImport} onExport={onExport} onSelectTopic={onSelectTopic} />);
    expect(screen.getAllByText(/alice|bob/i).length).toBeGreaterThan(0);
  });

  it('shows empty state when no topics', () => {
    render(<BCFPanel onImport={onImport} onExport={onExport} onSelectTopic={onSelectTopic} />);
    expect(screen.getByText(/no bcf issues/i)).toBeInTheDocument();
  });
});
