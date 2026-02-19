import React, { useMemo } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { ThemeColors, radii, spacing, shadows } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";
import { useAuthStore } from "../../auth/store/useAuthStore";

type Props = any;

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    await logout();
    navigation.replace(RouteNames.Login);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar & User Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarGlow} />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? "U"}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name ?? "User"}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ""}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <MaterialIcons name="verified-user" size={16} color="#10b981" />
              <Text style={styles.badgeText}>{user?.provider === "email" ? "Email" : "OAuth"}</Text>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="palette" size={20} color="#60a5fa" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Dark Mode</Text>
              <Text style={styles.menuDetail}>Current: Off</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSubtle} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="notifications" size={20} color="#fbbf24" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Notifications</Text>
              <Text style={styles.menuDetail}>Enabled</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSubtle} />
          </TouchableOpacity>
        </View>

        {/* App Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="storage" size={20} color="#8b5cf6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Storage</Text>
              <Text style={styles.menuDetail}>42 MB used of 500 MB</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSubtle} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="help-outline" size={20} color="#ec4899" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>FAQ & Help</Text>
              <Text style={styles.menuDetail}>Get support</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSubtle} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="lock-outline" size={20} color="#6366f1" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Privacy Policy</Text>
              <Text style={styles.menuDetail}>Read terms</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSubtle} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="info-outline" size={20} color="#f97316" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Version</Text>
              <Text style={styles.menuDetail}>1.0.0</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#f87171" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.footer} />
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  glowTop: {
    position: "absolute",
    top: -200,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(59,130,246,0.15)",
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  profileCard: {
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: spacing.md,
  },
  avatarGlow: {
    position: "absolute",
    top: -8,
    left: -8,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(59,130,246,0.25)",
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderGlass,
  },
  avatarText: {
    fontSize: 44,
    fontWeight: "700",
    color: "#fff",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    marginBottom: spacing.sm,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuDetail: {
    fontSize: 13,
    color: colors.textMuted,
  },
  logoutBtn: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: "rgba(248,113,113,0.15)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f87171",
  },
  footer: {
    height: spacing.xl,
  },
});
