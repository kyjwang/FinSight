import { demoAssets, demoCandles, demoChats, demoPosts, demoUsers } from "@/data/demo";
import { createForecast } from "@/lib/forecast";
import { ChatPreview, Comment, CreateThesisInput, SessionUser, ThesisPost } from "@/types";

export type AppState = {
  posts: ThesisPost[];
  likedPostIds: string[];
  bookmarkedPostIds: string[];
  watchlistSymbols: string[];
  commentsByPostId: Record<string, Comment[]>;
  chats: ChatPreview[];
  session: SessionUser | null;
};

export type AppAction =
  | { type: "createThesis"; input: CreateThesisInput }
  | { type: "toggleLike"; postId: string }
  | { type: "toggleBookmark"; postId: string }
  | { type: "toggleWatchlist"; symbol: string }
  | { type: "addComment"; postId: string; body: string }
  | { type: "sendMessage"; chatId: string; body: string }
  | { type: "signInDemo"; email: string }
  | { type: "signInSupabase"; email: string; userId: string }
  | { type: "signOut" }
  | { type: "hydrate"; state: AppState };

export const initialAppState: AppState = {
  posts: demoPosts,
  likedPostIds: ["p1"],
  bookmarkedPostIds: ["p1", "p2"],
  watchlistSymbols: ["NVDA", "BTC-USD"],
  commentsByPostId: {
    p1: [
      {
        id: "comment-p1-1",
        postId: "p1",
        author: demoUsers[2],
        body: "The invalidation level makes this much more useful than a normal bullish post.",
        createdAt: "12m"
      }
    ],
    p2: [
      {
        id: "comment-p2-1",
        postId: "p2",
        author: demoUsers[0],
        body: "I like waiting for confirmation here. The range has been unforgiving.",
        createdAt: "42m"
      }
    ]
  },
  chats: demoChats,
  session: {
    id: "demo-session",
    email: "demo@finsight.dev",
    profile: demoUsers[0],
    mode: "demo"
  }
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "hydrate":
      return {
        ...initialAppState,
        ...action.state,
        commentsByPostId: {
          ...initialAppState.commentsByPostId,
          ...action.state.commentsByPostId
        }
      };
    case "createThesis": {
      const asset = demoAssets.find((item) => item.symbol === action.input.symbol) ?? demoAssets[0];
      const candles = demoPosts.find((post) => post.asset.symbol === asset.symbol)?.candles ?? demoCandles(asset.symbol);
      const author = state.session?.profile ?? demoUsers[0];
      const post: ThesisPost = {
        id: `local-${Date.now()}`,
        author,
        asset,
        stance: action.input.stance,
        horizon: action.input.horizon,
        title: action.input.title.trim(),
        body: action.input.body.trim(),
        createdAt: "now",
        locked: true,
        candles,
        forecast: createForecast(candles, action.input.horizon, action.input.stance),
        result: { status: "pending" },
        likes: 0,
        comments: 0,
        bookmarks: 0
      };

      return {
        ...state,
        posts: [post, ...state.posts],
        watchlistSymbols: unique([asset.symbol, ...state.watchlistSymbols])
      };
    }
    case "toggleLike": {
      const liked = state.likedPostIds.includes(action.postId);
      return {
        ...state,
        likedPostIds: liked
          ? state.likedPostIds.filter((id) => id !== action.postId)
          : [...state.likedPostIds, action.postId],
        posts: state.posts.map((post) =>
          post.id === action.postId ? { ...post, likes: Math.max(0, post.likes + (liked ? -1 : 1)) } : post
        )
      };
    }
    case "toggleBookmark": {
      const bookmarked = state.bookmarkedPostIds.includes(action.postId);
      return {
        ...state,
        bookmarkedPostIds: bookmarked
          ? state.bookmarkedPostIds.filter((id) => id !== action.postId)
          : [...state.bookmarkedPostIds, action.postId],
        posts: state.posts.map((post) =>
          post.id === action.postId ? { ...post, bookmarks: Math.max(0, post.bookmarks + (bookmarked ? -1 : 1)) } : post
        )
      };
    }
    case "toggleWatchlist":
      return {
        ...state,
        watchlistSymbols: state.watchlistSymbols.includes(action.symbol)
          ? state.watchlistSymbols.filter((symbol) => symbol !== action.symbol)
          : [...state.watchlistSymbols, action.symbol]
      };
    case "addComment": {
      const body = action.body.trim();
      if (!body) return state;

      const comment: Comment = {
        id: `comment-${Date.now()}`,
        postId: action.postId,
        author: state.session?.profile ?? demoUsers[0],
        body,
        createdAt: "now"
      };

      return {
        ...state,
        commentsByPostId: {
          ...state.commentsByPostId,
          [action.postId]: [comment, ...(state.commentsByPostId[action.postId] ?? [])]
        },
        posts: state.posts.map((post) =>
          post.id === action.postId ? { ...post, comments: post.comments + 1 } : post
        )
      };
    }
    case "sendMessage": {
      const body = action.body.trim();
      if (!body) return state;

      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === action.chatId ? { ...chat, lastMessage: body, unread: 0, updatedAt: "now" } : chat
        )
      };
    }
    case "signInDemo":
      return {
        ...state,
        session: {
          id: "demo-session",
          email: action.email.trim() || "demo@finsight.dev",
          profile: demoUsers[0],
          mode: "demo"
        }
      };
    case "signInSupabase":
      return {
        ...state,
        session: {
          id: action.userId,
          email: action.email,
          profile: {
            ...demoUsers[0],
            id: action.userId,
            handle: action.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 24) || "finsight_user",
            name: action.email.split("@")[0] || "FinSight User"
          },
          mode: "supabase"
        }
      };
    case "signOut":
      return { ...state, session: null };
    default:
      return state;
  }
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
