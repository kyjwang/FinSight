import { Bookmark, Heart, MessageCircle, ShieldCheck } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar } from "./Avatar";
import { CandlestickChart } from "./CandlestickChart";
import { StancePill } from "./StancePill";
import { StatBadge } from "./StatBadge";
import { colors } from "@/lib/theme";
import { compactNumber, formatPercent } from "@/lib/format";
import { persistEngagementToSupabase } from "@/lib/supabasePersistence";
import { ThesisPost } from "@/types";

type Props = {
  post: ThesisPost;
  liked?: boolean;
  bookmarked?: boolean;
  onToggleLike?: (postId: string) => void;
  onToggleBookmark?: (postId: string) => void;
};

export function ThesisCard({ post, liked = false, bookmarked = false, onToggleLike, onToggleBookmark }: Props) {
  const router = useRouter();
  const resultTone = post.result?.status === "hit" ? "green" : post.result?.status === "miss" ? "red" : "blue";

  return (
    <Pressable style={styles.card} onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })}>
      <View style={styles.header}>
        <Avatar label={post.author.avatar} />
        <View style={styles.authorBlock}>
          <Text style={styles.author}>{post.author.name}</Text>
          <Text style={styles.meta}>@{post.author.handle} · {post.createdAt} · locked thesis</Text>
        </View>
        <StancePill stance={post.stance} />
      </View>

      <View style={styles.assetRow}>
        <Pressable
          onPress={() => router.push({ pathname: "/symbol/[symbol]", params: { symbol: post.asset.symbol } })}
          style={styles.symbolButton}
        >
          <Text style={styles.symbol}>{post.asset.symbol}</Text>
          <Text style={styles.exchange}>{post.asset.exchange}</Text>
        </Pressable>
        <Text style={[styles.change, { color: post.asset.changePercent >= 0 ? colors.green : colors.red }]}>
          {formatPercent(post.asset.changePercent)}
        </Text>
      </View>

      <CandlestickChart candles={post.candles} forecast={post.forecast} />

      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.body}>{post.body}</Text>

      {post.forecast && (
        <View style={styles.forecastBox}>
          <ShieldCheck color={colors.violet} size={18} />
          <View style={styles.forecastCopy}>
            <Text style={styles.forecastTitle}>{post.forecast.modelName}</Text>
            <Text style={styles.forecastText}>{post.forecast.summary}</Text>
          </View>
        </View>
      )}

      <View style={styles.stats}>
        <StatBadge label="Horizon" value={post.horizon} tone="blue" />
        <StatBadge label="Accuracy" value={`${Math.round(post.author.accuracy * 100)}%`} tone="green" />
        <StatBadge
          label="Result"
          value={post.result?.status === "pending" ? "Pending" : post.result?.status.toUpperCase() ?? "Pending"}
          tone={resultTone}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.action}
          onPress={(event) => {
            event.stopPropagation();
            onToggleLike?.(post.id);
            persistEngagementToSupabase(post.id, "likes", !liked).catch(() => undefined);
          }}
        >
          <Heart size={18} color={liked ? colors.red : colors.muted} fill={liked ? colors.red : "transparent"} />
          <Text style={[styles.actionText, liked && styles.likedText]}>{compactNumber(post.likes)}</Text>
        </Pressable>
        <View style={styles.action}><MessageCircle size={18} color={colors.muted} /><Text style={styles.actionText}>{compactNumber(post.comments)}</Text></View>
        <Pressable
          style={styles.action}
          onPress={(event) => {
            event.stopPropagation();
            onToggleBookmark?.(post.id);
            persistEngagementToSupabase(post.id, "bookmarks", !bookmarked).catch(() => undefined);
          }}
        >
          <Bookmark
            size={18}
            color={bookmarked ? colors.blue : colors.muted}
            fill={bookmarked ? colors.blue : "transparent"}
          />
          <Text style={[styles.actionText, bookmarked && styles.bookmarkedText]}>{compactNumber(post.bookmarks)}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  actionText: {
    color: colors.muted,
    fontWeight: "700"
  },
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 22,
    paddingTop: 14
  },
  assetRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  author: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  authorBlock: {
    flex: 1
  },
  bookmarkedText: {
    color: colors.blue
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  change: {
    fontWeight: "900"
  },
  exchange: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  forecastBox: {
    alignItems: "flex-start",
    backgroundColor: "#F1EDF8",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  forecastCopy: {
    flex: 1
  },
  forecastText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  forecastTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 2
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  likedText: {
    color: colors.red
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  stats: {
    flexDirection: "row",
    gap: 8
  },
  symbol: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  symbolButton: {
    gap: 2
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23
  }
});
