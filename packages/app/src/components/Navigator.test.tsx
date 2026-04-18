/**
 * T-UI-004: Navigator component tests
 *
 * Verifies: hierarchy, expand/collapse, selection, visibility toggle, lock toggle, search.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navigator } from './Navigator';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

describe('T-UI-004: Navigator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useDocumentStore.getState().initProject('test-project', 'test-user');
    useDocumentStore.setState({ selectedIds: [] });
  });

  it('renders the Navigator header', () => {
    render(<Navigator />);
    expect(screen.getByText('Navigator')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<Navigator />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('shows Views section expanded by default', () => {
    render(<Navigator />);
    expect(screen.getByText('Floor Plan')).toBeInTheDocument();
    expect(screen.getByText('3D View')).toBeInTheDocument();
  });

  it('shows Levels section with default Level 1', () => {
    render(<Navigator />);
    expect(screen.getByText('Level 1')).toBeInTheDocument();
  });

  it('shows Layers section', () => {
    render(<Navigator />);
    expect(screen.getByText('Layers')).toBeInTheDocument();
  });

  it('shows layer names in layers section', () => {
    render(<Navigator />);
    // Default document has at least one layer
    const doc = useDocumentStore.getState().document!;
    const firstLayer = Object.values(doc.organization.layers)[0];
    expect(screen.getByText(firstLayer.name)).toBeInTheDocument();
  });

  it('shows element count badge for elements', () => {
    render(<Navigator />);
    const elements = screen.getAllByText('Elements');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('collapses Views section on click', () => {
    render(<Navigator />);
    const viewsItem = screen.getByText('Views').closest('.nav-item')!;
    fireEvent.click(viewsItem);
    expect(screen.queryByText('Floor Plan')).not.toBeInTheDocument();
  });

  it('collapses Layers section on click', () => {
    render(<Navigator />);
    const doc = useDocumentStore.getState().document!;
    const firstLayer = Object.values(doc.organization.layers)[0];
    const layersFolder = screen.getByText('Layers').closest('.nav-item')!;
    fireEvent.click(layersFolder);
    expect(screen.queryByText(firstLayer.name)).not.toBeInTheDocument();
  });

  it('selects a level on click', () => {
    render(<Navigator />);
    const levelItem = screen.getByText('Level 1').closest('.nav-item')!;
    fireEvent.click(levelItem);
    const state = useDocumentStore.getState();
    expect(state.selectedIds.length).toBe(1);
  });

  it('shows eye (visibility) button on each layer', () => {
    render(<Navigator />);
    // There should be at least one eye button
    const eyeBtns = screen.getAllByTitle(/visibility/i);
    expect(eyeBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('shows lock button on each layer', () => {
    render(<Navigator />);
    const lockBtns = screen.getAllByTitle(/lock/i);
    expect(lockBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking eye button calls updateLayer with toggled visible', () => {
    const updateLayer = vi.spyOn(useDocumentStore.getState(), 'updateLayer');
    render(<Navigator />);
    const eyeBtns = screen.getAllByTitle(/visibility/i);
    fireEvent.click(eyeBtns[0]);
    expect(updateLayer).toHaveBeenCalled();
    const [, updates] = updateLayer.mock.calls[0];
    expect(updates).toHaveProperty('visible');
    updateLayer.mockRestore();
  });

  it('clicking lock button calls updateLayer with toggled locked', () => {
    // Use setState injection instead of spyOn to avoid Zustand state-replacement issues
    const mockUpdateLayer = vi.fn();
    const originalUpdateLayer = useDocumentStore.getState().updateLayer;
    useDocumentStore.setState({ updateLayer: mockUpdateLayer });
    render(<Navigator />);
    const lockBtns = screen.getAllByTitle(/lock/i);
    fireEvent.click(lockBtns[0]);
    expect(mockUpdateLayer).toHaveBeenCalled();
    const [, updates] = mockUpdateLayer.mock.calls[0];
    expect(updates).toHaveProperty('locked');
    useDocumentStore.setState({ updateLayer: originalUpdateLayer });
  });

  it('search input filters elements by type', () => {
    // Add an element so we have something to filter
    const state = useDocumentStore.getState();
    const layerId = Object.keys(state.document!.organization.layers)[0];
    state.addElement({ type: 'wall', layerId, properties: {} });

    render(<Navigator />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'wall' } });
    // At least one element with 'wall' in name should remain
    const wallItems = screen.queryAllByText(/wall/i);
    expect(wallItems.length).toBeGreaterThan(0);
  });

  it('search hides non-matching elements', () => {
    const state = useDocumentStore.getState();
    const layerId = Object.keys(state.document!.organization.layers)[0];
    state.addElement({ type: 'wall', layerId, properties: {} });
    state.addElement({ type: 'door', layerId, properties: {} });

    render(<Navigator />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'wall' } });
    // door-named items in .item-name spans should not appear
    const allNames = screen.queryAllByText(/^door [a-z0-9]+$/i);
    expect(allNames.length).toBe(0);
  });

  it('element count shows correct number per layer branch', () => {
    // Start fresh
    localStorage.clear();
    useDocumentStore.getState().initProject('test-project', 'test-user');

    const state = useDocumentStore.getState();
    const layerId = Object.keys(state.document!.organization.layers)[0];
    state.addElement({ type: 'wall', layerId, properties: {} });
    state.addElement({ type: 'wall', layerId, properties: {} });

    const { container } = render(<Navigator />);
    const countBadges = container.querySelectorAll('.item-count');
    const countValues = Array.from(countBadges).map((el) => el.textContent);
    expect(countValues).toContain('2');
  });

  it('clicking an element in tree selects it in the store', () => {
    const state = useDocumentStore.getState();
    const layerId = Object.keys(state.document!.organization.layers)[0];
    const elemId = state.addElement({ type: 'wall', layerId, properties: {} });

    render(<Navigator />);
    // Element should appear with its short id or 'wall ...'
    const elemItems = screen.getAllByText(new RegExp(`wall ${elemId.slice(0, 6)}`, 'i'));
    fireEvent.click(elemItems[0]);
    expect(useDocumentStore.getState().selectedIds).toContain(elemId);
  });
});
