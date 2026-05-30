import { Send } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { colors } from "@/lib/theme";
import { useAppState } from "@/state/AppState";

export function ChatScreen() {
  const { state, dispatch } = useAppState();
  const [message, setMessage] = useState("");
  const firstChat = state.chats[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={state.chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Chats</Text>
            <View style={styles.searchBox}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Send a demo message"
                placeholderTextColor={colors.muted}
                style={styles.search}
              />
              <Pressable
                style={styles.sendButton}
                onPress={() => {
                  if (!firstChat) return;
                  dispatch({ type: "sendMessage", chatId: firstChat.id, body: message });
                  setMessage("");
                }}
              >
                <Send size={18} color={colors.surface} />
              </Pressable>
            </View>
            <Text style={styles.caption}>Demo mode updates the latest conversation locally.</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.message}>Follow market creators to start conversations.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.chatCard}>
            <Avatar label={item.participant.avatar} />
            <View style={styles.chatBody}>
              <View style={styles.chatTop}>
                <Text style={styles.name}>{item.participant.name}</Text>
                <Text style={styles.time}>{item.updatedAt}</Text>
              </View>
              <Text style={styles.message} numberOfLines={2}>{item.lastMessage}</Text>
            </View>
            {item.unread > 0 && (
              <View style={styles.unread}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            )}
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chatBody: {
    flex: 1
  },
  chatCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  chatTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  content: {
    padding: 16,
    paddingBottom: 32
  },
  caption: {
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
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  name: {
    color: colors.ink,
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
  search: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 14
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    height: 48
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    marginRight: 5,
    width: 38
  },
  separator: {
    height: 12
  },
  time: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900"
  },
  unread: {
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    width: 22
  },
  unreadText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900"
  }
});
