import { Task } from "../core/types/task";
import { apiRequest, pingBackend } from "./apiClient";

function normalizeStatus(value: unknown): Task["status"] {
  return value === "completed" || value === "done" ? "completed" : "pending";
}

function normalizeTask(input: Partial<Task>): Task {
  const now = new Date().toISOString();

  return {
    id: input.id ?? "",
    title: input.title ?? "Untitled Task",
    category: input.category ?? null,
    dueAt: input.dueAt ?? null,
    reminderMinutes: input.reminderMinutes ?? null,
    status: normalizeStatus(input.status),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    notificationId: input.notificationId ?? null,
    imageUri: input.imageUri ?? null,
    imageUrl: input.imageUrl ?? null,
    imageBase64: null,
    userId: input.userId
  };
}

export async function initDb() {
  await pingBackend();
}

export async function getAllTasks(): Promise<Task[]> {
  const tasks = await apiRequest<Partial<Task>[]>("/tasks");
  return (tasks ?? [])
    .map(normalizeTask)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getTaskById(id: string): Promise<Task | null> {
  try {
    const task = await apiRequest<Partial<Task>>(`/tasks/${encodeURIComponent(id)}`);
    return normalizeTask(task);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      return null;
    }
    throw error;
  }
}

export async function upsertTask(task: Task): Promise<void> {
  const taskToSave: Task = {
    ...task,
    imageBase64: null
  };

  await apiRequest(`/tasks/${encodeURIComponent(task.id)}`, {
    method: "PUT",
    body: taskToSave
  });
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest(`/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
