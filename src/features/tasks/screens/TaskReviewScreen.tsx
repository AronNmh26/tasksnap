import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { ThemeColors, radii, spacing } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { upsertTask } from "../../../services/db";
import { Task } from "../../../core/types/task";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { MaterialIcons } from "@expo/vector-icons";
const DateTimePicker: any =
  Platform.OS === "web" ? null : require("@react-native-community/datetimepicker").default;

export default function TaskReviewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { imageUri } = route.params ?? {};
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const categories = ["Personal", "Academic", "Health", "Finance", "Work", "General"];
  const defaultCategory = "General";

  useEffect(() => {
    if (!selectedCategory && defaultCategory) {
      setSelectedCategory(defaultCategory);
    }
  }, []);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Review</Text>
          <View style={{ width: 40 }} />
        </View>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}

        <TextInput
          style={styles.titleInput}
          placeholder="Enter task title..."
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={colors.textSubtle}
          autoFocus={!imageUri}
        />

        <View style={styles.sectionHeader}>
          <MaterialIcons name="category" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Category</Text>
        </View>
        <View style={styles.categoryList}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, selectedCategory === cat && styles.selectedBtn]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.selectedText]}>{cat}</Text>
              {selectedCategory === cat && <MaterialIcons name="check" size={16} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        {imageUri ? <Text style={styles.helperNote}>Tip: Review task details before saving.</Text> : null}

        <View style={styles.sectionHeader}>
          <MaterialIcons name="event" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Due Date & Time</Text>
        </View>

        <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
          <MaterialIcons name="calendar-today" size={20} color={dueDate ? colors.primary : colors.textSubtle} />
          <Text style={[styles.dateText, { color: dueDate ? colors.textPrimary : colors.textSubtle }]}>
            {dueDate ? dueDate.toLocaleString() : "Set due date and time"}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSubtle} />
        </TouchableOpacity>

        {showDatePicker && DateTimePicker ? (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="datetime"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_event: { type?: string }, selectedDate?: Date) => {
              setShowDatePicker(false);
              if (selectedDate) setDueDate(selectedDate);
            }}
          />
        ) : null}

        <TouchableOpacity
          style={styles.save}
          onPress={async () => {
            if (!title.trim()) return;
            setSaving(true);
            try {
              const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
              const now = new Date().toISOString();
              const task: Task = {
                id,
                title: title.trim(),
                category: selectedCategory || null,
                dueAt: dueDate?.toISOString() || null,
                reminderMinutes: null,
                status: "pending",
                createdAt: now,
                updatedAt: now,
                notificationId: null,
                imageUri: imageUri ?? null,
                imageBase64: null,
              };
              await upsertTask(task);
              navigation.navigate(RouteNames.MainTabs);
            } catch (err) {
              console.error("Failed to save task:", err);
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving || !title.trim()}
        >
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save Task"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { padding: spacing.lg, backgroundColor: colors.background, paddingBottom: 100 },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
      paddingTop: Platform.OS === "ios" ? 40 : spacing.md,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    image: { height: 220, borderRadius: radii.lg, marginBottom: spacing.md },
    titleInput: {
      backgroundColor: colors.glass,
      borderRadius: radii.md,
      padding: 16,
      color: colors.textPrimary,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      fontSize: 16,
      fontWeight: "600",
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "700",
    },
    categoryList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
    categoryBtn: {
      backgroundColor: colors.glass,
      borderRadius: radii.md,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    selectedBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
    categoryText: { color: colors.textPrimary, fontWeight: "600" },
    selectedText: { color: "#fff" },
    dateInput: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.glass,
      borderRadius: radii.md,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    dateText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "500",
    },
    save: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: radii.md,
      marginTop: spacing.lg,
      alignItems: "center",
    },
    saveText: { color: "#fff", fontWeight: "700" },
    helperNote: {
      fontSize: 12,
      color: colors.textSubtle,
      textAlign: "center",
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      fontStyle: "italic",
    },
  });

