/**
 * T-AUTH-020: SSO provider-building sanity check.
 *
 * Verifies buildProvider returns the correct Firebase AuthProvider kind
 * for SAML vs OIDC configs and refuses invalid/incomplete configs. The
 * actual signInWithPopup flow is exercised end-to-end in the e2e suite.
 */
import { describe, it, expect, vi } from 'vitest';

// Firebase's auth module pulls a bunch of browser APIs — mock minimal shape.
vi.mock('firebase/auth', () => ({
  SAMLAuthProvider: class {
    constructor(public providerId: string) {}
  },
  OAuthProvider: class {
    constructor(public providerId: string) {}
  },
  signInWithPopup: vi.fn(),
}));
vi.mock('./firebase', () => ({
  firebaseAuth: vi.fn(),
  isFirebaseConfigured: true,
}));

import { buildProvider } from './ssoAuth';
import type { SSOConfig } from '../components/SSOSettingsPanel';

const base: SSOConfig = {
  enabled: true,
  provider: 'saml',
  entityId: '',
  ssoUrl: '',
  certificate: '',
  oidcClientId: '',
  oidcClientSecret: '',
  oidcDiscoveryUrl: '',
};

describe('T-AUTH-020: buildProvider', () => {
  it('returns null when disabled', () => {
    expect(buildProvider({ ...base, enabled: false })).toBeNull();
  });

  it('builds a SAML provider when entity id is set', () => {
    const p = buildProvider({ ...base, provider: 'saml', entityId: 'https://idp.example.com' });
    expect(p).not.toBeNull();
    expect((p as { providerId: string }).providerId).toMatch(/^saml\./);
  });

  it('builds an OIDC provider when client id is set', () => {
    const p = buildProvider({ ...base, provider: 'oidc', oidcClientId: 'abc-123' });
    expect(p).not.toBeNull();
    expect((p as { providerId: string }).providerId).toMatch(/^oidc\./);
  });

  it('returns null when SAML entity id is missing', () => {
    expect(buildProvider({ ...base, provider: 'saml', entityId: '' })).toBeNull();
  });

  it('returns null when OIDC client id is missing', () => {
    expect(buildProvider({ ...base, provider: 'oidc', oidcClientId: '' })).toBeNull();
  });
});
