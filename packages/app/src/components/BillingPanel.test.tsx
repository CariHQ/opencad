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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillingPanel } from './BillingPanel';

const mockUseSubscription = vi.fn();

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

// Mock the real invoice fetch. Tests that need invoices override this
// with real data; by default we return two invoices so the history
// table renders.
const mockListInvoices = vi.fn();
vi.mock('../lib/serverApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/serverApi')>('../lib/serverApi');
  return {
    ...actual,
    subscriptionApi: {
      ...actual.subscriptionApi,
      listInvoices: () => mockListInvoices(),
    },
  };
});

// Mock window.open for upgrade button
const mockWindowOpen = vi.fn();

/** Default subscription shape with the full new field set. Individual
 *  tests override this through mockUseSubscription.mockReturnValue. */
function baseSub(overrides: Record<string, unknown> = {}) {
  return {
    tier: 'trial',
    subscriptionStatus: null,
    validUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
    cancelAtPeriodEnd: false,
    accessMode: 'trial',
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    upgrade: vi.fn(),
    startCheckout: vi.fn(),
    openPortal: vi.fn(),
    ...overrides,
  };
}

describe('T-PAY-001: BillingPanel — plan badge and trial countdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true });
    mockUseSubscription.mockReturnValue(baseSub());
    // Two realistic Stripe-shaped invoices. Component fetches async on
    // mount; tests that assert presence use waitFor.
    mockListInvoices.mockResolvedValue([
      {
        id: 'in_001', number: 'INV-001', created: 1_700_000_000,
        amountPaid: 2900, currency: 'usd', status: 'paid',
        hostedInvoiceUrl: 'https://example.com/hosted/001',
        invoicePdf: 'https://example.com/pdf/001',
      },
      {
        id: 'in_002', number: 'INV-002', created: 1_702_000_000,
        amountPaid: 2900, currency: 'usd', status: 'paid',
        hostedInvoiceUrl: 'https://example.com/hosted/002',
        invoicePdf: 'https://example.com/pdf/002',
      },
    ]);
  });

  it('T-PAY-001-001: renders current plan badge for trial tier', () => {
    render(<BillingPanel />);
    expect(screen.getByTestId('plan-badge')).toBeInTheDocument();
    expect(screen.getByTestId('plan-badge')).toHaveTextContent(/trial/i);
  });

  it('T-PAY-001-002: renders current plan badge for pro tier', () => {
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'pro', validUntil: null, accessMode: 'active',
      subscriptionStatus: 'active',
    }));
    render(<BillingPanel />);
    expect(screen.getByTestId('plan-badge')).toHaveTextContent(/pro/i);
  });

  it('T-PAY-001-003: trial countdown shows days remaining when on trial', () => {
    render(<BillingPanel />);
    expect(screen.getByTestId('trial-countdown')).toBeInTheDocument();
    expect(screen.getByTestId('trial-countdown')).toHaveTextContent(/7.*day/i);
  });

  it('T-PAY-001-004: trial countdown is hidden when not on trial', () => {
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'pro', validUntil: null, accessMode: 'active',
      subscriptionStatus: 'active',
    }));
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

  it('T-PAY-001-006: invoice history table renders real Stripe rows', async () => {
    render(<BillingPanel />);
    // Async fetch from subscriptionApi.listInvoices — wait for it.
    await waitFor(() => {
      expect(screen.getByTestId('invoice-table')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('invoice-row').length).toBeGreaterThan(0);
  });

  it('T-PAY-001-006b: invoice rows show amount and PDF link', async () => {
    render(<BillingPanel />);
    await waitFor(() => {
      expect(screen.getAllByTestId('invoice-row').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByTestId('invoice-pdf-link').length).toBeGreaterThan(0);
  });

  it('T-PAY-001-006c: empty invoice list shows a helpful message', async () => {
    mockListInvoices.mockResolvedValue([]);
    render(<BillingPanel />);
    await waitFor(() => {
      expect(screen.getByText(/No invoices yet/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('invoice-table')).not.toBeInTheDocument();
  });

  it('T-PAY-001-007: cancel subscription button is present for active paid tiers', () => {
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'pro', accessMode: 'active', subscriptionStatus: 'active',
    }));
    render(<BillingPanel />);
    expect(screen.getByTestId('cancel-subscription-btn')).toBeInTheDocument();
  });

  it('T-PAY-001-007b: cancel button shows confirmation dialog', () => {
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'pro', accessMode: 'active', subscriptionStatus: 'active',
    }));
    render(<BillingPanel />);
    fireEvent.click(screen.getByTestId('cancel-subscription-btn'));
    expect(screen.getByTestId('cancel-confirm-dialog')).toBeInTheDocument();
  });

  it('T-PAY-001-007c: confirming cancel dialog calls openPortal', () => {
    const mockOpenPortal = vi.fn().mockResolvedValue(undefined);
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'pro', accessMode: 'active', subscriptionStatus: 'active',
      openPortal: mockOpenPortal,
    }));
    render(<BillingPanel />);
    fireEvent.click(screen.getByTestId('cancel-subscription-btn'));
    fireEvent.click(screen.getByTestId('cancel-confirm-yes'));
    expect(mockOpenPortal).toHaveBeenCalled();
  });

  it('T-PAY-001-007d: dismissing cancel dialog hides it', () => {
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'pro', accessMode: 'active', subscriptionStatus: 'active',
    }));
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
    mockListInvoices.mockResolvedValue([]);
  });

  it('T-PAY-002-001: renders Free plan badge', () => {
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'free', validUntil: null, accessMode: 'expired',
    }));
    render(<BillingPanel />);
    expect(screen.getByTestId('plan-badge')).toHaveTextContent(/free/i);
  });

  it('T-PAY-002-002: renders Business plan badge', () => {
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'business', validUntil: null, accessMode: 'active',
      subscriptionStatus: 'active',
    }));
    render(<BillingPanel />);
    expect(screen.getByTestId('plan-badge')).toHaveTextContent(/business/i);
  });

  it('T-PAY-002-003: cancel button is absent on free tier', () => {
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'free', validUntil: null, accessMode: 'expired',
    }));
    render(<BillingPanel />);
    expect(screen.queryByTestId('cancel-subscription-btn')).not.toBeInTheDocument();
  });

  it('T-PAY-002-004: shows loading state while subscription is loading', () => {
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'free', validUntil: null, isLoading: true, accessMode: 'expired',
    }));
    render(<BillingPanel />);
    expect(screen.getByTestId('billing-loading')).toBeInTheDocument();
  });

  it('T-PAY-002-005: cancel button is hidden when subscription already cancelAtPeriodEnd', () => {
    mockUseSubscription.mockReturnValue(baseSub({
      tier: 'pro', accessMode: 'grace',
      subscriptionStatus: 'active', cancelAtPeriodEnd: true,
    }));
    render(<BillingPanel />);
    expect(screen.queryByTestId('cancel-subscription-btn')).not.toBeInTheDocument();
  });
});
