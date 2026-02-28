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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../appRoot/navigation/RootNavigator";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { useTasksStore } from "../store/useTasksStore";
import { getTaskById } from "../../../services/db";
import { nowIso, toLocalReadable } from "../../../core/utils/date";
import { Task } from "../../../core/types/task";
import { cancelReminder, scheduleTaskReminder } from "../../../services/notifications";
import { ThemeColors, radii, spacing, shadows } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { deleteAsync } from 'expo-file-system/legacy';
const DateTimePicker: any =
  Platform.OS === "web" ? null : require("@react-native-community/datetimepicker").default;

type Props = NativeStackScreenProps<RootStackParamList, typeof RouteNames.TaskDetails>;

export default function TaskDetailsScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { taskId } = route.params;
  const { save, remove } = useTasksStore();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [status, setStatus] = useState<Task["status"]>("pending");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    getTaskById(taskId).then((t) => {
      setTask(t);
      if (t) {
        setTitle(t.title);
        setCategory(t.category ?? "");
        setDueDate(t.dueAt ? new Date(t.dueAt) : null);
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
    setStatus(currentTask.status);
    setImageUri(currentTask.imageUri ?? null);
    setImageUrl(currentTask.imageUrl ?? null);
  };

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
    await save(updated);
    setTask(updated);
    setIsEditing(false);
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

  const onAddDemoReminder = async () => {
    if (!task) return;

    // Demo: set due date 10 minutes from now, reminder 5 minutes before
    const due = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const reminderMinutes = 5;

    await cancelReminder(task.notificationId);

    const notificationId = await scheduleTaskReminder({
      title: task.title,
      dueAtIso: due,
      reminderMinutes,
    });

    const updated: Task = {
      ...task,
      dueAt: due,
      reminderMinutes,
      notificationId,
      updatedAt: nowIso(),
    };

    await save(updated);
    setTask(updated);
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
                await deleteAsync(imageUri, { idempotent: true });
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
    const permanentUri = `${(FileSystem as any).documentDirectory}${fileName}`;
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

        <View style={styles.utilityRow}>
          <TouchableOpacity style={styles.utilityBtn} onPress={onAddDemoReminder}>
            <MaterialIcons name="alarm" size={18} color={colors.textPrimary} />
            <Text style={styles.utilityText}>Add Demo Reminder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.utilityBtnDanger} onPress={onDelete}>
            <MaterialIcons name="delete" size={18} color="#fff" />
            <Text style={styles.utilityTextDanger}>Delete Task</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
