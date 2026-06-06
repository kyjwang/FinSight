import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, Bookmark, ChevronDown, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react-native";
import { CandlestickChart } from "@/components/CandlestickChart";
import { ThesisCard } from "@/components/ThesisCard";
import { communitySentiment } from "@/lib/analytics";
import { fetchCandles, requestKronosForecast, requestMarketSignal, searchAssets } from "@/lib/api";
import { assetFromSymbol, assetWithCandleStats, normalizeSymbol } from "@/lib/symbols";
import { colors } from "@/lib/theme";
import { compactNumber, formatCurrency, formatPercent } from "@/lib/format";
import { buildTradingSnapshot, TradingSnapshot } from "@/lib/tradingMetrics";
import { useAppState } from "@/state/AppState";
import { Asset, Candle, Forecast, Horizon, MarketSignal } from "@/types";

const horizons: Horizon[] = ["1D", "1W", "1M"];
const chartRanges = ["1M", "3M", "6M", "1Y"] as const;
type ChartRange = (typeof chartRanges)[number];
type OrderSide = "buy" | "sell";
type OrderType = "Market" | "Limit" | "Stop";

export function SymbolScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { state, dispatch } = useAppState();
  const normalizedSymbol = normalizeSymbol(symbol ?? "NVDA");
  const [asset, setAsset] = useState<Asset>(assetFromSymbol(normalizedSymbol));
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartRange, setChartRange] = useState<ChartRange>("6M");
  const [marketStatus, setMarketStatus] = useState("Loading real candles from the API...");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [kronosHorizon, setKronosHorizon] = useState<Horizon>("1W");
  const [kronosForecast, setKronosForecast] = useState<Forecast | null>(null);
  const [kronosLoading, setKronosLoading] = useState(false);
  const [kronosError, setKronosError] = useState("");
  const [marketSignal, setMarketSignal] = useState<MarketSignal | null>(null);
  const [signalLoading, setSignalLoading] = useState(false);
  const [signalError, setSignalError] = useState("");
  const [orderSide, setOrderSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("Limit");
  const [quantity, setQuantity] = useState("10");
  const posts = state.posts.filter((post) => post.asset.symbol === asset.symbol);
  const fallbackPosts = posts.length > 0 ? posts : state.posts.slice(0, 2);
  const sentiment = communitySentiment(fallbackPosts);
  const watching = state.watchlistSymbols.includes(asset.symbol);
  const marketStats = buildMarketStats(candles);
  const snapshot = useMemo(() => buildTradingSnapshot(asset, candles), [asset, candles]);
  const orderQuantity = parseOrderQuantity(quantity);

  useEffect(() => {
    let active = true;

    async function loadSymbol() {
      setMarketStatus("Loading real candles from the API...");
      setKronosForecast(null);
      setMarketSignal(null);
      setSignalError("");
      setSignalLoading(true);
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

      const signal = await requestMarketSignal(normalizedSymbol, resolvedCandles, kronosHorizon);
      if (!active) return;
      setMarketSignal(signal);
      setSignalError(signal ? "" : "Need at least 30 candles to calculate signal quality.");
      setSignalLoading(false);
    }

    loadSymbol().catch(() => {
      if (active) {
        setCandles([]);
        setMarketStatus("Market data request failed. Check that the FastAPI backend is running.");
        setSignalLoading(false);
        setSignalError("Signal engine could not load because market data failed.");
      }
    });

    return () => {
      active = false;
    };
  }, [normalizedSymbol, chartRange, kronosHorizon, refreshNonce]);

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
        <TradingHeader
          asset={asset}
          snapshot={snapshot}
          watching={watching}
          onRefresh={() => setRefreshNonce((value) => value + 1)}
          onToggleWatchlist={() => dispatch({ type: "toggleWatchlist", symbol: asset.symbol })}
        />

        <View style={styles.workspace}>
          <View style={styles.mainColumn}>
            <View style={styles.chartPanel}>
              <View style={styles.panelToolbar}>
                <View>
                  <Text style={styles.panelEyebrow}>Advanced chart</Text>
                  <Text style={styles.panelTitle}>{asset.symbol} candles</Text>
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
              </View>
              <CandlestickChart candles={candles} height={310} />
              <Text style={styles.marketStatus}>{marketStatus}</Text>
              <MarketStatsPanel marketStats={marketStats} snapshot={snapshot} chartRange={chartRange} />
              <SignalQualityCard signal={marketSignal} loading={signalLoading} error={signalError} />
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
                      <ModelMetric label="Signal" value={scoreText(kronosForecast.signalScore)} />
                    </View>
                    <ForecastStats candles={candles} forecast={kronosForecast} />
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
          </View>

          <View style={styles.sideColumn}>
            <OrderTicket
              asset={asset}
              snapshot={snapshot}
              orderSide={orderSide}
              orderType={orderType}
              quantity={quantity}
              orderQuantity={orderQuantity}
              onChangeSide={setOrderSide}
              onChangeOrderType={setOrderType}
              onChangeQuantity={setQuantity}
            />
            <MarketDepth snapshot={snapshot} />
            <TradeTape trades={snapshot.trades} />
            <AccountPanel asset={asset} snapshot={snapshot} orderQuantity={orderQuantity} />
            <SentimentPanel sentiment={sentiment} />
          </View>
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

function TradingHeader({
  asset,
  snapshot,
  watching,
  onRefresh,
  onToggleWatchlist
}: {
  asset: Asset;
  snapshot: TradingSnapshot;
  watching: boolean;
  onRefresh: () => void;
  onToggleWatchlist: () => void;
}) {
  const changeTone = snapshot.change >= 0 ? "green" : "red";

  return (
    <View style={styles.tradingHeader}>
      <View style={styles.headerIdentity}>
        <View>
          <Text style={styles.headerKicker}>Trading workstation</Text>
          <Text style={styles.symbol}>{asset.symbol}</Text>
          <Text style={styles.name}>{asset.name} · {asset.exchange} · Paper trading</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={onRefresh}>
            <RefreshCw size={18} color={colors.ink} />
          </Pressable>
          <Pressable style={[styles.iconButton, watching && styles.iconButtonActive]} onPress={onToggleWatchlist}>
            <Bookmark size={18} color={watching ? colors.surface : colors.ink} fill={watching ? colors.surface : "none"} />
          </Pressable>
          <View style={styles.iconButton}>
            <Bell size={18} color={colors.ink} />
          </View>
        </View>
      </View>

      <View style={styles.quoteGrid}>
        <View style={styles.quotePrimary}>
          <Text style={styles.quoteLabel}>Last</Text>
          <Text style={styles.quotePrice}>{formatCurrency(snapshot.lastPrice)}</Text>
          <Text style={[styles.quoteChange, changeTone === "green" ? styles.metricGreen : styles.metricRed]}>
            {snapshot.change >= 0 ? "+" : ""}{formatCurrency(snapshot.change)} · {formatPercent(snapshot.changePercent)}
          </Text>
        </View>
        <QuoteCell label="Bid" value={formatCurrency(snapshot.bid)} tone="green" />
        <QuoteCell label="Ask" value={formatCurrency(snapshot.ask)} tone="red" />
        <QuoteCell label="Spread" value={`${formatCurrency(snapshot.spread)} · ${snapshot.spreadPercent.toFixed(3)}%`} />
        <QuoteCell label="VWAP" value={formatCurrency(snapshot.vwap)} />
      </View>
    </View>
  );
}

function QuoteCell({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <View style={styles.quoteCell}>
      <Text style={styles.quoteLabel}>{label}</Text>
      <Text style={[styles.quoteValue, tone === "green" && styles.metricGreen, tone === "red" && styles.metricRed]}>{value}</Text>
    </View>
  );
}

function MarketStatsPanel({
  marketStats,
  snapshot,
  chartRange
}: {
  marketStats: ReturnType<typeof buildMarketStats>;
  snapshot: TradingSnapshot;
  chartRange: ChartRange;
}) {
  if (!marketStats) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Market stats</Text>
        <Text style={styles.panelCopy}>Load candles to populate live range, volume, and tape metrics.</Text>
      </View>
    );
  }

  return (
    <View style={styles.statsRail}>
      <MarketMetric label="Open" value={formatCurrency(marketStats.latest.open)} />
      <MarketMetric label="High" value={formatCurrency(marketStats.latest.high)} tone="green" />
      <MarketMetric label="Low" value={formatCurrency(marketStats.latest.low)} tone="red" />
      <MarketMetric label="Close" value={formatCurrency(marketStats.latest.close)} />
      <MarketMetric label="Volume" value={compactNumber(marketStats.latest.volume)} />
      <MarketMetric label="Avg Vol" value={compactNumber(snapshot.averageVolume)} />
      <MarketMetric label={`${chartRange} high`} value={formatCurrency(marketStats.rangeHigh)} tone="green" />
      <MarketMetric label={`${chartRange} low`} value={formatCurrency(marketStats.rangeLow)} tone="red" />
    </View>
  );
}

