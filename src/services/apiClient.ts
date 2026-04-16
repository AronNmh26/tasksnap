import { Platform } from "react-native";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2", "10.0.3.2"]);

function isLocalDevHost(hostname: string): boolean {
  if (LOCAL_DEV_HOSTS.has(hostname)) return true;
  return hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHostedWebApiBaseUrl(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }

  const { origin, hostname } = window.location;
  if (!origin || isLocalDevHost(hostname)) {
    return null;
  }

  if (hostname.endsWith(".web.app") || hostname.endsWith(".firebaseapp.com")) {
    return `${origin}/api`;
  }

  return null;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || /network|timeout|timed out/i.test(error.message);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getApiBaseUrl(): string {
  const explicitBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBase) {
    const normalized = explicitBase.replace(/\/+$/, "");
    try {
      const url = new URL(normalized);
      if (Platform.OS === "android" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
        url.hostname = "10.0.2.2";
      }
      if (url.protocol === "http:" && !isLocalDevHost(url.hostname)) {
        throw new Error("Insecure API base URL. Use HTTPS for production.");
      }
      return url.toString().replace(/\/+$/, "");
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error("Invalid EXPO_PUBLIC_API_BASE_URL.");
    }
  }

  const hostedWebBase = getHostedWebApiBaseUrl();
  if (hostedWebBase) {
    return hostedWebBase;
  }

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_FIREBASE_PROJECT_ID");
  }

  return `https://us-central1-${projectId}.cloudfunctions.net/api`;
}

/**
 * Wait for Firebase Auth to finish initialising (resolves the current user
 * once `onAuthStateChanged` fires for the first time). If the user is already
 * available it resolves immediately.
 */
function waitForAuth(timeoutMs = 10000): Promise<import("firebase/auth").User> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub();
      reject(new Error("User must be authenticated (auth timed out)"));
    }, timeoutMs);

    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      unsub();
      if (user) {
        resolve(user);
      } else {
        reject(new Error("User must be authenticated"));
      }
    });
  });
}

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser ?? await waitForAuth();
  return user.getIdToken();
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    requireAuth?: boolean;
    timeoutMs?: number;
    retries?: number;
  } = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const requireAuth = options.requireAuth ?? true;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const baseUrl = getApiBaseUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (requireAuth) {
    headers.Authorization = `Bearer ${await getAuthToken()}`;
  }

  const url = `${baseUrl}${path}`;
  let attempt = 0;

  while (true) {
    try {
      const response = await fetchWithTimeout(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      }, timeoutMs);

      if (response.status === 204) {
        return undefined as T;
      }

      const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;

      if (!response.ok) {
        if (attempt < retries && isRetryableStatus(response.status)) {
          attempt += 1;
          await sleep(300 * attempt + Math.floor(Math.random() * 200));
          continue;
        }
        if (response.status === 404 && path.startsWith("/auth/password-reset/")) {
          throw new Error(
            "Password reset service is unavailable right now (404). Check EXPO_PUBLIC_API_BASE_URL or deploy the latest Firebase Functions."
          );
        }
        throw new Error(payload.error || `Request failed (${response.status})`);
      }

      return payload.data as T;
    } catch (error: unknown) {
      if (attempt < retries && isNetworkError(error)) {
        attempt += 1;
        await sleep(300 * attempt + Math.floor(Math.random() * 200));
        continue;
      }
      if (isNetworkError(error)) {
        throw new Error("Network error. Please check your connection and try again.");
      }
      throw error;
    }
  }
}

export async function pingBackend(): Promise<void> {
  await apiRequest("/health", { requireAuth: false });
}
