import React, { useState } from 'react';
import type { MultiFactorResolver } from 'firebase/auth';
import { useAuthStore } from '../stores/authStore';

interface AuthModalProps {
  onClose?: () => void;
  /** When `true` the modal cannot be dismissed (trial expired / unauthenticated gate). */
  required?: boolean;
}

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use':        'An account with this email already exists.',
  'auth/invalid-email':               'Please enter a valid email address.',
  'auth/weak-password':               'Password must be at least 8 characters.',
  'auth/wrong-password':              'Incorrect password. Try again.',
  'auth/user-not-found':              'No account found for this email.',
  'auth/too-many-requests':           'Too many attempts — wait a moment and retry.',
  'auth/network-request-failed':      'Network error. Check your connection.',
  'auth/invalid-credential':          'Invalid email or password.',
  'auth/invalid-verification-code':   'Incorrect authentication code. Try again.',
  'auth/code-expired':                'The authentication code has expired. Please retry.',
  'auth/popup-blocked':               'Pop-up was blocked by your browser. Allow pop-ups and try again.',
  'auth/popup-closed-by-user':        'Sign-in was cancelled. Please try again.',
  'auth/cancelled-popup-request':     'Sign-in was cancelled. Please try again.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
};

function friendlyError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    return FIREBASE_ERRORS[code] ?? (err as { message?: string }).message ?? 'Something went wrong.';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

export function AuthModal({ onClose, required = false }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'mfa-challenge'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signIn, signUp, signInWithGoogle, signInWithMicrosoft, resolveMfaChallenge } = useAuthStore();

  const isLogin = mode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        setSuccess('Signed in successfully.');
      } else {
        if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
        await signUp(name.trim(), email, password);
        setSuccess('Account created! Your 14-day trial has started.');
      }
      setTimeout(() => onClose?.(), 1000);
    } catch (err) {
      const code = (err && typeof err === 'object' && 'code' in err)
        ? (err as { code: string }).code
        : null;

      // MFA required — switch to TOTP challenge step
      if (
        code === 'auth/multi-factor-auth-required' &&
        err !== null &&
        typeof err === 'object' &&
        'resolver' in err
      ) {
        setMfaResolver((err as { resolver: MultiFactorResolver }).resolver);
        setMode('mfa-challenge');
        setLoading(false);
        return;
      }

      setErrorCode(code);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaResolver) return;
    setError(null);
    setLoading(true);

    try {
      await resolveMfaChallenge(mfaResolver, totpCode);
      setSuccess('Signed in successfully.');
      setTimeout(() => onClose?.(), 1000);
    } catch (err) {
      const code = (err && typeof err === 'object' && 'code' in err)
        ? (err as { code: string }).code
        : null;
      setErrorCode(code);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft') => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithMicrosoft();
      }
      setSuccess('Signed in successfully.');
      setTimeout(() => onClose?.(), 1000);
    } catch (err) {
      const code = (err && typeof err === 'object' && 'code' in err)
        ? (err as { code: string }).code
        : null;
      setErrorCode(code);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const canClose = !required;
  const isMfaChallenge = mode === 'mfa-challenge';

  const ariaLabel = isMfaChallenge
    ? 'Two-factor authentication'
    : isLogin
      ? 'Sign in to OpenCAD'
      : 'Create OpenCAD account';

  return (
    <div
      className="auth-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={canClose ? (e) => { if (e.target === e.currentTarget) onClose?.(); } : undefined}
    >
      <div className="auth-modal">
        {canClose && (
          <button aria-label="Close" className="modal-close" onClick={onClose}>×</button>
        )}

        {/* ── MFA TOTP challenge step ────────────────────────────────── */}
        {isMfaChallenge ? (
          <>
            <h2 className="auth-title">Two-Factor Authentication</h2>
            <p className="auth-subtitle">Enter the 6-digit code from your authenticator app.</p>

            {error && (
              <div className="auth-msg auth-msg--error" role="alert">{error}</div>
            )}
            {success && <div className="auth-msg auth-msg--success" role="status">{success}</div>}

            <form className="auth-form" onSubmit={handleMfaSubmit} noValidate>
              <div className="form-field">
                <label htmlFor="auth-totp-code">Authenticator code</label>
                <input
                  id="auth-totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-auth-submit" disabled={loading}>
                {loading ? (
                  <span className="auth-spinner" aria-label="Loading" />
                ) : (
                  'Verify'
                )}
              </button>
            </form>
          </>
        ) : (
          /* ── Login / Register step ──────────────────────────────────── */
          <>
            <h2 className="auth-title">
              {isLogin ? 'Sign in to OpenCAD' : 'Create your account'}
            </h2>
            {!isLogin && (
              <p className="auth-subtitle">14-day free trial — no credit card required</p>
            )}

            {error && (
              <div className="auth-msg auth-msg--error" role="alert">
                {error}
                {errorCode === 'auth/email-already-in-use' && (
                  <>
                    {' '}
                    <button
                      className="btn-switch"
                      onClick={() => { setMode('login'); setError(null); setErrorCode(null); }}
                    >
                      Log in instead
                    </button>
                  </>
                )}
              </div>
            )}
            {success && <div className="auth-msg auth-msg--success" role="status">{success}</div>}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {!isLogin && (
                <div className="form-field">
                  <label htmlFor="auth-name">Full name</label>
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Johnson"
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>
              )}

              <div className="form-field">
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={8}
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-auth-submit" disabled={loading}>
                {loading ? (
                  <span className="auth-spinner" aria-label="Loading" />
                ) : (
                  isLogin ? 'Sign in' : 'Create free account'
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div className="auth-oauth">
              <button
                type="button"
                className="btn-oauth btn-oauth--google"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading}
              >
                Continue with Google
              </button>
              <button
                type="button"
                className="btn-oauth btn-oauth--microsoft"
                onClick={() => handleOAuthSignIn('microsoft')}
                disabled={loading}
              >
                Continue with Microsoft
              </button>
            </div>

            <div className="auth-switch">
              {isLogin ? (
                <>
                  No account?{' '}
                  <button className="btn-switch" onClick={() => { setMode('register'); setError(null); setErrorCode(null); }}>
                    Create one free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button className="btn-switch" onClick={() => { setMode('login'); setError(null); setErrorCode(null); }}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
