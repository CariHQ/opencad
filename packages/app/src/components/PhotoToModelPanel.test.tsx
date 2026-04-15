import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PhotoToModelPanel } from './PhotoToModelPanel';

describe('T-AI-031: PhotoToModelPanel', () => {
  const onUpload = vi.fn();
  const onExtract = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders Photo to Model header', () => {
    render(<PhotoToModelPanel onUpload={onUpload} onExtract={onExtract} />);
    expect(screen.getByText(/photo.to.model|photo to model/i)).toBeInTheDocument();
  });

  it('shows file upload drop zone', () => {
    render(<PhotoToModelPanel onUpload={onUpload} onExtract={onExtract} />);
    expect(screen.getAllByText(/drop.*photo|upload.*photo|drag.*drop/i).length).toBeGreaterThan(0);
  });

  it('shows Upload button', () => {
    render(<PhotoToModelPanel onUpload={onUpload} onExtract={onExtract} />);
    expect(screen.getByRole('button', { name: /upload|browse/i })).toBeInTheDocument();
  });

  it('shows Extract Massing button', () => {
    render(<PhotoToModelPanel onUpload={onUpload} onExtract={onExtract} status="ready" photoUrl="data:image/png;base64,abc" />);
    expect(screen.getByRole('button', { name: /extract.*massing|analyze/i })).toBeInTheDocument();
  });

  it('calls onExtract when Extract Massing clicked', () => {
    render(<PhotoToModelPanel onUpload={onUpload} onExtract={onExtract} status="ready" photoUrl="data:image/png;base64,abc" />);
    fireEvent.click(screen.getByRole('button', { name: /extract.*massing|analyze/i }));
    expect(onExtract).toHaveBeenCalled();
  });

  it('shows processing indicator when status is processing', () => {
    render(<PhotoToModelPanel onUpload={onUpload} onExtract={onExtract} status="processing" />);
    expect(screen.getByText(/processing|analyzing/i)).toBeInTheDocument();
  });

  it('shows result preview when status is done', () => {
    render(<PhotoToModelPanel onUpload={onUpload} onExtract={onExtract} status="done" extractedGeometry={{ wallCount: 8, estimatedArea: 120 }} />);
    expect(screen.getAllByText(/8|walls|120|m²/i).length).toBeGreaterThan(0);
  });

  it('shows instructions text', () => {
    render(<PhotoToModelPanel onUpload={onUpload} onExtract={onExtract} />);
    expect(screen.getAllByText(/photo|site|massing/i).length).toBeGreaterThan(0);
  });
});
