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
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { getLastAiDebugMessage, hasHuggingFaceToken, suggestLabel, suggestLabelFromImage, AiSuggestion } from "../../../services/ai";
import { ThemeColors, radii, spacing, shadows } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { useTasksStore } from "../store/useTasksStore";
import { nowIso } from "../../../core/utils/date";
import { Task } from "../../../core/types/task";

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function AiReviewScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { save } = useTasksStore();

  const { imageUri, rawText, selectedDateIso } = route.params ?? {};
  const [title, setTitle] = useState(rawText ?? "");
  const [category, setCategory] = useState("");
  const [dueInput, setDueInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

  useEffect(() => {
    if (rawText) {
      suggestLabel(rawText)
        .then((s) => {
          setTitle(s.title);
          setCategory(s.category ?? "");
        })
        .catch(console.error);
      return;
    }

    // AI analysis is now manual via button click
    if (imageUri) {
      // Set default placeholder text for photo tasks
      setTitle("Captured Task");
      setCategory("General");
    }
  }, [rawText, imageUri]);

  const generateAISuggestions = async () => {
    if (!imageUri) return;

    if (Platform.OS !== "web" && !hasHuggingFaceToken()) {
      setAnalysisMessage(
        "Missing Hugging Face token. Create a .env file and set EXPO_PUBLIC_HUGGINGFACE_API_TOKEN, then restart Expo with -c."
      );
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisMessage(null);
    try {
      const suggestions = await suggestLabelFromImage(imageUri);
      if (suggestions.length > 0) {
        setTitle(suggestions[0].title);
        setCategory(suggestions[0].category ?? "");
      } else {
        const debug = getLastAiDebugMessage();
        setAnalysisMessage(
          debug ||
            "No suggestions detected. Try a clearer photo (better lighting) or a photo with clearer content/text."
        );
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      setAnalysisMessage("OCR request failed. Check your internet connection and Hugging Face token.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSave = async () => {
    const parsed = Date.parse(dueInput);
    let dueAt = Number.isNaN(parsed) || !dueInput ? null : new Date(parsed).toISOString();
    if (!dueAt && selectedDateIso) {
      const selectedDate = new Date(selectedDateIso);
      selectedDate.setHours(12, 0, 0, 0);
      dueAt = selectedDate.toISOString();
    }
    const now = nowIso();

    const task: Task = {
      id: uuid(),
      title: title.trim() || "New Task",
      category: category.trim() || null,
      dueAt,
      reminderMinutes: null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      notificationId: null,
      imageUri: imageUri ?? null,
    };

    await save(task);
    navigation.navigate(RouteNames.Dashboard);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.glowTop} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Suggestion</Text>
          <View style={styles.iconButton} />
        </View>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialIcons name="photo" size={40} color={colors.textSubtle} />
          </View>
        )}

        <View style={styles.aiCard}>
          <View style={styles.aiRow}>
            <MaterialIcons name="auto-awesome" size={18} color="#60a5fa" />
            <Text style={styles.aiLabel}>
              {imageUri ? "Photo Task" : "Quick Task"}
            </Text>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Task title"
            placeholderTextColor={colors.textSubtle}
            style={styles.titleInput}
          />

          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Category (Academic / Personal / Reading / Gym)"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
          />

          <TextInput
            value={dueInput}
            onChangeText={setDueInput}
            placeholder="Optional due time (e.g., Tomorrow 5pm)"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
          />

          {imageUri && (
            <TouchableOpacity 
              style={[styles.aiButton, isAnalyzing && styles.aiButtonDisabled]} 
              onPress={generateAISuggestions}
              disabled={isAnalyzing}
            >
              <MaterialIcons 
                name={isAnalyzing ? "hourglass-empty" : "auto-awesome"} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.aiButtonText}>
                {isAnalyzing ? "Analyzing..." : "Generate AI Suggestions"}
              </Text>
            </TouchableOpacity>
          )}

          {analysisMessage ? <Text style={styles.aiMessage}>{analysisMessage}</Text> : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="edit" size={18} color={colors.textPrimary} />
            <Text style={styles.secondaryText}>Edit Input</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={onSave}>
            <MaterialIcons name="check" size={18} color="#fff" />
            <Text style={styles.primaryText}>Save Task</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
  glowTop: {
    position: "absolute",
    top: -160,
    left: -120,
    width: 420,
    height: 420,
    borderRadius: 220,
    backgroundColor: "rgba(17,82,212,0.2)",
  },
  content: { padding: spacing.lg, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerTitle: { color: colors.textMuted, fontWeight: "700", letterSpacing: 1, fontSize: 12 },
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
  image: {
    height: 320,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
  },
  imagePlaceholder: {
    height: 320,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  aiMessage: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  aiCard: {
    backgroundColor: colors.glass,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
  },
  aiRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  aiLabel: { color: colors.primaryLight, fontWeight: "700" },
  titleInput: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    paddingVertical: 6,
  },
  input: {
    backgroundColor: colors.glass,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primaryBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
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
  secondaryText: { color: colors.textPrimary, fontWeight: "700" },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  aiButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.6,
  },
  aiButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
