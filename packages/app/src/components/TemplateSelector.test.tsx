/**
 * T-DOC-011: Template selection loads schema into the store
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockLoadDocumentSchema = vi.fn();

vi.mock('../stores/documentStore', () => ({
  useDocumentStore: vi.fn(() => ({
    loadDocumentSchema: mockLoadDocumentSchema,
  })),
}));

vi.mock('../config/projectTemplates', () => ({
  PROJECT_TEMPLATES: [
    {
      id: 'residential',
      name: 'Residential',
      description: '3-bedroom house floor plan stub',
      schema: {
        id: 'residential',
        name: 'Residential Project',
        version: { clock: {} },
        metadata: { createdAt: 0, updatedAt: 0, createdBy: 'system', schemaVersion: '1.0' },
        content: { elements: { 'el-1': { id: 'el-1', type: 'wall' } }, spaces: {} },
        organization: {
          layers: { 'layer-1': { id: 'layer-1', name: 'Walls', color: '#333', visible: true, locked: false, order: 0 } },
          levels: {},
        },
        presentation: { views: {}, annotations: {} },
        library: { materials: {} },
      },
    },
    {
      id: 'commercial',
      name: 'Commercial',
      description: 'Open office floor plan stub',
      schema: {
        id: 'commercial',
        name: 'Commercial Project',
        version: { clock: {} },
        metadata: { createdAt: 0, updatedAt: 0, createdBy: 'system', schemaVersion: '1.0' },
        content: { elements: { 'el-1': { id: 'el-1', type: 'wall' } }, spaces: {} },
        organization: {
          layers: { 'layer-1': { id: 'layer-1', name: 'Walls', color: '#333', visible: true, locked: false, order: 0 } },
          levels: {},
        },
        presentation: { views: {}, annotations: {} },
        library: { materials: {} },
      },
    },
    {
      id: 'interior',
      name: 'Interior',
      description: 'Single room interior layout',
      schema: {
        id: 'interior',
        name: 'Interior Project',
        version: { clock: {} },
        metadata: { createdAt: 0, updatedAt: 0, createdBy: 'system', schemaVersion: '1.0' },
        content: { elements: { 'el-1': { id: 'el-1', type: 'wall' } }, spaces: {} },
        organization: {
          layers: { 'layer-1': { id: 'layer-1', name: 'Walls', color: '#333', visible: true, locked: false, order: 0 } },
          levels: {},
        },
        presentation: { views: {}, annotations: {} },
        library: { materials: {} },
      },
    },
  ],
}));

import { TemplateSelector } from './TemplateSelector';

describe('T-DOC-011: TemplateSelector', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a list of templates', () => {
    render(<TemplateSelector onClose={onClose} />);
    expect(screen.getByText('Residential')).toBeInTheDocument();
    expect(screen.getByText('Commercial')).toBeInTheDocument();
    expect(screen.getByText('Interior')).toBeInTheDocument();
  });

  it('shows template descriptions', () => {
    render(<TemplateSelector onClose={onClose} />);
    expect(screen.getByText('3-bedroom house floor plan stub')).toBeInTheDocument();
    expect(screen.getByText('Open office floor plan stub')).toBeInTheDocument();
    expect(screen.getByText('Single room interior layout')).toBeInTheDocument();
  });

  it('shows 3 "Use Template" buttons', () => {
    render(<TemplateSelector onClose={onClose} />);
    const buttons = screen.getAllByRole('button', { name: /use template/i });
    expect(buttons).toHaveLength(3);
  });

  it('clicking Residential calls loadDocumentSchema with residential schema', () => {
    render(<TemplateSelector onClose={onClose} />);
    const buttons = screen.getAllByRole('button', { name: /use template/i });
    fireEvent.click(buttons[0]!);
    expect(mockLoadDocumentSchema).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'residential', name: 'Residential Project' })
    );
  });

  it('clicking a template calls onClose', () => {
    render(<TemplateSelector onClose={onClose} />);
    const buttons = screen.getAllByRole('button', { name: /use template/i });
    fireEvent.click(buttons[0]!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking Commercial calls loadDocumentSchema with commercial schema', () => {
    render(<TemplateSelector onClose={onClose} />);
    const buttons = screen.getAllByRole('button', { name: /use template/i });
    fireEvent.click(buttons[1]!);
    expect(mockLoadDocumentSchema).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'commercial', name: 'Commercial Project' })
    );
  });

  it('clicking Interior calls loadDocumentSchema with interior schema', () => {
    render(<TemplateSelector onClose={onClose} />);
    const buttons = screen.getAllByRole('button', { name: /use template/i });
    fireEvent.click(buttons[2]!);
    expect(mockLoadDocumentSchema).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'interior', name: 'Interior Project' })
    );
  });
});
