// src/services/facebookAuth.ts
// Facebook OAuth for Expo Go / Web / dev builds.
// Uses expo-web-browser to open Facebook's OAuth page directly (no native SDK
// required). Works in Expo Go on iOS, Android, and web.

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";

// ──── Facebook App ID (get from https://developers.facebook.com) ────────────
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? "";

// ──── Helpers ───────────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Build a redirect URI that Facebook will accept.
 * - Web: use current origin
 * - Expo Go (native): use https://auth.expo.io/@owner/slug
 */
function getFacebookRedirectUri(): string {
  if (Platform.OS === "web") {
    // Web: redirect back to current page
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://localhost:8081";
  }

  // Expo Go: use the exact Expo auth proxy URL
  return "https://auth.expo.io/@aronmh26/tasksnap";
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
    display: "popup",
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

export { FACEBOOK_APP_ID, facebookSignIn };
