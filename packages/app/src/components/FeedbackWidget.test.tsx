/**
 * FeedbackWidget component tests
 * T-UI-020: In-app feedback widget renders, submits, and shows assessment results
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FeedbackWidget } from './FeedbackWidget';
import type { FeedbackItem } from '../lib/serverApi';

const mockSubmit = vi.fn();

vi.mock('../lib/serverApi', () => ({
  feedbackApi: {
    submit: (...args: unknown[]) => mockSubmit(...args),
    list: vi.fn().mockResolvedValue([]),
  },
}));

const MOCK_RESULT: FeedbackItem = {
  id: 'abc-123',
  category: 'feature',
  title: 'Add snap to grid',
  feasibility: 'in_scope',
  prd_label: 'T-2D',
  github_issue_url: 'https://github.com/org/repo/issues/42',
  github_issue_number: 42,
  created_at: '2026-04-17T00:00:00Z',
};

describe('T-UI-020: FeedbackWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the floating trigger button', () => {
    render(<FeedbackWidget />);
    expect(screen.getByRole('button', { name: /send feedback/i })).toBeInTheDocument();
  });

  it('panel is not visible initially', () => {
    render(<FeedbackWidget />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the panel when trigger is clicked', () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Send feedback')).toBeInTheDocument();
  });

  it('renders category selector with all options', () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    const select = screen.getByRole('combobox');
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toContain('bug');
    expect(options).toContain('feature');
    expect(options).toContain('question');
  });

  it('renders title and description fields', () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('shows validation error when fields are empty on submit', async () => {
    const { container } = render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    // Use fireEvent.submit on the form to bypass browser constraint validation
    // so the React handler runs and we can test the JS error path.
    act(() => {
      fireEvent.submit(container.querySelector('form')!);
    });
    expect(await screen.findByText(/please fill in all fields/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error when title is empty', async () => {
    const { container } = render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Some detail' } });
    act(() => {
      fireEvent.submit(container.querySelector('form')!);
    });
    expect(await screen.findByText(/please fill in all fields/i)).toBeInTheDocument();
  });

  it('calls feedbackApi.submit with the correct arguments', async () => {
    mockSubmit.mockResolvedValueOnce(MOCK_RESULT);
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Add snap to grid' } });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'It would be helpful to snap to grid while drawing' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit).toHaveBeenCalledWith(
      'feature',
      'Add snap to grid',
      'It would be helpful to snap to grid while drawing',
    );
  });

  it('transitions to submitted state and shows feasibility badge', async () => {
    mockSubmit.mockResolvedValueOnce(MOCK_RESULT);
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Add snap to grid' } });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Detailed description here' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(await screen.findByText(/thanks for your feedback/i)).toBeInTheDocument();
    expect(screen.getByText('In PRD scope')).toBeInTheDocument();
  });

  it('shows PRD label badge in submitted state', async () => {
    mockSubmit.mockResolvedValueOnce(MOCK_RESULT);
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Snap feature' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Snap to grid' } });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(await screen.findByText('T-2D')).toBeInTheDocument();
  });

  it('shows GitHub issue link in submitted state', async () => {
    mockSubmit.mockResolvedValueOnce(MOCK_RESULT);
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Snap feature' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Snap to grid' } });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    await waitFor(() => screen.getByText('#42'));
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/org/repo/issues/42');
  });

  it('closes panel when Done is clicked in submitted state', async () => {
    mockSubmit.mockResolvedValueOnce(MOCK_RESULT);
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Snap feature' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Snap to grid' } });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    await waitFor(() => screen.getByRole('button', { name: /done/i }));
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes panel when close (X) button is clicked', () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // The X button has no accessible name — find it by its proximity to the dialog
    const closeBtn = screen.getByRole('dialog').querySelector('.feedback-panel__close') as HTMLElement;
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes panel on Escape key press', () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows error when submission fails', async () => {
    mockSubmit.mockRejectedValueOnce(new Error('Network error'));
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Snap feature' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Snap to grid' } });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(await screen.findByText(/failed to submit feedback/i)).toBeInTheDocument();
  });

  it('resets form fields when reopening after close', () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Something typed' } });
    const closeBtn = screen.getByRole('dialog').querySelector('.feedback-panel__close') as HTMLElement;
    fireEvent.click(closeBtn);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe('');
  });

  it('shows "unclear" feasibility as Under review', async () => {
    mockSubmit.mockResolvedValueOnce({
      ...MOCK_RESULT,
      feasibility: 'unclear',
      prd_label: null,
      github_issue_url: null,
      github_issue_number: null,
    });
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Something vague' } });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Not sure what this is about' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(await screen.findByText('Under review')).toBeInTheDocument();
  });
});
