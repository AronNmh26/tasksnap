import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../appRoot/navigation/RootNavigator";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { useTasksStore } from "../store/useTasksStore";
import { getTaskById } from "../../../services/db";
import { nowIso, toLocalReadable } from "../../../core/utils/date";
import { Task } from "../../../core/types/task";
import { cancelReminder } from "../../../services/notifications";
import { ThemeColors, radii, spacing, shadows } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { useSettingsStore } from "../../settings/store/useSettingsStore";
const DateTimePicker: any =
  Platform.OS === "web" ? null : require("@react-native-community/datetimepicker").default;

function mergeDateAndTime(datePart: Date, timePart: Date): Date {
  const merged = new Date(datePart);
  merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return merged;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type Props = NativeStackScreenProps<RootStackParamList, typeof RouteNames.TaskDetails>;

export default function TaskDetailsScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { taskId } = route.params;
  const { save, remove } = useTasksStore();
  const { notificationsEnabled, loadSettings } = useSettingsStore();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [datePart, setDatePart] = useState<Date>(new Date());
  const [timePart, setTimePart] = useState<Date>(new Date());
  const [showWebDatePicker, setShowWebDatePicker] = useState(false);
  const [showWebTimePicker, setShowWebTimePicker] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [status, setStatus] = useState<Task["status"]>("pending");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadSettings();
    getTaskById(taskId).then((t) => {
      setTask(t);
      if (t) {
        setTitle(t.title);
        setCategory(t.category ?? "");
        setDueDate(t.dueAt ? new Date(t.dueAt) : null);
        if (t.dueAt) {
          const parsed = new Date(t.dueAt);
          setDatePart(parsed);
          setTimePart(parsed);
          setViewMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
        }
        setStatus(t.status);
        setImageUri(t.imageUri ?? null);
        setImageUrl(t.imageUrl ?? null);
      }
    });
  }, [taskId]);

  const canToggle = useMemo(() => !!task, [task]);
  const displayedImage = imageUri ?? imageUrl;

  const resetFromTask = (currentTask: Task) => {
    setTitle(currentTask.title);
    setCategory(currentTask.category ?? "");
    setDueDate(currentTask.dueAt ? new Date(currentTask.dueAt) : null);
    if (currentTask.dueAt) {
      const parsed = new Date(currentTask.dueAt);
      setDatePart(parsed);
      setTimePart(parsed);
      setViewMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    } else {
      const now = new Date();
      setDatePart(now);
      setTimePart(now);
      setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
    setStatus(currentTask.status);
    setImageUri(currentTask.imageUri ?? null);
    setImageUrl(currentTask.imageUrl ?? null);
  };

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

  const onSave = async () => {
    if (!task) return;
    const updated: Task = {
      ...task,
      title: title.trim() || task.title,
      category: category.trim() || null,
      dueAt: dueDate?.toISOString() || null,
      status,
      imageUri,
      imageUrl,
      updatedAt: nowIso(),
    };
    try {
      await save(updated);
      setTask(updated);
      setIsEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save task";
      Alert.alert("Error", msg);
    }
  };

  const onToggleDone = async () => {
    if (!task) return;

    // cancel reminder if completing
    if (task.status !== "completed") {
      await cancelReminder(task.notificationId);
    }

    const updated: Task = {
      ...task,
      status: task.status === "completed" ? "pending" : "completed",
      notificationId: task.status === "completed" ? task.notificationId : null,
      updatedAt: nowIso(),
    };

    await save(updated);
    setTask(updated);
    setStatus(updated.status);
  };

  const onDelete = async () => {
    if (!task) return;
    await cancelReminder(task.notificationId);
    await remove(task.id);
    navigation.goBack();
  };

  const onDeletePhoto = async () => {
    if (!task || !displayedImage) return;

    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (imageUri) {
                await FileSystem.deleteAsync(imageUri, { idempotent: true });
              }

              // Update the task to remove the imageUri
              const updated: Task = {
                ...task,
                imageUri: null,
                imageUrl: null,
                updatedAt: nowIso(),
              };

              // Save the updated task
              await save(updated);
              setTask(updated);
              setImageUri(null);
              setImageUrl(null);
            } catch (error) {
              console.error("Error deleting photo:", error);
              Alert.alert("Error", "Failed to delete photo. Please try again.");
            }
          },
        },
      ]
    );
  };

  const copyToPermanentStorage = async (sourceUri: string, prefix: string): Promise<string> => {
    const ext = sourceUri.split(".").pop()?.split("?")[0] || "jpg";
    const fileName = `${prefix}_${Date.now()}.${ext}`;
    const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (!baseDir) throw new Error("Local storage is unavailable.");
    const permanentUri = `${baseDir}${fileName}`;
    await FileSystem.copyAsync({ from: sourceUri, to: permanentUri });
    return permanentUri;
  };

  const onPickImageFromGallery = async () => {
    if (!isEditing) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      const uri = await copyToPermanentStorage(result.assets[0].uri, "task_detail_gallery");
      setImageUri(uri);
      setImageUrl(null);
    } catch {
      setImageUri(result.assets[0].uri);
      setImageUrl(null);
    }
  };

  const onCaptureImageWithCamera = async () => {
    if (!isEditing) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      const uri = await copyToPermanentStorage(result.assets[0].uri, "task_detail_camera");
      setImageUri(uri);
      setImageUrl(null);
    } catch {
      setImageUri(result.assets[0].uri);
      setImageUrl(null);
    }
  };

  if (!task) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="more-vert" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleBlock}>
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <MaterialIcons name="title" size={20} color={colors.primary} />
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.titleInput}
              placeholder="Task title"
              placeholderTextColor={colors.textSubtle}
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <MaterialIcons name="label" size={20} color={colors.primary} />
            </View>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Category"
              placeholderTextColor={colors.textSubtle}
              style={styles.subtitleInput}
              editable={isEditing}
            />
          </View>

          {DateTimePicker ? (
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => isEditing && setShowPicker(true)}
              disabled={!isEditing}
            >
              <View style={styles.inputIcon}>
                <MaterialIcons name="event" size={20} color={dueDate ? colors.primary : colors.textSubtle} />
              </View>
              <Text style={[styles.dateText, { color: dueDate ? colors.textPrimary : colors.textSubtle }]}>
                {dueDate ? dueDate.toLocaleString() : "Set due date and time"}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSubtle} />
            </TouchableOpacity>
          ) : (
            <View style={styles.webRow}>
              <TouchableOpacity
                style={styles.webSelector}
                onPress={() => isEditing && setShowWebDatePicker(true)}
                disabled={!isEditing}
              >
                <MaterialIcons name="event" size={18} color={colors.primary} />
                <Text style={styles.webSelectorText}>{datePart.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.webSelector}
                onPress={() => isEditing && setShowWebTimePicker(true)}
                disabled={!isEditing}
              >
                <MaterialIcons name="schedule" size={18} color={colors.primary} />
                <Text style={styles.webSelectorText}>{formatTime(timePart)}</Text>
              </TouchableOpacity>
            </View>
          )}
          {showPicker && DateTimePicker && (
            <DateTimePicker
              value={dueDate || new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: { type?: string }, selectedDate?: Date) => {
                setShowPicker(false);
                if (selectedDate) setDueDate(selectedDate);
              }}
            />
          )}
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={styles.statusPill}>
              <MaterialIcons
                name={status === "completed" ? "check-circle" : "hourglass-empty"}
                size={16}
                color={status === "completed" ? "#10b981" : "#facc15"}
              />
              <Text
                style={
                  status === "completed" ? styles.statusDoneText : styles.statusPendingText
                }
              >
                {status === "completed" ? "Completed" : "Pending"}
              </Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.statusActions}>
              <TouchableOpacity
                style={[styles.statusActionBtn, status === "pending" && styles.statusActionBtnActive]}
                onPress={() => setStatus("pending")}
              >
                <Text style={[styles.statusActionText, status === "pending" && styles.statusActionTextActive]}>
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusActionBtn, status === "completed" && styles.statusActionBtnActive]}
                onPress={() => setStatus("completed")}
              >
                <Text style={[styles.statusActionText, status === "completed" && styles.statusActionTextActive]}>
                  Completed
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="calendar-today" size={18} color="#f87171" />
              <View>
                <Text style={styles.metaLabel}>Deadline</Text>
                <Text style={styles.metaValue}>{toLocalReadable(dueDate?.toISOString() ?? null)}</Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="school" size={18} color="#34d399" />
              <View>
                <Text style={styles.metaLabel}>Category</Text>
                <Text style={styles.metaValue}>{category || "General"}</Text>
              </View>
            </View>
          </View>
        </View>

        {displayedImage ? (
          <View style={styles.imageCard}>
            <Image source={{ uri: displayedImage }} style={styles.image} />
            <View style={styles.imageTag}>
              <MaterialIcons name="photo-camera" size={14} color="#fff" />
              <Text style={styles.imageTagText}>Task Image</Text>
            </View>
            <TouchableOpacity style={styles.deletePhotoBtn} onPress={onDeletePhoto}>
              <MaterialIcons name="delete" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageCard}>
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="photo" size={36} color={colors.textSubtle} />
            </View>
            <View style={styles.imageTag}>
              <MaterialIcons name="photo-camera" size={14} color="#fff" />
              <Text style={styles.imageTagText}>No Image</Text>
            </View>
          </View>
        )}

        {isEditing ? (
          <View style={styles.imageActionsRow}>
            <TouchableOpacity style={styles.utilityBtn} onPress={onPickImageFromGallery}>
              <MaterialIcons name="photo-library" size={18} color={colors.textPrimary} />
              <Text style={styles.utilityText}>Upload Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.utilityBtn} onPress={onCaptureImageWithCamera}>
              <MaterialIcons name="photo-camera" size={18} color={colors.textPrimary} />
              <Text style={styles.utilityText}>Capture Photo</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.reminderInfoCard}>
          <MaterialIcons
            name="notifications-active"
            size={18}
            color={notificationsEnabled ? colors.primary : colors.textSubtle}
          />
          <Text style={styles.reminderInfoText}>
            {notificationsEnabled
              ? "TaskSnap will remind you 1 hour before the deadline when this task has a due date."
              : "Turn on notifications in Settings to receive 1-hour deadline reminders."}
          </Text>
        </View>

        <View style={styles.utilityRow}>
          <TouchableOpacity style={styles.utilityBtnDanger} onPress={onDelete}>
            <MaterialIcons name="delete" size={18} color="#fff" />
            <Text style={styles.utilityTextDanger}>Delete Task</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {!DateTimePicker ? (
        <Modal
          visible={showWebDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWebDatePicker(false)}
        >
          <View style={styles.innerBackdrop}>
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
                    <TouchableOpacity
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
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowWebDatePicker(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

      {!DateTimePicker ? (
        <Modal
          visible={showWebTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWebTimePicker(false)}
        >
          <View style={styles.innerBackdrop}>
            <View style={styles.innerCard}>
              <Text style={styles.innerTitle}>Select Time</Text>
              <ScrollView style={styles.timeList}>
                {timeOptions.map((opt, idx) => {
                  const active =
                    opt.getHours() === timePart.getHours() && opt.getMinutes() === timePart.getMinutes();
                  return (
                    <TouchableOpacity
                      key={`t-${idx}`}
                      style={[styles.timeRow, active && styles.timeRowActive]}
                      onPress={() => {
                        setTimePart(opt);
                        setDueDate(mergeDateAndTime(datePart, opt));
                        setShowWebTimePicker(false);
                      }}
                    >
                      <Text style={[styles.timeText, active && styles.timeTextActive]}>{formatTime(opt)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowWebTimePicker(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => {
            if (!task) return;
            if (isEditing) {
              resetFromTask(task);
              setIsEditing(false);
              return;
            }
            setIsEditing(true);
          }}
          disabled={!canToggle}
        >
          <MaterialIcons name={isEditing ? "close" : "edit"} size={18} color={colors.textPrimary} />
          <Text style={styles.secondaryText}>{isEditing ? "Cancel Edit" : "Edit Task"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={isEditing ? onSave : onToggleDone}>
          <MaterialIcons name={isEditing ? "save" : "check"} size={18} color="#fff" />
          <Text style={styles.primaryText}>
            {isEditing ? "Save Changes" : task.status === "completed" ? "Mark Pending" : "Mark as Done"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const glowBase = { position: "absolute" as const, width: 420, height: 420, borderRadius: 220 };
const glassBorder = (c: ThemeColors) => ({ borderWidth: 1, borderColor: c.borderGlass });
const rowCenter = { flexDirection: "row" as const, alignItems: "center" as const };
const btnBase = (c: ThemeColors) => ({
  flex: 1, ...rowCenter, justifyContent: "center" as const,
  gap: spacing.xs, paddingVertical: 12, borderRadius: radii.lg, ...glassBorder(c),
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    glowTop: { ...glowBase, top: -160, left: -120, backgroundColor: "rgba(17,82,212,0.2)" },
    glowBottom: { ...glowBase, bottom: -140, right: -120, backgroundColor: "rgba(126,34,206,0.18)" },
    header: { paddingTop: spacing.xl, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, ...rowCenter, justifyContent: "space-between" },
    headerTitle: { color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 2 },
    iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.glass, ...glassBorder(colors) },
    content: { paddingHorizontal: spacing.md, paddingBottom: 140 },
    titleBlock: { paddingVertical: spacing.lg },
    inputGroup: { ...rowCenter, backgroundColor: colors.glass, borderRadius: radii.lg, ...glassBorder(colors), marginBottom: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    inputIcon: { width: 24, alignItems: "center", marginRight: spacing.sm },
    titleInput: { flex: 1, color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
    subtitleInput: { flex: 1, color: colors.textPrimary, fontSize: 16, fontWeight: "500" },
    dateInput: { ...rowCenter, backgroundColor: colors.glass, borderRadius: radii.lg, ...glassBorder(colors), paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
    dateText: { flex: 1, fontSize: 16, fontWeight: "500" },
    webRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    webSelector: { flex: 1, ...rowCenter, gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.glass, ...glassBorder(colors) },
    webSelectorText: { color: colors.textPrimary, fontWeight: "600" },
    innerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
    innerCard: { borderRadius: radii.lg, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderGlass, padding: spacing.md, gap: spacing.sm, ...shadows.soft },
    innerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "center" },
    calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    monthNav: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.glass, ...glassBorder(colors) },
    weekRow: { flexDirection: "row", marginBottom: spacing.xs },
    weekday: { flex: 1, textAlign: "center", color: colors.textSubtle, fontSize: 11, fontWeight: "600" },
    dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
    dayCell: { width: "13.7%", aspectRatio: 1, borderRadius: radii.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.glass, ...glassBorder(colors) },
    dayCellDisabled: { opacity: 0 },
    dayCellActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dayCellText: { color: colors.textPrimary, fontWeight: "600", fontSize: 12 },
    dayCellTextActive: { color: "#fff", fontWeight: "700" },
    timeList: { maxHeight: 260 },
    timeRow: { height: 40, borderRadius: radii.md, justifyContent: "center", paddingHorizontal: spacing.md, backgroundColor: colors.glass, ...glassBorder(colors), marginBottom: spacing.xs },
    timeRowActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    timeText: { color: colors.textPrimary, fontWeight: "600" },
    timeTextActive: { color: "#fff", fontWeight: "700" },
    closeBtn: { marginTop: spacing.xs, height: 40, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.glass, ...glassBorder(colors) },
    closeText: { color: colors.textPrimary, fontWeight: "700" },
    statusCard: { backgroundColor: colors.glass, borderRadius: radii.xl, ...glassBorder(colors), padding: spacing.lg, gap: spacing.md, ...shadows.soft },
    statusRow: { ...rowCenter, justifyContent: "space-between" },
    statusLabel: { color: colors.textSubtle, fontSize: 12, fontWeight: "600" },
    statusPill: { ...rowCenter, gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, ...glassBorder(colors) },
    statusPendingText: { color: "#facc15", fontSize: 11, fontWeight: "700" },
    statusDoneText: { color: "#10b981", fontSize: 11, fontWeight: "700" },
    statusActions: { flexDirection: "row", gap: spacing.sm },
    statusActionBtn: { flex: 1, paddingVertical: 8, borderRadius: radii.md, alignItems: "center", backgroundColor: colors.surfaceAlt, ...glassBorder(colors) },
    statusActionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    statusActionText: { color: colors.textPrimary, fontSize: 12, fontWeight: "700" },
    statusActionTextActive: { color: "#fff" },
    metaRow: { flexDirection: "row", gap: spacing.sm },
    metaItem: { flex: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceAlt, ...glassBorder(colors) },
    metaLabel: { color: colors.textSubtle, fontSize: 10, textTransform: "uppercase" },
    metaValue: { color: colors.textPrimary, fontWeight: "700", fontSize: 12 },
    imageCard: { marginTop: spacing.lg, borderRadius: radii.xl, overflow: "hidden", backgroundColor: colors.glass, ...glassBorder(colors) },
    image: { width: "100%", height: 320 },
    imagePlaceholder: { width: "100%", height: 320, alignItems: "center", justifyContent: "center" },
    imageTag: { position: "absolute", top: 14, left: 14, ...rowCenter, gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: "rgba(0,0,0,0.5)" },
    imageTagText: { color: "#fff", fontSize: 11, fontWeight: "600" },
    deletePhotoBtn: { position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(239,68,68,0.8)", alignItems: "center", justifyContent: "center" },
    reminderInfoCard: { marginTop: spacing.lg, flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.glass, ...glassBorder(colors) },
    reminderInfoText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "600" },
    utilityRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
    imageActionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
    utilityBtn: { ...btnBase(colors), backgroundColor: colors.glass },
    utilityBtnDanger: { ...btnBase(colors), backgroundColor: "rgba(239,68,68,0.2)", borderColor: "rgba(239,68,68,0.4)" },
    utilityText: { color: colors.textPrimary, fontWeight: "700", fontSize: 12 },
    utilityTextDanger: { color: "#fff", fontWeight: "700", fontSize: 12 },
    bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, flexDirection: "row", gap: spacing.sm, backgroundColor: colors.surfaceAlt, borderTopWidth: 1, borderTopColor: colors.borderGlass },
    primaryBtn: { flex: 1.3, ...rowCenter, justifyContent: "center", gap: spacing.xs, paddingVertical: 14, borderRadius: radii.lg, backgroundColor: colors.primary, ...shadows.soft },
    primaryText: { color: "#fff", fontWeight: "700" },
    secondaryBtn: { ...btnBase(colors), paddingVertical: 14, backgroundColor: colors.glass },
    secondaryText: { color: colors.textPrimary, fontWeight: "700" },
    loading: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
    loadingText: { color: colors.textMuted },
  });
