export type ThemeMode = "light" | "dark";

export const darkColors = {
  primary: "#1152d4",
  primaryLight: "#3a7bd5",
  background: "#101622",
  surface: "#1c1f27",
  surfaceAlt: "#1b2230",
  textPrimary: "#ffffff",
  textMuted: "rgba(255,255,255,0.7)",
  textSubtle: "rgba(255,255,255,0.5)",
  borderGlass: "rgba(255,255,255,0.08)",
  glass: "rgba(28,31,39,0.7)",
};

export const lightColors = {
  primary: "#1152d4",
  primaryLight: "#3a7bd5",
  background: "#eef2f6",
  surface: "#ffffff",
  surfaceAlt: "#e8edf5",
  textPrimary: "#0b1220",
  textMuted: "rgba(11,18,32,0.78)",
  textSubtle: "rgba(11,18,32,0.6)",
  borderGlass: "rgba(11,18,32,0.16)",
  glass: "rgba(255,255,255,0.9)",
};

export type ThemeColors = typeof darkColors;

export const getThemeColors = (mode: ThemeMode): ThemeColors =>
  mode === "light" ? lightColors : darkColors;

// Backward-compatible default colors (dark).
export const colors = darkColors;

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const shadows = {
  soft: {
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};
