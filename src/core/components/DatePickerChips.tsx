import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeColors, radii, spacing, shadows } from "../theme/theme";
import { useTheme } from "../theme/ThemeProvider";

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DatePickerChips({ selectedDate, onDateChange }: DatePickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dateChips = Array.from({ length: 14 }).map((_, index) => {
    const d = new Date();
    d.setDate(new Date().getDate() + index - 3); // Show past 3 days + future days
    return {
      key: d.toDateString(),
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      date: d.getDate(),
      fullDate: new Date(d),
    };
  });

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {dateChips.map((chip) => (
        <TouchableOpacity
          key={chip.key}
          style={[styles.chip, isSelected(chip.fullDate) && styles.chipActive]}
          onPress={() => onDateChange(chip.fullDate)}
        >
          <Text style={isSelected(chip.fullDate) ? styles.chipDayActive : styles.chipDay}>
            {chip.day}
          </Text>
          <Text style={isSelected(chip.fullDate) ? styles.chipDateActive : styles.chipDate}>
            {chip.date}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.chipMore}>
        <MaterialIcons name="calendar-today" size={18} color={colors.textMuted} />
        <Text style={styles.chipMoreText}>Cal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    chips: {
      paddingBottom: spacing.md,
      gap: spacing.xs,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      alignItems: "center",
      minWidth: 56,
    },
    chipActive: {
      backgroundColor: "rgba(37,99,235,0.25)",
      borderColor: "rgba(37,99,235,0.5)",
    },
    chipDay: {
      fontSize: 11,
      color: colors.textSubtle,
      fontWeight: "500",
    },
    chipDayActive: {
      fontSize: 11,
      color: colors.primaryLight,
      fontWeight: "600",
    },
    chipDate: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textMuted,
      marginTop: 2,
    },
    chipDateActive: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
      marginTop: 2,
    },
    chipMore: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 56,
      gap: 4,
    },
    chipMoreText: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.textMuted,
    },
  });
