/**
 * T-UI-002: LayersPanel component tests
 *
 * Verifies: layers render from store, add layer works, visibility toggle works.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayersPanel } from './LayerPanel';
import { useDocumentStore } from '../stores/documentStore';

describe('T-UI-002: LayersPanel', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('test-project', 'test-user');
  });

  it('renders the Layers header', () => {
    render(<LayersPanel />);
    expect(screen.getByText('Layers')).toBeInTheDocument();
  });

  it('shows the default Layer 1', () => {
    render(<LayersPanel />);
    expect(screen.getByText('Layer 1')).toBeInTheDocument();
  });

  it('adds a new layer when Add Layer button is clicked', () => {
    render(<LayersPanel />);
    const addBtn = screen.getByTitle('Add Layer');
    fireEvent.click(addBtn);

    expect(screen.getByText('Layer 2')).toBeInTheDocument();
    const layers = Object.values(useDocumentStore.getState().document!.organization.layers);
    expect(layers.length).toBe(2);
  });

  it('toggles layer visibility on eye button click', () => {
    render(<LayersPanel />);
    const hideBtn = screen.getByTitle('Hide Layer');
    fireEvent.click(hideBtn);

    const layers = Object.values(useDocumentStore.getState().document!.organization.layers);
    expect(layers[0].visible).toBe(false);
  });

  it('shows Show Layer title after hiding', () => {
    const { rerender } = render(<LayersPanel />);
    const hideBtn = screen.getByTitle('Hide Layer');
    fireEvent.click(hideBtn);
    // Zustand updates sync; re-render the component to reflect new state
    rerender(<LayersPanel />);
    expect(screen.getByTitle('Show Layer')).toBeInTheDocument();
  });
});
