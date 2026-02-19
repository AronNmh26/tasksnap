import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { ThemeColors, radii, spacing } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { upsertTask } from "../../../services/db";
import { Task } from "../../../core/types/task";
import { getLastAiDebugMessage, hasHuggingFaceToken, suggestLabelFromImage, AiSuggestion } from "../../../services/ai";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { useSettingsStore } from "../../settings/store/useSettingsStore";
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from "@expo/vector-icons";

export default function AIReviewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { imageUri, imageBase64, selectedDateIso } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  console.log('🎯 AIReviewScreen - Received params:');
  console.log('   - imageUri:', imageUri);
  console.log('   - imageBase64 length:', imageBase64?.length || 'null');
  console.log('   - selectedDateIso:', selectedDateIso);

  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [allSuggestions, setAllSuggestions] = useState<AiSuggestion[]>([]);

  const categories = ["Personal", "Academic", "Health", "Finance", "Work", "General"];
  const { aiAutoSuggest, defaultCategory } = useSettingsStore();

  // Auto-trigger AI analysis when image is available and setting is enabled
  useEffect(() => {
    if (imageUri && aiAutoSuggest) {
      generateAISuggestions();
    }
    // Set default category from settings
    if (!selectedCategory && defaultCategory) {
      setSelectedCategory(defaultCategory);
    }
  }, []);

  const generateAISuggestions = async () => {
    if (!imageUri) return;

    if (Platform.OS !== "web" && !hasHuggingFaceToken()) {
      setAnalysisMessage(
        "Missing Hugging Face token. Create a .env file and set EXPO_PUBLIC_HUGGINGFACE_API_TOKEN, then restart Expo with -c."
      );
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisStep("Analyzing image...");
    setAnalysisMessage(null);
    
    try {
      const suggestions = await suggestLabelFromImage(imageUri, imageBase64);
      if (suggestions.length > 0) {
        setAllSuggestions(suggestions);
        setTitle(suggestions[0].title);
        setSelectedCategory(suggestions[0].category ?? "");
        setAnalysisMessage(null);
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
      setAnalysisStep("");
    }
  };



  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Review</Text>
          <View style={{ width: 40 }} />
        </View>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}

        {/* AI Analysis Section */}
        {isAnalyzing && (
          <View style={styles.analyzingCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.analyzingText}>{analysisStep || "Analyzing image..."}</Text>
          </View>
        )}

        {/* Suggestion chips */}
        {allSuggestions.length > 1 && !isAnalyzing && (
          <View style={styles.suggestionsSection}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="lightbulb" size={18} color="#fbbf24" />
              <Text style={styles.sectionTitle}>AI Suggestions</Text>
            </View>
            <View style={styles.suggestionChips}>
              {allSuggestions.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestionChip, title === s.title && styles.suggestionChipActive]}
                  onPress={() => {
                    setTitle(s.title);
                    if (s.category) setSelectedCategory(s.category);
                  }}
                >
                  <MaterialIcons name="auto-awesome" size={14} color={title === s.title ? "#fff" : colors.primary} />
                  <Text style={[styles.suggestionChipText, title === s.title && { color: "#fff" }]}>{s.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
              {isAnalyzing ? (analysisStep || "Analyzing...") : "Generate AI Suggestions"}
            </Text>
          </TouchableOpacity>
        )}

        {imageUri && (
          <Text style={styles.aiNote}>
            💡 OCR uses Hugging Face models. Add `EXPO_PUBLIC_HUGGINGFACE_API_TOKEN` in `.env`.
          </Text>
        )}

        {analysisMessage ? <Text style={styles.aiError}>{analysisMessage}</Text> : null}

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

        {showDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDueDate(selectedDate);
            }}
          />
        )}

        <TouchableOpacity
          style={styles.save}
          onPress={async () => {
            if (!title.trim()) return;
            setSaving(true);
            try {
              console.log('💾 Starting task save process...');

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
                imageBase64: imageBase64 ?? null,
              };

              console.log('📝 Task object created:', {
                id: task.id,
                title: task.title,
                hasImageUri: !!task.imageUri,
                hasImageBase64: !!task.imageBase64,
                imageBase64Length: task.imageBase64?.length
              });

              console.log('☁️ Calling upsertTask...');
              await upsertTask(task);
              console.log('✅ Task saved successfully!');

              console.log('🏠 Navigating to MainTabs...');
              navigation.navigate(RouteNames.MainTabs);
              console.log('✅ Navigation completed');

            } catch (err) {
              console.error("❌ Failed to save task:", err);
              // Don't navigate if save failed
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
    analyzingCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.primary + "40",
      marginBottom: spacing.md,
    },
    analyzingText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    suggestionsSection: {
      marginBottom: spacing.md,
    },
    suggestionChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    suggestionChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    suggestionChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    suggestionChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textPrimary,
    },
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
    ai: { color: colors.primaryLight, fontWeight: "600", marginBottom: 6 },
    categoryList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
    categoryBtn: { backgroundColor: colors.glass, borderRadius: radii.md, padding: 12, borderWidth: 1, borderColor: colors.borderGlass, flexDirection: "row", alignItems: "center", gap: 6 },
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
    aiError: {
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      color: colors.textMuted,
    },
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
    aiNote: {
      fontSize: 12,
      color: colors.textSubtle,
      textAlign: "center",
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      fontStyle: "italic",
    },
  });
