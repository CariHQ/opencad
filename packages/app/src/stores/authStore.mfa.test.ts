/**
 * T-AUTH-007: MFA TOTP enrollment and challenge resolution
 *
 * Tests for enrollTotp, verifyTotpEnrollment, and resolveMfaChallenge actions
 * added to the authStore.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Firebase auth mocks ────────────────────────────────────────────────────

const mockGenerateSecret = vi.fn();
const mockAssertionForEnrollment = vi.fn();
const mockAssertionForSignIn = vi.fn();
const mockEnroll = vi.fn();
const mockGetSession = vi.fn(() => Promise.resolve('mock-session'));
const mockMultiFactorUser = { enroll: mockEnroll, getSession: mockGetSession };
const mockMultiFactor = vi.fn(() => mockMultiFactorUser);

vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>();
  return {
    ...actual,
    TotpMultiFactorGenerator: {
      generateSecret: mockGenerateSecret,
      assertionForEnrollment: mockAssertionForEnrollment,
      assertionForSignIn: mockAssertionForSignIn,
      FACTOR_ID: 'totp',
    },
    multiFactor: mockMultiFactor,
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn((_auth: unknown, cb: (u: null) => void) => {
      cb(null);
      return vi.fn();
    }),
    updateProfile: vi.fn(),
    getAuth: vi.fn(),
  };
});

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  serverTimestamp: vi.fn(),
  getFirestore: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  isFirebaseConfigured: true,
  firebaseAuth: vi.fn(() => ({ currentUser: mockCurrentUser })),
  firebaseDb: vi.fn(),
}));

vi.mock('../lib/serverApi', () => ({
  authApi: { me: vi.fn(() => Promise.resolve()) },
}));

// ─── Shared mock user ───────────────────────────────────────────────────────

const mockCurrentUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('T-AUTH-007: authStore MFA TOTP actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue('mock-session');
  });

  describe('enrollTotp()', () => {
    it('T-AUTH-007-01: returns secret and qrCodeUrl from TotpMultiFactorGenerator', async () => {
      const mockSecret = {
        secretKey: 'JBSWY3DPEHPK3PXP',
        generateQrCodeUrl: vi.fn(() => 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP'),
      };
      mockGenerateSecret.mockResolvedValue(mockSecret);

      const { useAuthStore } = await import('./authStore');
      const store = useAuthStore.getState();

      const result = await store.enrollTotp(mockCurrentUser as unknown as import('firebase/auth').User);

      expect(mockMultiFactor).toHaveBeenCalledWith(mockCurrentUser);
      expect(mockGetSession).toHaveBeenCalled();
      expect(mockGenerateSecret).toHaveBeenCalledWith('mock-session');
      expect(result).toEqual({
        secret: mockSecret,
        qrCodeUrl: 'otpauth://totp/OpenCAD:test@example.com?secret=JBSWY3DPEHPK3PXP',
      });
    });

    it('T-AUTH-007-02: no-ops gracefully when Firebase is not configured', async () => {
      vi.doMock('../lib/firebase', () => ({
        isFirebaseConfigured: false,
        firebaseAuth: vi.fn(),
        firebaseDb: vi.fn(),
      }));

      vi.resetModules();
      const { useAuthStore } = await import('./authStore');
      const store = useAuthStore.getState();

      const result = await store.enrollTotp(mockCurrentUser as unknown as import('firebase/auth').User);

      expect(result).toBeNull();

      // Restore
      vi.doMock('../lib/firebase', () => ({
        isFirebaseConfigured: true,
        firebaseAuth: vi.fn(() => ({ currentUser: mockCurrentUser })),
        firebaseDb: vi.fn(),
      }));
      vi.resetModules();
    });
  });

  describe('verifyTotpEnrollment()', () => {
    it('T-AUTH-007-03: calls assertionForEnrollment and enroll with correct args', async () => {
      const mockSecret = { secretKey: 'JBSWY3DPEHPK3PXP' } as unknown as import('firebase/auth').TotpSecret;
      const mockAssertion = { factorId: 'totp' };
      mockAssertionForEnrollment.mockReturnValue(mockAssertion);
      mockEnroll.mockResolvedValue(undefined);

      const { useAuthStore } = await import('./authStore');
      const store = useAuthStore.getState();

      await store.verifyTotpEnrollment(
        mockCurrentUser as unknown as import('firebase/auth').User,
        mockSecret,
        '123456',
      );

      expect(mockAssertionForEnrollment).toHaveBeenCalledWith(mockSecret, '123456');
      expect(mockMultiFactor).toHaveBeenCalledWith(mockCurrentUser);
      expect(mockEnroll).toHaveBeenCalledWith(mockAssertion, 'Authenticator');
    });

    it('T-AUTH-007-04: no-ops gracefully when Firebase is not configured', async () => {
      vi.doMock('../lib/firebase', () => ({
        isFirebaseConfigured: false,
        firebaseAuth: vi.fn(),
        firebaseDb: vi.fn(),
      }));
      vi.resetModules();

      const { useAuthStore } = await import('./authStore');
      const store = useAuthStore.getState();
      const mockSecret = { secretKey: 'JBSWY3DPEHPK3PXP' } as unknown as import('firebase/auth').TotpSecret;

      await expect(
        store.verifyTotpEnrollment(mockCurrentUser as unknown as import('firebase/auth').User, mockSecret, '123456'),
      ).resolves.toBeUndefined();

      expect(mockAssertionForEnrollment).not.toHaveBeenCalled();

      vi.doMock('../lib/firebase', () => ({
        isFirebaseConfigured: true,
        firebaseAuth: vi.fn(() => ({ currentUser: mockCurrentUser })),
        firebaseDb: vi.fn(),
      }));
      vi.resetModules();
    });
  });

  describe('resolveMfaChallenge()', () => {
    it('T-AUTH-007-05: resolves MFA challenge using TotpMultiFactorGenerator.assertionForSignIn', async () => {
      const mockHint = { factorId: 'totp', uid: 'hint-uid' };
      const mockResolver = {
        hints: [mockHint],
        resolveSignIn: vi.fn().mockResolvedValue({ user: mockCurrentUser }),
      };
      const mockAssertion = { factorId: 'totp' };
      mockAssertionForSignIn.mockReturnValue(mockAssertion);

      const { useAuthStore } = await import('./authStore');
      const store = useAuthStore.getState();

      await store.resolveMfaChallenge(
        mockResolver as unknown as import('firebase/auth').MultiFactorResolver,
        '654321',
      );

      expect(mockAssertionForSignIn).toHaveBeenCalledWith(mockHint.uid, '654321');
      expect(mockResolver.resolveSignIn).toHaveBeenCalledWith(mockAssertion);
    });

    it('T-AUTH-007-06: no-ops gracefully when Firebase is not configured', async () => {
      vi.doMock('../lib/firebase', () => ({
        isFirebaseConfigured: false,
        firebaseAuth: vi.fn(),
        firebaseDb: vi.fn(),
      }));
      vi.resetModules();

      const { useAuthStore } = await import('./authStore');
      const store = useAuthStore.getState();

      const mockResolver = {
        hints: [{ factorId: 'totp', uid: 'hint-uid' }],
        resolveSignIn: vi.fn(),
      };

      await expect(
        store.resolveMfaChallenge(
          mockResolver as unknown as import('firebase/auth').MultiFactorResolver,
          '654321',
        ),
      ).resolves.toBeUndefined();

      expect(mockResolver.resolveSignIn).not.toHaveBeenCalled();

      vi.doMock('../lib/firebase', () => ({
        isFirebaseConfigured: true,
        firebaseAuth: vi.fn(() => ({ currentUser: mockCurrentUser })),
        firebaseDb: vi.fn(),
      }));
      vi.resetModules();
    });

    it('T-AUTH-007-07: resolveSignIn is called with the assertion', async () => {
      const mockHint = { factorId: 'totp', uid: 'hint-uid' };
      const mockUser = { ...mockCurrentUser };
      const mockResolver = {
        hints: [mockHint],
        resolveSignIn: vi.fn().mockResolvedValue({ user: mockUser }),
      };
      const mockAssertion = { factorId: 'totp' };
      mockAssertionForSignIn.mockReturnValue(mockAssertion);

      vi.doMock('../lib/firebase', () => ({
        isFirebaseConfigured: true,
        firebaseAuth: vi.fn(() => ({ currentUser: mockCurrentUser })),
        firebaseDb: vi.fn(),
      }));
      vi.resetModules();

      const { useAuthStore } = await import('./authStore');
      const store = useAuthStore.getState();

      await store.resolveMfaChallenge(
        mockResolver as unknown as import('firebase/auth').MultiFactorResolver,
        '654321',
      );

      expect(mockResolver.resolveSignIn).toHaveBeenCalledWith(mockAssertion);
    });
  });
});
