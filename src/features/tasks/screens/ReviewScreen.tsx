import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeColors, radii, spacing } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { useTasksStore } from "../store/useTasksStore";

export default function ReviewScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tasks } = useTasksStore();
  const [filter, setFilter] = useState<"ongoing" | "completed">("ongoing");

  // Calculate summary stats
  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "completed").length;
    const ongoing = tasks.filter((t) => t.status === "pending").length;
    return { completed, ongoing, total: tasks.length };
  }, [tasks]);

  // Filter tasks based on selected filter
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => t.status === filter).slice(0, 10);
  }, [tasks, filter]);

  const categoryColor: { [key: string]: string } = {
    academic: "#2563eb",
    personal: "#10b981",
    reading: "#a855f7",
    fitness: "#f97316",
    health: "#f97316",
  };

  const getCategoryColor = (category?: string | null) => {
    return categoryColor[(category ?? "").toLowerCase()] || "#64748b";
  };

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
          <Text style={styles.headerSubtitle}>Weekly overview</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
              <MaterialIcons name="check-circle" size={20} color="#22c55e" />
            </View>
            <Text style={styles.summaryLabel}>Completed</Text>
            <Text style={styles.summaryValue}>{stats.completed}</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: "rgba(37,99,235,0.15)" }]}>
              <MaterialIcons name="schedule" size={20} color="#2563eb" />
            </View>
            <Text style={styles.summaryLabel}>Ongoing</Text>
            <Text style={styles.summaryValue}>{stats.ongoing}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, filter === "ongoing" && styles.tabActive]}
            onPress={() => setFilter("ongoing")}
          >
            <Text style={[styles.tabText, filter === "ongoing" && styles.tabTextActive]}>Ongoing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === "completed" && styles.tabActive]}
            onPress={() => setFilter("completed")}
          >
            <Text style={[styles.tabText, filter === "completed" && styles.tabTextActive]}>Completed</Text>
          </TouchableOpacity>
        </View>

        {/* Task List */}
        {filteredTasks.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="check" size={48} color={colors.textSubtle} />
            <Text style={styles.emptyText}>No {filter} tasks</Text>
          </View>
        )}

        <View style={styles.taskList}>
          {filteredTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={[styles.taskBadge, { backgroundColor: `${getCategoryColor(task.category)}22` }]}>
                <Text style={[styles.taskBadgeText, { color: getCategoryColor(task.category) }]}>
                  {task.category ?? "General"}
                </Text>
              </View>
              <View style={styles.taskBody}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={styles.taskMeta}>
                  <MaterialIcons name="schedule" size={14} color={colors.textSubtle} />
                  <Text style={styles.taskMetaText}>
                    {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "No due date"}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusIcon, { backgroundColor: task.status === "completed" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)" }]}>
                <MaterialIcons
                  name={task.status === "completed" ? "done" : "radio-button-unchecked"}
                  size={18}
                  color={task.status === "completed" ? "#22c55e" : colors.textSubtle}
                />
              </View>
            </View>
          ))}
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
  glowTop: {
    position: "absolute",
    top: -200,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(59,130,246,0.15)",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
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
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.glass,
    borderRadius: radii.lg,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "rgba(37,99,235,0.3)",
  },
  tabText: {
    color: colors.textSubtle,
    fontWeight: "600",
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.primaryLight,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  taskList: {
    gap: spacing.md,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  taskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginRight: spacing.md,
  },
  taskBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskMetaText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    height: spacing.xl,
  },
});
