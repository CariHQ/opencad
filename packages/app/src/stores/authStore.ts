import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
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
  };
});
