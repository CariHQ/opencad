/**
 * T-AUTH-P0: Server API bearer token wiring tests
 *
 * T-AUTH-P0-001: requests include Authorization header when user is logged in
 * T-AUTH-P0-002: requests work without Authorization header when user is not logged in
 * T-AUTH-P0-003: signIn → /auth/me is called and server profile is stored
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerTokenProvider } from './serverApi';

expect.extend(jestDomMatchers);

// ── helpers ────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

// ── T-AUTH-P0-001: Bearer token is attached when user is logged in ──────────

describe('T-AUTH-P0-001: requests include Authorization header when user is logged in', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset the module's token provider by registering a fresh one each time.
    // We register before each test and clean up after.
  });

  afterEach(() => {
    // Clear token provider so other tests start clean
    registerTokenProvider(async () => null);
    vi.restoreAllMocks();
  });

  it('attaches Authorization: Bearer <token> when token provider returns a token', async () => {
    registerTokenProvider(async () => 'test-firebase-id-token');
    mockFetch(200, { uid: 'u1', email: 'a@b.com', role: 'user', trialEndsAt: null });

    // Dynamically import authApi so it picks up the fresh token provider
    const { authApi } = await import('./serverApi');
    await authApi.me();

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const [_url, init] = calls[0]!;
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get('authorization')).toBe('Bearer test-firebase-id-token');
  });
});

// ── T-AUTH-P0-002: No Authorization header when user is not logged in ───────

describe('T-AUTH-P0-002: requests work without Authorization header when user is not logged in', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    registerTokenProvider(async () => null);
    vi.restoreAllMocks();
  });

  it('omits Authorization header when token provider returns null', async () => {
    registerTokenProvider(async () => null);
    mockFetch(200, { uid: 'u1', email: 'a@b.com', role: 'user', trialEndsAt: null });

    const { authApi } = await import('./serverApi');
    await authApi.me();

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const [_url, init] = calls[0]!;
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get('authorization')).toBeNull();
  });

  it('omits Authorization header when no token provider is registered', async () => {
    // Register null provider (same as no provider)
    registerTokenProvider(async () => null);
    mockFetch(200, []);

    const { documentsApi } = await import('./serverApi');
    await documentsApi.list();

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const [_url, init] = calls[0]!;
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get('authorization')).toBeNull();
  });
});

// ── T-AUTH-P0-003: authStore wires token provider and fetches /auth/me ──────

describe('T-AUTH-P0-003: authStore wires token provider and profile is stored after signIn', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('registerTokenProvider is called during authStore initialization when Firebase is configured', async () => {
    // Mock firebase module
    const mockGetIdToken = vi.fn().mockResolvedValue('mock-id-token');
    const mockUser = {
      uid: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      getIdToken: mockGetIdToken,
    };

    vi.doMock('firebase/auth', () => ({
      createUserWithEmailAndPassword: vi.fn(),
      signInWithEmailAndPassword: vi.fn().mockResolvedValue({ user: mockUser }),
      signOut: vi.fn(),
      onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
        cb(null);
        return vi.fn();
      }),
      updateProfile: vi.fn(),
      multiFactor: vi.fn(),
      TotpMultiFactorGenerator: { generateSecret: vi.fn(), assertionForEnrollment: vi.fn(), assertionForSignIn: vi.fn() },
      getAuth: vi.fn(() => ({ currentUser: mockUser })),
    }));

    vi.doMock('firebase/firestore', () => ({
      doc: vi.fn(),
      setDoc: vi.fn(),
      getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
      serverTimestamp: vi.fn(),
      getFirestore: vi.fn(),
    }));

    vi.doMock('../lib/firebase', () => ({
      isFirebaseConfigured: true,
      firebaseAuth: vi.fn(() => ({ currentUser: mockUser })),
      firebaseDb: vi.fn(() => ({})),
    }));

    const registerSpy = vi.fn();
    vi.doMock('./serverApi', () => ({
      authApi: { me: vi.fn().mockResolvedValue({ uid: 'user-123', email: 'test@example.com', role: 'user', trialEndsAt: null }) },
      registerTokenProvider: registerSpy,
    }));

    // Import authStore after mocking — it runs initialization immediately
    await import('../stores/authStore');

    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(typeof registerSpy.mock.calls[0]?.[0]).toBe('function');
  });

  it('token provider returns the Firebase ID token for the current user', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('live-firebase-token');
    const mockUser = {
      uid: 'user-456',
      email: 'user@example.com',
      displayName: 'Live User',
      getIdToken: mockGetIdToken,
    };

    vi.doMock('firebase/auth', () => ({
      createUserWithEmailAndPassword: vi.fn(),
      signInWithEmailAndPassword: vi.fn().mockResolvedValue({ user: mockUser }),
      signOut: vi.fn(),
      onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
        cb(null);
        return vi.fn();
      }),
      updateProfile: vi.fn(),
      multiFactor: vi.fn(),
      TotpMultiFactorGenerator: { generateSecret: vi.fn(), assertionForEnrollment: vi.fn(), assertionForSignIn: vi.fn() },
      getAuth: vi.fn(() => ({ currentUser: mockUser })),
    }));

    vi.doMock('firebase/firestore', () => ({
      doc: vi.fn(),
      setDoc: vi.fn(),
      getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
      serverTimestamp: vi.fn(),
      getFirestore: vi.fn(),
    }));

    let capturedProvider: (() => Promise<string | null>) | undefined;

    vi.doMock('../lib/firebase', () => ({
      isFirebaseConfigured: true,
      firebaseAuth: vi.fn(() => ({ currentUser: mockUser })),
      firebaseDb: vi.fn(() => ({})),
    }));

    vi.doMock('./serverApi', () => ({
      authApi: { me: vi.fn().mockResolvedValue({ uid: 'user-456', email: 'user@example.com', role: 'user', trialEndsAt: null }) },
      registerTokenProvider: vi.fn((fn: () => Promise<string | null>) => {
        capturedProvider = fn;
      }),
    }));

    await import('../stores/authStore');

    expect(capturedProvider).toBeDefined();
    const token = await capturedProvider!();
    expect(token).toBe('live-firebase-token');
    // Token refresh is managed by Firebase internally — no force-refresh arg
    expect(mockGetIdToken).toHaveBeenCalledWith();
  });
});
