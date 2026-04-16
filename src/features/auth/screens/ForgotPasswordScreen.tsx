import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../appRoot/navigation/RootNavigator";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { ThemeColors, radii, shadows, spacing } from "../../../core/theme/theme";
import { useAuthStore } from "../store/useAuthStore";

type Props = NativeStackScreenProps<RootStackParamList, typeof RouteNames.ForgotPassword>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState(route.params?.email ?? "");
  const { requestPasswordResetEmail, isLoading, clearError } = useAuthStore();

  const validateEmail = () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      Alert.alert("Email Required", "Please enter the email linked to your account.");
      return null;
    }
    if (!EMAIL_REGEX.test(normalized)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return null;
    }
    return normalized;
  };

  const handleSendResetEmail = async () => {
    const normalizedEmail = validateEmail();
    if (!normalizedEmail) {
      return;
    }

    try {
      clearError();
      const message = await requestPasswordResetEmail(normalizedEmail);
      Alert.alert("Reset Email Sent", message, [
        {
          text: "Back to Login",
          onPress: () => navigation.navigate(RouteNames.Login),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send password reset email.";
      Alert.alert("Could Not Send Email", message);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isLoading}>
          <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter your account email and we will send you a secure password reset link through Firebase Auth.
          </Text>

          <View style={styles.inputWrap}>
            <MaterialIcons name="mail" size={20} color={colors.textMuted} />
            <TextInput
              placeholder="Email address"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={handleSendResetEmail}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryText}>Send password reset email</Text>}
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>What happens next?</Text>
          <Text style={styles.helper}>
            Open the email from TaskSnap, tap the reset link, and follow the Firebase page to choose a new password.
          </Text>

          <Text style={styles.helper}>
            Tip: if the email takes a minute, check your spam folder and confirm that Email/Password sign-in is enabled in Firebase Authentication.
          </Text>
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
      top: -150,
      left: -120,
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: "rgba(124,58,237,0.22)",
    },
    glowBottom: {
      position: "absolute",
      bottom: -180,
      right: -140,
      width: 360,
      height: 360,
      borderRadius: 180,
      backgroundColor: "rgba(37,99,235,0.22)",
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
      gap: spacing.md,
      ...shadows.soft,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: "800",
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 22,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      height: 56,
      borderRadius: radii.pill,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    input: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 15,
    },
    primaryBtn: {
      height: 56,
      borderRadius: radii.pill,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: "rgba(96,165,250,0.4)",
      alignItems: "center",
      justifyContent: "center",
      ...shadows.soft,
    },
    primaryBtnDisabled: {
      opacity: 0.6,
    },
    primaryText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderGlass,
      marginVertical: 4,
    },
    helper: {
      color: colors.textSubtle,
      fontSize: 12,
      lineHeight: 18,
    },
  });
