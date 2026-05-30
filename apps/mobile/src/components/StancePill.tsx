import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";
import { Stance } from "@/types";

const stanceColor: Record<Stance, string> = {
  bullish: colors.green,
  neutral: colors.blue,
  bearish: colors.red
};

type Props = {
  stance: Stance;
};

export function StancePill({ stance }: Props) {
  return (
    <View style={[styles.pill, { borderColor: stanceColor[stance] }]}>
      <View style={[styles.dot, { backgroundColor: stanceColor[stance] }]} />
      <Text style={[styles.text, { color: stanceColor[stance] }]}>{stance.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  text: {
    fontSize: 11,
    fontWeight: "800"
  }
});
