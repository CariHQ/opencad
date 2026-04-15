/**
 * T-BIM-003: Door & window tool panel tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DoorWindowPanel } from './DoorWindowPanel';
import { useDocumentStore } from '../stores/documentStore';

vi.mock('../stores/documentStore');

const mockUseDocumentStore = vi.mocked(useDocumentStore);

function makeStore(toolType: 'door' | 'window' = 'door', overrides = {}) {
  return {
    activeTool: toolType,
    toolParams: {
      door: { width: 900, height: 2100, swing: 90, frameType: 'standard' },
      window: { width: 1200, height: 1200, sillHeight: 900, frameType: 'standard' },
    },
    setToolParam: vi.fn(),
    ...overrides,
  };
}

describe('T-BIM-003: DoorWindowPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Door mode', () => {
    beforeEach(() => {
      mockUseDocumentStore.mockReturnValue(makeStore('door') as ReturnType<typeof useDocumentStore>);
    });

    it('renders door panel title', () => {
      render(<DoorWindowPanel />);
      expect(screen.getByText('Door')).toBeInTheDocument();
    });

    it('shows door width input', () => {
      render(<DoorWindowPanel />);
      expect(screen.getByLabelText(/width/i)).toHaveValue(900);
    });

    it('shows door height input', () => {
      render(<DoorWindowPanel />);
      expect(screen.getByLabelText(/height/i)).toHaveValue(2100);
    });

    it('shows swing angle input', () => {
      render(<DoorWindowPanel />);
      expect(screen.getByLabelText(/swing/i)).toHaveValue(90);
    });

    it('shows frame type select', () => {
      render(<DoorWindowPanel />);
      expect(screen.getByLabelText(/frame/i)).toBeInTheDocument();
    });

    it('calls setToolParam when door width changes', () => {
      const store = makeStore('door');
      mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
      render(<DoorWindowPanel />);
      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '1000' } });
      expect(store.setToolParam).toHaveBeenCalledWith('door', 'width', 1000);
    });
  });

  describe('Window mode', () => {
    beforeEach(() => {
      mockUseDocumentStore.mockReturnValue(makeStore('window') as ReturnType<typeof useDocumentStore>);
    });

    it('renders window panel title', () => {
      render(<DoorWindowPanel />);
      expect(screen.getByText('Window')).toBeInTheDocument();
    });

    it('shows sill height input', () => {
      render(<DoorWindowPanel />);
      expect(screen.getByLabelText(/sill/i)).toHaveValue(900);
    });

    it('calls setToolParam when sill height changes', () => {
      const store = makeStore('window');
      mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
      render(<DoorWindowPanel />);
      fireEvent.change(screen.getByLabelText(/sill/i), { target: { value: '1000' } });
      expect(store.setToolParam).toHaveBeenCalledWith('window', 'sillHeight', 1000);
    });

    it('shows placement hint mentioning wall', () => {
      render(<DoorWindowPanel />);
      expect(screen.getByText(/wall/i)).toBeInTheDocument();
    });
  });
});
