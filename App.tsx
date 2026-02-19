import React, { useEffect } from "react";
import { Platform } from "react-native";
import RootNavigator from "./src/appRoot/navigation/RootNavigator";
import { ThemeProvider } from "./src/core/theme/ThemeProvider";
import { initDb } from "./src/services/db";
import { configureNotifications } from "./src/services/notifications";
import { useSettingsStore } from "./src/features/settings/store/useSettingsStore";

export default function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    // Initialize local DB + notifications + settings once
    initDb().catch(console.error);
    loadSettings().catch(console.error);
    if (Platform.OS !== "web") {
      configureNotifications().catch(console.error);
    }
  }, []);

  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
