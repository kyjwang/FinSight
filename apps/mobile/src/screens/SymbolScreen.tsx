import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CandlestickChart } from "@/components/CandlestickChart";
import { ThesisCard } from "@/components/ThesisCard";
import { communitySentiment } from "@/lib/analytics";
import { fetchCandles, requestKronosForecast, searchAssets } from "@/lib/api";
import { assetFromSymbol, assetWithCandleStats, normalizeSymbol } from "@/lib/symbols";
import { colors } from "@/lib/theme";
import { compactNumber, formatCurrency, formatPercent } from "@/lib/format";
import { useAppState } from "@/state/AppState";
import { Asset, Candle, Forecast, Horizon } from "@/types";

const horizons: Horizon[] = ["1D", "1W", "1M"];
const chartRanges = ["1M", "3M", "6M", "1Y"] as const;
type ChartRange = (typeof chartRanges)[number];

export function SymbolScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { state, dispatch } = useAppState();
  const normalizedSymbol = normalizeSymbol(symbol ?? "NVDA");
  const [asset, setAsset] = useState<Asset>(assetFromSymbol(normalizedSymbol));
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartRange, setChartRange] = useState<ChartRange>("6M");
  const [marketStatus, setMarketStatus] = useState("Loading real candles from the API...");
  const [kronosHorizon, setKronosHorizon] = useState<Horizon>("1W");
  const [kronosForecast, setKronosForecast] = useState<Forecast | null>(null);
  const [kronosLoading, setKronosLoading] = useState(false);
  const [kronosError, setKronosError] = useState("");
  const posts = state.posts.filter((post) => post.asset.symbol === asset.symbol);
  const fallbackPosts = posts.length > 0 ? posts : state.posts.slice(0, 2);
  const sentiment = communitySentiment(fallbackPosts);
  const watching = state.watchlistSymbols.includes(asset.symbol);
  const marketStats = buildMarketStats(candles);

  useEffect(() => {
    let active = true;

    async function loadSymbol() {
      setMarketStatus("Loading real candles from the API...");
      setKronosForecast(null);
      const [resolvedAsset] = await searchAssets(normalizedSymbol, [assetFromSymbol(normalizedSymbol)]);
      const resolvedCandles = await fetchCandles(normalizedSymbol, [], chartRange);

      if (!active) return;

      setAsset(assetWithCandleStats(resolvedAsset ?? assetFromSymbol(normalizedSymbol), resolvedCandles));
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
  }, [normalizedSymbol, chartRange]);

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
          <View style={styles.rangeRow}>
            {chartRanges.map((range) => (
              <Pressable
                key={range}
                style={[styles.rangeButton, range === chartRange && styles.rangeButtonActive]}
                onPress={() => setChartRange(range)}
              >
                <Text style={[styles.rangeText, range === chartRange && styles.rangeTextActive]}>{range}</Text>
              </Pressable>
            ))}
          </View>
          <CandlestickChart candles={candles} height={230} />
          <Text style={styles.marketStatus}>{marketStatus}</Text>
          {marketStats ? (
            <>
              <View style={styles.statGrid}>
                <MarketMetric label="Open" value={formatCurrency(marketStats.latest.open)} />
                <MarketMetric label="High" value={formatCurrency(marketStats.latest.high)} tone="green" />
                <MarketMetric label="Low" value={formatCurrency(marketStats.latest.low)} tone="red" />
                <MarketMetric label="Close" value={formatCurrency(marketStats.latest.close)} />
                <MarketMetric label="Volume" value={compactNumber(marketStats.latest.volume)} />
                <MarketMetric label="Avg Vol" value={compactNumber(marketStats.averageVolume)} />
              </View>
              <View style={styles.marketTape}>
                <TapeItem label="Latest candle" value={marketStats.latest.time} />
                <TapeItem label="Previous close" value={formatCurrency(marketStats.previousClose)} />
                <TapeItem label={`${chartRange} range`} value={`${formatCurrency(marketStats.rangeLow)} - ${formatCurrency(marketStats.rangeHigh)}`} />
                <TapeItem label="Total traded" value={compactNumber(marketStats.totalVolume)} />
              </View>
              <RecentCandles candles={candles.slice(-6).reverse()} />
            </>
          ) : null}
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

function MarketMetric({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <View style={styles.marketMetric}>
      <Text style={styles.marketMetricLabel}>{label}</Text>
      <Text style={[styles.marketMetricValue, tone === "green" && styles.metricGreen, tone === "red" && styles.metricRed]}>
        {value}
      </Text>
    </View>
  );
}

function TapeItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tapeItem}>
      <Text style={styles.tapeLabel}>{label}</Text>
      <Text style={styles.tapeValue}>{value}</Text>
    </View>
  );
}

function RecentCandles({ candles }: { candles: Candle[] }) {
  return (
    <View style={styles.candleTable}>
      <View style={styles.candleTableHeader}>
        <Text style={[styles.candleCell, styles.candleDate]}>Time</Text>
        <Text style={styles.candleCell}>Open</Text>
        <Text style={styles.candleCell}>High</Text>
        <Text style={styles.candleCell}>Low</Text>
        <Text style={styles.candleCell}>Vol</Text>
      </View>
      {candles.map((candle) => (
        <View key={candle.time} style={styles.candleRow}>
          <Text style={[styles.candleCell, styles.candleDate]}>{shortDate(candle.time)}</Text>
          <Text style={styles.candleCell}>{priceText(candle.open)}</Text>
          <Text style={[styles.candleCell, styles.metricGreen]}>{priceText(candle.high)}</Text>
          <Text style={[styles.candleCell, styles.metricRed]}>{priceText(candle.low)}</Text>
          <Text style={styles.candleCell}>{compactNumber(candle.volume)}</Text>
        </View>
      ))}
    </View>
  );
}

function buildMarketStats(candles: Candle[]) {
  const latest = candles.at(-1);
  if (!latest) return null;

  const previous = candles.at(-2) ?? latest;
  const totalVolume = candles.reduce((sum, candle) => sum + candle.volume, 0);
  return {
    latest,
    previousClose: previous.close,
    averageVolume: Math.round(totalVolume / candles.length),
    totalVolume,
    rangeHigh: Math.max(...candles.map((candle) => candle.high)),
    rangeLow: Math.min(...candles.map((candle) => candle.low))
  };
}

function shortDate(value: string): string {
  const [, month, day] = value.split("-");
  if (month && day) return `${month}/${day}`;
  return value.slice(0, 8);
}

function priceText(value: number): string {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(1);
  if (value >= 10) return value.toFixed(2);
  return value.toFixed(3);
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
  candleCell: {
    color: colors.ink,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right"
  },
  candleDate: {
    color: colors.muted,
    flex: 1.15,
    textAlign: "left"
  },
  candleRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 8
  },
  candleTable: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  candleTableHeader: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 6,
    paddingTop: 6
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
  rangeButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 9
  },
  rangeButtonActive: {
    backgroundColor: colors.green,
    borderColor: colors.green
  },
  rangeRow: {
    flexDirection: "row",
    gap: 8
  },
  rangeText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  rangeTextActive: {
    color: colors.surface
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
  marketMetric: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    flexBasis: "31%",
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  marketMetricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  marketMetricValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3
  },
  marketStatus: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  marketTape: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10
  },
  metricGreen: {
    color: colors.green
  },
  metricRed: {
    color: colors.red
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
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  symbol: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900"
  },
  tapeItem: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  tapeLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  tapeValue: {
    color: colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right"
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
