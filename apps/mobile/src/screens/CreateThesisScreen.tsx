import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CandlestickChart } from "@/components/CandlestickChart";
import { StancePill } from "@/components/StancePill";
import { fetchCandles, searchAssets } from "@/lib/api";
import { createForecast } from "@/lib/forecast";
import { assetFromSymbol, normalizeSymbol } from "@/lib/symbols";
import { persistThesisToSupabase } from "@/lib/supabasePersistence";
import { colors } from "@/lib/theme";
import { useAppState } from "@/state/AppState";
import { Asset, Candle, Forecast, Horizon, Stance } from "@/types";

const stances: Stance[] = ["bullish", "neutral", "bearish"];
const horizons: Horizon[] = ["1D", "1W", "1M"];

export function CreateThesisScreen() {
  const router = useRouter();
  const { dispatch } = useAppState();
  const [symbol, setSymbol] = useState("NVDA");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [stance, setStance] = useState<Stance>("bullish");
  const [horizon, setHorizon] = useState<Horizon>("1W");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("Load real market data before publishing a thesis.");

  const canPublish = Boolean(asset && candles.length >= 8 && title.trim().length >= 4 && body.trim().length >= 10);

  useEffect(() => {
    if (candles.length >= 8) {
      setForecast(createForecast(candles, horizon, stance));
    }
  }, [candles, horizon, stance]);

  async function loadMarketData() {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) {
      setNotice("Enter a valid ticker, for example NVDA or BTC-USD.");
      return;
    }

    setLoading(true);
    setNotice("");

    try {
      const [resolvedAsset] = await searchAssets(normalized, [assetFromSymbol(normalized)]);
      const resolvedCandles = await fetchCandles(normalized, []);
      if (resolvedCandles.length < 8) {
        setAsset(resolvedAsset ?? assetFromSymbol(normalized));
        setCandles([]);
        setForecast(null);
        setNotice("No live candles loaded. Start the FastAPI backend with yfinance installed, then try again.");
        return;
      }

      setAsset(resolvedAsset ?? assetFromSymbol(normalized));
      setCandles(resolvedCandles);
      setForecast(createForecast(resolvedCandles, horizon, stance));
      setNotice(`Loaded ${resolvedCandles.length} real candles for ${normalized}.`);
    } finally {
      setLoading(false);
    }
  }

  function publishThesis() {
    if (!canPublish || !asset) {
      setNotice("Load real candles and add a title/body before publishing.");
      return;
    }

    dispatch({ type: "createThesis", input: { asset, candles, stance, horizon, title, body } });
    persistThesisToSupabase({ asset, candles, stance, horizon, title, body }).catch(() => undefined);
    setNotice("Published locally. Your thesis is now at the top of the feed.");
    router.push("/");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create thesis</Text>
        <Text style={styles.caption}>Publish a locked market scenario with chart context and measurable outcome.</Text>

        <View style={styles.panel}>
          <Text style={styles.label}>Ticker</Text>
          <TextInput
            value={symbol}
            onChangeText={setSymbol}
            autoCapitalize="characters"
            style={styles.input}
            placeholder="NVDA"
            placeholderTextColor={colors.muted}
          />
          <Pressable style={styles.loadButton} onPress={loadMarketData}>
            <Text style={styles.loadButtonText}>{loading ? "Loading market data..." : "Load real market data"}</Text>
          </Pressable>

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

        {asset && forecast ? (
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
        ) : (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>No chart loaded</Text>
            <Text style={styles.previewBody}>Load real candles from the API to preview the thesis chart and forecast.</Text>
          </View>
        )}

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
  loadButton: {
    alignItems: "center",
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    paddingVertical: 12
  },
  loadButtonText: {
    color: colors.surface,
    fontWeight: "900"
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
