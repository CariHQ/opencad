import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SpecWritingPanel, type RoomDataSheet } from './SpecWritingPanel';

describe('T-AI-030: SpecWritingPanel', () => {
  const onGenerate = vi.fn();
  const onExport = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  const sheets: RoomDataSheet[] = [
    {
      id: 'rds-1',
      roomName: 'Main Bedroom',
      area: 18.5,
      height: 2.7,
      finishes: { floor: 'Timber', ceiling: 'Plaster', walls: 'Paint' },
      services: ['Lighting', 'Power', 'Data'],
      notes: 'Acoustic insulation required.',
    },
    {
      id: 'rds-2',
      roomName: 'Kitchen',
      area: 12.0,
      height: 2.7,
      finishes: { floor: 'Tile', ceiling: 'Plaster', walls: 'Tile' },
      services: ['Lighting', 'Power', 'Gas', 'Plumbing'],
      notes: '',
    },
  ];

  it('renders Spec Writing header', () => {
    render(<SpecWritingPanel sheets={sheets} onGenerate={onGenerate} onExport={onExport} />);
    expect(screen.getByText(/spec writing|room data/i)).toBeInTheDocument();
  });

  it('shows room names', () => {
    render(<SpecWritingPanel sheets={sheets} onGenerate={onGenerate} onExport={onExport} />);
    expect(screen.getByText('Main Bedroom')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
  });

  it('shows room area', () => {
    render(<SpecWritingPanel sheets={sheets} onGenerate={onGenerate} onExport={onExport} />);
    expect(screen.getAllByText(/18\.5|12\.0|m²/i).length).toBeGreaterThan(0);
  });

  it('shows floor finish', () => {
    render(<SpecWritingPanel sheets={sheets} onGenerate={onGenerate} onExport={onExport} />);
    expect(screen.getAllByText(/timber|tile/i).length).toBeGreaterThan(0);
  });

  it('shows Generate from Model button', () => {
    render(<SpecWritingPanel sheets={sheets} onGenerate={onGenerate} onExport={onExport} />);
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('calls onGenerate when Generate clicked', () => {
    render(<SpecWritingPanel sheets={sheets} onGenerate={onGenerate} onExport={onExport} />);
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(onGenerate).toHaveBeenCalled();
  });

  it('shows Export button', () => {
    render(<SpecWritingPanel sheets={sheets} onGenerate={onGenerate} onExport={onExport} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('calls onExport with sheets when Export clicked', () => {
    render(<SpecWritingPanel sheets={sheets} onGenerate={onGenerate} onExport={onExport} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(onExport).toHaveBeenCalledWith(sheets);
  });

  it('shows services for each room', () => {
    render(<SpecWritingPanel sheets={sheets} onGenerate={onGenerate} onExport={onExport} />);
    expect(screen.getAllByText(/lighting|power|gas|plumbing/i).length).toBeGreaterThan(0);
  });

  it('shows empty state when no sheets', () => {
    render(<SpecWritingPanel sheets={[]} onGenerate={onGenerate} onExport={onExport} />);
    expect(screen.getAllByText(/no room data|generate/i).length).toBeGreaterThan(0);
  });
});
