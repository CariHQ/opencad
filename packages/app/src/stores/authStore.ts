import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
<<<<<<< HEAD
  multiFactor,
  TotpMultiFactorGenerator,
  type User,
  type TotpSecret,
  type MultiFactorResolver,
=======
  type User,
>>>>>>> ee34659 (fix(auth): show authenticated user state in toolbar profile button)
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { firebaseAuth, firebaseDb, isFirebaseConfigured } from '../lib/firebase';
import { authApi } from '../lib/serverApi';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
export type TrialStatus = 'active' | 'expired' | 'none';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  plan: 'trial' | 'pro' | 'team';
  trialExpiresAt: Date | null;
}

<<<<<<< HEAD
export interface TotpEnrollmentResult {
  secret: TotpSecret;
  qrCodeUrl: string;
}

=======
>>>>>>> ee34659 (fix(auth): show authenticated user state in toolbar profile button)
interface AuthState {
  status: AuthStatus;
  user: User | null;
  profile: UserProfile | null;
  trialStatus: TrialStatus;
  error: string | null;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
<<<<<<< HEAD
  /** Start TOTP enrollment: generates a secret and returns the QR code URL. */
  enrollTotp: (user: User) => Promise<TotpEnrollmentResult | null>;
  /** Complete TOTP enrollment by verifying a one-time code. */
  verifyTotpEnrollment: (user: User, secret: TotpSecret, otp: string) => Promise<void>;
  /** Resolve a pending MFA sign-in challenge with a TOTP one-time code. */
  resolveMfaChallenge: (resolver: MultiFactorResolver, otp: string) => Promise<void>;
=======
>>>>>>> ee34659 (fix(auth): show authenticated user state in toolbar profile button)
}

const TRIAL_DAYS = 14;

async function upsertProfile(user: User, name?: string): Promise<UserProfile> {
  if (!isFirebaseConfigured) {
    return {
      uid: user.uid,
      email: user.email ?? '',
      name: name ?? user.displayName ?? '',
      plan: 'trial',
      trialExpiresAt: null,
    };
  }

  const db = firebaseDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const trialExpires = new Date();
    trialExpires.setDate(trialExpires.getDate() + TRIAL_DAYS);
    await setDoc(ref, {
      email: user.email,
      name: name ?? user.displayName ?? '',
      createdAt: serverTimestamp(),
      trialExpiresAt: trialExpires,
      plan: 'trial',
    });
    return {
      uid: user.uid,
      email: user.email ?? '',
      name: name ?? user.displayName ?? '',
      plan: 'trial',
      trialExpiresAt: trialExpires,
    };
  }

  const data = snap.data();
  const trialTs = data['trialExpiresAt'] as Timestamp | null;
  return {
    uid: user.uid,
    email: data['email'] ?? user.email ?? '',
    name: data['name'] ?? user.displayName ?? '',
    plan: data['plan'] ?? 'trial',
    trialExpiresAt: trialTs ? trialTs.toDate() : null,
  };
}

function computeTrialStatus(profile: UserProfile | null): TrialStatus {
  if (!profile) return 'none';
  if (profile.plan !== 'trial') return 'none';
  if (!profile.trialExpiresAt) return 'active';
  return profile.trialExpiresAt > new Date() ? 'active' : 'expired';
}

export const useAuthStore = create<AuthState>((set, _get) => {
  // Subscribe to Firebase auth state once
  if (isFirebaseConfigured) {
    const auth = firebaseAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await upsertProfile(user);
        // Upsert user row in the server DB (fire-and-forget; non-blocking)
        authApi.me().catch(() => {});
        set({
          status: 'authenticated',
          user,
          profile,
          trialStatus: computeTrialStatus(profile),
          error: null,
        });
      } else {
        set({ status: 'unauthenticated', user: null, profile: null, trialStatus: 'none' });
      }
    });
  } else {
    // No Firebase configured — skip auth gate (dev mode)
    setTimeout(() => set({ status: 'unauthenticated' }), 0);
  }

  return {
    status: 'loading',
    user: null,
    profile: null,
    trialStatus: 'none',
    error: null,

    signUp: async (name, email, password) => {
      if (!isFirebaseConfigured) throw new Error('Firebase not configured');
      const auth = firebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      const profile = await upsertProfile(cred.user, name);
      set({
        status: 'authenticated',
        user: cred.user,
        profile,
        trialStatus: computeTrialStatus(profile),
        error: null,
      });
    },

    signIn: async (email, password) => {
      if (!isFirebaseConfigured) throw new Error('Firebase not configured');
      const auth = firebaseAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await upsertProfile(cred.user);
      set({
        status: 'authenticated',
        user: cred.user,
        profile,
        trialStatus: computeTrialStatus(profile),
        error: null,
      });
    },

    signOut: async () => {
      if (!isFirebaseConfigured) {
        set({ status: 'unauthenticated', user: null, profile: null, trialStatus: 'none' });
        return;
      }
      await fbSignOut(firebaseAuth());
      set({ status: 'unauthenticated', user: null, profile: null, trialStatus: 'none' });
    },

    clearError: () => set({ error: null }),
<<<<<<< HEAD

    enrollTotp: async (user: User): Promise<TotpEnrollmentResult | null> => {
      if (!isFirebaseConfigured) return null;
      // firebaseAuth() keeps the auth instance active
      firebaseAuth();
      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      const qrCodeUrl = secret.generateQrCodeUrl(
        user.email ?? 'user',
        'OpenCAD',
      );
      return { secret, qrCodeUrl };
    },

    verifyTotpEnrollment: async (user: User, secret: TotpSecret, otp: string): Promise<void> => {
      if (!isFirebaseConfigured) return;
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, otp);
      await multiFactor(user).enroll(assertion, 'Authenticator');
    },

    resolveMfaChallenge: async (resolver: MultiFactorResolver, otp: string): Promise<void> => {
      if (!isFirebaseConfigured) return;
      // Use the first TOTP hint (apps with a single second factor)
      const hint = resolver.hints[0];
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, otp);
      await resolver.resolveSignIn(assertion);
    },
=======
>>>>>>> ee34659 (fix(auth): show authenticated user state in toolbar profile button)
  };
});
