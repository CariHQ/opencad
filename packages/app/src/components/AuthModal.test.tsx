import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthModal } from './AuthModal';
expect.extend(jestDomMatchers);

// Mock the auth store so tests don't need Firebase configured
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
  }),
}));

describe('T-AUTH-002: AuthModal', () => {
  const onClose = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders sign-in form by default', () => {
    render(<AuthModal onClose={onClose} />);
    expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
  });

  it('shows email and password inputs', () => {
    render(<AuthModal onClose={onClose} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('calls signIn when login form submitted with credentials', async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<AuthModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    // signIn is async; just verify it was called
    await vi.waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'secret123'));
  });

  it('switches to register form', () => {
    render(<AuthModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /create one free/i }));
    expect(screen.getAllByText(/create your account/i).length).toBeGreaterThan(0);
  });

  it('shows name input on register form', () => {
    render(<AuthModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /create one free/i }));
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('calls signUp when register form submitted with credentials', async () => {
    mockSignUp.mockResolvedValue(undefined);
    render(<AuthModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /create one free/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass1234' } });
    fireEvent.click(screen.getByRole('button', { name: /create free account/i }));
    await vi.waitFor(() => expect(mockSignUp).toHaveBeenCalledWith('Alice', 'alice@example.com', 'pass1234'));
  });

  it('shows close button when not required', () => {
    render(<AuthModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not show close button when required=true', () => {
    render(<AuthModal required />);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('shows error message when signIn rejects', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/wrong-password' });
    render(<AuthModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'x@x.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpw' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await vi.waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toMatch(/incorrect password/i);
  });
});
