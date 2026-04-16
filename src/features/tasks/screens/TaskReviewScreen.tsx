import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  Alert,
  Keyboard,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { ThemeColors, radii, spacing } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { useTasksStore } from "../store/useTasksStore";
import { useAuthStore } from "../../auth/store/useAuthStore";
import { Task } from "../../../core/types/task";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { MaterialIcons } from "@expo/vector-icons";
const isWeb = Platform.OS === "web";
const useNativeDateTimePicker = Platform.OS === "ios";
const DateTimePicker: any =
  useNativeDateTimePicker ? require("@react-native-community/datetimepicker").default : null;

function mergeDateAndTime(datePart: Date, timePart: Date): Date {
  const merged = new Date(datePart);
  merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return merged;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dismissKeyboardSafely() {
  try {
    Keyboard?.dismiss?.();
  } catch (error) {
    console.warn("[TaskReview] Keyboard.dismiss() was unavailable:", error);
  }
}

export default function TaskReviewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { imageUri, selectedDateIso } = route.params ?? {};
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { save } = useTasksStore();
  const authUser = useAuthStore((s) => s.user);

  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [pickerDate, setPickerDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePart, setDatePart] = useState<Date>(new Date());
  const [timePart, setTimePart] = useState<Date>(new Date());
  const [showWebDatePicker, setShowWebDatePicker] = useState(false);
  const [showWebTimePicker, setShowWebTimePicker] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const categories = ["Personal", "Academic", "Health", "Finance", "Work", "General"];
  const defaultCategory = "General";

  useEffect(() => {
    if (!selectedCategory && defaultCategory) {
      setSelectedCategory(defaultCategory);
    }
  }, []);

  useEffect(() => {
    if (!selectedDateIso || dueDate) return;
    const base = new Date(selectedDateIso);
    if (Number.isNaN(base.getTime())) return;
    base.setHours(12, 0, 0, 0);
    setDueDate(base);
    setDatePart(base);
    setTimePart(base);
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [selectedDateIso, dueDate]);

  useEffect(() => {
    if (!dueDate) return;
    setDatePart(new Date(dueDate));
    setTimePart(new Date(dueDate));
    setViewMonth(new Date(dueDate.getFullYear(), dueDate.getMonth(), 1));
  }, [dueDate]);

  const dayCells = useMemo(() => {
    const firstWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, idx) => {
      const d = idx - firstWeekday + 1;
      if (d < 1 || d > daysInMonth) return null;
      return new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
    });
  }, [viewMonth]);

  const timeOptions = useMemo(() => {
    return Array.from({ length: 48 }, (_, idx) => {
      const h = Math.floor(idx / 2);
      const m = idx % 2 === 0 ? 0 : 30;
      const d = new Date(timePart);
      d.setHours(h, m, 0, 0);
      return d;
    });
  }, [timePart]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

        {imageUri ? (
          <Text style={styles.helperNote}>
            Tip: AI task identification from photos is not available in this version. Please review and enter details manually.
          </Text>
        ) : null}

        <View style={styles.sectionHeader}>
          <MaterialIcons name="event" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Due Date & Time</Text>
        </View>

        {useNativeDateTimePicker && DateTimePicker ? (
          <Pressable
            style={styles.dateInput}
            onPress={() => {
              dismissKeyboardSafely();
              setPickerDate(dueDate || new Date());
              setShowDatePicker(true);
            }}
          >
            <MaterialIcons name="calendar-today" size={20} color={dueDate ? colors.primary : colors.textSubtle} />
            <Text style={[styles.dateText, { color: dueDate ? colors.textPrimary : colors.textSubtle }]}>
              {dueDate ? dueDate.toLocaleString() : "Set due date and time"}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSubtle} />
          </Pressable>
        ) : (
          <View style={styles.webRow}>
            <Pressable style={styles.webSelector} onPress={() => { dismissKeyboardSafely(); setShowWebDatePicker(true); }}>
              <MaterialIcons name="event" size={18} color={colors.primary} />
              <Text style={styles.webSelectorText}>{dueDate ? datePart.toLocaleDateString() : "Pick date"}</Text>
            </Pressable>
            <Pressable style={styles.webSelector} onPress={() => { dismissKeyboardSafely(); setShowWebTimePicker(true); }}>
              <MaterialIcons name="schedule" size={18} color={colors.primary} />
              <Text style={styles.webSelectorText}>{dueDate ? formatTime(timePart) : "Pick time"}</Text>
            </Pressable>
          </View>
        )}

        {!useNativeDateTimePicker ? (
          <Text style={styles.webHint}>
            {dueDate ? `Due: ${dueDate.toLocaleString()}` : "Tap above to set due date and time"}
          </Text>
        ) : null}

        <Text style={styles.reminderHint}>
          When a due date is set, TaskSnap can remind you 1 hour before the deadline.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.save,
            (saving || !title.trim()) && styles.saveDisabled,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            if (saving || !title.trim()) return;
            dismissKeyboardSafely();
            const doSave = async () => {
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
                  userId: authUser?.id,
                };
                console.log("[TaskReview] saving task:", task.id, task.title, "authUser:", authUser?.id);
                await save(task);
                console.log("[TaskReview] save succeeded, navigating to dashboard");
                navigation.navigate(RouteNames.MainTabs);
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed to save task";
                console.error("[TaskReview] Failed to save task:", err);
                Alert.alert("Save Failed", msg + "\n\nIf this keeps happening, try logging out and logging back in.");
              } finally {
                setSaving(false);
              }
            };
            doSave();
          }}
        >
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save Task"}</Text>
        </Pressable>
      </ScrollView>
      {/* iOS native date picker in a Modal overlay */}
      {useNativeDateTimePicker && DateTimePicker && showDatePicker && Platform.OS === "ios" ? (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.innerBackdrop}>
            <View style={styles.iosPickerCard}>
              <Text style={styles.innerTitle}>Select Date & Time</Text>
              <DateTimePicker
                value={pickerDate}
                mode="datetime"
                display="spinner"
                themeVariant="dark"
                textColor={colors.textPrimary}
                onChange={(_event: { type?: string }, selectedDate?: Date) => {
                  if (selectedDate) setPickerDate(selectedDate);
                }}
              />
              <View style={styles.iosPickerActions}>
                <TouchableOpacity style={styles.iosSecondaryBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.iosSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iosPrimaryBtn}
                  onPress={() => {
                    setDueDate(pickerDate);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.iosPrimaryText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Android native date picker (renders as system dialog) */}
      {/* Cross-platform custom date picker overlay */}
      {!useNativeDateTimePicker && showWebDatePicker ? (
        <View style={styles.overlayBackdrop}>
          <Pressable style={styles.overlayDismiss} onPress={() => setShowWebDatePicker(false)} />
          <View style={styles.innerCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.monthNav}
                onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              >
                <MaterialIcons name="chevron-left" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.innerTitle}>
                {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </Text>
              <TouchableOpacity
                style={styles.monthNav}
                onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              >
                <MaterialIcons name="chevron-right" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                <Text key={w} style={styles.weekday}>{w}</Text>
              ))}
            </View>

            <View style={styles.dayGrid}>
              {dayCells.map((d, idx) => {
                const active =
                  !!d &&
                  d.getDate() === datePart.getDate() &&
                  d.getMonth() === datePart.getMonth() &&
                  d.getFullYear() === datePart.getFullYear();
                return (
                  <Pressable
                    key={`dc-${idx}`}
                    disabled={!d}
                    style={[styles.dayCell, !d && styles.dayCellDisabled, active && styles.dayCellActive]}
                    onPress={() => {
                      if (!d) return;
                      setDatePart(d);
                      setDueDate(mergeDateAndTime(d, timePart));
                      setShowWebDatePicker(false);
                    }}
                  >
                    <Text style={[styles.dayCellText, active && styles.dayCellTextActive]}>{d ? d.getDate() : ""}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.closeBtn} onPress={() => setShowWebDatePicker(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Cross-platform custom time picker overlay */}
      {!useNativeDateTimePicker && showWebTimePicker ? (
        <View style={styles.overlayBackdrop}>
          <Pressable style={styles.overlayDismiss} onPress={() => setShowWebTimePicker(false)} />
          <View style={styles.innerCard}>
            <Text style={styles.innerTitle}>Select Time</Text>
            <ScrollView style={styles.timeList} keyboardShouldPersistTaps="handled">
              {timeOptions.map((opt, idx) => {
                const active =
                  opt.getHours() === timePart.getHours() && opt.getMinutes() === timePart.getMinutes();
                return (
                  <Pressable
                    key={`t-${idx}`}
                    style={[styles.timeRow, active && styles.timeRowActive]}
                    onPress={() => {
                      setTimePart(opt);
                      setDueDate(mergeDateAndTime(datePart, opt));
                      setShowWebTimePicker(false);
                    }}
                  >
                    <Text style={[styles.timeText, active && styles.timeTextActive]}>{formatTime(opt)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setShowWebTimePicker(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
    webRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    webSelector: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      height: 50,
      borderRadius: radii.md,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    webSelectorText: {
      color: colors.textPrimary,
      fontWeight: "600",
    },
    webHint: {
      marginTop: spacing.xs,
      color: colors.textMuted,
      fontSize: 12,
    },
    reminderHint: {
      marginTop: spacing.sm,
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    iosPickerCard: {
      borderRadius: radii.lg,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      padding: spacing.md,
      gap: spacing.sm,
      width: "100%",
      maxWidth: 400,
      alignSelf: "center",
    },
    iosPickerActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    iosSecondaryBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      backgroundColor: colors.glass,
    },
    iosSecondaryText: { color: colors.textPrimary, fontWeight: "600" },
    iosPrimaryBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },
    iosPrimaryText: { color: "#fff", fontWeight: "700" },
    innerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    innerCard: {
      borderRadius: radii.lg,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      padding: spacing.md,
      gap: spacing.sm,
    },
    innerTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
    },
    calendarHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    monthNav: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    weekRow: {
      flexDirection: "row",
      marginBottom: spacing.xs,
    },
    weekday: {
      flex: 1,
      textAlign: "center",
      color: colors.textSubtle,
      fontSize: 11,
      fontWeight: "600",
    },
    dayGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
    },
    dayCell: {
      width: "13.7%",
      aspectRatio: 1,
      borderRadius: radii.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    dayCellDisabled: {
      opacity: 0,
    },
    dayCellActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayCellText: {
      color: colors.textPrimary,
      fontWeight: "600",
      fontSize: 12,
    },
    dayCellTextActive: {
      color: "#fff",
      fontWeight: "700",
    },
    timeList: {
      maxHeight: 260,
    },
    timeRow: {
      height: 40,
      borderRadius: radii.md,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      marginBottom: spacing.xs,
    },
    timeRowActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    timeText: {
      color: colors.textPrimary,
      fontWeight: "600",
    },
    timeTextActive: {
      color: "#fff",
      fontWeight: "700",
    },
    closeBtn: {
      marginTop: spacing.xs,
      height: 40,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    closeText: {
      color: colors.textPrimary,
      fontWeight: "700",
    },
    overlayBackdrop: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center" as const,
      alignItems: "center" as const,
      padding: spacing.lg,
      zIndex: 9999,
    },
    overlayDismiss: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    save: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: radii.md,
      marginTop: spacing.lg,
      alignItems: "center" as const,
    },
    saveDisabled: {
      opacity: 0.5,
    },
    saveText: { color: "#fff", fontWeight: "700" as const },
    helperNote: {
      fontSize: 12,
      color: colors.textSubtle,
      textAlign: "center",
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      fontStyle: "italic",
    },
  });
