import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@app_settings";

export interface AppSettings {
  defaultCategory: string;
  aiAutoSuggest: boolean;
  defaultReminderMinutes: number;
  showCompletedTasks: boolean;
}

interface SettingsState extends AppSettings {
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultCategory: "General",
  aiAutoSuggest: true,
  defaultReminderMinutes: 15,
  showCompletedTasks: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        set({ ...DEFAULT_SETTINGS, ...parsed, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  updateSetting: async (key, value) => {
    set({ [key]: value } as any);
    try {
      const state = get();
      const toSave: AppSettings = {
        defaultCategory: state.defaultCategory,
        aiAutoSuggest: state.aiAutoSuggest,
        defaultReminderMinutes: state.defaultReminderMinutes,
        showCompletedTasks: state.showCompletedTasks,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  },
}));
