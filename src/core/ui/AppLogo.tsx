import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle } from "react-native-svg";

interface AppLogoProps {
  size?: number;
}

/**
 * TaskSnap modern app logo.
 * A rounded square with a gradient background, featuring a camera lens
 * combined with a checkmark — representing "snap + task done".
 */
export default function AppLogo({ size = 96 }: AppLogoProps) {
  const s = size;
  const half = s / 2;
  const r = s * 0.22; // corner radius ratio

  // Checkmark path scaled to icon
  const cx = half;
  const cy = half;
  const checkSize = s * 0.22;
  const checkX = cx - checkSize * 0.6;
  const checkY = cy + checkSize * 0.1;
  const checkMid = `${checkX + checkSize * 0.4} ${checkY + checkSize * 0.4}`;
  const checkEnd = `${checkX + checkSize * 1.2} ${checkY - checkSize * 0.4}`;

  return (
    <View style={[styles.container, { width: s, height: s }]}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Defs>
          <LinearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1E3A8A" />
            <Stop offset="50%" stopColor="#1152D4" />
            <Stop offset="100%" stopColor="#3B82F6" />
          </LinearGradient>
          <LinearGradient id="lens" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
          </LinearGradient>
        </Defs>

        {/* Background */}
        <Rect x={0} y={0} width={s} height={s} rx={r} fill="url(#bg)" />

        {/* Camera lens ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={s * 0.32}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={s * 0.03}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={s * 0.24}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={s * 0.02}
          fill="url(#lens)"
        />

        {/* Checkmark */}
        <Path
          d={`M ${checkX} ${checkY} L ${checkMid} L ${checkEnd}`}
          stroke="#FFFFFF"
          strokeWidth={s * 0.055}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Small flash dot (top-right) */}
        <Circle
          cx={s * 0.78}
          cy={s * 0.22}
          r={s * 0.04}
          fill="rgba(255,255,255,0.6)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
