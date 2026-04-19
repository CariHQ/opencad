import React, { useState } from 'react';
import type { TotpSecret } from 'firebase/auth';
import { useAuthStore } from '../stores/authStore';

type EnrollStep = 'idle' | 'qr' | 'success';

export function MFASettingsPanel() {
  const { user, enrollTotp, verifyTotpEnrollment } = useAuthStore();

  const [step, setStep] = useState<EnrollStep>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartEnrollment = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const result = await enrollTotp(user);
      if (!result) return; // Firebase not configured
      setSecret(result.secret);
      setQrCodeUrl(result.qrCodeUrl);
      setStep('qr');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !secret) return;
    setError(null);
    setLoading(true);
    try {
      await verifyTotpEnrollment(user, secret, otpCode);
      setStep('success');
      setOtpCode('');
    } catch (err) {
      const code =
        err !== null && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : null;
      const message =
        code === 'auth/invalid-verification-code'
          ? 'Incorrect code — check your authenticator app and try again.'
          : err instanceof Error
            ? err.message
            : 'Verification failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mfa-settings-panel" aria-labelledby="mfa-heading">
      <h3 id="mfa-heading">Two-Factor Authentication (TOTP)</h3>

      {error && (
        <div className="auth-msg auth-msg--error" role="alert">{error}</div>
      )}

      {step === 'success' && (
        <div className="auth-msg auth-msg--success" role="status">
          Authenticator app enabled successfully.
        </div>
      )}

      {step === 'idle' && (
        <button
          type="button"
          className="btn-mfa-setup"
          onClick={handleStartEnrollment}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Set up Authenticator'}
        </button>
      )}

      {step === 'qr' && qrCodeUrl && (
        <>
          <p className="mfa-instructions">
            Scan this QR code with your authenticator app (e.g. Google Authenticator,
            Authy), then enter the 6-digit code below to confirm.
          </p>
          <img
            data-testid="mfa-qr-code"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
            alt="Scan this QR code to set up your authenticator app"
            width={200}
            height={200}
          />

          <form onSubmit={handleConfirm} className="mfa-confirm-form" noValidate>
            <div className="form-field">
              <label htmlFor="mfa-otp-code">Enter code</label>
              <input
                id="mfa-otp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                autoComplete="one-time-code"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="btn-mfa-confirm"
              disabled={loading || otpCode.length < 6}
            >
              {loading ? 'Verifying…' : 'Confirm'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
