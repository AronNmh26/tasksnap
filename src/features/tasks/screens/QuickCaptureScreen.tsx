import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../appRoot/navigation/RootNavigator";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { ThemeColors, radii, spacing } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, typeof RouteNames.QuickCapture>;

export default function QuickCaptureScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [text, setText] = useState("");
  const selectedDateIso = route.params?.selectedDateIso;

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
        <Text style={styles.subtitle}>Type anything and let AI clean it up.</Text>
      </View>

      <View style={styles.inputWrap}>
        <MaterialIcons name="edit" size={20} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g., dish, homework, gym"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
        />
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => {
          const rawText = text.trim();
          if (!rawText) return;
          navigation.navigate(RouteNames.AiReview, { rawText, selectedDateIso });
        }}
      >
        <MaterialIcons name="auto-awesome" size={18} color="#fff" />
        <Text style={styles.primaryText}>AI Suggest Label</Text>
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
