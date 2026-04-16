/**
 * Direct Firestore data access — no Cloud Functions required.
 * Works on the free Spark plan.
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { db, auth } from "./firebase";
import { Task } from "../core/types/task";

const TASKS_COLLECTION = "tasks";
const TASKS_CACHE_TTL_MS = 15_000;
const MAX_RETRY_ATTEMPTS = 2;

type TaskCache = {
  uid: string;
  tasks: Task[];
  fetchedAt: number;
};

let taskCache: TaskCache | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function assertValidId(id: string, label = "id"): void {
  if (!id || !id.trim()) {
    throw new Error(`Invalid ${label}.`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFirestoreError(error: any): boolean {
  const code = error?.code as string | undefined;
  return code === "unavailable" || code === "deadline-exceeded" || code === "aborted";
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt += 1;
      if (!isRetryableFirestoreError(error) || attempt > MAX_RETRY_ATTEMPTS) {
        throw error;
      }
      const backoffMs = 300 * attempt + Math.floor(Math.random() * 200);
      await sleep(backoffMs);
    }
  }
}

function toFriendlyFirestoreError(error: any, fallback: string): Error {
  const code = error?.code as string | undefined;
  if (code === "unavailable" || code === "deadline-exceeded") {
    return new Error("Network unavailable. Please check your connection and try again.");
  }
  if (code === "permission-denied" || error?.message?.includes("permission")) {
    return new Error("Permission denied. Please log out and log in again.");
  }
  return new Error(fallback);
}

function getCachedTasks(uid: string): Task[] | null {
  if (!taskCache || taskCache.uid !== uid) return null;
  if (Date.now() - taskCache.fetchedAt > TASKS_CACHE_TTL_MS) return null;
  return taskCache.tasks;
}

function getAnyCachedTasks(uid: string): Task[] | null {
  if (!taskCache || taskCache.uid !== uid) return null;
  return taskCache.tasks;
}

function setCachedTasks(uid: string, tasks: Task[]): void {
  taskCache = {
    uid,
    tasks: [...tasks],
    fetchedAt: Date.now(),
  };
}

function upsertCachedTask(uid: string, task: Task): void {
  const cached = getCachedTasks(uid);
  if (!cached) return;
  const next = cached.filter((t) => t.id !== task.id);
  next.unshift(task);
  next.sort((a, b) => safeDateMs(b.updatedAt) - safeDateMs(a.updatedAt));
  setCachedTasks(uid, next);
}

function removeCachedTask(uid: string, id: string): void {
  const cached = getCachedTasks(uid);
  if (!cached) return;
  const next = cached.filter((t) => t.id !== id);
  setCachedTasks(uid, next);
}

function clearCachedTasks(uid: string): void {
  if (taskCache?.uid === uid) {
    taskCache = null;
  }
}

/**
 * Returns the signed-in user's uid.
 * 1. If auth.currentUser is available, returns immediately.
 * 2. Otherwise waits up to 5s for onAuthStateChanged.
 * 3. As a last resort, signs in anonymously (creates a Firebase Auth session
 *    so Firestore security rules can verify request.auth.uid).
 */
async function getUid(): Promise<string> {
  // Fast path — user already available
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }

  // Wait briefly for auth to initialise
  const uid = await new Promise<string | null>((resolve) => {
    console.log("[firestoreDb] getUid: waiting for auth state...");
    let settled = false;
    let unsubscribe: (() => void) | null = null;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
      console.warn("[firestoreDb] getUid: auth timed out after 5s");
      resolve(null);
    }, 5_000);

    unsubscribe = onAuthStateChanged(auth, (user) => {
      if (settled) return;
      if (user?.uid) {
        settled = true;
        clearTimeout(timer);
        unsubscribe?.();
        console.log("[firestoreDb] getUid: resolved uid:", user.uid);
        resolve(user.uid);
      }
      // Don't resolve on null — auth may still be initialising
    });
  });

  if (uid) return uid;

  // Last resort: if we still have no auth session, try signing in anonymously
  // This creates a valid request.auth for Firestore security rules
  console.warn("[firestoreDb] getUid: no auth session found, signing in anonymously as fallback...");
  try {
    const result = await signInAnonymously(auth);
    console.log("[firestoreDb] getUid: anonymous sign-in succeeded:", result.user.uid);
    return result.user.uid;
  } catch (e: any) {
    console.error("[firestoreDb] getUid: anonymous sign-in failed:", e?.message);
    throw new Error("Not signed in. Please log out and log in again.");
  }
}

function normalizeStatus(value: unknown): Task["status"] {
  return value === "completed" || value === "done" ? "completed" : "pending";
}

