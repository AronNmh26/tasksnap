import { adminDb } from "../config/firebase";

const TASKS_COLLECTION = "tasks";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TaskStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  status?: TaskStatus;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: TaskStatus;
}

function tasksCollection() {
  return adminDb.collection(TASKS_COLLECTION);
}

function normalizeStatus(status: string | undefined): TaskStatus {
  if (status === "in_progress" || status === "done") {
    return status;
  }
  return "todo";
}

export async function listUserTasks(userId: string): Promise<TaskRecord[]> {
  const snapshot = await tasksCollection().where("userId", "==", userId).get();

  return snapshot.docs
    .map((doc) => doc.data() as TaskRecord)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getUserTaskById(userId: string, taskId: string): Promise<TaskRecord | null> {
  const snapshot = await tasksCollection().doc(taskId).get();

  if (!snapshot.exists) {
    return null;
  }

  const task = snapshot.data() as TaskRecord;
  if (task.userId !== userId) {
    return null;
  }

  return task;
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<TaskRecord> {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Task title is required");
  }

  const now = new Date().toISOString();
  const taskRef = tasksCollection().doc();
  const task: TaskRecord = {
    id: taskRef.id,
    title,
    description: input.description?.trim() || null,
    dueDate: input.dueDate?.trim() || null,
    status: normalizeStatus(input.status),
    userId,
    createdAt: now,
    updatedAt: now
  };

  await taskRef.set(task);
  return task;
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput
): Promise<TaskRecord | null> {
  const existing = await getUserTaskById(userId, taskId);
  if (!existing) {
    return null;
  }

  const updated: TaskRecord = {
    ...existing,
    title: input.title !== undefined ? input.title.trim() : existing.title,
    description: input.description !== undefined ? input.description : existing.description,
    dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
    status: input.status !== undefined ? normalizeStatus(input.status) : existing.status,
    updatedAt: new Date().toISOString()
  };

  if (!updated.title) {
    throw new Error("Task title cannot be empty");
  }

  await tasksCollection().doc(taskId).set(updated, { merge: true });
  return updated;
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const existing = await getUserTaskById(userId, taskId);
  if (!existing) {
    return false;
  }

  await tasksCollection().doc(taskId).delete();
  return true;
}
