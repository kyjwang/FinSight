import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { ThesisCard } from "@/components/ThesisCard";
import { colors } from "@/lib/theme";
import { useAppState } from "@/state/AppState";
import { useState } from "react";

export function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useAppState();
  const [comment, setComment] = useState("");
  const post = state.posts.find((item) => item.id === id) ?? state.posts[0];
  const comments = state.commentsByPostId[post.id] ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThesisCard
          post={post}
          liked={state.likedPostIds.includes(post.id)}
          bookmarked={state.bookmarkedPostIds.includes(post.id)}
          onToggleLike={(postId) => dispatch({ type: "toggleLike", postId })}
          onToggleBookmark={(postId) => dispatch({ type: "toggleBookmark", postId })}
        />
        <View style={styles.panel}>
          <Text style={styles.title}>Result accountability</Text>
          <Text style={styles.copy}>
            This thesis is locked. When the selected horizon expires, FinSight compares the AI scenario and user stance
            against realized candles, then updates the profile accuracy score.
          </Text>
        </View>
        {post.forecast && (
          <View style={styles.panel}>
            <Text style={styles.title}>Model card</Text>
            <Text style={styles.copy}>{post.forecast.modelName}</Text>
            <Text style={styles.copy}>
              Confidence {Math.round(post.forecast.confidence * 100)}% · backtested direction accuracy{" "}
              {Math.round(post.forecast.backtest.directionAccuracy * 100)}% · mean absolute error{" "}
              {post.forecast.backtest.meanAbsoluteError}%.
            </Text>
            <Text style={styles.warning}>Scenario analysis only. Not financial advice.</Text>
          </View>
        )}
        <View style={styles.panel}>
          <Text style={styles.title}>Comments</Text>
          <View style={styles.commentComposer}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Add a thoughtful comment"
              placeholderTextColor={colors.muted}
              style={styles.commentInput}
            />
            <Pressable
              style={styles.commentButton}
              onPress={() => {
                dispatch({ type: "addComment", postId: post.id, body: comment });
                setComment("");
              }}
            >
              <Text style={styles.commentButtonText}>Post</Text>
            </Pressable>
          </View>
          {comments.length === 0 ? (
            <Text style={styles.copy}>No comments yet. Start the discussion.</Text>
          ) : (
            comments.map((item) => (
              <View key={item.id} style={styles.comment}>
                <Avatar label={item.author.avatar} size={32} />
                <View style={styles.commentBody}>
                  <Text style={styles.commentAuthor}>{item.author.name} · {item.createdAt}</Text>
                  <Text style={styles.copy}>{item.body}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 32
  },
  copy: {
    color: colors.muted,
    lineHeight: 20
  },
  comment: {
    alignItems: "flex-start",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingTop: 12
  },
  commentAuthor: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 3
  },
  commentBody: {
    flex: 1
  },
  commentButton: {
    alignItems: "center",
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  commentButtonText: {
    color: colors.surface,
    fontWeight: "900"
  },
  commentComposer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14
  },
  commentInput: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  safeArea: {
    alignSelf: "center",
    backgroundColor: colors.background,
    flex: 1,
    maxWidth: 430,
    width: "100%"
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  warning: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: "900"
  }
});
