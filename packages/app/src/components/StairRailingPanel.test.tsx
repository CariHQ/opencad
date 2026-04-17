import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StairRailingPanel } from './StairRailingPanel';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore');

function makeStore(activeTool = 'stair', toolParams = {}) {
  const defaultParams = {
    stair: {
      totalRise: 3000,
      treadDepth: 250,
      width: 1200,
      material: 'Concrete',
      railingHeight: 1000,
      balusters: true,
    },
    railing: {
      height: 1000,
      material: 'Steel',
      balusters: true,
      balusterSpacing: 150,
    },
  };
  return {
    activeTool,
    toolParams: { ...defaultParams, ...toolParams },
    setToolParam: vi.fn(),
  };
}

describe('T-BIM-005: StairRailingPanel', () => {
  beforeEach(() => {
    vi.mocked(useDocumentStore).mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
  });

  it('renders Stair panel when activeTool is stair', () => {
    render(<StairRailingPanel />);
    expect(screen.getByText('Stair')).toBeInTheDocument();
  });

  it('renders Railing panel when activeTool is railing', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('railing') as ReturnType<typeof useDocumentStore>
    );
    render(<StairRailingPanel />);
    expect(screen.getByText('Railing')).toBeInTheDocument();
  });

  // Stair inputs
  it('shows total rise input', () => {
    render(<StairRailingPanel />);
    expect(screen.getByLabelText(/total rise/i)).toBeInTheDocument();
  });

  it('shows tread depth input', () => {
    render(<StairRailingPanel />);
    expect(screen.getByLabelText(/tread depth/i)).toBeInTheDocument();
  });

  it('shows stair width input', () => {
    render(<StairRailingPanel />);
    expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
  });

  it('shows stair material input', () => {
    render(<StairRailingPanel />);
    expect(screen.getByLabelText(/material/i)).toBeInTheDocument();
  });

  it('shows railing height input for stairs', () => {
    render(<StairRailingPanel />);
    expect(screen.getByLabelText(/railing height/i)).toBeInTheDocument();
  });

  it('shows computed riser count', () => {
    render(<StairRailingPanel />);
    // 3000mm total rise / 175mm riser = ~17 risers
    expect(screen.getByText(/riser/i)).toBeInTheDocument();
  });

  it('shows compliance warning when rise/going ratio is bad', () => {
    // Short tread depth (100mm) violates standard rule
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('stair', { stair: { totalRise: 3000, treadDepth: 100, width: 1200, material: 'Concrete', railingHeight: 1000, balusters: true } }) as ReturnType<typeof useDocumentStore>
    );
    render(<StairRailingPanel />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not show warning when dimensions are compliant', () => {
    render(<StairRailingPanel />);
    // Default 250mm tread should be compliant
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls setToolParam when total rise changes', () => {
    const store = makeStore();
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<StairRailingPanel />);
    const input = screen.getByLabelText(/total rise/i);
    fireEvent.change(input, { target: { value: '3500' } });
    fireEvent.blur(input);
    expect(store.setToolParam).toHaveBeenCalledWith('stair', 'totalRise', 3500);
  });

  it('calls setToolParam when tread depth changes', () => {
    const store = makeStore();
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<StairRailingPanel />);
    const input = screen.getByLabelText(/tread depth/i);
    fireEvent.change(input, { target: { value: '280' } });
    fireEvent.blur(input);
    expect(store.setToolParam).toHaveBeenCalledWith('stair', 'treadDepth', 280);
  });

  // Railing inputs
  it('shows railing height input', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('railing') as ReturnType<typeof useDocumentStore>
    );
    render(<StairRailingPanel />);
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
  });

  it('shows railing material input', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('railing') as ReturnType<typeof useDocumentStore>
    );
    render(<StairRailingPanel />);
    expect(screen.getByLabelText(/material/i)).toBeInTheDocument();
  });

  it('shows baluster spacing input', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('railing') as ReturnType<typeof useDocumentStore>
    );
    render(<StairRailingPanel />);
    expect(screen.getByLabelText(/baluster spacing/i)).toBeInTheDocument();
  });

  it('calls setToolParam when railing height changes', () => {
    const store = makeStore('railing');
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<StairRailingPanel />);
    const input = screen.getByLabelText(/height/i);
    fireEvent.change(input, { target: { value: '1100' } });
    fireEvent.blur(input);
    expect(store.setToolParam).toHaveBeenCalledWith('railing', 'height', 1100);
  });

  it('shows placement hint for stair', () => {
    render(<StairRailingPanel />);
    expect(screen.getByText(/drag.*stair|place stair/i)).toBeInTheDocument();
  });

  it('shows placement hint for railing', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('railing') as ReturnType<typeof useDocumentStore>
    );
    render(<StairRailingPanel />);
    expect(screen.getByText(/draw.*railing|click.*railing/i)).toBeInTheDocument();
  });
});
