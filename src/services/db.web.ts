import { Task } from "../core/types/task";

const memory: Task[] = [];

export async function initDb() {
  // Web fallback: keep tasks in memory for demo only.
}

export async function getAllTasks(): Promise<Task[]> {
  // For web demo, return all tasks (no user filtering needed)
  return [...memory].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getTaskById(id: string): Promise<Task | null> {
  const found = memory.find((t) => t.id === id);
  return found ?? null;
}

export async function upsertTask(task: Task): Promise<void> {
  const index = memory.findIndex((t) => t.id === task.id);
  if (index >= 0) memory[index] = task;
  else memory.unshift(task);
}

export async function deleteTask(id: string): Promise<void> {
  const index = memory.findIndex((t) => t.id === id);
  if (index >= 0) memory.splice(index, 1);
}
