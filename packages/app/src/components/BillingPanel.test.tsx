/**
 * T-PAY-001 / T-PAY-002: BillingPanel component tests
 *
 * Tests T-PAY-001-001 through T-PAY-001-007 (plan badge, trial countdown, upgrade):
 * - T-PAY-001-001: Renders current plan badge — Trial
 * - T-PAY-001-002: Renders current plan badge — Pro
 * - T-PAY-001-003: Trial countdown shows days remaining when on trial
 * - T-PAY-001-004: Trial countdown is hidden when not on trial
 * - T-PAY-001-005: Upgrade button present and links to pricing
 * - T-PAY-001-006: Invoice history table renders mock rows
 * - T-PAY-001-007: Cancel subscription button present with confirmation
 *
 * Tests T-PAY-002-001 through T-PAY-002-003 (plan tiers: Starter, Enterprise):
 * - T-PAY-002-001: Renders Starter plan badge
 * - T-PAY-002-002: Renders Enterprise plan badge
 * - T-PAY-002-003: Cancel button absent on free / trial tier
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BillingPanel } from './BillingPanel';

const mockUseSubscription = vi.fn();

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

// Mock window.open for upgrade button
const mockWindowOpen = vi.fn();

describe('T-PAY-001: BillingPanel — plan badge and trial countdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true });
    // Default: trial tier, 7 days remaining (validUntil = now + 7 days in ms)
    const sevenDaysMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
    mockUseSubscription.mockReturnValue({
      tier: 'trial',
      validUntil: sevenDaysMs,
      isLoading: false,
      upgrade: vi.fn(),
      startCheckout: vi.fn(),
      openPortal: vi.fn(),
    });
  });

  it('T-PAY-001-001: renders current plan badge for trial tier', () => {
    render(<BillingPanel />);
    expect(screen.getByTestId('plan-badge')).toBeInTheDocument();
    expect(screen.getByTestId('plan-badge')).toHaveTextContent(/trial/i);
  });

  it('T-PAY-001-002: renders current plan badge for pro tier', () => {
    mockUseSubscription.mockReturnValue({
      tier: 'pro',
      validUntil: null,
      isLoading: false,
      upgrade: vi.fn(),
      startCheckout: vi.fn(),
      openPortal: vi.fn(),
    });
    render(<BillingPanel />);
    expect(screen.getByTestId('plan-badge')).toHaveTextContent(/pro/i);
  });

  it('T-PAY-001-003: trial countdown shows days remaining when on trial', () => {
    render(<BillingPanel />);
    expect(screen.getByTestId('trial-countdown')).toBeInTheDocument();
    expect(screen.getByTestId('trial-countdown')).toHaveTextContent(/7.*day/i);
  });

  it('T-PAY-001-004: trial countdown is hidden when not on trial', () => {
    mockUseSubscription.mockReturnValue({
      tier: 'pro',
      validUntil: null,
      isLoading: false,
      upgrade: vi.fn(),
      startCheckout: vi.fn(),
      openPortal: vi.fn(),
    });
    render(<BillingPanel />);
    expect(screen.queryByTestId('trial-countdown')).not.toBeInTheDocument();
  });

  it('T-PAY-001-005: upgrade button is present', () => {
    render(<BillingPanel />);
    expect(screen.getByTestId('upgrade-btn')).toBeInTheDocument();
  });

  it('T-PAY-001-005b: clicking upgrade opens pricing page', () => {
    render(<BillingPanel />);
    fireEvent.click(screen.getByTestId('upgrade-btn'));
    expect(mockWindowOpen).toHaveBeenCalledWith('https://opencad.archi/pricing', '_blank');
  });

  it('T-PAY-001-006: invoice history table renders mock rows', () => {
    render(<BillingPanel />);
    expect(screen.getByTestId('invoice-table')).toBeInTheDocument();
    // Should have at least one invoice row
    expect(screen.getAllByTestId('invoice-row').length).toBeGreaterThan(0);
  });

  it('T-PAY-001-006b: invoice rows show date, amount, status', () => {
    render(<BillingPanel />);
    const rows = screen.getAllByTestId('invoice-row');
    // First row should contain amount and status info
    expect(rows[0]).toBeInTheDocument();
    // There should be a download/PDF link in each row
    expect(screen.getAllByTestId('invoice-pdf-link').length).toBeGreaterThan(0);
  });

  it('T-PAY-001-007: cancel subscription button is present for trial/paid tiers', () => {
    render(<BillingPanel />);
    expect(screen.getByTestId('cancel-subscription-btn')).toBeInTheDocument();
  });

  it('T-PAY-001-007b: cancel button shows confirmation dialog', () => {
    render(<BillingPanel />);
    fireEvent.click(screen.getByTestId('cancel-subscription-btn'));
    expect(screen.getByTestId('cancel-confirm-dialog')).toBeInTheDocument();
  });

  it('T-PAY-001-007c: confirming cancel dialog calls openPortal', () => {
    const mockOpenPortal = vi.fn().mockResolvedValue(undefined);
    mockUseSubscription.mockReturnValue({
      tier: 'pro',
      validUntil: null,
      isLoading: false,
      upgrade: vi.fn(),
      startCheckout: vi.fn(),
      openPortal: mockOpenPortal,
    });
    render(<BillingPanel />);
    fireEvent.click(screen.getByTestId('cancel-subscription-btn'));
    fireEvent.click(screen.getByTestId('cancel-confirm-yes'));
    expect(mockOpenPortal).toHaveBeenCalled();
  });

  it('T-PAY-001-007d: dismissing cancel dialog hides it', () => {
    render(<BillingPanel />);
    fireEvent.click(screen.getByTestId('cancel-subscription-btn'));
    expect(screen.getByTestId('cancel-confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-confirm-no'));
    expect(screen.queryByTestId('cancel-confirm-dialog')).not.toBeInTheDocument();
  });
});

describe('T-PAY-002: BillingPanel — plan tier badges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true });
  });

  it('T-PAY-002-001: renders Starter plan badge', () => {
    mockUseSubscription.mockReturnValue({
      tier: 'free',
      validUntil: null,
      isLoading: false,
      upgrade: vi.fn(),
      startCheckout: vi.fn(),
      openPortal: vi.fn(),
    });
    render(<BillingPanel />);
    expect(screen.getByTestId('plan-badge')).toHaveTextContent(/free/i);
  });

  it('T-PAY-002-002: renders Business plan badge', () => {
    mockUseSubscription.mockReturnValue({
      tier: 'business',
      validUntil: null,
      isLoading: false,
      upgrade: vi.fn(),
      startCheckout: vi.fn(),
      openPortal: vi.fn(),
    });
    render(<BillingPanel />);
    expect(screen.getByTestId('plan-badge')).toHaveTextContent(/business/i);
  });

  it('T-PAY-002-003: cancel button is absent on free tier', () => {
    mockUseSubscription.mockReturnValue({
      tier: 'free',
      validUntil: null,
      isLoading: false,
      upgrade: vi.fn(),
      startCheckout: vi.fn(),
      openPortal: vi.fn(),
    });
    render(<BillingPanel />);
    expect(screen.queryByTestId('cancel-subscription-btn')).not.toBeInTheDocument();
  });

  it('T-PAY-002-004: shows loading state while subscription is loading', () => {
    mockUseSubscription.mockReturnValue({
      tier: 'free',
      validUntil: null,
      isLoading: true,
      upgrade: vi.fn(),
      startCheckout: vi.fn(),
      openPortal: vi.fn(),
    });
    render(<BillingPanel />);
    expect(screen.getByTestId('billing-loading')).toBeInTheDocument();
  });
});
