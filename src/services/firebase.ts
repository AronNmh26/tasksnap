/**
 * Firebase initialisation — NATIVE (iOS / Android)
 * Metro loads this file on native; firebase.web.ts is loaded on web.
 *
 * Tries to use initializeAuth + getReactNativePersistence so Firebase Auth
 * persists the session in AsyncStorage across app restarts.
 * Falls back to getAuth() if the RN-specific export isn't available.
 */
import { initializeApp } from "firebase/app";
import { initializeAuth, getAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { CustomProvider, initializeAppCheck as initializeJsAppCheck } from "firebase/app-check";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp as getNativeApp } from "@react-native-firebase/app";
import {
  default as appCheckModule,
  getToken as getNativeAppCheckToken,
  initializeAppCheck as initializeNativeAppCheck,
} from "@react-native-firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

const app = initializeApp(firebaseConfig);

let appCheckInitPromise: Promise<void> | null = null;

/**
 * Initializes native App Check and bridges tokens into Firebase JS SDK.
 * This keeps existing Firestore/Auth JS SDK calls protected by App Check.
 */
export async function initFirebaseAppCheck(): Promise<void> {
  if (appCheckInitPromise) {
    return appCheckInitPromise;
  }

  appCheckInitPromise = (async () => {
    try {
      const nativeApp = getNativeApp();
      const nativeProvider = appCheckModule(nativeApp).newReactNativeFirebaseAppCheckProvider();

      nativeProvider.configure({
        android: { provider: __DEV__ ? "debug" : "playIntegrity" },
        apple: { provider: __DEV__ ? "debug" : "appAttestWithDeviceCheckFallback" },
        isTokenAutoRefreshEnabled: true,
      });

      const nativeAppCheck = await initializeNativeAppCheck(nativeApp, {
        provider: nativeProvider,
        isTokenAutoRefreshEnabled: true,
      });

      const jsProvider = new CustomProvider({
        getToken: async () => {
          const tokenResult = await getNativeAppCheckToken(nativeAppCheck, false);
          // Token TTL is managed natively; set a conservative expiry for JS SDK cache semantics.
          return {
            token: tokenResult.token,
            expireTimeMillis: Date.now() + 55 * 60 * 1000,
          };
        },
      });

      initializeJsAppCheck(app, {
        provider: jsProvider,
        isTokenAutoRefreshEnabled: true,
      });

      console.log("[firebase] ✅ App Check initialized (native provider bridge)");
    } catch (e: any) {
      console.warn("[firebase] ⚠️ App Check initialization failed:", e?.message ?? e);
    }
  })();

  return appCheckInitPromise;
}

// Try RN persistence first; fall back gracefully
let _auth: Auth;
try {
  // Metro resolves firebase/auth to the RN build which exports getReactNativePersistence
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const firebaseAuthModule = require("firebase/auth");
  if (typeof firebaseAuthModule.getReactNativePersistence === "function") {
    _auth = initializeAuth(app, {
      persistence: firebaseAuthModule.getReactNativePersistence(AsyncStorage),
    });
    console.log("[firebase] ✅ Auth initialized with AsyncStorage persistence");
  } else {
    _auth = getAuth(app);
    console.log("[firebase] ⚠️ getReactNativePersistence not found, using getAuth()");
  }
} catch (e: any) {
  console.warn("[firebase] ⚠️ initializeAuth failed, falling back to getAuth():", e?.message);
  try {
    _auth = getAuth(app);
  } catch {
    // getAuth() can also fail if initializeAuth partially ran; try bare init
    _auth = initializeAuth(app);
  }
}
export const auth = _auth;
export const db = getFirestore(app);
