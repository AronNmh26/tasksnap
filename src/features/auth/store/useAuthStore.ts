// src/features/auth/store/useAuthStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "../../../services/firebase";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: "email" | "google" | "facebook";
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  isSessionChecked: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

const STORAGE_KEY = "@auth_user";

// ✅ helper to map Firebase user -> your AuthUser
function mapFirebaseUser(u: any): AuthUser {
  const providerId: string = u?.providerData?.[0]?.providerId ?? "password";
  const provider: AuthUser["provider"] =
    providerId.includes("google") ? "google" : providerId.includes("facebook") ? "facebook" : "email";

  return {
    id: u.uid,
    email: u.email ?? "",
    name: u.displayName ?? (u.email ? u.email.split("@")[0] : "User"),
    avatar: u.photoURL ?? undefined,
    provider,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  isSessionChecked: false,

  clearError: () => set({ error: null }),

  signup: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password);

      if (name?.trim()) {
        await updateProfile(res.user, { displayName: name.trim() });
      }

      const mapped = mapFirebaseUser({ ...res.user, displayName: name.trim() || res.user.displayName });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));

      set({ user: mapped, isSessionChecked: true });
    } catch (err: any) {
      const message = err?.message ?? "Signup failed";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), password);

      const mapped = mapFirebaseUser(res.user);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));

      set({ user: mapped, isSessionChecked: true });
    } catch (err: any) {
      const message = err?.message ?? "Login failed";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Forgot password support
  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email.trim());
      set({ isSessionChecked: true });
    } catch (err: any) {
      const message = err?.message ?? "Reset password failed";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Google login (idToken obtained from UI layer)
  loginWithGoogle: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const res = await signInWithCredential(auth, credential);

      const mapped = mapFirebaseUser(res.user);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));

      set({ user: mapped, isSessionChecked: true });
    } catch (err: any) {
      const message = err?.message ?? "Google login failed";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Facebook login (accessToken obtained from UI layer via expo-auth-session)
  loginWithFacebook: async (accessToken) => {
    set({ isLoading: true, error: null });
    try {
      const credential = FacebookAuthProvider.credential(accessToken);
      const res = await signInWithCredential(auth, credential);

      const mapped = mapFirebaseUser(res.user);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));

      set({ user: mapped, isSessionChecked: true });
    } catch (err: any) {
      const message = err?.message ?? "Facebook login failed";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await signOut(auth);
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ user: null, error: null });
    } finally {
      set({ isLoading: false, isSessionChecked: true });
    }
  },

  // ✅ session restore (AsyncStorage + firebase state sync)
  restoreSession: async () => {
    try {
      // 1) quick local restore (fast UI)
      const sessionData = await AsyncStorage.getItem(STORAGE_KEY);
      if (sessionData) {
        set({ user: JSON.parse(sessionData) as AuthUser });
      }

      // 2) sync with firebase (source of truth)
      onAuthStateChanged(auth, async (u) => {
        if (!u) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          set({ user: null, isSessionChecked: true });
          return;
        }

        const mapped = mapFirebaseUser(u);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        set({ user: mapped, isSessionChecked: true });
      });
    } catch (err) {
      set({ isSessionChecked: true });
    }
  },
}));
