import { Bell, Search } from "lucide-react-native";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThesisCard } from "@/components/ThesisCard";
import { colors } from "@/lib/theme";
import { useAppState } from "@/state/AppState";

export function FeedScreen() {
  const { state, dispatch, hydrated } = useAppState();

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={state.posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<FeedHeader hydrated={hydrated} />}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <ThesisCard
            post={item}
            liked={state.likedPostIds.includes(item.id)}
            bookmarked={state.bookmarkedPostIds.includes(item.id)}
            onToggleLike={(postId) => dispatch({ type: "toggleLike", postId })}
            onToggleBookmark={(postId) => dispatch({ type: "toggleBookmark", postId })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

function FeedHeader({ hydrated }: { hydrated: boolean }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.kicker}>FinSight</Text>
        <Text style={styles.title}>Market theses</Text>
        <Text style={styles.status}>{hydrated ? "Local state saved in this browser" : "Loading local state..."}</Text>
      </View>
      <View style={styles.iconRow}>
        <Pressable style={styles.iconButton}><Search size={19} color={colors.ink} /></Pressable>
        <Pressable style={styles.iconButton}><Bell size={19} color={colors.ink} /></Pressable>
      </View>
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>AI scenarios are educational analysis, not financial advice.</Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No theses yet</Text>
      <Text style={styles.emptyCopy}>Create the first market thesis to start the feed.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32
  },
  disclaimer: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  disclaimerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
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
    marginBottom: 16
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  iconRow: {
    flexDirection: "row",
    gap: 8,
    position: "absolute",
    right: 0,
    top: 4
  },
  kicker: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0
  },
  safeArea: {
    alignSelf: "center",
    backgroundColor: colors.background,
    flex: 1,
    maxWidth: 430,
    width: "100%"
  },
  separator: {
    height: 14
  },
  status: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900"
  }
});
