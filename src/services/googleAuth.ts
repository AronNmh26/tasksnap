// src/services/googleAuth.ts
// Native Google Sign-In via @react-native-google-signin/google-signin
// Falls back to expo-auth-session for web / Expo Go.
//
// The native TurboModule crashes with an Invariant Violation if required in
// Expo Go (no native binary).  We detect Expo Go *before* ever requiring the
// package so the crash never happens.

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";

WebBrowser.maybeCompleteAuthSession();

// ──── OAuth Client IDs (Firebase → Authentication → Sign-in method → Google) ────
// Web client ID is used for both web auth and as the "server" client ID for native.
const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  "911003774738-2u84b0mrdifshcj2h56vubqetntv26ig.apps.googleusercontent.com";

// iOS / Android client IDs – create these in Google Cloud Console → Credentials
// iOS: "iOS" type, bundle ID = com.tasksnap.app
// Android: "Android" type, package = com.tasksnap.app + your SHA-1
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

const FALLBACK_EXPO_OWNER = "aronmh26";
const EXPO_OWNER =
  process.env.EXPO_PUBLIC_EXPO_ACCOUNT ??
  process.env.EXPO_PUBLIC_EXPO_OWNER ??
  Constants.expoConfig?.owner ??
  FALLBACK_EXPO_OWNER;
const EXPO_SLUG = Constants.expoConfig?.slug ?? "tasksnap";
const EXPO_PROJECT_FOR_PROXY =
  process.env.EXPO_PUBLIC_EXPO_PROJECT_FOR_PROXY ??
  (EXPO_OWNER ? `@${EXPO_OWNER}/${EXPO_SLUG}` : undefined);

// ──── Detect Expo Go vs development build ──────────────────────────────────
const isExpoGo = Constants.appOwnership === "expo";

// Only attempt to load the native module in a development/standalone build on
// a real device / emulator (never in Expo Go, never on web).
let _nativeModule: any | null = null;
let _nativeChecked = false;

function getNativeModule(): any | null {
  if (_nativeChecked) return _nativeModule;
  _nativeChecked = true;

  if (Platform.OS === "web" || isExpoGo) {
    _nativeModule = null;
    if (isExpoGo) {
      console.warn(
        "[googleAuth] Running in Expo Go – native Google Sign-In unavailable, using web OAuth fallback."
      );
    }
    return _nativeModule;
  }

  try {
    _nativeModule = require("@react-native-google-signin/google-signin");
  } catch {
    _nativeModule = null;
    console.warn(
      "[googleAuth] @react-native-google-signin/google-signin could not be loaded – using web OAuth fallback."
    );
  }
  return _nativeModule;
}

/** Returns true when the native Google Sign-In SDK is usable (dev builds only). */
function isNativeGoogleAvailable(): boolean {
  return getNativeModule() !== null;
}

// ──── Public API ────────────────────────────────────────────────────────────

const configureNativeGoogleSignIn = (): void => {
  const mod = getNativeModule();
  if (!mod) return;
  mod.GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: Platform.OS === "ios" && IOS_CLIENT_ID ? IOS_CLIENT_ID : undefined,
    androidClientId:
      Platform.OS === "android" && ANDROID_CLIENT_ID ? ANDROID_CLIENT_ID : undefined,
    offlineAccess: false,
  });
};

const nativeSignIn = async (): Promise<string> => {
  const mod = getNativeModule();
  if (!mod) throw new Error("Native Google Sign-In is not available in Expo Go.");

  await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await mod.GoogleSignin.signIn();
  const idToken = response?.data?.idToken;
  if (!idToken) {
    throw new Error("Google Sign-In succeeded but no idToken was returned.");
  }
  return idToken;
};

// ──── Expo Go fallback: manual OAuth via WebBrowser ────────────────────────
// Uses Expo's auth proxy redirect URL. This keeps Expo Go functional while
// native builds use the Google Sign-In SDK.

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Manual Google OAuth sign-in for Expo Go.
 * Uses the Web client ID + Expo auth proxy redirect URI.
 * Returns { idToken, accessToken } on success.
 */
const expoGoSignIn = async (): Promise<{ idToken: string | null; accessToken: string | null }> => {
  if (!WEB_CLIENT_ID) {
    throw new Error("Missing Google Web client ID. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env file.");
  }

  const redirectUri = EXPO_PROJECT_FOR_PROXY
    ? `https://auth.expo.io/${EXPO_PROJECT_FOR_PROXY}`
    : `https://auth.expo.io/@${FALLBACK_EXPO_OWNER}/${EXPO_SLUG}`;
  if (redirectUri.startsWith("exp://")) {
    console.warn(
      "[googleAuth] Expo auth proxy not detected. Set EXPO_PUBLIC_EXPO_ACCOUNT to your Expo username."
    );
  }
  const state = bytesToHex(Crypto.getRandomBytes(16));
  const nonce = bytesToHex(Crypto.getRandomBytes(16));

  // ── Build authorization URL ────────────────────────────────────────────
  const params = new URLSearchParams({
    client_id: WEB_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "token id_token",
    scope: "openid email profile",
    state,
    nonce,
    prompt: "select_account",
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // ── Open browser & wait for redirect ───────────────────────────────────
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success" || !(result as any).url) {
    throw new Error("Google sign-in was cancelled.");
  }

  // Parse tokens from redirect URL fragment (#access_token=...&id_token=...&...)
  const returnedUrl: string = (result as any).url;
  const fragment = returnedUrl.includes("#") ? returnedUrl.split("#")[1] : "";
  const fragmentParams = new URLSearchParams(fragment);

  const accessToken = fragmentParams.get("access_token");
  const idToken = fragmentParams.get("id_token");
  const returnedState = fragmentParams.get("state");

  if (returnedState !== state) throw new Error("OAuth state mismatch.");
  if (!accessToken && !idToken) {
    throw new Error("No access token or id token returned by Google.");
  }

  return { idToken: idToken ?? null, accessToken: accessToken ?? null };
};

export {
  isExpoGo,
  configureNativeGoogleSignIn,
  nativeSignIn,
  isNativeGoogleAvailable,
  expoGoSignIn,
};
