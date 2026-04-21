/**
 * SSO sign-in driver — bridges SSOSettingsPanel config to Firebase Auth.
 *
 * Given a persisted SSOConfig (SAML or OIDC), builds the matching Firebase
 * AuthProvider and runs a popup-based sign-in. Returns the signed-in
 * Firebase user or a typed error. Real identity-provider config still has
 * to be wired in the Firebase console; this module handles the client-
 * side handshake.
 */

import {
  SAMLAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type User,
  type AuthProvider,
} from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured } from './firebase';
import type { SSOConfig } from '../components/SSOSettingsPanel';

export type SSOResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export function buildProvider(config: SSOConfig): AuthProvider | null {
  if (!config.enabled) return null;
  if (config.provider === 'saml') {
    if (!config.entityId) return null;
    // Firebase SAML provider id format: "saml.<providerId>"
    const id = config.entityId.startsWith('saml.')
      ? config.entityId
      : `saml.${slug(config.entityId)}`;
    return new SAMLAuthProvider(id);
  }
  if (config.provider === 'oidc') {
    if (!config.oidcClientId) return null;
    // Firebase OIDC provider id format: "oidc.<clientId>"
    const id = `oidc.${slug(config.oidcClientId)}`;
    return new OAuthProvider(id);
  }
  return null;
}

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function ssoSignIn(config: SSOConfig): Promise<SSOResult> {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Firebase is not configured in this build.' };
  }
  const provider = buildProvider(config);
  if (!provider) {
    return { ok: false, error: 'SSO is not enabled or provider details are incomplete.' };
  }
  try {
    const result = await signInWithPopup(firebaseAuth(), provider);
    return { ok: true, user: result.user };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Sign-in failed.',
    };
  }
}
