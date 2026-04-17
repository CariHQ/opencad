/**
 * Toolbar component tests
 * T-2D-010: Toolbar renders tools and calls setActiveTool
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from './Toolbar';

const mockSetActiveTool = vi.fn();
let mockActiveTool = 'select';

vi.mock('../stores/documentStore', () => ({
  useDocumentStore: vi.fn(() => ({
    activeTool: mockActiveTool,
    setActiveTool: mockSetActiveTool,
  })),
}));

describe('T-2D-010: Toolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveTool = 'select';
  });

  it('renders the Tools label', () => {
    render(<Toolbar />);
    expect(screen.getByText('Tools')).toBeInTheDocument();
  });

  it('renders all tool buttons', () => {
    render(<Toolbar />);
    const toolLabels = ['Select', 'Line', 'Rectangle', 'Circle', 'Wall', 'Door', 'Window', 'Dimension', 'Text'];
    for (const label of toolLabels) {
      expect(screen.getByTitle(label)).toBeInTheDocument();
    }
  });

  it('renders 9 tool buttons', () => {
    render(<Toolbar />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(9);
  });

  it('marks the active tool with "active" class', () => {
    render(<Toolbar />);
    const selectButton = screen.getByTitle('Select');
    expect(selectButton).toHaveClass('active');
  });

  it('does not mark inactive tools as active', () => {
    render(<Toolbar />);
    const lineButton = screen.getByTitle('Line');
    expect(lineButton).not.toHaveClass('active');
  });

  it('calls setActiveTool with tool id on click', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle('Line'));
    expect(mockSetActiveTool).toHaveBeenCalledWith('line');
  });

  it('calls setActiveTool for each tool when clicked', () => {
    render(<Toolbar />);
    const toolMap: Record<string, string> = {
      Select: 'select',
      Line: 'line',
      Rectangle: 'rect',
      Circle: 'circle',
      Wall: 'wall',
      Door: 'door',
      Window: 'window',
      Dimension: 'dimension',
      Text: 'text',
    };
    for (const [title, id] of Object.entries(toolMap)) {
      fireEvent.click(screen.getByTitle(title));
      expect(mockSetActiveTool).toHaveBeenCalledWith(id);
    }
  });

  it('shows tool label text for each tool', () => {
    render(<Toolbar />);
    expect(screen.getByText('Line')).toBeInTheDocument();
    expect(screen.getByText('Circle')).toBeInTheDocument();
  });

  it('shows active class on "wall" when activeTool is wall', () => {
    mockActiveTool = 'wall';
    render(<Toolbar />);
    const wallButton = screen.getByTitle('Wall');
    expect(wallButton).toHaveClass('active');
  });
});
