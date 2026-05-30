import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CandlestickChart } from "@/components/CandlestickChart";
import { StancePill } from "@/components/StancePill";
import { demoAssets, demoCandles } from "@/data/demo";
import { createForecast } from "@/lib/forecast";
import { persistThesisToSupabase } from "@/lib/supabasePersistence";
import { colors } from "@/lib/theme";
import { useAppState } from "@/state/AppState";
import { Horizon, Stance } from "@/types";

const stances: Stance[] = ["bullish", "neutral", "bearish"];
const horizons: Horizon[] = ["1D", "1W", "1M"];

export function CreateThesisScreen() {
  const router = useRouter();
  const { dispatch } = useAppState();
  const [symbol, setSymbol] = useState("NVDA");
  const [stance, setStance] = useState<Stance>("bullish");
  const [horizon, setHorizon] = useState<Horizon>("1W");
  const [title, setTitle] = useState("Breakout retest with clear invalidation");
  const [body, setBody] = useState("I want price to hold the prior breakout shelf. If it loses that level on volume, the thesis is invalid.");
  const [notice, setNotice] = useState("");

  const asset = demoAssets.find((item) => item.symbol === symbol) ?? demoAssets[0];
  const candles = useMemo(() => demoCandles(asset.symbol), [asset.symbol]);
  const forecast = useMemo(() => createForecast(candles, horizon, stance), [candles, horizon, stance]);
  const canPublish = title.trim().length >= 4 && body.trim().length >= 10;

  function publishThesis() {
    if (!canPublish) {
      setNotice("Add a title and at least one complete sentence before publishing.");
      return;
    }

    dispatch({ type: "createThesis", input: { symbol, stance, horizon, title, body } });
    persistThesisToSupabase({ symbol, stance, horizon, title, body }).catch(() => undefined);
    setNotice("Published locally. Your thesis is now at the top of the feed.");
    router.push("/");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create thesis</Text>
        <Text style={styles.caption}>Publish a locked market scenario with chart context and measurable outcome.</Text>

        <View style={styles.panel}>
          <Text style={styles.label}>Asset</Text>
          <View style={styles.assetGrid}>
            {demoAssets.map((item) => (
              <Pressable
                key={item.symbol}
                onPress={() => setSymbol(item.symbol)}
                style={[styles.assetButton, item.symbol === asset.symbol && styles.selectedButton]}
              >
                <Text style={[styles.assetText, item.symbol === asset.symbol && styles.selectedText]}>{item.symbol}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Stance</Text>
          <View style={styles.segmentRow}>
            {stances.map((item) => (
              <Pressable key={item} onPress={() => setStance(item)} style={[styles.segment, item === stance && styles.selectedButton]}>
                <Text style={[styles.segmentText, item === stance && styles.selectedText]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Horizon</Text>
          <View style={styles.segmentRow}>
            {horizons.map((item) => (
              <Pressable key={item} onPress={() => setHorizon(item)} style={[styles.segment, item === horizon && styles.selectedButton]}>
                <Text style={[styles.segmentText, item === horizon && styles.selectedText]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor={colors.muted} />

          <Text style={styles.label}>Thesis</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            style={[styles.input, styles.textArea]}
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={styles.symbol}>{asset.symbol}</Text>
              <Text style={styles.caption}>{asset.name}</Text>
            </View>
            <StancePill stance={stance} />
          </View>
          <CandlestickChart candles={candles} forecast={forecast} />
          <Text style={styles.previewTitle}>{title}</Text>
          <Text style={styles.previewBody}>{body}</Text>
          <View style={styles.aiBox}>
            <Text style={styles.aiLabel}>{forecast.modelName}</Text>
            <Text style={styles.aiText}>{forecast.summary}</Text>
            <Text style={styles.aiMeta}>
              Backtest: {Math.round(forecast.backtest.directionAccuracy * 100)}% direction accuracy across{" "}
              {forecast.backtest.sampleSize} samples.
            </Text>
          </View>
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Pressable style={[styles.publishButton, !canPublish && styles.disabledButton]} onPress={publishThesis}>
          <Text style={styles.publishText}>Publish locked thesis</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  aiBox: {
    backgroundColor: "#F1EDF8",
    borderRadius: 8,
    padding: 12
  },
  aiLabel: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4
  },
  aiText: {
    color: colors.muted,
    lineHeight: 19
  },
  aiMeta: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 8
  },
  assetButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 86,
    paddingVertical: 11
  },
  assetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  assetText: {
    color: colors.ink,
    fontWeight: "900"
  },
  caption: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 32
  },
  disabledButton: {
    opacity: 0.52
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    padding: 12
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  preview: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  previewBody: {
    color: colors.muted,
    lineHeight: 20
  },
  previewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  publishButton: {
    alignItems: "center",
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    paddingVertical: 15
  },
  publishText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900"
  },
  safeArea: {
    alignSelf: "center",
    backgroundColor: colors.background,
    flex: 1,
    maxWidth: 430,
    width: "100%"
  },
  segment: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  segmentText: {
    color: colors.muted,
    fontWeight: "900"
  },
  selectedButton: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal
  },
  selectedText: {
    color: colors.surface
  },
  symbol: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  textArea: {
    minHeight: 108,
    textAlignVertical: "top"
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900"
  }
});
