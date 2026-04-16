// src/features/auth/store/useAuthStore.ts
import { create } from "zustand";
import { Platform } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithCredential,
  signInWithPopup,
  deleteUser,
} from "firebase/auth";
import { auth } from "../../../services/firebase";
import { secureGetItem, secureSetItem, secureRemoveItem } from "../../../services/secureStore";
import { deleteAllTasksForUser } from "../../../services/db";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: "email" | "google" | "facebook" | "guest";
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  isSessionChecked: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  loginWithGoogle: (idToken: string | null, accessToken?: string | null) => Promise<void>;
  loginWithGooglePopup: () => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  loginWithFacebookPopup: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  requestPasswordResetEmail: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

const STORAGE_KEY = "@auth_user";

// ✅ helper to map Firebase user -> your AuthUser
function mapFirebaseUser(u: any): AuthUser {
  const providerId: string = u?.providerData?.[0]?.providerId ?? "password";
  const isAnonymous = Boolean(u?.isAnonymous);
  const provider: AuthUser["provider"] = isAnonymous
    ? "guest"
    : providerId.includes("google")
      ? "google"
      : providerId.includes("facebook")
        ? "facebook"
        : "email";

  return {
    id: u.uid,
    email: u.email ?? "",
    name: isAnonymous ? "Guest User" : u.displayName ?? (u.email ? u.email.split("@")[0] : "User"),
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
      await secureSetItem(STORAGE_KEY, JSON.stringify(mapped));

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
      await secureSetItem(STORAGE_KEY, JSON.stringify(mapped));

      set({ user: mapped, isSessionChecked: true });
    } catch (err: any) {
      const message = err?.message ?? "Login failed";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  requestPasswordResetEmail: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      set({ isSessionChecked: true });
      return "Password reset email sent. Please check your inbox and spam folder.";
    } catch (err: any) {
      const message = err?.message ?? "Failed to send password reset email";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Google login (idToken or accessToken obtained from UI layer)
  loginWithGoogle: async (idToken, accessToken) => {
    set({ isLoading: true, error: null });    
    try {
      const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? undefined);
      const res = await signInWithCredential(auth, credential);

      const mapped = mapFirebaseUser(res.user);
      await secureSetItem(STORAGE_KEY, JSON.stringify(mapped));

      set({ user: mapped, isSessionChecked: true });
    } catch (err: any) {
      const message = err?.message ?? "Google login failed";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  loginAsGuest: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await signInAnonymously(auth);
      const mapped = mapFirebaseUser(res.user);
      await secureSetItem(STORAGE_KEY, JSON.stringify(mapped));
      set({ user: mapped, isSessionChecked: true });
    } catch (err: any) {
      const message = err?.message ?? "Guest login failed";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Web Google login via Firebase popup (no custom redirect URI)
  loginWithGooglePopup: async () => {
    set({ isLoading: true, error: null });
    try {
      if (Platform.OS !== "web") {
        throw new Error("Google popup login is only available on web.");
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const res = await signInWithPopup(auth, provider);

      const mapped = mapFirebaseUser(res.user);
      await secureSetItem(STORAGE_KEY, JSON.stringify(mapped));

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
      await secureSetItem(STORAGE_KEY, JSON.stringify(mapped));

      set({ user: mapped, isSessionChecked: true });
    } catch (err: any) {
      const message = err?.message ?? "Facebook login failed";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Web Facebook login via Firebase popup (no custom redirect URI)
  loginWithFacebookPopup: async () => {
    set({ isLoading: true, error: null });
    try {
      if (Platform.OS !== "web") {
        throw new Error("Facebook popup login is only available on web.");
      }

      const provider = new FacebookAuthProvider();
      const res = await signInWithPopup(auth, provider);

      const mapped = mapFirebaseUser(res.user);
      await secureSetItem(STORAGE_KEY, JSON.stringify(mapped));

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
      await secureRemoveItem(STORAGE_KEY);
      set({ user: null, error: null });
    } finally {
      set({ isLoading: false, isSessionChecked: true });
    }
  },

  deleteAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to delete your account.");
      }

      // Delete user-owned data first
      await deleteAllTasksForUser();

      // Delete Firebase Auth user
      await deleteUser(user);

      await secureRemoveItem(STORAGE_KEY);
      set({ user: null, error: null, isSessionChecked: true });
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === "auth/requires-recent-login") {
        const message = "Please log in again, then retry account deletion.";
        set({ error: message, isSessionChecked: true });
        throw new Error(message);
      }
      const message = err?.message ?? "Account deletion failed";
      set({ error: message, isSessionChecked: true });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ session restore (SecureStore + firebase state sync)
  restoreSession: async () => {
    try {
      // 1) quick local restore (fast UI)
      const sessionData = await secureGetItem(STORAGE_KEY);
      if (sessionData) {
        set({ user: JSON.parse(sessionData) as AuthUser });
      }

      // 2) sync with firebase (source of truth)
      let isFirstCallback = true;
      const unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
          const mapped = mapFirebaseUser(u);
          await secureSetItem(STORAGE_KEY, JSON.stringify(mapped));
          set({ user: mapped, isSessionChecked: true });
          console.log("[AuthStore] Firebase auth user restored:", u.uid);
        } else if (isFirstCallback && sessionData) {
          // First callback is null BUT we have a local session.
          // Don't clear yet — Firebase Auth may still be initialising (e.g., restoring
          // persistence on native). Just mark session as checked so the app doesn't block.
          console.log("[AuthStore] First auth callback null, keeping local session");
          set({ isSessionChecked: true });
        } else {
          // Genuinely signed out (or no local session existed)
          console.log("[AuthStore] User signed out");
          await secureRemoveItem(STORAGE_KEY);
          set({ user: null, isSessionChecked: true });
        }
        isFirstCallback = false;
      });
    } catch (err) {
      console.error("[AuthStore] restoreSession error:", err);
      set({ isSessionChecked: true });
    }
  },
}));
