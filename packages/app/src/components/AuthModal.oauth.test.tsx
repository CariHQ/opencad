/**
 * T-AUTH-008 / T-AUTH-009 / T-AUTH-010: OAuth2 login — Google and Microsoft providers
 *
 * Tests that:
 * - T-AUTH-008: Clicking "Continue with Google" calls signInWithGoogle()
 * - T-AUTH-009: Clicking "Continue with Microsoft" calls signInWithMicrosoft()
 * - T-AUTH-010: When an OAuth provider throws, the modal shows an error message
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from './AuthModal';

// ─── Auth store mock ─────────────────────────────────────────────────────────

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockSignInWithMicrosoft = vi.fn();
const mockResolveMfaChallenge = vi.fn();

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    signInWithGoogle: mockSignInWithGoogle,
    signInWithMicrosoft: mockSignInWithMicrosoft,
    resolveMfaChallenge: mockResolveMfaChallenge,
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('T-AUTH-008 / T-AUTH-009 / T-AUTH-010: AuthModal OAuth providers', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T-AUTH-008: "Continue with Google" button is rendered', () => {
    render(<AuthModal onClose={onClose} />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('T-AUTH-008: clicking "Continue with Google" calls signInWithGoogle()', async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined);
    render(<AuthModal onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1));
  });

  it('T-AUTH-009: "Continue with Microsoft" button is rendered', () => {
    render(<AuthModal onClose={onClose} />);
    expect(screen.getByRole('button', { name: /continue with microsoft/i })).toBeInTheDocument();
  });

  it('T-AUTH-009: clicking "Continue with Microsoft" calls signInWithMicrosoft()', async () => {
    mockSignInWithMicrosoft.mockResolvedValue(undefined);
    render(<AuthModal onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /continue with microsoft/i }));

    await waitFor(() => expect(mockSignInWithMicrosoft).toHaveBeenCalledTimes(1));
  });

  it('T-AUTH-010: when Google sign-in fails, shows error message', async () => {
    mockSignInWithGoogle.mockRejectedValue({
      code: 'auth/popup-closed-by-user',
      message: 'Sign-in was cancelled.',
    });
    render(<AuthModal onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert').textContent).toMatch(/cancelled/i);
  });

  it('T-AUTH-010: when Microsoft sign-in fails, shows error message', async () => {
    mockSignInWithMicrosoft.mockRejectedValue({
      code: 'auth/popup-blocked',
      message: 'Pop-up was blocked.',
    });
    render(<AuthModal onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /continue with microsoft/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert').textContent).toMatch(/pop-up/i);
  });

  it('T-AUTH-010: OAuth buttons are disabled while loading', async () => {
    // Make the promise hang to keep loading state active
    let resolveSignIn!: () => void;
    mockSignInWithGoogle.mockReturnValue(
      new Promise<void>((res) => { resolveSignIn = res; }),
    );

    render(<AuthModal onClose={onClose} />);
    const googleBtn = screen.getByRole('button', { name: /continue with google/i });
    const msBtn = screen.getByRole('button', { name: /continue with microsoft/i });

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(googleBtn).toBeDisabled();
      expect(msBtn).toBeDisabled();
    });

    // Resolve so the promise doesn't leak
    resolveSignIn();
  });
});
