import React, { useState } from 'react';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

interface AuthModalProps {
  onClose: () => void;
  onLogin: (creds: LoginCredentials) => void;
  onRegister: (creds: RegisterCredentials) => void;
  mode?: 'login' | 'register';
}

export function AuthModal({ onClose, onLogin, onRegister, mode: initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) return;
    onLogin({ email, password });
  };

  const handleRegister = () => {
    if (!name || !email || !password) return;
    onRegister({ name, email, password });
  };

  const isLogin = mode === 'login';

  return (
    <div className="auth-modal-overlay" role="dialog" aria-modal="true">
      <div className="auth-modal">
        <button aria-label="Close" className="modal-close" onClick={onClose}>×</button>

        <h2 className="auth-title">{isLogin ? 'Sign In' : 'Create Account'}</h2>

        <div className="oauth-buttons">
          <button aria-label="Continue with Google" className="btn-oauth btn-google" onClick={() => {}}>
            Google
          </button>
          <button aria-label="Continue with GitHub" className="btn-oauth btn-github" onClick={() => {}}>
            GitHub
          </button>
        </div>

        <div className="auth-divider">or</div>

        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); isLogin ? handleLogin() : handleRegister(); }}>
          {!isLogin && (
            <div className="form-field">
              <label htmlFor="auth-name">Name</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
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
            />
          </div>

          <button type="submit" className="btn-auth-submit">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? (
            <button
              aria-label="Create account"
              className="btn-switch"
              onClick={() => setMode('register')}
            >
              Create account
            </button>
          ) : (
            <button
              aria-label="Sign in instead"
              className="btn-switch"
              onClick={() => setMode('login')}
            >
              Sign in instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
