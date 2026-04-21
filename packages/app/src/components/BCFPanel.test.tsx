import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BCFPanel, type BCFTopic } from './BCFPanel';
expect.extend(jestDomMatchers);

describe('T-BCF-001: BCFPanel', () => {
  const onImport = vi.fn();
  const onExport = vi.fn();
  const onSelectTopic = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  const topics: BCFTopic[] = [
    {
      guid: 't1',
      topic_type: 'Issue',
      topic_status: 'Open',
      priority: 'High',
      title: 'Wall clash at grid A1',
      creation_date: '2024-01-15',
      creation_author: 'reporter@example.com',
      assigned_to: 'alice@example.com',
      description: 'Structural wall clashing with ductwork.',
      comments: [],
      viewpoints: [],
    },
    {
      guid: 't2',
      topic_type: 'Issue',
      topic_status: 'Resolved',
      priority: 'Normal',
      title: 'Window sill height',
      creation_date: '2024-01-10',
      creation_author: 'reporter@example.com',
      assigned_to: 'bob@example.com',
      description: 'Window sill is 10mm too low per code.',
      comments: [],
      viewpoints: [],
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