function OrderTicket({
  asset,
  snapshot,
  orderSide,
  orderType,
  quantity,
  orderQuantity,
  onChangeSide,
  onChangeOrderType,
  onChangeQuantity
}: {
  asset: Asset;
  snapshot: TradingSnapshot;
  orderSide: OrderSide;
  orderType: OrderType;
  quantity: string;
  orderQuantity: number;
  onChangeSide: (side: OrderSide) => void;
  onChangeOrderType: (type: OrderType) => void;
  onChangeQuantity: (quantity: string) => void;
}) {
  const executionPrice = orderSide === "buy" ? snapshot.ask : snapshot.bid;
  const notional = executionPrice * orderQuantity;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>Paper order</Text>
          <Text style={styles.panelTitle}>{asset.symbol}</Text>
        </View>
        <ShieldCheck size={19} color={colors.green} />
      </View>

      <View style={styles.sideToggle}>
        <Pressable
          style={[styles.sideButton, orderSide === "buy" && styles.buyButtonActive]}
          onPress={() => onChangeSide("buy")}
        >
          <Text style={[styles.sideButtonText, orderSide === "buy" && styles.sideButtonTextActive]}>Buy</Text>
        </Pressable>
        <Pressable
          style={[styles.sideButton, orderSide === "sell" && styles.sellButtonActive]}
          onPress={() => onChangeSide("sell")}
        >
          <Text style={[styles.sideButtonText, orderSide === "sell" && styles.sideButtonTextActive]}>Sell</Text>
        </Pressable>
      </View>

      <View style={styles.formRow}>
        <Text style={styles.formLabel}>Order type</Text>
        <View style={styles.orderTypeRow}>
          {(["Market", "Limit", "Stop"] as OrderType[]).map((type) => (
            <Pressable key={type} style={[styles.orderTypeButton, orderType === type && styles.orderTypeActive]} onPress={() => onChangeOrderType(type)}>
              <Text style={[styles.orderTypeText, orderType === type && styles.orderTypeTextActive]}>{type}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.formRow}>
        <Text style={styles.formLabel}>Quantity</Text>
        <TextInput
          value={quantity}
          onChangeText={(value) => onChangeQuantity(value.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
          style={styles.orderInput}
          placeholder="0"
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.orderSummary}>
        <SummaryRow label="Route" value="Smart" />
        <SummaryRow label={orderType === "Market" ? "Est. price" : "Limit price"} value={formatCurrency(executionPrice)} />
        <SummaryRow label="Est. notional" value={formatCurrency(notional)} />
        <SummaryRow label="Buying power" value={formatCurrency(25000)} />
      </View>

      <Pressable style={[styles.reviewButton, orderSide === "sell" && styles.reviewSellButton]}>
        <TrendingUp size={16} color={colors.surface} />
        <Text style={styles.reviewButtonText}>Review paper order</Text>
      </Pressable>
      <Text style={styles.panelFootnote}>Order ticket is simulated for research workflows only.</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function MarketDepth({ snapshot }: { snapshot: TradingSnapshot }) {
  const maxTotal = Math.max(...snapshot.depth.bids.map((level) => level.total), ...snapshot.depth.asks.map((level) => level.total), 1);

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>Level II</Text>
          <Text style={styles.panelTitle}>Market depth</Text>
        </View>
        <ChevronDown size={18} color={colors.muted} />
      </View>
      <View style={styles.bookHeader}>
        <Text style={styles.bookCell}>Bid</Text>
        <Text style={styles.bookCell}>Size</Text>
        <Text style={styles.bookCellRight}>Ask</Text>
      </View>
      {snapshot.depth.bids.map((bid, index) => {
        const ask = snapshot.depth.asks[index];
        return (
          <View key={`${bid.price}-${ask.price}`} style={styles.bookRow}>
            <View style={[styles.depthBar, styles.depthBidBar, { width: `${Math.max(8, (bid.total / maxTotal) * 44)}%` }]} />
            <View style={[styles.depthBar, styles.depthAskBar, { width: `${Math.max(8, (ask.total / maxTotal) * 44)}%` }]} />
            <Text style={[styles.bookCell, styles.metricGreen]}>{priceText(bid.price)}</Text>
            <Text style={styles.bookCell}>{compactNumber(bid.size)}</Text>
            <Text style={[styles.bookCellRight, styles.metricRed]}>{priceText(ask.price)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function TradeTape({ trades }: { trades: TradingSnapshot["trades"] }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>Time and sales</Text>
      <Text style={styles.panelTitle}>Recent prints</Text>
      {trades.length === 0 ? (
        <Text style={styles.panelCopy}>No trade prints yet.</Text>
      ) : (
        <View style={styles.tradeTable}>
          {trades.slice(0, 6).map((trade) => (
            <View key={`${trade.time}-${trade.price}`} style={styles.tradeRow}>
              <Text style={styles.tradeTime}>{shortDate(trade.time)}</Text>
              <Text style={[styles.tradePrice, trade.side === "buy" ? styles.metricGreen : styles.metricRed]}>{priceText(trade.price)}</Text>
              <Text style={styles.tradeSize}>{compactNumber(trade.size)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function AccountPanel({ asset, snapshot, orderQuantity }: { asset: Asset; snapshot: TradingSnapshot; orderQuantity: number }) {
  const positionSize = Math.max(1, Math.round(orderQuantity || 10));
  const averageCost = snapshot.vwap || snapshot.lastPrice;
  const pnl = (snapshot.lastPrice - averageCost) * positionSize;

  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>Portfolio</Text>
      <Text style={styles.panelTitle}>Positions and orders</Text>
      <View style={styles.positionRow}>
        <Text style={styles.positionSymbol}>{asset.symbol}</Text>
        <Text style={styles.positionMeta}>{positionSize} sh · avg {formatCurrency(averageCost)}</Text>
        <Text style={[styles.positionPnl, pnl >= 0 ? styles.metricGreen : styles.metricRed]}>{formatCurrency(pnl)}</Text>
      </View>
      <View style={styles.ordersRow}>
        <Text style={styles.panelCopy}>Open orders</Text>
        <Text style={styles.orderCount}>0</Text>
      </View>
    </View>
  );
}

function SentimentPanel({ sentiment }: { sentiment: { bullish: number; neutral: number; bearish: number } }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>Community</Text>
      <Text style={styles.panelTitle}>Thesis sentiment</Text>
      <View style={styles.sentimentRow}>
        <Sentiment label="Bullish" value={sentiment.bullish} color={colors.green} />
        <Sentiment label="Neutral" value={sentiment.neutral} color={colors.blue} />
        <Sentiment label="Bearish" value={sentiment.bearish} color={colors.red} />
      </View>
    </View>
  );
}

function SignalQualityCard({ signal, loading, error }: { signal: MarketSignal | null; loading: boolean; error: string }) {
  if (loading) {
    return (
      <View style={styles.signalCard}>
        <Text style={styles.signalEyebrow}>AI Signal Quality</Text>
        <Text style={styles.signalTitle}>Calculating market context...</Text>
      </View>
    );
  }

  if (!signal) {
    return (
      <View style={styles.signalCard}>
        <Text style={styles.signalEyebrow}>AI Signal Quality</Text>
        <Text style={styles.signalTitle}>Signal unavailable</Text>
        <Text style={styles.signalCopy}>{error || "Load more real candles to calculate technical confirmation."}</Text>
      </View>
    );
  }

  const tone = signal.signal === "bullish" ? "green" : signal.signal === "bearish" ? "red" : "neutral";

  return (
    <View style={styles.signalCard}>
      <View style={styles.signalHeader}>
        <View>
          <Text style={styles.signalEyebrow}>AI Signal Quality</Text>
          <Text style={styles.signalTitle}>{signal.signal.toUpperCase()} · {scoreText(signal.score)}</Text>
        </View>
        <View style={[styles.signalBadge, tone === "green" && styles.signalBadgeGreen, tone === "red" && styles.signalBadgeRed]}>
          <Text style={[styles.signalBadgeText, tone === "green" && styles.signalBadgeTextGreen, tone === "red" && styles.signalBadgeTextRed]}>
            {Math.round(signal.confidence * 100)}%
          </Text>
        </View>
      </View>
      <Text style={styles.signalCopy}>{signal.summary}</Text>
      <View style={styles.signalMetricGrid}>
        <SignalMetric label="Expected move" value={formatPercent(signal.expectedMovePercent)} tone={signal.expectedMovePercent >= 0 ? "green" : "red"} />
        <SignalMetric label="Risk/reward" value={`${signal.riskReward.toFixed(2)}x`} />
        <SignalMetric label="Stop / target" value={`${formatPercent(signal.stopLossPercent)} / ${formatPercent(signal.takeProfitPercent)}`} />
        <SignalMetric label="Volatility" value={formatPercent(signal.volatilityPercent)} />
      </View>
      <View style={styles.signalComponents}>
        {signal.components.map((component) => (
          <View key={component.label} style={styles.signalComponentRow}>
            <View style={styles.signalComponentTop}>
              <Text style={styles.signalComponentLabel}>{component.label}</Text>
              <Text style={[styles.signalComponentScore, component.score >= 0 ? styles.metricGreen : styles.metricRed]}>
                {scoreText(component.score)}
              </Text>
            </View>
            <Text style={styles.signalComponentValue}>{component.value}</Text>
            <Text style={styles.signalComponentDetail}>{component.detail}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.disclaimer}>{signal.notFinancialAdvice}</Text>
    </View>
  );
}

function SignalMetric({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <View style={styles.signalMetric}>
      <Text style={styles.signalMetricLabel}>{label}</Text>
      <Text style={[styles.signalMetricValue, tone === "green" && styles.metricGreen, tone === "red" && styles.metricRed]}>{value}</Text>
    </View>
  );
}

function scoreText(value?: number | null): string {
  if (typeof value !== "number") return "Pending";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
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

function ForecastStats({ candles, forecast }: { candles: Candle[]; forecast: Forecast }) {
  const stats = buildForecastStats(candles, forecast);
  if (!stats) return null;

  return (
    <View style={styles.forecastBlock}>
      <View style={styles.forecastGrid}>
        <ForecastMetric label="Target close" value={formatCurrency(stats.finalMean)} />
        <ForecastMetric label="Projected move" value={formatPercent(stats.projectedMove)} tone={stats.projectedMove >= 0 ? "green" : "red"} />
        <ForecastMetric label="Confidence band" value={`${formatCurrency(stats.finalLower)} - ${formatCurrency(stats.finalUpper)}`} />
        <ForecastMetric label="Risk/reward" value={forecast.riskReward ? `${forecast.riskReward.toFixed(2)}x` : "Pending"} />
      </View>
      <View style={styles.forecastTable}>
        <View style={styles.forecastRowHeader}>
          <Text style={[styles.forecastCell, styles.forecastTime]}>Time</Text>
          <Text style={styles.forecastCell}>Mean</Text>
          <Text style={styles.forecastCell}>Low</Text>
          <Text style={styles.forecastCell}>High</Text>
        </View>
        {forecast.points.slice(0, 6).map((point) => (
          <View key={point.time} style={styles.forecastRow}>
            <Text style={[styles.forecastCell, styles.forecastTime]}>{shortDate(point.time)}</Text>
            <Text style={styles.forecastCell}>{priceText(point.mean)}</Text>
            <Text style={[styles.forecastCell, styles.metricRed]}>{priceText(point.lower)}</Text>
            <Text style={[styles.forecastCell, styles.metricGreen]}>{priceText(point.upper)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ForecastMetric({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <View style={styles.forecastMetric}>
      <Text style={styles.forecastMetricLabel}>{label}</Text>
      <Text style={[styles.forecastMetricValue, tone === "green" && styles.metricGreen, tone === "red" && styles.metricRed]}>
        {value}
      </Text>
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

function buildForecastStats(candles: Candle[], forecast: Forecast) {
  const latest = candles.at(-1);
  const finalPoint = forecast.points.at(-1);
  if (!latest || !finalPoint || latest.close === 0) return null;

  return {
    finalMean: finalPoint.mean,
    finalLower: finalPoint.lower,
    finalUpper: finalPoint.upper,
    projectedMove: ((finalPoint.mean - latest.close) / latest.close) * 100
  };
}

function shortDate(value: string): string {
  const datePart = value.split(/[ T]/)[0];
  const [, month, day] = datePart.split("-");
  if (month && day) return `${month}/${day}`;
  return datePart.slice(0, 8);
}

function priceText(value: number): string {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(1);
  if (value >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

function parseOrderQuantity(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

const styles = StyleSheet.create({
  accountLine: {
    flexDirection: "row"
  },
  bar: {
    borderRadius: 999,
    height: 5,
    marginBottom: 7
  },
  bookCell: {
    color: colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    zIndex: 1
  },
  bookCellRight: {
    color: colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    zIndex: 1
  },
  bookHeader: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingBottom: 7
  },
  bookRow: {
    flexDirection: "row",
    minHeight: 28,
    overflow: "hidden",
    paddingVertical: 6,
    position: "relative"
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
    padding: 18,
    paddingBottom: 32
  },
  chartPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  depthAskBar: {
    backgroundColor: "#FBE3E0",
    right: 0
  },
  depthBar: {
    bottom: 3,
    opacity: 0.8,
    position: "absolute",
    top: 3
  },
  depthBidBar: {
    backgroundColor: "#E0F3E8",
    left: 0
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
  forecastBlock: {
    gap: 10
  },
  forecastCell: {
    color: colors.ink,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right"
  },
  forecastGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  forecastMetric: {
    backgroundColor: colors.surface,
    borderColor: "#DDD2F0",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "31%",
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  forecastMetricLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800"
  },
  forecastMetricValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3
  },
  forecastRow: {
    borderTopColor: "#DDD2F0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 7
  },
  forecastRowHeader: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 6,
    paddingTop: 6
  },
  forecastTable: {
    backgroundColor: "#FAF8FD",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  forecastTime: {
    color: colors.muted,
    flex: 1.2,
    textAlign: "left"
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
  formLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  formRow: {
    gap: 7
  },
  safeArea: {
    alignSelf: "center",
    backgroundColor: colors.background,
    flex: 1,
    maxWidth: 1180,
    width: "100%"
  },
  headerActions: {
    flexDirection: "row",
    gap: 8
  },
  headerIdentity: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between"
  },
  headerKicker: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  iconButtonActive: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal
  },
  mainColumn: {
    flexBasis: 620,
    flexGrow: 1,
    flexShrink: 1,
    gap: 14,
    minWidth: 320
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  orderCount: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  ordersRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10
  },
  orderInput: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  orderSummary: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10
  },
  orderTypeActive: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal
  },
  orderTypeButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8
  },
  orderTypeRow: {
    flexDirection: "row",
    gap: 6
  },
  orderTypeText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  orderTypeTextActive: {
    color: colors.surface
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  panelCopy: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  panelEyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  panelFootnote: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15
  },
  panelHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2
  },
  panelToolbar: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  positionMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  positionPnl: {
    fontSize: 15,
    fontWeight: "900"
  },
  positionRow: {
    gap: 4
  },
  positionSymbol: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  quoteCell: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 120,
    paddingHorizontal: 11,
    paddingVertical: 10
  },
  quoteChange: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3
  },
  quoteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  quoteLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  quotePrice: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 2
  },
  quotePrimary: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1.4,
    minWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  quoteValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4
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
  sideButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10
  },
  sideButtonText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "900"
  },
  sideButtonTextActive: {
    color: colors.surface
  },
  sideColumn: {
    flexBasis: 320,
    flexGrow: 1,
    flexShrink: 1,
    gap: 12,
    minWidth: 280
  },
  sideToggle: {
    flexDirection: "row",
    gap: 8
  },
  buyButtonActive: {
    backgroundColor: colors.green,
    borderColor: colors.green
  },
  sellButtonActive: {
    backgroundColor: colors.red,
    borderColor: colors.red
  },
  reviewButton: {
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 12
  },
  reviewButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  reviewSellButton: {
    backgroundColor: colors.red
  },

  signalBadge: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  signalBadgeGreen: {
    backgroundColor: "#E8F8EF"
  },
  signalBadgeRed: {
    backgroundColor: "#FDECEC"
  },
  signalBadgeText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  signalBadgeTextGreen: {
    color: colors.green
  },
  signalBadgeTextRed: {
    color: colors.red
  },
  signalCard: {
    backgroundColor: "#F8FBFA",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  signalComponentDetail: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3
  },
  signalComponentLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  signalComponentRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8
  },
  signalComponentScore: {
    fontSize: 12,
    fontWeight: "900"
  },
  signalComponentTop: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  signalComponentValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  signalComponents: {
    gap: 8
  },
  signalCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  signalEyebrow: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "900"
  },
  signalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  signalMetric: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexBasis: "47%",
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  signalMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  signalMetricLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800"
  },
  signalMetricValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3
  },
  signalTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  statsRail: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 10
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
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
  tradePrice: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right"
  },
  tradeRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 7
  },
  tradeSize: {
    color: colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right"
  },
  tradeTable: {
    marginTop: 2
  },
  tradeTime: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "800"
  },
  tradingHeader: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14
  },
  workspace: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
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
