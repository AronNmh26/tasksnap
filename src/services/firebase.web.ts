/**
 * Firebase initialisation — WEB
 * Metro / Expo loads this file on web; firebase.ts is loaded on native.
 *
 * getAuth() automatically uses browserLocalPersistence on web,
 * so no extra configuration is needed.
 */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { ReCaptchaV3Provider, initializeAppCheck } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let appCheckInitialized = false;

export async function initFirebaseAppCheck(): Promise<void> {
  if (appCheckInitialized) return;

  const siteKey = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY ?? "";
  if (!siteKey) {
    console.warn(
      "[firebase.web] ⚠️ App Check site key is missing. Set EXPO_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY."
    );
    return;
  }

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckInitialized = true;
    console.log("[firebase.web] ✅ App Check initialized (reCAPTCHA v3)");
  } catch (e: any) {
    console.warn("[firebase.web] ⚠️ App Check initialization failed:", e?.message ?? e);
  }
}

enableIndexedDbPersistence(db).catch((err) => {
  if (err?.code === "failed-precondition") {
    console.warn("[firebase.web] Persistence disabled: multiple tabs open.");
  } else if (err?.code === "unimplemented") {
    console.warn("[firebase.web] Persistence is not available in this browser.");
  } else {
    console.warn("[firebase.web] Persistence error:", err?.message ?? err);
  }
});
