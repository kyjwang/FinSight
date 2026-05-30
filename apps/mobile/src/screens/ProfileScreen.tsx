import { Settings } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { ThesisCard } from "@/components/ThesisCard";
import { colors } from "@/lib/theme";
import { compactNumber, formatPercent } from "@/lib/format";
import { useAppState } from "@/state/AppState";
import { isSupabaseConfigured } from "@/lib/supabase";
import { signInOrSignUpWithEmail, signOutFromSupabase } from "@/lib/supabasePersistence";

export function ProfileScreen() {
  const { state, dispatch } = useAppState();
  const [email, setEmail] = useState(state.session?.email ?? "local@finsight.dev");
  const [password, setPassword] = useState("finsight-local");
  const [authNotice, setAuthNotice] = useState("");
  const user = state.session?.profile;
  const posts = state.posts.filter((post) => post.author.id === user?.id || post.id === "p2");

  async function handleAuth() {
    if (!isSupabaseConfigured) {
      dispatch({ type: "signInLocal", email });
      setAuthNotice("Signed in with browser-local persistence.");
      return;
    }

    const result = await signInOrSignUpWithEmail(email, password);
    if (result.ok) {
      dispatch({ type: "signInSupabase", email: result.email, userId: result.userId });
      setAuthNotice("Signed in with Supabase.");
      return;
    }

    dispatch({ type: "signInLocal", email });
    setAuthNotice(result.message);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            {user ? (
              <>
                <View style={styles.profileTop}>
                  <Avatar label={user.avatar} size={72} />
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => {
                      signOutFromSupabase().catch(() => undefined);
                      dispatch({ type: "signOut" });
                    }}
                  >
                    <Settings size={19} color={colors.ink} />
                  </Pressable>
                </View>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.handle}>@{user.handle} · {state.session?.mode === "supabase" ? "Supabase" : "Local mode"}</Text>
                <Text style={styles.bio}>{user.bio}</Text>
                <View style={styles.stats}>
                  <ProfileStat label="Followers" value={compactNumber(user.followers)} />
                  <ProfileStat label="Accuracy" value={`${Math.round(user.accuracy * 100)}%`} />
                  <ProfileStat label="Avg return" value={formatPercent(user.averageReturn)} />
                </View>
              </>
            ) : (
              <View style={styles.authPanel}>
                <Text style={styles.authTitle}>Sign in to persistence</Text>
                <Text style={styles.authCopy}>
                  {isSupabaseConfigured
                    ? "Supabase credentials are configured. Email/password auth can be enabled against the schema."
                    : "Supabase env vars are missing, so this uses browser-local mode."}
                </Text>
                <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholderTextColor={colors.muted} />
                {isSupabaseConfigured && (
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={colors.muted}
                  />
                )}
                {authNotice ? <Text style={styles.authNotice}>{authNotice}</Text> : null}
                <Pressable style={styles.signInButton} onPress={handleAuth}>
                  <Text style={styles.signInText}>{isSupabaseConfigured ? "Continue with Supabase" : "Continue locally"}</Text>
                </Pressable>
              </View>
            )}
            <Text style={styles.sectionTitle}>Recent theses</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.bio}>Create a thesis to see it appear on your profile.</Text>}
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

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  authCopy: {
    color: colors.muted,
    lineHeight: 20
  },
  authPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  authTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  authNotice: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  bio: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  },
  content: {
    padding: 16,
    paddingBottom: 32
  },
  handle: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2
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
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  name: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 14
  },
  profileTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
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
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18
  },
  separator: {
    height: 14
  },
  signInButton: {
    alignItems: "center",
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    paddingVertical: 13
  },
  signInText: {
    color: colors.surface,
    fontWeight: "900"
  },
  stat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4
  },
  stats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  },
  statValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  }
});
