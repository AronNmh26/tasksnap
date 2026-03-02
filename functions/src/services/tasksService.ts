import { adminDb } from "../config/firebase";

const TASKS_COLLECTION = "tasks";

export type TaskStatus = "pending" | "completed";

export interface TaskRecord {
  id: string;
  title: string;
  category: string | null;
  dueAt: string | null;
  reminderMinutes: number | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  notificationId: string | null;
  imageUri: string | null;
  imageUrl: string | null;
  userId: string;
}

export type TaskInput = Partial<Omit<TaskRecord, "userId">>;

function tasksCollection() {
  return adminDb.collection(TASKS_COLLECTION);
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function normalizeStatus(value: unknown): TaskStatus {
  if (value === "completed" || value === "done") {
    return "completed";
  }
  return "pending";
}

function normalizeRecordFromDoc(docId: string, raw: Record<string, unknown>): TaskRecord {
  const now = new Date().toISOString();
  return {
    id: asString(raw.id) ?? docId,
    title: asString(raw.title) ?? "Untitled Task",
    category: asString(raw.category) ?? asString(raw.description),
    dueAt: asString(raw.dueAt) ?? asString(raw.dueDate),
    reminderMinutes: asOptionalNumber(raw.reminderMinutes),
    status: normalizeStatus(raw.status),
    createdAt: asString(raw.createdAt) ?? now,
    updatedAt: asString(raw.updatedAt) ?? now,
    notificationId: asString(raw.notificationId),
    imageUri: asString(raw.imageUri),
    imageUrl: asString(raw.imageUrl),
    userId: asString(raw.userId) ?? ""
  };
}

export async function listUserTasks(userId: string): Promise<TaskRecord[]> {
  const snapshot = await tasksCollection().where("userId", "==", userId).get();

  return snapshot.docs
    .map((doc) => normalizeRecordFromDoc(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getUserTaskById(userId: string, taskId: string): Promise<TaskRecord | null> {
  const snapshot = await tasksCollection().doc(taskId).get();

  if (!snapshot.exists) {
    return null;
  }

  const task = normalizeRecordFromDoc(taskId, snapshot.data() as Record<string, unknown>);
  if (task.userId !== userId) {
    return null;
  }

  return task;
}

export async function createTask(userId: string, input: TaskInput): Promise<TaskRecord> {
  const title = asString(input.title);
  if (!title) {
    throw new Error("Task title is required");
  }

  const now = new Date().toISOString();
  const taskRef = tasksCollection().doc();
  const task: TaskRecord = {
    id: taskRef.id,
    title,
    category: asString(input.category),
    dueAt: asString(input.dueAt),
    reminderMinutes: asOptionalNumber(input.reminderMinutes),
    status: normalizeStatus(input.status),
    createdAt: now,
    updatedAt: now,
    notificationId: asString(input.notificationId),
    imageUri: asString(input.imageUri),
    imageUrl: asString(input.imageUrl),
    userId
  };

  await taskRef.set(task);
  return task;
}

export async function upsertTaskById(
  userId: string,
  taskId: string,
  input: TaskInput
): Promise<TaskRecord> {
  const docRef = tasksCollection().doc(taskId);
  const snapshot = await docRef.get();
  const now = new Date().toISOString();
  let existing: TaskRecord | null = null;

  if (snapshot.exists) {
    const normalized = normalizeRecordFromDoc(taskId, snapshot.data() as Record<string, unknown>);
    if (normalized.userId !== userId) {
      throw new Error("Task does not belong to authenticated user");
    }
    existing = normalized;
  }

  const title = asString(input.title) ?? existing?.title ?? null;
  if (!title) {
    throw new Error("Task title is required");
  }

  const task: TaskRecord = {
    id: taskId,
    title,
    category: input.category !== undefined ? asString(input.category) : existing?.category ?? null,
    dueAt: input.dueAt !== undefined ? asString(input.dueAt) : existing?.dueAt ?? null,
    reminderMinutes:
      input.reminderMinutes !== undefined
        ? asOptionalNumber(input.reminderMinutes)
        : existing?.reminderMinutes ?? null,
    status: input.status !== undefined ? normalizeStatus(input.status) : existing?.status ?? "pending",
    createdAt: existing?.createdAt ?? asString(input.createdAt) ?? now,
    updatedAt: now,
    notificationId:
      input.notificationId !== undefined ? asString(input.notificationId) : existing?.notificationId ?? null,
    imageUri: input.imageUri !== undefined ? asString(input.imageUri) : existing?.imageUri ?? null,
    imageUrl: input.imageUrl !== undefined ? asString(input.imageUrl) : existing?.imageUrl ?? null,
    userId
  };

  await docRef.set(task);
  return task;
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const existing = await getUserTaskById(userId, taskId);
  if (!existing) {
    return false;
  }

  await tasksCollection().doc(taskId).delete();
  return true;
}
