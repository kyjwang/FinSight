import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CandlestickChart } from "@/components/CandlestickChart";
import { ThesisCard } from "@/components/ThesisCard";
import { communitySentiment } from "@/lib/analytics";
import { fetchCandles, requestKronosForecast, searchAssets } from "@/lib/api";
import { assetFromSymbol, normalizeSymbol } from "@/lib/symbols";
import { colors } from "@/lib/theme";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAppState } from "@/state/AppState";
import { Asset, Candle, Forecast, Horizon } from "@/types";

const horizons: Horizon[] = ["1D", "1W", "1M"];

export function SymbolScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { state, dispatch } = useAppState();
  const normalizedSymbol = normalizeSymbol(symbol ?? "NVDA");
  const [asset, setAsset] = useState<Asset>(assetFromSymbol(normalizedSymbol));
  const [candles, setCandles] = useState<Candle[]>([]);
  const [marketStatus, setMarketStatus] = useState("Loading real candles from the API...");
  const [kronosHorizon, setKronosHorizon] = useState<Horizon>("1W");
  const [kronosForecast, setKronosForecast] = useState<Forecast | null>(null);
  const [kronosLoading, setKronosLoading] = useState(false);
  const [kronosError, setKronosError] = useState("");
  const posts = state.posts.filter((post) => post.asset.symbol === asset.symbol);
  const fallbackPosts = posts.length > 0 ? posts : state.posts.slice(0, 2);
  const sentiment = communitySentiment(fallbackPosts);
  const watching = state.watchlistSymbols.includes(asset.symbol);

  useEffect(() => {
    let active = true;

    async function loadSymbol() {
      setMarketStatus("Loading real candles from the API...");
      setKronosForecast(null);
      const [resolvedAsset] = await searchAssets(normalizedSymbol, [assetFromSymbol(normalizedSymbol)]);
      const resolvedCandles = await fetchCandles(normalizedSymbol, []);

      if (!active) return;

      setAsset(resolvedAsset ?? assetFromSymbol(normalizedSymbol));
      setCandles(resolvedCandles);
      setMarketStatus(
        resolvedCandles.length >= 8
          ? `Loaded ${resolvedCandles.length} real candles from the API.`
          : "No real candles loaded. Start FastAPI with yfinance installed, then refresh this symbol."
      );
    }

    loadSymbol().catch(() => {
      if (active) {
        setCandles([]);
        setMarketStatus("Market data request failed. Check that the FastAPI backend is running.");
      }
    });

    return () => {
      active = false;
    };
  }, [normalizedSymbol]);

  async function analyzeWithKronos() {
    if (candles.length < 8) {
      setKronosError("Load real candles before running Kronos.");
      return;
    }

    setKronosLoading(true);
    setKronosError("");

    try {
      const forecast = await requestKronosForecast(asset.symbol, candles, kronosHorizon);
      setKronosForecast(forecast);
    } catch {
      setKronosError("Kronos analysis could not be completed. Try again after the API is running.");
    } finally {
      setKronosLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.symbol}>{asset.symbol}</Text>
              <Text style={styles.name}>{asset.name} · {asset.exchange}</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>{formatCurrency(asset.price)}</Text>
              <Text style={[styles.change, { color: asset.changePercent >= 0 ? colors.green : colors.red }]}>
                {formatPercent(asset.changePercent)}
              </Text>
            </View>
          </View>
          <CandlestickChart candles={candles} />
          <Text style={styles.marketStatus}>{marketStatus}</Text>
          <Pressable
            style={[styles.watchButton, watching && styles.watchButtonActive]}
            onPress={() => dispatch({ type: "toggleWatchlist", symbol: asset.symbol })}
          >
            <Text style={[styles.watchText, watching && styles.watchTextActive]}>
              {watching ? "Remove from watchlist" : "Add to watchlist"}
            </Text>
          </Pressable>
          <View style={styles.sentimentRow}>
            <Sentiment label="Bullish" value={sentiment.bullish} color={colors.green} />
            <Sentiment label="Neutral" value={sentiment.neutral} color={colors.blue} />
            <Sentiment label="Bearish" value={sentiment.bearish} color={colors.red} />
          </View>
        </View>

        <View style={styles.kronosPanel}>
          <View>
            <Text style={styles.kronosEyebrow}>Kronos Forecast Lab</Text>
            <Text style={styles.kronosTitle}>Analyze future K-lines</Text>
            <Text style={styles.kronosCopy}>
              Sends up to 512 real historical candles to the FastAPI Kronos adapter. If Kronos is unavailable, FinSight
              marks the result as a baseline fallback.
            </Text>
          </View>

          <View style={styles.horizonRow}>
            {horizons.map((item) => (
              <Pressable
                key={item}
                style={[styles.horizonButton, item === kronosHorizon && styles.horizonButtonActive]}
                onPress={() => setKronosHorizon(item)}
              >
                <Text style={[styles.horizonText, item === kronosHorizon && styles.horizonTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={[styles.kronosButton, candles.length < 8 && styles.disabledButton]} onPress={analyzeWithKronos} disabled={kronosLoading || candles.length < 8}>
            <Text style={styles.kronosButtonText}>{kronosLoading ? "Analyzing..." : "Analyze with Kronos"}</Text>
          </Pressable>

          {kronosError ? <Text style={styles.kronosError}>{kronosError}</Text> : null}

          {kronosForecast && (
            <View style={styles.kronosResult}>
              <CandlestickChart candles={candles} forecast={kronosForecast} />
              <View style={styles.modelCard}>
                <Text style={styles.modelName}>{kronosForecast.modelName}</Text>
                <Text style={styles.modelCopy}>{kronosForecast.summary}</Text>
                <View style={styles.modelGrid}>
                  <ModelMetric label="Provider" value={kronosForecast.provider ?? "baseline"} />
                  <ModelMetric label="Status" value={kronosForecast.providerStatus ?? "ready"} />
                  <ModelMetric label="Lookback" value={`${kronosForecast.lookback ?? candles.length}`} />
                </View>
                <Text style={styles.modelCopy}>
                  Backtest: {Math.round(kronosForecast.backtest.directionAccuracy * 100)}% direction accuracy ·{" "}
                  {kronosForecast.backtest.meanAbsoluteError}% MAE.
                </Text>
                {kronosForecast.fallbackReason ? (
                  <Text style={styles.fallbackReason}>{kronosForecast.fallbackReason}</Text>
                ) : null}
                <Text style={styles.disclaimer}>Scenario analysis only. Not financial advice.</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Community theses</Text>
        {fallbackPosts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No theses for this symbol yet</Text>
            <Text style={styles.kronosCopy}>Create a thesis after loading real candles.</Text>
          </View>
        ) : fallbackPosts.map((post) => (
          <ThesisCard
            key={post.id}
            post={post}
            liked={state.likedPostIds.includes(post.id)}
            bookmarked={state.bookmarkedPostIds.includes(post.id)}
            onToggleLike={(postId) => dispatch({ type: "toggleLike", postId })}
            onToggleBookmark={(postId) => dispatch({ type: "toggleBookmark", postId })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Sentiment({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.sentiment}>
      <View style={[styles.bar, { width: `${Math.max(12, value * 100)}%`, backgroundColor: color }]} />
      <Text style={styles.sentimentLabel}>{label}</Text>
      <Text style={styles.sentimentValue}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

function ModelMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.modelMetric}>
      <Text style={styles.modelMetricLabel}>{label}</Text>
      <Text style={styles.modelMetricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 999,
    height: 5,
    marginBottom: 7
  },
  change: {
    fontWeight: "900"
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 32
  },
  disclaimer: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: "900"
  },
  fallbackReason: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14
  },
  heroTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  name: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  price: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  priceBlock: {
    alignItems: "flex-end"
  },
  horizonButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10
  },
  horizonButtonActive: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal
  },
  horizonRow: {
    flexDirection: "row",
    gap: 8
  },
  horizonText: {
    color: colors.muted,
    fontWeight: "900"
  },
  horizonTextActive: {
    color: colors.surface
  },
  kronosButton: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 8,
    paddingVertical: 13
  },
  disabledButton: {
    opacity: 0.52
  },
  kronosButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  kronosCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  kronosError: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "800"
  },
  kronosEyebrow: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: "900"
  },
  kronosPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14
  },
  kronosResult: {
    gap: 12
  },
  kronosTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2
  },
  modelCard: {
    backgroundColor: "#F1EDF8",
    borderRadius: 8,
    gap: 10,
    padding: 12
  },
  modelCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  modelGrid: {
    flexDirection: "row",
    gap: 8
  },
  modelMetric: {
    flex: 1
  },
  modelMetricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  modelMetricValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2
  },
  modelName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  marketStatus: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  empty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4
  },
  safeArea: {
    alignSelf: "center",
    backgroundColor: colors.background,
    flex: 1,
    maxWidth: 430,
    width: "100%"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  sentiment: {
    flex: 1
  },
  sentimentLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  sentimentRow: {
    flexDirection: "row",
    gap: 8
  },
  sentimentValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2
  },
  symbol: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900"
  },
  watchButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12
  },
  watchButtonActive: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal
  },
  watchText: {
    color: colors.muted,
    fontWeight: "900"
  },
  watchTextActive: {
    color: colors.surface
  }
});
