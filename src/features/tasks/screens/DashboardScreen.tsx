import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { useTasksStore } from "../store/useTasksStore";
import { toLocalReadable } from "../../../core/utils/date";
import { ThemeColors, radii, spacing, shadows } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { DatePickerChips } from "../../../core/components/DatePickerChips";
import { useAuthStore } from "../../auth/store/useAuthStore";
import { Swipeable } from 'react-native-gesture-handler';

type Props = any; // Dashboard is now inside MainTabsNavigator, so it doesn't have RootStackParamList props

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tasks, refresh, remove } = useTasksStore();
  const navigation = useNavigation<any>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { user } = useAuthStore();

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  // Filter tasks by selected date
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.dueAt) {
        // Tasks without due date are shown if selected date is today
        return (
          selectedDate.getDate() === new Date().getDate() &&
          selectedDate.getMonth() === new Date().getMonth() &&
          selectedDate.getFullYear() === new Date().getFullYear()
        );
      }
      const taskDate = new Date(task.dueAt);
      return (
        taskDate.getDate() === selectedDate.getDate() &&
        taskDate.getMonth() === selectedDate.getMonth() &&
        taskDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [tasks, selectedDate]);

  const renderRightActions = (taskId: string) => (
    <TouchableOpacity
      style={styles.deleteBtn}
      onPress={() => remove(taskId)}
    >
      <MaterialIcons name="delete" size={24} color="#fff" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const categoryColor = (category?: string | null) => {
    switch ((category ?? "").toLowerCase()) {
      case "academic":
        return "rgba(59,130,246,0.3)";
      case "personal":
        return "rgba(16,185,129,0.3)";
      case "reading":
        return "rgba(168,85,247,0.3)";
      case "fitness":
      case "health":
        return "rgba(249,115,22,0.3)";
      default:
        return "rgba(148,163,184,0.3)";
    }
  };

  const focusTasks = filteredTasks.slice(0, 3);

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</Text>
            <Text style={styles.title}>Today</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statNumber}>{filteredTasks.length}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statNumber}>{filteredTasks.filter(t => t.status === "completed").length}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <DatePickerChips selectedDate={selectedDate} onDateChange={setSelectedDate} />
        </ScrollView>

        <View style={styles.sectionHeader}>
          <MaterialIcons name="auto-awesome" size={20} color="#facc15" />
          <Text style={styles.sectionTitle}>Focus for Today</Text>
        </View>

        <View style={styles.cardList}>
          {focusTasks.length === 0 && (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="lightbulb" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Ready to capture your day?</Text>
              <Text style={styles.emptyText}>Take a photo of your tasks or add them manually to get started.</Text>
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() =>
                  navigation.navigate(RouteNames.CameraCapture, {
                    selectedDateIso: selectedDate.toISOString(),
                  })
                }
              >
                <MaterialIcons name="add-a-photo" size={20} color="#fff" />
                <Text style={styles.primaryActionText}>Capture Task</Text>
              </TouchableOpacity>
            </View>
          )}

          {focusTasks.map((task) => (
            <Swipeable key={task.id} renderRightActions={() => renderRightActions(task.id)}>
              <TouchableOpacity
                style={styles.glassCard}
                onPress={() => navigation.navigate(RouteNames.TaskDetails, { taskId: task.id })}
              >
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: categoryColor(task.category) }]}>
                      <MaterialIcons name="label" size={12} color="#fff" />
                      <Text style={styles.badgeText}>{task.category ?? "General"}</Text>
                    </View>
                    <View style={styles.priorityDot}>
                      <MaterialIcons name="circle" size={8} color="#fbbf24" />
                    </View>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{task.title}</Text>
                  <View style={styles.cardMeta}>
                    <MaterialIcons name="access-time" size={14} color={colors.textMuted} />
                    <Text style={styles.cardMetaText}>{toLocalReadable(task.dueAt)}</Text>
                  </View>
                </View>
                <View style={styles.cardThumb}>
                  {task.imageUri ? (
                    <Image source={{ uri: task.imageUri }} style={styles.cardThumbImage} resizeMode="cover" />
                  ) : task.imageUrl ? (
                    <Image source={{ uri: task.imageUrl }} style={styles.cardThumbImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.cardThumbPlaceholder}>
                      <MaterialIcons name="image" size={24} color={colors.textSubtle} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Swipeable>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() =>
              navigation.navigate(RouteNames.QuickCapture, {
                selectedDateIso: selectedDate.toISOString(),
              })
            }
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.primaryActionText}>Quick Add Task</Text>
          </TouchableOpacity>
        </View>
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
  glowTop: {
    position: "absolute",
    top: -160,
    left: -120,
    width: 420,
    height: 420,
    borderRadius: 220,
    backgroundColor: "rgba(17,82,212,0.2)",
  },
  content: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "800",
  },
  greeting: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statBadge: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  statNumber: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  chips: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  cardList: {
    gap: spacing.md,
  },
  glassCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    ...shadows.soft,
  },
  cardBody: {
    flex: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardMetaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardThumb: {
    width: 86,
    height: 86,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  cardThumbImage: {
    width: "100%",
    height: "100%",
  },
  cardThumbPlaceholder: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityDot: {
    padding: 2,
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    gap: spacing.lg,
    alignItems: "center",
    ...shadows.soft,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  actionsRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  primaryActionText: { color: "#fff", fontWeight: "700" },
  secondaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  secondaryActionText: { color: colors.textPrimary, fontWeight: "700" },
  deleteBtn: { backgroundColor: "#dc2626", justifyContent: "center", alignItems: "center", width: 80, borderRadius: radii.lg },
  deleteText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});

