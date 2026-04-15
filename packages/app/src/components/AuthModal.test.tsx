import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AuthModal } from './AuthModal';

describe('T-AUTH-002: AuthModal', () => {
  const onClose = vi.fn();
  const onLogin = vi.fn();
  const onRegister = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders login form by default', () => {
    render(<AuthModal onClose={onClose} onLogin={onLogin} onRegister={onRegister} />);
    expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
  });

  it('shows email and password inputs', () => {
    render(<AuthModal onClose={onClose} onLogin={onLogin} onRegister={onRegister} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('calls onLogin when login form submitted', () => {
    render(<AuthModal onClose={onClose} onLogin={onLogin} onRegister={onRegister} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onLogin).toHaveBeenCalledWith({ email: 'test@example.com', password: 'secret123' });
  });

  it('switches to register form', () => {
    render(<AuthModal onClose={onClose} onLogin={onLogin} onRegister={onRegister} />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getAllByText(/create account/i).length).toBeGreaterThan(0);
  });

  it('shows name input on register form', () => {
    render(<AuthModal onClose={onClose} onLogin={onLogin} onRegister={onRegister} mode="register" />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('calls onRegister when register form submitted', () => {
    render(<AuthModal onClose={onClose} onLogin={onLogin} onRegister={onRegister} mode="register" />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass1234' } });
    fireEvent.click(screen.getByRole('button', { name: /create account|register/i }));
    expect(onRegister).toHaveBeenCalledWith({ name: 'Alice', email: 'alice@example.com', password: 'pass1234' });
  });

  it('shows OAuth buttons for Google and GitHub', () => {
    render(<AuthModal onClose={onClose} onLogin={onLogin} onRegister={onRegister} />);
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
  });

  it('shows close button', () => {
    render(<AuthModal onClose={onClose} onLogin={onLogin} onRegister={onRegister} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation error if email is empty on submit', () => {
    render(<AuthModal onClose={onClose} onLogin={onLogin} onRegister={onRegister} />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onLogin).not.toHaveBeenCalled();
  });
});
