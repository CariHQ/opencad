/**
 * T-PAY-003: SubscriptionModal component tests
 *
 * Verifies: three plan cards, current plan highlight, upgrade CTA, billing portal
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubscriptionModal } from './SubscriptionModal';

expect.extend(jestDomMatchers);

const mockStartCheckout = vi.fn();
const mockOpenPortal = vi.fn();

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({
    tier: 'free',
    validUntil: null,
    isLoading: false,
    startCheckout: mockStartCheckout,
    openPortal: mockOpenPortal,
  }),
}));

describe('T-PAY-003: SubscriptionModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three plan cards', () => {
    render(<SubscriptionModal onClose={onClose} />);
    // Each plan has an h3 heading with the tier name
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Business' })).toBeInTheDocument();
  });

  it('highlights the current plan', () => {
    render(<SubscriptionModal onClose={onClose} />);
    // Current plan button should be disabled and say "Current plan"
    const currentBtn = screen.getByRole('button', { name: /current plan/i });
    expect(currentBtn).toBeDisabled();
  });

  it('Upgrade button calls startCheckout with pro tier', () => {
    render(<SubscriptionModal onClose={onClose} />);
    const upgradeButtons = screen.getAllByRole('button', { name: /upgrade/i });
    // Click the Pro upgrade button (first upgrade button)
    fireEvent.click(upgradeButtons[0]!);
    expect(mockStartCheckout).toHaveBeenCalledWith('pro');
  });

  it('Manage billing calls openPortal', () => {
    render(<SubscriptionModal onClose={onClose} />);
    const manageBillingBtn = screen.getByRole('button', { name: /manage billing/i });
    fireEvent.click(manageBillingBtn);
    expect(mockOpenPortal).toHaveBeenCalled();
  });

  it('current plan button is disabled', () => {
    render(<SubscriptionModal onClose={onClose} />);
    const currentBtn = screen.getByRole('button', { name: /current plan/i });
    expect(currentBtn).toBeDisabled();
  });

  it('shows "Most popular" badge on Business plan', () => {
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByText(/most popular/i)).toBeInTheDocument();
  });

  it('shows price for Pro plan', () => {
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByText(/\$29/)).toBeInTheDocument();
  });

  it('shows price for Business plan', () => {
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByText(/\$99/)).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    render(<SubscriptionModal onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
