/**
 * T-AUTH-007: MFA TOTP challenge step in AuthModal
 *
 * Tests that the AuthModal detects `auth/multi-factor-auth-required` errors
 * and transitions to a TOTP OTP input step.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from './AuthModal';

// ─── Auth store mock ─────────────────────────────────────────────────────────

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResolveMfaChallenge = vi.fn();

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    resolveMfaChallenge: mockResolveMfaChallenge,
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a fake Firebase MFA-required error */
function makeMfaError(resolver: unknown) {
  return Object.assign(new Error('MFA required'), {
    code: 'auth/multi-factor-auth-required',
    customData: { _serverResponse: {} },
    resolver,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('T-AUTH-007: AuthModal MFA TOTP challenge step', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T-AUTH-007-08: shows TOTP input step when signIn throws auth/multi-factor-auth-required', async () => {
    const mockResolver = { hints: [{ factorId: 'totp', uid: 'hint-uid' }] };
    mockSignIn.mockRejectedValue(makeMfaError(mockResolver));

    render(<AuthModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'mfa@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument();
    });
  });

  it('T-AUTH-007-09: TOTP input step shows descriptive heading', async () => {
    const mockResolver = { hints: [{ factorId: 'totp', uid: 'hint-uid' }] };
    mockSignIn.mockRejectedValue(makeMfaError(mockResolver));

    render(<AuthModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'mfa@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    });
  });

  it('T-AUTH-007-10: submitting TOTP code calls resolveMfaChallenge with resolver and OTP', async () => {
    const mockResolver = { hints: [{ factorId: 'totp', uid: 'hint-uid' }] };
    mockSignIn.mockRejectedValue(makeMfaError(mockResolver));
    mockResolveMfaChallenge.mockResolvedValue(undefined);

    render(<AuthModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'mfa@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => screen.getByLabelText(/authenticator code/i));

    fireEvent.change(screen.getByLabelText(/authenticator code/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(mockResolveMfaChallenge).toHaveBeenCalledWith(mockResolver, '123456');
    });
  });

  it('T-AUTH-007-11: shows error when TOTP verification fails', async () => {
    const mockResolver = { hints: [{ factorId: 'totp', uid: 'hint-uid' }] };
    mockSignIn.mockRejectedValue(makeMfaError(mockResolver));
    mockResolveMfaChallenge.mockRejectedValue(
      Object.assign(new Error('Invalid OTP'), { code: 'auth/invalid-verification-code' }),
    );

    render(<AuthModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'mfa@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => screen.getByLabelText(/authenticator code/i));

    fireEvent.change(screen.getByLabelText(/authenticator code/i), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('T-AUTH-007-12: non-MFA signIn errors still show inline error (not TOTP step)', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/wrong-password' });

    render(<AuthModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'x@x.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpw' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByLabelText(/authenticator code/i)).not.toBeInTheDocument();
  });
});
