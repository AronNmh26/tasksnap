import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemeColors, radii, spacing, shadows } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";

const SUPPORT_EMAIL = "6731503078@lamduan.mfu.ac.th";

export default function HelpFaqScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  const openEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          <Text style={styles.question}>How do I delete a task?</Text>
          <Text style={styles.answer}>
            Open the task, tap the menu, and choose delete. This removes the task from your account.
          </Text>

          <Text style={styles.question}>How do I delete my account?</Text>
          <Text style={styles.answer}>
            Go to Settings → Delete Account & Data. This permanently removes your account and tasks.
          </Text>

          <Text style={styles.question}>Why aren’t notifications working?</Text>
          <Text style={styles.answer}>
            Make sure notifications are enabled in Settings and in your phone’s system settings.
          </Text>

          <Text style={styles.question}>Where are my photos stored?</Text>
          <Text style={styles.answer}>
            Photos attached to tasks are stored locally on your device. You can remove them from
            Settings → Delete All Photos.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <Text style={styles.answer}>
            For help or privacy requests, contact us at:
          </Text>
          <TouchableOpacity style={styles.emailRow} onPress={openEmail}>
            <MaterialIcons name="email" size={18} color={colors.primary} />
            <Text style={styles.emailText}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    glowTop: {
      position: "absolute",
      top: -180,
      right: -120,
      width: 360,
      height: 360,
      borderRadius: 180,
      backgroundColor: "rgba(236,72,153,0.14)",
    },
    glowBottom: {
      position: "absolute",
      bottom: -200,
      left: -120,
      width: 360,
      height: 360,
      borderRadius: 180,
      backgroundColor: "rgba(59,130,246,0.14)",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      marginRight: spacing.sm,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.glass,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      padding: spacing.lg,
      ...shadows.soft,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    question: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    answer: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
      marginTop: 4,
    },
    emailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    emailText: {
      color: colors.primary,
      fontWeight: "700",
      fontSize: 14,
    },
  });
