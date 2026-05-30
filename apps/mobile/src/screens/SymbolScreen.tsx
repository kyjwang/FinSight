import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CandlestickChart } from "@/components/CandlestickChart";
import { ThesisCard } from "@/components/ThesisCard";
import { demoAssets, demoCandles } from "@/data/demo";
import { communitySentiment } from "@/lib/analytics";
import { colors } from "@/lib/theme";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAppState } from "@/state/AppState";

export function SymbolScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { state, dispatch } = useAppState();
  const asset = demoAssets.find((item) => item.symbol === symbol) ?? demoAssets[0];
  const posts = state.posts.filter((post) => post.asset.symbol === asset.symbol);
  const fallbackPosts = posts.length > 0 ? posts : state.posts.slice(0, 2);
  const sentiment = communitySentiment(fallbackPosts);
  const watching = state.watchlistSymbols.includes(asset.symbol);

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
          <CandlestickChart candles={demoCandles(asset.symbol)} />
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

        <Text style={styles.sectionTitle}>Community theses</Text>
        {fallbackPosts.map((post) => (
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
