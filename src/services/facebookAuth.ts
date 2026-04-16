// src/services/facebookAuth.ts
// Facebook OAuth for Expo Go / Web / dev builds.
// Uses expo-web-browser to open Facebook's OAuth page directly (no native SDK
// required). Works in Expo Go on iOS, Android, and web.

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";

WebBrowser.maybeCompleteAuthSession();

// ──── Facebook App ID (get from https://developers.facebook.com) ────────────
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? "";

// ──── Helpers ───────────────────────────────────────────────────────────────

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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const APP_SCHEME =
  (Array.isArray(Constants.expoConfig?.scheme)
    ? Constants.expoConfig?.scheme[0]
    : Constants.expoConfig?.scheme) ?? "tasksnap";

const isExpoGo = Constants.appOwnership === "expo";

/**
 * Build a redirect URI that Facebook will accept.
 * - Web: use current origin
 * - Expo Go (native): Expo auth proxy
 * - Dev/standalone builds: Facebook login success URL (https)
 */
function getFacebookRedirectUri(): string {
  if (Platform.OS === "web") {
    // Web: redirect back to current page
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://localhost:8081";
  }

  if (isExpoGo) {
    const proxyUri = EXPO_PROJECT_FOR_PROXY
      ? `https://auth.expo.io/${EXPO_PROJECT_FOR_PROXY}`
      : `https://auth.expo.io/@${FALLBACK_EXPO_OWNER}/${EXPO_SLUG}`;
    if (proxyUri.startsWith("exp://")) {
      console.warn(
        "[facebookAuth] Expo auth proxy not detected. Set EXPO_PUBLIC_EXPO_ACCOUNT to your Expo username."
      );
    }
    return proxyUri;
  }

  // Meta Web OAuth rejects custom schemes in redirect URI validation.
  // For installed native builds, use Facebook's documented login success URL.
  return "https://www.facebook.com/connect/login_success.html";
}

// ──── Public API ────────────────────────────────────────────────────────────

/**
 * Opens Facebook login in a browser and returns an access token.
 * Uses the implicit flow (response_type=token) which returns the access_token
 * directly in the URL fragment.
 */
const facebookSignIn = async (): Promise<string> => {
  if (!FACEBOOK_APP_ID) {
    throw new Error(
      "Missing Facebook App ID. Set EXPO_PUBLIC_FACEBOOK_APP_ID in your .env file."
    );
  }

  const redirectUri = getFacebookRedirectUri();
  const state = bytesToHex(Crypto.getRandomBytes(16));

  // Build Facebook authorization URL
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: "email,public_profile",
    state,
    display: Platform.OS === "web" ? "popup" : "touch",
  });
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;

  console.log("[facebookAuth] redirect_uri:", redirectUri);
  console.log("[facebookAuth] authUrl:", authUrl);

  // Open browser & wait for redirect
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success" || !(result as any).url) {
    throw new Error("Facebook sign-in was cancelled.");
  }

  // Parse the access token from the URL fragment (#access_token=...&...)
  const returnedUrl: string = (result as any).url;

  // Facebook returns tokens in the URL fragment (after #)
  const fragment = returnedUrl.includes("#") ? returnedUrl.split("#")[1] : "";
  const fragmentParams = new URLSearchParams(fragment);

  // Also check query params as a fallback
  const query = returnedUrl.includes("?") ? returnedUrl.split("?")[1]?.split("#")[0] : "";
  const queryParams = new URLSearchParams(query);

  const accessToken = fragmentParams.get("access_token") || queryParams.get("access_token");
  const returnedState = fragmentParams.get("state") || queryParams.get("state");

  if (returnedState && returnedState !== state) {
    throw new Error("OAuth state mismatch.");
  }

  if (!accessToken) {
    const errorMsg =
      fragmentParams.get("error_description") ||
      queryParams.get("error_description") ||
      "No access token returned by Facebook.";
    throw new Error(errorMsg);
  }

  return accessToken;
};

export { facebookSignIn };
