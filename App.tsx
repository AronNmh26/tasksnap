import React, { useEffect, useState } from "react";
import { Platform, View, Text, StyleSheet } from "react-native";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import RootNavigator from "./src/appRoot/navigation/RootNavigator";
import { ThemeProvider } from "./src/core/theme/ThemeProvider";
import { initDb } from "./src/services/db";
import { configureNotifications } from "./src/services/notifications";
import { useSettingsStore } from "./src/features/settings/store/useSettingsStore";

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: String(error?.message || error) };
  }

  componentDidCatch(error: any) {
    console.error("App runtime error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>App Failed To Load</Text>
          <Text style={styles.errorText}>{this.state.error || "Unknown runtime error"}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
                                                                                                                                                                                                    
export default function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    Promise.all([MaterialIcons.loadFont(), FontAwesome.loadFont()])
      .catch((error) => {
        console.error("Icon font load failed:", error);
      })
      .finally(() => {
        setFontsReady(true);
      });
  }, []);

  useEffect(() => {
    // Initialize local DB + notifications + settings once
    initDb().catch(console.error);
    loadSettings().catch(console.error);
    if (Platform.OS !== "web") {
      configureNotifications().catch(console.error);
    }
  }, []);
  
  if (!fontsReady && Platform.OS !== "web") return null;

  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#0f172a",
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  errorText: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center",
  },
});
