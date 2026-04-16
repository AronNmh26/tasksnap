import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeColors, radii, spacing, shadows } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import * as FileSystem from "expo-file-system/legacy";
import { getAllTasks, upsertTask } from "../../../services/db";
import { nowIso } from "../../../core/utils/date";
import { useSettingsStore } from "../store/useSettingsStore";
import { useAuthStore } from "../../auth/store/useAuthStore";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { cancelAllReminders, ensureNotificationPermission } from "../../../services/notifications";

const CATEGORIES = ["General", "Personal", "Academic", "Health", "Finance", "Work"];
const REMINDER_OPTIONS = [
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
];

export default function SettingsScreen() {
  const { mode, colors, setMode } = useTheme();
  const [darkMode, setDarkMode] = useState(mode === "dark");
  const [autoSync, setAutoSync] = useState(false);
  const [storageBytes, setStorageBytes] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [storageLoading, setStorageLoading] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { deleteAccount } = useAuthStore();

  const {
    defaultCategory,
    defaultReminderMinutes,
    showCompletedTasks,
    notificationsEnabled,
    loadSettings,
    updateSetting,
  } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setDarkMode(mode === "dark");
  }, [mode]);

  const formatBytes = (bytes: number): string => {
    if (bytes <= 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  };

  const refreshStorageUsage = useCallback(async () => {
    setStorageLoading(true);
    try {
      const tasks = await getAllTasks();
      const uris = tasks.map((t) => t.imageUri).filter(Boolean) as string[];
      let total = 0;
      let existingCount = 0;

      for (const uri of uris) {
        try {
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists && typeof info.size === "number") {
            total += info.size;
            existingCount += 1;
          }
        } catch {
          // ignore missing or invalid files
        }
      }

      setStorageBytes(total);
      setPhotoCount(existingCount);
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshStorageUsage();
    }, [refreshStorageUsage])
  );

  const handleResetData = () => {
    Alert.alert(
      "Delete All Photos",
      "Are you sure you want to delete all locally stored photos? This will free up storage space but cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All Photos",
          style: "destructive",
          onPress: async () => {
            try {
              Alert.alert("Deleting Photos", "Please wait while we delete all photos...");

              // Get all tasks
              const allTasks = await getAllTasks();
              const tasksWithPhotos = allTasks.filter(task => task.imageUri);

              if (tasksWithPhotos.length === 0) {
                Alert.alert("No Photos Found", "There are no photos stored locally to delete.");
                return;
              }

              let deletedCount = 0;
              let errorCount = 0;

              // Delete photos and update tasks
              for (const task of tasksWithPhotos) {
                try {
                  // Delete the photo file from local storage
                  if (task.imageUri) {
                    await FileSystem.deleteAsync(task.imageUri, { idempotent: true });
                  }

                  // Update the task to remove imageUri
                  const updatedTask = {
                    ...task,
                    imageUri: null,
                    updatedAt: nowIso(),
                  };

                  await upsertTask(updatedTask);
                  deletedCount++;
                } catch (error) {
                  console.error(`Error deleting photo for task ${task.id}:`, error);
                  errorCount++;
                }
              }

              // Show result
              if (errorCount === 0) {
                Alert.alert(
                  "Photos Deleted",
                  `Successfully deleted ${deletedCount} photo${deletedCount !== 1 ? 's' : ''}. Storage space has been freed up.`
                );
                refreshStorageUsage();
              } else {
                Alert.alert(
                  "Partial Success",
                  `Deleted ${deletedCount} photo${deletedCount !== 1 ? 's' : ''}, but ${errorCount} failed. Some storage space may still be occupied.`
                );
                refreshStorageUsage();
              }
            } catch (error) {
              console.error("Error deleting photos:", error);
              Alert.alert("Error", "Failed to delete photos. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (!value) {
      await cancelAllReminders();
      updateSetting("notificationsEnabled", false);
      return;
    }

    const status = await ensureNotificationPermission();
    if (status !== "granted") {
      Alert.alert(
        "Notifications Disabled",
        "Permission was not granted. You can enable it later in system settings."
      );
      updateSetting("notificationsEnabled", false);
      return;
    }

    updateSetting("notificationsEnabled", true);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account & Data",
      "This will permanently delete your account and all task data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              Alert.alert("Deleting Account", "Please wait while we remove your data...");

              const allTasks = await getAllTasks();
              for (const task of allTasks) {
                if (task.imageUri) {
                  try {
                    await FileSystem.deleteAsync(task.imageUri, { idempotent: true });
                  } catch {
                    // Ignore local deletion errors; account deletion should proceed.
                  }
                }
              }

              await deleteAccount();
            } catch (error: any) {
              Alert.alert("Error", error?.message ?? "Failed to delete account.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your experience</Text>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="palette" size={20} color="#a78bfa" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Dark Mode</Text>
              <Text style={styles.menuDetail}>{darkMode ? "On" : "Off"}</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(value) => {
                setDarkMode(value);
                setMode(value ? "dark" : "light");
              }}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={darkMode ? "#93c5fd" : "#94a3b8"}
            />
          </View>
        </View>

        {/* Notifications & Sync */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications & Sync</Text>
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="notifications" size={20} color="#fbbf24" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Push Notifications</Text>
              <Text style={styles.menuDetail}>Task reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={notificationsEnabled ? "#93c5fd" : "#94a3b8"}
            />
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="cloud-sync" size={20} color="#34d399" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Cloud Sync</Text>
              <Text style={styles.menuDetail}>Coming soon</Text>
            </View>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              disabled
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={autoSync ? "#93c5fd" : "#94a3b8"}
            />
          </View>
        </View>

        {/* Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Defaults</Text>

          {/* Default category */}
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="category" size={20} color="#60a5fa" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Default Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, defaultCategory === cat && styles.chipActive]}
                    onPress={() => updateSetting("defaultCategory", cat)}
                  >
                    <Text style={[styles.chipText, defaultCategory === cat && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Default reminder */}
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="alarm" size={20} color="#f97316" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Default Reminder</Text>
              <View style={styles.chipRow}>
                {REMINDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, defaultReminderMinutes === opt.value && styles.chipActive]}
                    onPress={() => updateSetting("defaultReminderMinutes", opt.value)}
                  >
                    <Text style={[styles.chipText, defaultReminderMinutes === opt.value && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Show completed tasks */}
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="check-circle" size={20} color="#10b981" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Show Completed Tasks</Text>
              <Text style={styles.menuDetail}>Display on dashboard</Text>
            </View>
            <Switch
              value={showCompletedTasks}
              onValueChange={(v) => updateSetting("showCompletedTasks", v)}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={showCompletedTasks ? "#93c5fd" : "#94a3b8"}
            />
          </View>
        </View>

        {/* Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="storage" size={20} color="#8b5cf6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Storage Usage</Text>
              <View style={styles.storageBar}>
                <View
                  style={[
                    styles.storageUsed,
                    {
                      width: storageBytes > 0 ? "100%" : "0%",
                    },
                  ]}
                />
              </View>
              <Text style={styles.menuDetail}>
                {storageLoading
                  ? "Calculating..."
                  : photoCount > 0
                    ? `${formatBytes(storageBytes)} across ${photoCount} local photo${photoCount > 1 ? "s" : ""}`
                    : "No local photos stored"}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={handleResetData}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="delete-outline" size={20} color="#f87171" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: "#f87171" }]}>Delete All Photos</Text>
              <Text style={styles.menuDetail}>Free up storage space</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="rgba(248,113,113,0.5)" />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate(RouteNames.HelpFaq)}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name="help-outline" size={20} color="#ec4899" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>FAQ & Support</Text>
              <Text style={styles.menuDetail}>Get help</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSubtle} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate(RouteNames.PrivacyPolicy)}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name="lock-outline" size={20} color="#6366f1" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Privacy Policy</Text>
              <Text style={styles.menuDetail}>Read terms</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSubtle} />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="info-outline" size={20} color="#f97316" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Version</Text>
              <Text style={styles.menuDetail}>1.0.0</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="delete-forever" size={20} color="#ef4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: "#ef4444" }]}>Delete Account & Data</Text>
              <Text style={styles.menuDetail}>Permanently remove your data</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="rgba(239,68,68,0.6)" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  glowTop: {
    position: "absolute",
    top: -200,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(59,130,246,0.15)",
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    marginBottom: spacing.sm,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuDetail: {
    fontSize: 13,
    color: colors.textMuted,
  },
  storageBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderGlass,
    marginVertical: 6,
    overflow: "hidden",
  },
  storageUsed: {
    height: 6,
    width: "8%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  chipTextActive: {
    color: "#fff",
  },
  footer: {
    height: spacing.xl,
  },
});
