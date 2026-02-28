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
import * as Crypto from "expo-crypto";

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

const nativeSignOut = async (): Promise<void> => {
  const mod = getNativeModule();
  if (!mod) return;
  try {
    await mod.GoogleSignin.signOut();
  } catch {
    // silent – user may already be signed out
  }
};

// ──── Expo Go fallback: manual OAuth + PKCE via WebBrowser ─────────────────
// expo-auth-session's Google provider constructs an invalid redirect URI in
// Expo Go. This bypasses it entirely using the iOS/Android client ID with the
// reversed-client-ID redirect scheme that Google auto-accepts.

function reverseClientId(clientId: string): string {
  return clientId.split(".").reverse().join(".");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64ToBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Manual Google OAuth sign-in for Expo Go.
 * Uses the platform-specific (iOS/Android) client ID + PKCE.
 * Returns { idToken, accessToken } on success.
 */
const expoGoSignIn = async (): Promise<{ idToken: string; accessToken: string }> => {
  const clientId =
    Platform.OS === "ios" ? IOS_CLIENT_ID : ANDROID_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      `Missing Google ${Platform.OS} client ID. Set EXPO_PUBLIC_GOOGLE_${Platform.OS === "ios" ? "IOS" : "ANDROID"}_CLIENT_ID in your .env file.`
    );
  }

  const redirectUri = `${reverseClientId(clientId)}:/oauthredirect`;

  // ── PKCE ───────────────────────────────────────────────────────────────
  const verifierBytes = Crypto.getRandomBytes(32);
  const codeVerifier = bytesToHex(verifierBytes); // 64-char hex string

  const challengeB64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  const codeChallenge = base64ToBase64Url(challengeB64);
  const state = bytesToHex(Crypto.getRandomBytes(16));

  // ── Build authorization URL ────────────────────────────────────────────
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // ── Open browser & wait for redirect ───────────────────────────────────
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success" || !(result as any).url) {
    throw new Error("Google sign-in was cancelled.");
  }

  // Parse code & state from redirect URL query string
  const returnedUrl: string = (result as any).url;
  const qs = returnedUrl.includes("?") ? returnedUrl.split("?")[1] : "";
  const responseParams = new URLSearchParams(qs);

  const code = responseParams.get("code");
  const returnedState = responseParams.get("state");

  if (returnedState !== state) throw new Error("OAuth state mismatch.");
  if (!code) throw new Error("No authorization code returned by Google.");

  // ── Exchange code for tokens ───────────────────────────────────────────
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  });

  const tokens = await tokenRes.json();

  if (tokens.error) {
    throw new Error(tokens.error_description || tokens.error);
  }
  if (!tokens.id_token) {
    throw new Error("Token exchange succeeded but no id_token was returned.");
  }

  return { idToken: tokens.id_token, accessToken: tokens.access_token ?? "" };
};

export {
  WEB_CLIENT_ID,
  IOS_CLIENT_ID,
  ANDROID_CLIENT_ID,
  isExpoGo,
  configureNativeGoogleSignIn,
  nativeSignIn,
  nativeSignOut,
  isNativeGoogleAvailable,
  expoGoSignIn,
};
