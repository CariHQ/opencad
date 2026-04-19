import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  multiFactor,
  TotpMultiFactorGenerator,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type User,
  type TotpSecret,
  type MultiFactorResolver,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { firebaseAuth, firebaseDb, isFirebaseConfigured } from '../lib/firebase';
import { authApi, registerTokenProvider } from '../lib/serverApi';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
export type TrialStatus = 'active' | 'expired' | 'none';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  plan: 'free' | 'trial' | 'pro' | 'team';
  trialExpiresAt: Date | null;
}

export interface TotpEnrollmentResult {
  secret: TotpSecret;
  qrCodeUrl: string;
}

interface AuthState {
  status: AuthStatus;
  user: User | null;
  profile: UserProfile | null;
  trialStatus: TrialStatus;
  error: string | null;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  /** Start TOTP enrollment: generates a secret and returns the QR code URL. */
  enrollTotp: (user: User) => Promise<TotpEnrollmentResult | null>;
  /** Complete TOTP enrollment by verifying a one-time code. */
  verifyTotpEnrollment: (user: User, secret: TotpSecret, otp: string) => Promise<void>;
  /** Resolve a pending MFA sign-in challenge with a TOTP one-time code. */
  resolveMfaChallenge: (resolver: MultiFactorResolver, otp: string) => Promise<void>;
}

const TRIAL_DAYS = 14;

async function upsertProfile(
  user: User,
  name?: string,
  defaultPlan: UserProfile['plan'] = 'trial',
): Promise<UserProfile> {
  if (!isFirebaseConfigured) {
    return {
      uid: user.uid,
      email: user.email ?? '',
      name: name ?? user.displayName ?? '',
      plan: defaultPlan,
      trialExpiresAt: null,
    };
  }

  const db = firebaseDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const trialExpires = defaultPlan === 'trial' ? new Date() : null;
    if (trialExpires) trialExpires.setDate(trialExpires.getDate() + TRIAL_DAYS);
    await setDoc(ref, {
      email: user.email,
      name: name ?? user.displayName ?? '',
      createdAt: serverTimestamp(),
      trialExpiresAt: trialExpires,
      plan: defaultPlan,
    });
    return {
      uid: user.uid,
      email: user.email ?? '',
      name: name ?? user.displayName ?? '',
      plan: defaultPlan,
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

    // Wire the Firebase ID token into every serverApi request.
    // Let Firebase manage token refresh automatically — do not force-refresh
    // on every call, as that causes unnecessary network round-trips and can
    // transiently fail, dropping the user back to the login screen.
    registerTokenProvider(async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      return currentUser.getIdToken().catch(() => null);
    });

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await upsertProfile(user);
          // Fetch the server-side user profile and merge it into local state.
          // Falls back to the Firestore profile if the backend is unreachable.
          const serverProfile = await authApi.me().catch(() => null);
          const mergedProfile: UserProfile = serverProfile
            ? {
                ...profile,
                plan: (serverProfile.role === 'admin' ? 'team' : profile.plan),
                trialExpiresAt: serverProfile.trialEndsAt
                  ? new Date(serverProfile.trialEndsAt)
                  : profile.trialExpiresAt,
              }
            : profile;
          set({
            status: 'authenticated',
            user,
            profile: mergedProfile,
            trialStatus: computeTrialStatus(mergedProfile),
            error: null,
          });
        } catch {
          // Firestore/network error — still mark the user as authenticated
          // so they're not stranded on the login screen.
          set({
            status: 'authenticated',
            user,
            profile: {
              uid: user.uid,
              email: user.email ?? '',
              name: user.displayName ?? '',
              plan: 'trial',
              trialExpiresAt: null,
            },
            trialStatus: 'active',
            error: null,
          });
        }
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

    signInWithGoogle: async (): Promise<void> => {
      if (!isFirebaseConfigured) throw new Error('Firebase not configured');
      const auth = firebaseAuth();
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const profile = await upsertProfile(cred.user, undefined, 'free');
      set({
        status: 'authenticated',
        user: cred.user,
        profile,
        trialStatus: computeTrialStatus(profile),
        error: null,
      });
    },

    signInWithMicrosoft: async (): Promise<void> => {
      if (!isFirebaseConfigured) throw new Error('Firebase not configured');
      const auth = firebaseAuth();
      const provider = new OAuthProvider('microsoft.com');
      const cred = await signInWithPopup(auth, provider);
      const profile = await upsertProfile(cred.user, undefined, 'free');
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
  };
});
