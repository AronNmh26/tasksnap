import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../appRoot/navigation/RootNavigator";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { ThemeColors, radii, spacing } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { upsertTask } from "../../../services/db";
import { Task } from "../../../core/types/task";
const DateTimePicker: any =
  Platform.OS === "web" ? null : require("@react-native-community/datetimepicker").default;

type Props = NativeStackScreenProps<RootStackParamList, typeof RouteNames.QuickCapture>;

export default function QuickCaptureScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedDateIso = route.params?.selectedDateIso;
  const categories = ["General", "Personal", "Academic", "Health", "Finance", "Work"];

  const saveQuickTask = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert("Missing title", "Please enter a task title.");
      return;
    }

    setSaving(true);
    try {
      const defaultDue = selectedDateIso ? new Date(selectedDateIso) : null;
      if (defaultDue) defaultDue.setHours(12, 0, 0, 0);
      const chosenDue = dueDate ?? defaultDue;
      const now = new Date().toISOString();

      const task: Task = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: cleanTitle,
        category: category || "General",
        dueAt: chosenDue ? chosenDue.toISOString() : null,
        reminderMinutes: null,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        notificationId: null,
        imageUri: null,
        imageBase64: null,
      };

      await upsertTask(task);
      navigation.navigate(RouteNames.MainTabs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save task";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Capture</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.header}>
        <Text style={styles.subtitle}>Quickly add a task with name, category, and due date. No photo required.</Text>
      </View>

      <View style={styles.inputWrap}>
        <MaterialIcons name="edit" size={20} color={colors.textMuted} />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Task name"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
        />
      </View>

      <View style={styles.chipsRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
        <MaterialIcons name="event" size={18} color={colors.primary} />
        <Text style={styles.dateText}>
          {dueDate ? dueDate.toLocaleString() : "Choose due date (optional)"}
        </Text>
      </TouchableOpacity>

      {showDatePicker && DateTimePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="datetime"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event: any, selected?: Date) => {
            setShowDatePicker(false);
            if (selected) setDueDate(selected);
          }}
        />
      )}

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={saveQuickTask}
        disabled={saving}
      >
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="check" size={18} color="#fff" />}
        <Text style={styles.primaryText}>{saving ? "Saving..." : "Save Task"}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: spacing.lg,
      backgroundColor: colors.background,
    },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  header: { marginBottom: spacing.lg },
  subtitle: { color: colors.textMuted, marginTop: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  input: { flex: 1, color: colors.textPrimary },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  dateBtn: {
    marginTop: spacing.md,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateText: {
    color: colors.textPrimary,
    fontWeight: "500",
  },
  primaryBtn: {
    marginTop: spacing.lg,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
});