function docToTask(data: Record<string, unknown>, docId: string): Task {
  const now = nowIso();
  return {
    id: (data.id as string) ?? docId,
    title: (data.title as string) ?? "Untitled Task",
    category: (data.category as string) ?? null,
    dueAt: (data.dueAt as string) ?? null,
    reminderMinutes: typeof data.reminderMinutes === "number" ? data.reminderMinutes : null,
    status: normalizeStatus(data.status),
    createdAt: (data.createdAt as string) ?? now,
    updatedAt: (data.updatedAt as string) ?? now,
    notificationId: (data.notificationId as string) ?? null,
    imageUri: (data.imageUri as string) ?? null,
    imageUrl: (data.imageUrl as string) ?? null,
    imageBase64: null,
    userId: (data.userId as string) ?? "",
  };
}

function taskToDoc(task: Task, uid: string): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    category: task.category ?? null,
    dueAt: task.dueAt ?? null,
    reminderMinutes: task.reminderMinutes ?? null,
    status: task.status ?? "pending",
    createdAt: task.createdAt,
    updatedAt: nowIso(),
    notificationId: task.notificationId ?? null,
    imageUri: task.imageUri ?? null,
    imageUrl: task.imageUrl ?? null,
    userId: uid,
  };
}

function safeDateMs(value: string | null): number {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function getTaskByIdForUser(id: string, uid: string): Promise<Task | null> {
  assertValidId(id, "task id");
  const cached = getCachedTasks(uid)?.find((task) => task.id === id);
  if (cached) return cached;
  const ref = doc(db, TASKS_COLLECTION, id);
  const snap = await withRetry(() => getDoc(ref));
  if (!snap.exists()) return null;
  const task = docToTask(snap.data() as Record<string, unknown>, snap.id);
  return task.userId === uid ? task : null;
}

// ---------- public API (same signatures as before) ----------

export async function initDb(): Promise<void> {
  // no-op — Firestore is ready as soon as firebase.ts runs
}

export async function getAllTasks(): Promise<Task[]> {
  const uid = await getUid();
  const cached = getCachedTasks(uid);
  if (cached) return cached;
  console.log("[firestoreDb] getAllTasks for uid:", uid);
  // Simple query — no composite index needed
  const q = query(
    collection(db, TASKS_COLLECTION),
    where("userId", "==", uid),
  );
  try {
    const snap = await withRetry(() => getDocs(q));
    console.log("[firestoreDb] getAllTasks returned", snap.docs.length, "docs");
    const tasks = snap.docs.map((d) => docToTask(d.data() as Record<string, unknown>, d.id));
    // Sort client-side (avoids composite index requirement)
    tasks.sort((a, b) => safeDateMs(b.updatedAt) - safeDateMs(a.updatedAt));
    setCachedTasks(uid, tasks);
    return tasks;
  } catch (error: any) {
    const stale = getAnyCachedTasks(uid);
    if (stale && stale.length > 0) {
      console.warn("[firestoreDb] getAllTasks failed, returning cached data");
      return stale;
    }
    throw toFriendlyFirestoreError(error, "Failed to load tasks.");
  }
}

export async function getTaskById(id: string): Promise<Task | null> {
  const uid = await getUid();
  return getTaskByIdForUser(id, uid);
}

export async function upsertTask(task: Task): Promise<void> {
  assertValidId(task.id, "task id");
  const uid = await getUid();
  const ref = doc(db, TASKS_COLLECTION, task.id);
  const taskDoc = taskToDoc(task, uid);

  console.log("[firestoreDb] upsertTask:", task.id, task.title, "userId:", uid);
  try {
    await withRetry(() => setDoc(ref, taskDoc, { merge: true }));
    console.log("[firestoreDb] upsertTask SUCCESS");
    const cachedTask = docToTask(taskDoc, task.id);
    upsertCachedTask(uid, cachedTask);
  } catch (e: any) {
    console.error("[firestoreDb] upsertTask FAILED:", e?.message, e?.code);
    throw toFriendlyFirestoreError(e, "Failed to save task.");
  }
}

export async function deleteTask(id: string): Promise<void> {
  const uid = await getUid();
  // Verify ownership before delete
  const existing = await getTaskByIdForUser(id, uid);
  if (!existing) {
    throw new Error("Task not found or not authorised.");
  }
  try {
    await withRetry(() => deleteDoc(doc(db, TASKS_COLLECTION, id)));
    removeCachedTask(uid, id);
  } catch (error: any) {
    throw toFriendlyFirestoreError(error, "Failed to delete task.");
  }
}

export async function deleteAllTasksForUser(): Promise<void> {
  const uid = await getUid();
  const q = query(collection(db, TASKS_COLLECTION), where("userId", "==", uid));
  const snap = await withRetry(() => getDocs(q));

  if (snap.empty) return;

  let batch = writeBatch(db);
  let count = 0;

  for (const d of snap.docs) {
    batch.delete(d.ref);
    count += 1;
    if (count >= 450) {
      await withRetry(() => batch.commit());
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    await withRetry(() => batch.commit());
  }

  clearCachedTasks(uid);
}
