import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { ThemeColors, radii, shadows, spacing } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";

const DateTimePicker: any =
  Platform.OS === "web" ? null : require("@react-native-community/datetimepicker").default;

type QuickAddPayload = {
  title: string;
  dueAt: string | null;
  imageUri: string | null;
};

type Props = {
  visible: boolean;
  initialDate?: Date;
  onClose: () => void;
  onCreate: (payload: QuickAddPayload) => Promise<void>;
};

type PickerMode = "date" | "time" | null;

function mergeDateAndTime(datePart: Date, timePart: Date): Date {
  const merged = new Date(datePart);
  merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return merged;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function QuickAddTaskModal({ visible, initialDate, onClose, onCreate }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [optionalImageUri, setOptionalImageUri] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [datePart, setDatePart] = useState<Date>(initialDate ?? new Date());
  const [timePart, setTimePart] = useState<Date>(new Date());
  const [showWebDatePicker, setShowWebDatePicker] = useState(false);
  const [showWebTimePicker, setShowWebTimePicker] = useState(false);
  const [showImageSourcePicker, setShowImageSourcePicker] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date(datePart.getFullYear(), datePart.getMonth(), 1));

  const reset = () => {
    setTitle("");
    setPickerMode(null);
    setIsSaving(false);
    const baseDate = initialDate ?? new Date();
    setDatePart(baseDate);
    setTimePart(new Date());
    setShowWebDatePicker(false);
    setShowWebTimePicker(false);
    setShowImageSourcePicker(false);
    setViewMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setOptionalImageUri(null);
  };

  const handleClose = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const buildDueAt = (): Date | null => {
    return mergeDateAndTime(datePart, timePart);
  };

  const copyToPermanentStorage = async (sourceUri: string, prefix: string): Promise<string> => {
    const ext = sourceUri.split(".").pop()?.split("?")[0] || "jpg";
    const fileName = `${prefix}_${Date.now()}.${ext}`;
    const permanentUri = `${(FileSystem as any).documentDirectory}${fileName}`;
    await FileSystem.copyAsync({ from: sourceUri, to: permanentUri });
    return permanentUri;
  };

  const selectImage = async (source: "camera" | "gallery") => {
    setShowImageSourcePicker(false);
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera permission needed", "Please allow camera access to capture an image.");
        return;
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Gallery permission needed", "Please allow photo library access to choose an image.");
        return;
      }
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
            allowsEditing: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
            allowsEditing: false,
          });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    try {
      const savedUri = await copyToPermanentStorage(result.assets[0].uri, `quick_add_${source}`);
      setOptionalImageUri(savedUri);
    } catch {
      setOptionalImageUri(result.assets[0].uri);
    }
  };

  const openImageOptions = () => {
    setShowImageSourcePicker(true);
  };

  const submit = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert("Missing task name", "Please enter a task name.");
      return;
    }

    const dueDate = buildDueAt();
    setIsSaving(true);
    try {
      await onCreate({
        title: cleanTitle,
        dueAt: dueDate ? dueDate.toISOString() : null,
        imageUri: optionalImageUri ?? null,
      });
      reset();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const duePreview = mergeDateAndTime(datePart, timePart).toLocaleString();
  const firstWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const dayCells = Array.from({ length: 42 }, (_, idx) => {
    const d = idx - firstWeekday + 1;
    if (d < 1 || d > daysInMonth) return null;
    return new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
  });
  const timeOptions = Array.from({ length: 48 }, (_, idx) => {
    const h = Math.floor(idx / 2);
    const m = idx % 2 === 0 ? 0 : 30;
    const d = new Date(timePart);
    d.setHours(h, m, 0, 0);
    return d;
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Quick Add Task</Text>

          <View style={styles.inputWrap}>
            <MaterialIcons name="edit" size={18} color={colors.textMuted} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Task name"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              autoFocus
            />
          </View>

          {DateTimePicker ? (
            <>
              <TouchableOpacity style={styles.selector} onPress={() => setPickerMode("date")}>
                <MaterialIcons name="event" size={18} color={colors.primary} />
                <Text style={styles.selectorText}>{datePart.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.selector} onPress={() => setPickerMode("time")}>
                <MaterialIcons name="schedule" size={18} color={colors.primary} />
                <Text style={styles.selectorText}>
                  {timePart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.selector} onPress={() => setShowWebDatePicker(true)}>
                <MaterialIcons name="event" size={18} color={colors.primary} />
                <Text style={styles.selectorText}>{datePart.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.selector} onPress={() => setShowWebTimePicker(true)}>
                <MaterialIcons name="schedule" size={18} color={colors.primary} />
                <Text style={styles.selectorText}>{formatTime(timePart)}</Text>
              </TouchableOpacity>
            </>
          )}

          {pickerMode && DateTimePicker ? (
            <DateTimePicker
              value={pickerMode === "date" ? datePart : timePart}
              mode={pickerMode}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event: { type?: string }, selected?: Date) => {
                if (Platform.OS !== "ios") setPickerMode(null);
                if (event?.type === "dismissed") return;
                if (!selected) return;
                if (pickerMode === "date") setDatePart(selected);
                else setTimePart(selected);
              }}
            />
          ) : null}

          <Text style={styles.hint}>Due: {duePreview}</Text>

          <TouchableOpacity style={styles.selector} onPress={openImageOptions}>
            <MaterialIcons name="image" size={18} color={colors.primary} />
            <Text style={styles.selectorText}>
              {optionalImageUri ? "Change selected image" : "Add image (optional)"}
            </Text>
          </TouchableOpacity>

          {optionalImageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: optionalImageUri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setOptionalImageUri(null)}>
                <MaterialIcons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.optionalImage}>Image is optional. You can upload/add it later.</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleClose} disabled={isSaving}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={isSaving}>
              <Text style={styles.primaryText}>{isSaving ? "Saving..." : "Create Task"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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

      <Modal
        visible={showImageSourcePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageSourcePicker(false)}
      >
        <View style={styles.innerBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowImageSourcePicker(false)} />
          <View style={styles.innerCard}>
            <Text style={styles.innerTitle}>Add Image</Text>
            <TouchableOpacity style={styles.sourceOption} onPress={() => void selectImage("camera")}>
              <MaterialIcons name="photo-camera" size={18} color={colors.primary} />
              <Text style={styles.sourceOptionText}>Capture from Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sourceOption} onPress={() => void selectImage("gallery")}>
              <MaterialIcons name="photo-library" size={18} color={colors.primary} />
              <Text style={styles.sourceOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowImageSourcePicker(false)}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    card: {
      borderRadius: radii.lg,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      padding: spacing.md,
      gap: spacing.sm,
      ...shadows.soft,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    inputWrap: {
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
    input: {
      flex: 1,
      color: colors.textPrimary,
    },
    selector: {
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
    selectorText: {
      color: colors.textPrimary,
      fontWeight: "600",
    },
    hint: {
      color: colors.textMuted,
      fontSize: 12,
    },
    optionalImage: {
      color: colors.textSubtle,
      fontSize: 12,
      fontStyle: "italic",
    },
    previewWrap: {
      marginTop: spacing.xs,
      borderRadius: radii.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.borderGlass,
      backgroundColor: colors.glass,
    },
    previewImage: {
      width: "100%",
      height: 160,
    },
    removeImageBtn: {
      position: "absolute",
      right: 10,
      top: 10,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
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
      ...shadows.soft,
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
    sourceOption: {
      height: 46,
      borderRadius: radii.md,
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    sourceOptionText: {
      color: colors.textPrimary,
      fontWeight: "600",
    },
    actions: {
      marginTop: spacing.sm,
      flexDirection: "row",
      gap: spacing.sm,
    },
    secondaryBtn: {
      flex: 1,
      height: 46,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    secondaryText: {
      color: colors.textPrimary,
      fontWeight: "600",
    },
    primaryBtn: {
      flex: 1,
      height: 46,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    primaryText: {
      color: "#fff",
      fontWeight: "700",
    },
  });
