import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemeColors, radii, spacing, shadows } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>TaskSnap Privacy Policy (Thai PDPA)</Text>
          <Text style={styles.updated}>Last updated: 2026-04-04</Text>

          <Text style={styles.sectionTitle}>1. Data We Collect</Text>
          <Text style={styles.body}>
            We collect only what is needed to operate the app:
          </Text>
          <Text style={styles.body}>• Account info: email and display name.</Text>
          <Text style={styles.body}>• Task data: titles, categories, due dates, reminders, status.</Text>
          <Text style={styles.body}>• Optional media: images you attach to tasks.</Text>
          <Text style={styles.body}>• Authentication identifiers (Firebase UID) for access control.</Text>

          <Text style={styles.sectionTitle}>2. Purpose of Collection</Text>
          <Text style={styles.body}>
            We use your data only to provide the core task management features, keep your data
            synced, and secure access to your account.
          </Text>

          <Text style={styles.sectionTitle}>3. Consent</Text>
          <Text style={styles.body}>
            We ask for clear consent before creating an account. You can withdraw consent by
            deleting your account at any time.
          </Text>

          <Text style={styles.sectionTitle}>4. Third-Party Services</Text>
          <Text style={styles.body}>
            We use Firebase Authentication and Firestore for secure login and data storage. If you
            sign in with Google or Facebook, those providers may process your login data.
          </Text>

          <Text style={styles.sectionTitle}>5. Your Rights (PDPA)</Text>
          <Text style={styles.body}>You can:</Text>
          <Text style={styles.body}>• Access and edit your task data.</Text>
          <Text style={styles.body}>• Delete tasks at any time.</Text>
          <Text style={styles.body}>• Delete your account and all associated data.</Text>
          <Text style={styles.body}>• Withdraw consent at any time.</Text>

          <Text style={styles.sectionTitle}>6. Data Retention & Deletion</Text>
          <Text style={styles.body}>
            If you delete your account, we delete your tasks and account data from our systems.
            Local device photos should also be deleted using the in-app controls.
          </Text>

          <Text style={styles.sectionTitle}>7. Contact (Data Controller)</Text>
          <Text style={styles.body}>
            For PDPA requests or privacy questions, contact:
          </Text>
          <Text style={styles.body}>6731503078@lamduan.mfu.ac.th</Text>
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
      backgroundColor: "rgba(99,102,241,0.18)",
    },
    glowBottom: {
      position: "absolute",
      bottom: -200,
      left: -120,
      width: 360,
      height: 360,
      borderRadius: 180,
      backgroundColor: "rgba(14,165,233,0.16)",
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
    },
    card: {
      backgroundColor: colors.glass,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      padding: spacing.lg,
      ...shadows.soft,
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    updated: {
      fontSize: 12,
      color: colors.textSubtle,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    body: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
      marginBottom: 4,
    },
  });
