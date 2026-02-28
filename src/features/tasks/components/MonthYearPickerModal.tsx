import React, { useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeColors, radii, shadows, spacing } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";

type Props = {
  visible: boolean;
  initialDate: Date;
  onClose: () => void;
  onApply: (date: Date) => void;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function MonthYearPickerModal({
  visible,
  initialDate,
  onClose,
  onApply,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [month, setMonth] = useState(initialDate.getMonth());
  const [year, setYear] = useState(initialDate.getFullYear());
  const [day, setDay] = useState(initialDate.getDate());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const clampedDay = Math.min(day, daysInMonth);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = i - firstWeekday + 1;
    if (d < 1 || d > daysInMonth) return null;
    return d;
  });

  const apply = () => onApply(new Date(year, month, clampedDay));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => {
        setMonth(initialDate.getMonth());
        setYear(initialDate.getFullYear());
        setDay(initialDate.getDate());
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Select Date</Text>

          <View style={styles.yearRow}>
            <TouchableOpacity
              style={styles.yearNav}
              onPress={() => setYear((prev) => prev - 1)}
            >
              <MaterialIcons name="chevron-left" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.yearText}>{year}</Text>
            <TouchableOpacity
              style={styles.yearNav}
              onPress={() => setYear((prev) => prev + 1)}
            >
              <MaterialIcons name="chevron-right" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthGrid}>
            {MONTHS.map((label, idx) => (
              <TouchableOpacity
                key={label}
                style={[styles.monthBtn, idx === month && styles.monthBtnActive]}
                onPress={() => {
                  setMonth(idx);
                  const nextDaysInMonth = new Date(year, idx + 1, 0).getDate();
                  if (day > nextDaysInMonth) setDay(nextDaysInMonth);
                }}
              >
                <Text style={[styles.monthText, idx === month && styles.monthTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {cells.map((d, idx) => (
              <TouchableOpacity
                key={`d-${idx}`}
                disabled={!d}
                style={[
                  styles.dayBtn,
                  !d && styles.dayBtnDisabled,
                  d === clampedDay && styles.dayBtnActive,
                ]}
                onPress={() => d && setDay(d)}
              >
                <Text style={[styles.dayText, d === clampedDay && styles.dayTextActive]}>
                  {d ?? ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={apply}>
              <Text style={styles.primaryText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    card: {
      borderRadius: radii.lg,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      padding: spacing.md,
      gap: spacing.md,
      ...shadows.soft,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    yearRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    yearNav: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    yearText: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "800",
    },
    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    monthBtn: {
      width: "23%",
      height: 40,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    monthBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    monthText: {
      color: colors.textPrimary,
      fontWeight: "600",
      fontSize: 13,
    },
    monthTextActive: {
      color: "#fff",
    },
    daysGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    dayBtn: {
      width: "13%",
      aspectRatio: 1,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    dayBtnDisabled: {
      opacity: 0,
    },
    dayBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: "600",
    },
    dayTextActive: {
      color: "#fff",
      fontWeight: "700",
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    secondaryBtn: {
      flex: 1,
      height: 44,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    secondaryText: {
      color: colors.textPrimary,
      fontWeight: "600",
    },
    primaryBtn: {
      flex: 1,
      height: 44,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    primaryText: {
      color: "#fff",
      fontWeight: "700",
    },
  });
