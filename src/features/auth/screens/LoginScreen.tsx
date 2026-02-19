import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../appRoot/navigation/RootNavigator";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { ThemeColors, radii, spacing, shadows } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { useAuthStore } from "../store/useAuthStore";
import AppLogo from "../../../core/ui/AppLogo";

type Props = NativeStackScreenProps<RootStackParamList, typeof RouteNames.Login>;

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID =
  "911003774738-2u84b0mrdifshcj2h56vubqetntv26ig.apps.googleusercontent.com";

// Facebook App ID — replace with your own from developers.facebook.com
const FACEBOOK_APP_ID = "YOUR_FACEBOOK_APP_ID";

export default function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const { login, signup, loginWithGoogle, loginWithFacebook, isLoading, error, clearError } = useAuthStore();

  const [request, , promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID,
    scopes: ["profile", "email"],
    responseType: "id_token",
  });

  const [fbRequest, , fbPromptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
    scopes: ["public_profile", "email"],
    responseType: "token",
  });

  const handleSubmit = async () => {
    try {
      clearError();
      if (isSignup) {
        await signup(email, password, name);
      } else {
        await login(email, password);
      }
      navigation.replace(RouteNames.MainTabs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      Alert.alert("Error", msg);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      clearError();
      const result = await promptAsync();
      if (result.type !== "success") {
        throw new Error("Google login cancelled");
      }

      const idToken = (result.params as { id_token?: string }).id_token;
      if (!idToken) {
        throw new Error("Google id_token missing");
      }

      await loginWithGoogle(idToken);
      navigation.replace(RouteNames.MainTabs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google login failed";
      Alert.alert("Error", msg);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      clearError();
      const result = await fbPromptAsync();
      if (result.type !== "success") {
        throw new Error("Facebook login cancelled");
      }

      const accessToken = (result.params as { access_token?: string }).access_token;
      if (!accessToken) {
        throw new Error("Facebook access_token missing");
      }

      await loginWithFacebook(accessToken);
      navigation.replace(RouteNames.MainTabs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Facebook login failed";
      Alert.alert("Error", msg);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.glowRight} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <View style={styles.logoGlow} />
            <AppLogo size={96} />
          </View>
          <Text style={styles.brand}>TaskSnap</Text>
          <Text style={styles.tagline}>Simplicity meets productivity.</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={18} color="#ff4757" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          {isSignup && (
            <View style={styles.inputWrap}>
              <MaterialIcons name="person" size={20} color={colors.textMuted} />
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={colors.textSubtle}
                style={styles.input}
                value={name}
                onChangeText={setName}
                editable={!isLoading}
              />
            </View>
          )}

          <View style={styles.inputWrap}>
            <MaterialIcons name="mail" size={20} color={colors.textMuted} />
            <TextInput
              placeholder="Email address"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputWrap}>
            <MaterialIcons name="lock" size={20} color={colors.textMuted} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />
          </View>

          {!isSignup && (
            <TouchableOpacity style={styles.forgot} disabled={isLoading}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.primaryText}>{isSignup ? "Sign Up" : "Log In"}</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {!isSignup && (
            <>
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleGoogleLogin}
                disabled={isLoading || !request}
              >
                <FontAwesome name="google" size={18} color={colors.textPrimary} />
                <Text style={styles.socialText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialBtn} onPress={handleFacebookLogin} disabled={isLoading || !fbRequest}>
                <FontAwesome name="facebook" size={18} color="#1877F2" />
                <Text style={styles.socialText}>Continue with Facebook</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isSignup ? "Already have an account? " : "Don't have an account? "}
          </Text>
          <TouchableOpacity onPress={() => setIsSignup(!isSignup)} disabled={isLoading}>
            <Text style={styles.footerLink}>{isSignup ? "Log in" : "Sign up free"}</Text>
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: "center",
  },
  glowTop: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(124,58,237,0.28)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -140,
    right: -140,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(37,99,235,0.28)",
  },
  glowRight: {
    position: "absolute",
    top: 180,
    right: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(34,211,238,0.12)",
  },
  header: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  logoWrap: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoGlow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(59,130,246,0.35)",
  },
  logoCard: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 4,
  },
  form: {
    width: "100%",
    gap: spacing.sm,
  },
  errorBanner: {
    width: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: "rgba(255, 71, 87, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.3)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: "#ff4757",
    fontSize: 13,
    fontWeight: "500",
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
  forgot: {
    alignItems: "flex-end",
    paddingHorizontal: spacing.sm,
  },
  forgotText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: "600",
  },
  primaryBtn: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.4)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    ...shadows.soft,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderGlass,
  },
  orText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "600",
  },
  socialBtn: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  socialText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  footer: {
    marginTop: spacing.lg,
    flexDirection: "row",
    gap: 6,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  footerLink: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
});
