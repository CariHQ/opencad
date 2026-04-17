import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface AuthModalProps {
  onClose?: () => void;
  /** When `true` the modal cannot be dismissed (trial expired / unauthenticated gate). */
  required?: boolean;
}

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use':  'An account with this email already exists.',
  'auth/invalid-email':          'Please enter a valid email address.',
  'auth/weak-password':          'Password must be at least 8 characters.',
  'auth/wrong-password':         'Incorrect password. Try again.',
  'auth/user-not-found':         'No account found for this email.',
  'auth/too-many-requests':      'Too many attempts — wait a moment and retry.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/invalid-credential':     'Invalid email or password.',
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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signIn, signUp } = useAuthStore();

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
      setErrorCode(code);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const canClose = !required;

  return (
    <div
      className="auth-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isLogin ? 'Sign in to OpenCAD' : 'Create OpenCAD account'}
      onClick={canClose ? (e) => { if (e.target === e.currentTarget) onClose?.(); } : undefined}
    >
      <div className="auth-modal">
        {canClose && (
          <button aria-label="Close" className="modal-close" onClick={onClose}>×</button>
        )}

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
      </div>
    </div>
  );
}
