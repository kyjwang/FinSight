import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

type Props = {
  label: string;
  value: string;
  tone?: "green" | "red" | "blue" | "neutral";
};

const toneColor = {
  green: colors.green,
  red: colors.red,
  blue: colors.blue,
  neutral: colors.muted
};

export function StatBadge({ label, value, tone = "neutral" }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: toneColor[tone] }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  value: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2
  }
});
