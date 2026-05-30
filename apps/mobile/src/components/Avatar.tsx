import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

type Props = {
  label: string;
  size?: number;
};

export function Avatar({ label, size = 44 }: Props) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: Math.max(12, size * 0.34) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.charcoal
  },
  text: {
    color: colors.surface,
    fontWeight: "800"
  }
});
