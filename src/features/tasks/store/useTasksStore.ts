import { create } from "zustand";
import { Task } from "../../../core/types/task";
import { deleteTask, getAllTasks, upsertTask } from "../../../services/db";

type State = {
  tasks: Task[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  save: (task: Task) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

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
    await upsertTask(task);
    await get().refresh();
  },

  remove: async (id) => {
    await deleteTask(id);
    await get().refresh();
  },
}));
