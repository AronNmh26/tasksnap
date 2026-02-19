import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ThemeColors, radii, spacing } from "../../core/theme/theme";
import { useTheme } from "../../core/theme/ThemeProvider";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Camera")}
      >
        <Text style={styles.cardTitle}>➕ Quick Capture</Text>
        <Text style={styles.cardSub}>Snap → AI labels → Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
    title: { color: colors.textPrimary, fontSize: 32, fontWeight: "800", marginBottom: spacing.lg },
    card: {
      backgroundColor: colors.glass,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    cardTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
    cardSub: { color: colors.textMuted, marginTop: 6 },
  });
