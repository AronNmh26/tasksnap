import { create } from "zustand";
import { Task } from "../../../core/types/task";
import { deleteTask, getAllTasks, upsertTask } from "../../../services/db";
import { cancelReminder, scheduleTaskReminder } from "../../../services/notifications";
import { useSettingsStore } from "../../settings/store/useSettingsStore";

type State = {
  tasks: Task[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  save: (task: Task) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

async function ensureSettingsLoaded() {
  const settingsState = useSettingsStore.getState();
  if (!settingsState.isLoaded) {
    await settingsState.loadSettings();
  }
  return useSettingsStore.getState();
}

async function syncTaskReminder(task: Task): Promise<Task> {
  const settings = await ensureSettingsLoaded();
  const reminderMinutes = task.reminderMinutes ?? settings.defaultReminderMinutes ?? 60;

  if (task.notificationId) {
    await cancelReminder(task.notificationId);
  }

  if (!settings.notificationsEnabled || !task.dueAt || task.status === "completed") {
    return {
      ...task,
      reminderMinutes: task.dueAt ? reminderMinutes : null,
      notificationId: null,
    };
  }

  const notificationId = await scheduleTaskReminder({
    title: task.title,
    dueAtIso: task.dueAt,
    reminderMinutes,
    category: task.category ?? null,
  });

  return {
    ...task,
    reminderMinutes,
    notificationId,
  };
}

export const useTasksStore = create<State>((set, get) => ({
  tasks: [],
  isLoading: false,

  refresh: async () => {
    set({ isLoading: true });
    try {
      const rows = await getAllTasks();
      set({ tasks: rows });
    } finally {
      set({ isLoading: false });
    }
  },

  save: async (task) => {
    const taskWithReminder = await syncTaskReminder(task);
    await upsertTask(taskWithReminder);
    // Refresh in background — don't let a refresh failure hide a successful save
    try {
      await get().refresh();
    } catch (refreshErr) {
      console.warn("[TasksStore] refresh after save failed:", refreshErr);
    }
  },

  remove: async (id) => {
    const existing = get().tasks.find((task) => task.id === id);
    await cancelReminder(existing?.notificationId);
    await deleteTask(id);
    await get().refresh();
  },
}));
