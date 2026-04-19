/**
 * T-PAY-003: SubscriptionModal component tests
 *
 * Tests T-PAY-003-001 through T-PAY-003-008:
 * - T-PAY-003-001: Renders 3 tier cards
 * - T-PAY-003-002: Current tier shows badge
 * - T-PAY-003-003: Free tier: Upgrade to Pro button visible
 * - T-PAY-003-004: Clicking upgrade calls upgrade('pro')
 * - T-PAY-003-005: Pro tier: shows "Manage billing" button
 * - T-PAY-003-006: Manage billing calls openPortal
 * - T-PAY-003-007: Pro tier: upgrade-business button still shown
 * - T-PAY-003-008: Business tier: both upgrade buttons hidden
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubscriptionModal } from './SubscriptionModal';

expect.extend(jestDomMatchers);

const mockUpgrade = vi.fn();
const mockOpenPortal = vi.fn();

const mockUseSubscription = vi.fn();

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

describe('T-PAY-003: SubscriptionModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: free tier
    mockUseSubscription.mockReturnValue({
      tier: 'free',
      validUntil: null,
      isLoading: false,
      upgrade: mockUpgrade,
      startCheckout: mockUpgrade,
      openPortal: mockOpenPortal,
    });
  });

  it('T-PAY-003-001: renders three tier cards', () => {
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByTestId('tier-free')).toBeInTheDocument();
    expect(screen.getByTestId('tier-pro')).toBeInTheDocument();
    expect(screen.getByTestId('tier-business')).toBeInTheDocument();
  });

  it('T-PAY-003-002: current tier shows badge', () => {
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByTestId('current-plan-badge')).toBeInTheDocument();
  });

  it('T-PAY-003-003: free tier: Upgrade to Pro button is visible', () => {
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByTestId('upgrade-pro')).toBeInTheDocument();
  });

  it('T-PAY-003-004: clicking upgrade-pro calls upgrade("pro")', () => {
    mockUpgrade.mockResolvedValue(undefined);
    render(<SubscriptionModal onClose={onClose} />);
    fireEvent.click(screen.getByTestId('upgrade-pro'));
    expect(mockUpgrade).toHaveBeenCalledWith('pro');
  });

  it('T-PAY-003-005: pro tier shows "Manage billing" button', () => {
    mockUseSubscription.mockReturnValue({
      tier: 'pro',
      validUntil: null,
      isLoading: false,
      upgrade: mockUpgrade,
      startCheckout: mockUpgrade,
      openPortal: mockOpenPortal,
    });
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByTestId('manage-billing')).toBeInTheDocument();
  });

  it('T-PAY-003-006: manage billing button calls openPortal', () => {
    mockUseSubscription.mockReturnValue({
      tier: 'pro',
      validUntil: null,
      isLoading: false,
      upgrade: mockUpgrade,
      startCheckout: mockUpgrade,
      openPortal: mockOpenPortal,
    });
    mockOpenPortal.mockResolvedValue(undefined);
    render(<SubscriptionModal onClose={onClose} />);
    fireEvent.click(screen.getByTestId('manage-billing'));
    expect(mockOpenPortal).toHaveBeenCalled();
  });

  it('T-PAY-003-007: pro tier: upgrade-business button is still shown', () => {
    mockUseSubscription.mockReturnValue({
      tier: 'pro',
      validUntil: null,
      isLoading: false,
      upgrade: mockUpgrade,
      startCheckout: mockUpgrade,
      openPortal: mockOpenPortal,
    });
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByTestId('upgrade-business')).toBeInTheDocument();
  });

  it('T-PAY-003-008: business tier: both upgrade buttons are hidden', () => {
    mockUseSubscription.mockReturnValue({
      tier: 'business',
      validUntil: null,
      isLoading: false,
      upgrade: mockUpgrade,
      startCheckout: mockUpgrade,
      openPortal: mockOpenPortal,
    });
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.queryByTestId('upgrade-pro')).not.toBeInTheDocument();
    expect(screen.queryByTestId('upgrade-business')).not.toBeInTheDocument();
  });

  // ── Additional coverage ──────────────────────────────────────────────────────

  it('renders three plan cards with headings', () => {
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Business' })).toBeInTheDocument();
  });

  it('highlights the current plan with a disabled button', () => {
    render(<SubscriptionModal onClose={onClose} />);
    const currentBtn = screen.getByRole('button', { name: /current plan/i });
    expect(currentBtn).toBeDisabled();
  });

  it('Manage billing calls openPortal (footer)', () => {
    mockOpenPortal.mockResolvedValue(undefined);
    render(<SubscriptionModal onClose={onClose} />);
    const manageBillingBtn = screen.getByRole('button', { name: /manage billing/i });
    fireEvent.click(manageBillingBtn);
    expect(mockOpenPortal).toHaveBeenCalled();
  });

  it('shows "Most popular" badge on Business plan', () => {
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByText(/most popular/i)).toBeInTheDocument();
  });

  it('shows price for Pro plan ($29)', () => {
    render(<SubscriptionModal onClose={onClose} />);
    expect(screen.getByText(/\$29/)).toBeInTheDocument();
  });

  it('shows price for Business plan ($99)', () => {
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
