import React, { useMemo, useState } from "react";
import { Alert, BackHandler, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemeColors, radii, shadows, spacing } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { RouteNames } from "../../../appRoot/navigation/routes";

type Props = {
  onAccepted: () => Promise<void>;
};

export default function PrivacyConsentScreen({ onAccepted }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    if (!accepted || saving) return;
    setSaving(true);
    try {
      await onAccepted();
    } catch (e: any) {
      Alert.alert("Unable to continue", e?.message ?? "Failed to save consent. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Consent Required",
      "You need to accept the Privacy Policy to use TaskSnap.",
      [
        { text: "Review Again", style: "cancel" },
        {
          text: "Exit App",
          style: "destructive",
          onPress: () => BackHandler.exitApp(),
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Privacy Consent</Text>
        <Text style={styles.subtitle}>Please review and accept before entering the app.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>TaskSnap Privacy Policy</Text>
          <Text style={styles.cardBody}>
            We collect only data required to operate TaskSnap (account details, tasks, optional task photos,
            and reminder metadata). Your data is used to provide core task features and secure your account.
          </Text>
          <Text style={styles.cardBody}>
            You can view full policy details and your rights anytime.
          </Text>

          <View style={styles.linkRow}>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => navigation.navigate(RouteNames.PrivacyPolicy)}
            >
              <MaterialIcons name="description" size={18} color={colors.textPrimary} />
              <Text style={styles.linkText}>Read Full Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => Linking.openURL("https://tasksnap-bdaa2.web.app/privacy-policy").catch(() => {})}
            >
              <MaterialIcons name="open-in-new" size={18} color={colors.textPrimary} />
              <Text style={styles.linkText}>Open Web Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAccepted((prev) => !prev)}
          testID="privacy_gate_checkbox"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <MaterialIcons name="check" size={14} color="#fff" />}
          </View>
          <Text style={styles.checkboxText}>I have read and agree to the Privacy Policy.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptBtn, (!accepted || saving) && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={!accepted || saving}
          testID="privacy_gate_accept"
        >
          <Text style={styles.acceptBtnText}>{saving ? "Saving..." : "Accept & Continue"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} testID="privacy_gate_decline">
          <Text style={styles.declineBtnText}>Decline</Text>
        </TouchableOpacity>

        <Text style={styles.note}>Last updated: 2026-04-15</Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    glowTop: {
      position: "absolute",
      top: -180,
      right: -100,
      width: 360,
      height: 360,
      borderRadius: 180,
      backgroundColor: "rgba(59,130,246,0.16)",
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      gap: spacing.md,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
    },
    card: {
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      borderRadius: radii.xl,
      padding: spacing.lg,
      ...shadows.soft,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    cardBody: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    linkRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
      flexWrap: "wrap",
    },
    linkBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
    },
    linkText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: "600",
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.textSubtle,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxText: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "500",
    },
    acceptBtn: {
      backgroundColor: colors.primary,
      borderRadius: radii.lg,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
    },
    acceptBtnDisabled: {
      opacity: 0.5,
    },
    acceptBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    declineBtn: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
    },
    declineBtnText: {
      color: "#f87171",
      fontSize: 14,
      fontWeight: "600",
    },
    note: {
      textAlign: "center",
      color: colors.textSubtle,
      fontSize: 12,
      marginTop: spacing.xs,
    },
  });
