/**
 * T-AUTH-007: MFASettingsPanel — QR code display and TOTP enroll/unenroll
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MFASettingsPanel } from './MFASettingsPanel';
import type { User } from 'firebase/auth';

// ─── Auth store mock ──────────────────────────────────────────────────────────

const mockEnrollTotp = vi.fn();
const mockVerifyTotpEnrollment = vi.fn();
const mockUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
} as unknown as User;

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    enrollTotp: mockEnrollTotp,
    verifyTotpEnrollment: mockVerifyTotpEnrollment,
  }),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('T-AUTH-007: MFASettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T-AUTH-007-13: renders "Set up Authenticator" button when user has no MFA enrolled', () => {
    render(<MFASettingsPanel />);
    expect(screen.getByRole('button', { name: /set up authenticator/i })).toBeInTheDocument();
  });

  it('T-AUTH-007-14: clicking "Set up Authenticator" calls enrollTotp and shows QR code URL', async () => {
    const mockSecret = {
      secretKey: 'JBSWY3DPEHPK3PXP',
      generateQrCodeUrl: vi.fn(() => 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP'),
    };
    mockEnrollTotp.mockResolvedValue({
      secret: mockSecret,
      qrCodeUrl: 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP',
    });

    render(<MFASettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /set up authenticator/i }));

    await waitFor(() => {
      expect(mockEnrollTotp).toHaveBeenCalledWith(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByTestId('mfa-qr-code')).toBeInTheDocument();
    });
  });

  it('T-AUTH-007-15: shows OTP input and Confirm button after QR code is displayed', async () => {
    const mockSecret = {
      secretKey: 'JBSWY3DPEHPK3PXP',
      generateQrCodeUrl: vi.fn(() => 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP'),
    };
    mockEnrollTotp.mockResolvedValue({
      secret: mockSecret,
      qrCodeUrl: 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP',
    });

    render(<MFASettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /set up authenticator/i }));

    await waitFor(() => screen.getByTestId('mfa-qr-code'));

    expect(screen.getByLabelText(/enter code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('T-AUTH-007-16: confirming OTP calls verifyTotpEnrollment with correct args', async () => {
    const mockSecret = {
      secretKey: 'JBSWY3DPEHPK3PXP',
      generateQrCodeUrl: vi.fn(() => 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP'),
    };
    mockEnrollTotp.mockResolvedValue({
      secret: mockSecret,
      qrCodeUrl: 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP',
    });
    mockVerifyTotpEnrollment.mockResolvedValue(undefined);

    render(<MFASettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /set up authenticator/i }));

    await waitFor(() => screen.getByTestId('mfa-qr-code'));

    fireEvent.change(screen.getByLabelText(/enter code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockVerifyTotpEnrollment).toHaveBeenCalledWith(mockUser, mockSecret, '123456');
    });
  });

  it('T-AUTH-007-17: shows success message after successful enrollment', async () => {
    const mockSecret = {
      secretKey: 'JBSWY3DPEHPK3PXP',
      generateQrCodeUrl: vi.fn(() => 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP'),
    };
    mockEnrollTotp.mockResolvedValue({
      secret: mockSecret,
      qrCodeUrl: 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP',
    });
    mockVerifyTotpEnrollment.mockResolvedValue(undefined);

    render(<MFASettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /set up authenticator/i }));

    await waitFor(() => screen.getByTestId('mfa-qr-code'));

    fireEvent.change(screen.getByLabelText(/enter code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
    expect(screen.getByRole('status').textContent).toMatch(/enabled/i);
  });

  it('T-AUTH-007-18: shows error when verifyTotpEnrollment fails', async () => {
    const mockSecret = {
      secretKey: 'JBSWY3DPEHPK3PXP',
      generateQrCodeUrl: vi.fn(() => 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP'),
    };
    mockEnrollTotp.mockResolvedValue({
      secret: mockSecret,
      qrCodeUrl: 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP',
    });
    mockVerifyTotpEnrollment.mockRejectedValue(
      Object.assign(new Error('Invalid OTP'), { code: 'auth/invalid-verification-code' }),
    );

    render(<MFASettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /set up authenticator/i }));

    await waitFor(() => screen.getByTestId('mfa-qr-code'));

    fireEvent.change(screen.getByLabelText(/enter code/i), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
