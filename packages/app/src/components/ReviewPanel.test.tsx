/**
 * T-REVIEW-001: Design review workflow
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewPanel } from './ReviewPanel';

const mockSetReviewStatus = vi.fn();
let mockReviewStatus = 'none';

vi.mock('../stores/documentStore', () => ({
  useDocumentStore: vi.fn(() => ({
    reviewStatus: mockReviewStatus,
    setReviewStatus: mockSetReviewStatus,
  })),
}));

describe('T-REVIEW-001: ReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReviewStatus = 'none';
  });

  it('renders Request Review button when status is none', () => {
    render(<ReviewPanel />);
    expect(screen.getByRole('button', { name: /Request Review/i })).toBeInTheDocument();
  });

  it('calls setReviewStatus("pending") when Request Review is clicked', () => {
    render(<ReviewPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Request Review/i }));
    expect(mockSetReviewStatus).toHaveBeenCalledWith('pending');
  });

  it('shows reviewer list and Approve/Request Changes buttons when status is pending', () => {
    mockReviewStatus = 'pending';
    render(<ReviewPanel />);
    expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request Changes/i })).toBeInTheDocument();
  });

  it('shows pending indicator when status is pending', () => {
    mockReviewStatus = 'pending';
    render(<ReviewPanel />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('calls setReviewStatus("approved") when Approve is clicked', () => {
    mockReviewStatus = 'pending';
    render(<ReviewPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));
    expect(mockSetReviewStatus).toHaveBeenCalledWith('approved');
  });

  it('calls setReviewStatus("changes_requested") when Request Changes is clicked', () => {
    mockReviewStatus = 'pending';
    render(<ReviewPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Request Changes/i }));
    expect(mockSetReviewStatus).toHaveBeenCalledWith('changes_requested');
  });

  it('shows green approved badge when status is approved', () => {
    mockReviewStatus = 'approved';
    render(<ReviewPanel />);
    const badge = screen.getByTestId('review-approved-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/approved/i);
  });

  it('shows comment textarea when status is changes_requested', () => {
    mockReviewStatus = 'changes_requested';
    render(<ReviewPanel />);
    expect(screen.getByRole('textbox', { name: /comment/i })).toBeInTheDocument();
  });

  it('shows changes requested indicator when status is changes_requested', () => {
    mockReviewStatus = 'changes_requested';
    render(<ReviewPanel />);
    expect(screen.getByText(/changes requested/i)).toBeInTheDocument();
  });

  it('allows returning to none status from approved state', () => {
    mockReviewStatus = 'approved';
    render(<ReviewPanel />);
    const resetBtn = screen.getByRole('button', { name: /New Review/i });
    fireEvent.click(resetBtn);
    expect(mockSetReviewStatus).toHaveBeenCalledWith('none');
  });
});
