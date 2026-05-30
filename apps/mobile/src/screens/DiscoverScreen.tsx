import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StancePill } from "@/components/StancePill";
import { communitySentiment } from "@/lib/analytics";
import { checkApiHealth, fetchCandles, searchAssets } from "@/lib/api";
import { assetFromSymbol, assetWithCandleStats, normalizeSymbol } from "@/lib/symbols";
import { colors } from "@/lib/theme";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAppState } from "@/state/AppState";
import { Asset } from "@/types";

const quickSymbols = ["NVDA", "AAPL", "MSFT", "BTC-USD", "ETH-USD"];

export function DiscoverScreen() {
  const router = useRouter();
  const { state, dispatch } = useAppState();
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("Type a ticker like NVDA or BTC-USD, then search real market data.");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline" | "local">("checking");
  const sentiment = communitySentiment(state.posts);

  useEffect(() => {
    let active = true;

    checkApiHealth().then((status) => {
      if (active) setApiStatus(status);
    });

    return () => {
      active = false;
    };
  }, []);

  async function runSearch(input = query) {
    const symbol = normalizeSymbol(input);
    if (!symbol) {
      setAssets([]);
      setNotice("Enter a valid ticker symbol, for example NVDA.");
      return;
    }

    setLoading(true);
    setNotice("");
    const fallback = [assetFromSymbol(symbol)];

    try {
      const results = await searchAssets(symbol, fallback);
      const baseAssets = results.length > 0 ? results : fallback;
      const enrichedAssets = await Promise.all(
        baseAssets.map(async (asset) => assetWithCandleStats(asset, await fetchCandles(asset.symbol, [])))
      );
      setAssets(enrichedAssets);
      if (results.length === 0) {
        setNotice("API is not configured, so FinSight can only prepare the symbol route. Start FastAPI for live candles.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={assets}
        keyExtractor={(item) => item.symbol}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Discover</Text>
            <View style={styles.statusCard}>
              <View style={[styles.statusDot, apiStatus === "online" && styles.statusDotOnline, apiStatus === "offline" && styles.statusDotOffline]} />
              <View style={styles.statusTextColumn}>
                <Text style={styles.statusTitle}>
                  {apiStatus === "online" ? "Hosted market API online" : apiStatus === "offline" ? "Market API unreachable" : "Checking market API"}
                </Text>
                <Text style={styles.statusCopy}>
                  {apiStatus === "online"
                    ? "Search results load real Yahoo Finance candles and Kronos can run from the backend."
                    : "The app still opens, but real candles and Kronos need the hosted FastAPI service."}
                </Text>
              </View>
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search stocks or crypto"
              placeholderTextColor={colors.muted}
              style={styles.search}
              autoCapitalize="characters"
              onSubmitEditing={() => runSearch()}
            />
            <Pressable style={styles.searchButton} onPress={() => runSearch()}>
              <Text style={styles.searchButtonText}>{loading ? "Searching..." : "Search"}</Text>
            </Pressable>
            <View style={styles.quickRow}>
              {quickSymbols.map((symbol) => (
                <Pressable
                  key={symbol}
                  style={styles.quickButton}
                  onPress={() => {
                    setQuery(symbol);
                    runSearch(symbol);
                  }}
                >
                  <Text style={styles.quickText}>{symbol}</Text>
                </Pressable>
              ))}
            </View>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <View style={styles.sentimentCard}>
              <Text style={styles.sectionTitle}>Community sentiment</Text>
              <View style={styles.sentimentRow}>
                <Metric label="Bullish" value={`${Math.round(sentiment.bullish * 100)}%`} color={colors.green} />
                <Metric label="Neutral" value={`${Math.round(sentiment.neutral * 100)}%`} color={colors.blue} />
                <Metric label="Bearish" value={`${Math.round(sentiment.bearish * 100)}%`} color={colors.red} />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No symbols found</Text>
            <Text style={styles.emptyCopy}>Search a real ticker to load it from the API.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.assetCard}
            onPress={() => router.push({ pathname: "/symbol/[symbol]", params: { symbol: item.symbol } })}
          >
            <View style={styles.assetTop}>
              <View>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.name}>{item.name} · {item.exchange}</Text>
              </View>
              <View style={styles.priceBlock}>
                <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                <Text style={[styles.change, { color: item.changePercent >= 0 ? colors.green : colors.red }]}>
                  {formatPercent(item.changePercent)}
                </Text>
              </View>
            </View>
            <View style={styles.assetBottom}>
              <StancePill stance={item.changePercent >= 0 ? "bullish" : "bearish"} />
              <Pressable
                style={[
                  styles.watchButton,
                  state.watchlistSymbols.includes(item.symbol) && styles.watchButtonActive
                ]}
                onPress={(event) => {
                  event.stopPropagation();
                  dispatch({ type: "toggleWatchlist", symbol: item.symbol });
                }}
              >
                <Text
                  style={[
                    styles.watchText,
                    state.watchlistSymbols.includes(item.symbol) && styles.watchTextActive
                  ]}
                >
                  {state.watchlistSymbols.includes(item.symbol) ? "Watching" : "Watch"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  assetBottom: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  assetCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  assetTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  caption: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  change: {
    fontWeight: "900"
  },
  content: {
    padding: 16,
    paddingBottom: 32
  },
  empty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18
  },
  emptyCopy: {
    color: colors.muted,
    lineHeight: 20
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6
  },
  header: {
    gap: 14,
    marginBottom: 16
  },
  metric: {
    flex: 1
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4
  },
  name: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  price: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  priceBlock: {
    alignItems: "flex-end"
  },
  quickButton: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  quickText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  safeArea: {
    alignSelf: "center",
    backgroundColor: colors.background,
    flex: 1,
    maxWidth: 430,
    width: "100%"
  },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 13
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    paddingVertical: 13
  },
  searchButtonText: {
    color: colors.surface,
    fontWeight: "900"
  },
  statusCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  statusCopy: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3
  },
  statusDot: {
    backgroundColor: colors.amber,
    borderRadius: 999,
    height: 10,
    marginTop: 4,
    width: 10
  },
  statusDotOffline: {
    backgroundColor: colors.red
  },
  statusDotOnline: {
    backgroundColor: colors.green
  },
  statusTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  statusTextColumn: {
    flex: 1
  },
  notice: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  sentimentCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  sentimentRow: {
    flexDirection: "row"
  },
  separator: {
    height: 12
  },
  symbol: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900"
  },
  watchButton: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  watchButtonActive: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal
  },
  watchText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  watchTextActive: {
    color: colors.surface
  }
});
