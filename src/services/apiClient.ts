import { auth } from "./firebase";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

function getApiBaseUrl(): string {
  const explicitBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBase) {
    return explicitBase.replace(/\/+$/, "");
  }

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_FIREBASE_PROJECT_ID");
  }

  return `https://us-central1-${projectId}.cloudfunctions.net/api`;
}

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated");
  }

  return user.getIdToken();
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    requireAuth?: boolean;
  } = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const requireAuth = options.requireAuth ?? true;
  const baseUrl = getApiBaseUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (requireAuth) {
    headers.Authorization = `Bearer ${await getAuthToken()}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload.data as T;
}

export async function pingBackend(): Promise<void> {
  await apiRequest("/health", { requireAuth: false });
}
