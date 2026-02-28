import React, { useMemo, useState } from "react";
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

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

  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstWeekday + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return new Date(viewMonth.getFullYear(), viewMonth.getMonth(), dayNumber);
  });

  const openCalendar = () => {
    setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setShowCalendar(true);
  };

  const pickDate = (d: Date) => {
    onDateChange(d);
    setShowCalendar(false);
  };

  return (
    <>
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
        <TouchableOpacity style={styles.chipMore} onPress={openCalendar}>
          <MaterialIcons name="calendar-today" size={18} color={colors.textMuted} />
          <Text style={styles.chipMoreText}>Cal</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={showCalendar} animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.monthNav}
                onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              >
                <MaterialIcons name="chevron-left" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{monthLabel}</Text>
              <TouchableOpacity
                style={styles.monthNav}
                onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              >
                <MaterialIcons name="chevron-right" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                <Text key={w} style={styles.weekday}>{w}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((d, i) => (
                <TouchableOpacity
                  key={`day-${i}`}
                  disabled={!d}
                  style={[styles.dayCell, d && isSelected(d) && styles.dayCellActive, !d && styles.dayCellDisabled]}
                  onPress={() => d && pickDate(d)}
                >
                  <Text style={[styles.dayText, d && isSelected(d) && styles.dayTextActive]}>
                    {d ? d.getDate() : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCalendar(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    modalCard: {
      width: "100%",
      maxWidth: 360,
      borderRadius: radii.lg,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      padding: spacing.md,
      ...shadows.soft,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    monthNav: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    monthTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    weekRow: {
      flexDirection: "row",
      marginBottom: spacing.xs,
    },
    weekday: {
      flex: 1,
      textAlign: "center",
      color: colors.textSubtle,
      fontSize: 11,
      fontWeight: "600",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
    },
    dayCell: {
      width: "13.7%",
      aspectRatio: 1,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    dayCellDisabled: {
      opacity: 0,
    },
    dayCellActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    dayTextActive: {
      color: "#fff",
      fontWeight: "700",
    },
    closeBtn: {
      marginTop: spacing.md,
      height: 42,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    closeText: {
      color: colors.textPrimary,
      fontWeight: "700",
    },
  });
