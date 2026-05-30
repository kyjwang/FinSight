import { createForecast } from "@/lib/forecast";
import { ChatPreview, Comment, CreateThesisInput, SessionUser, ThesisPost, User } from "@/types";

const localUser: User = {
  id: "local-user",
  handle: "finsight_user",
  name: "FinSight User",
  bio: "Building a public market thesis track record.",
  avatar: "FU",
  followers: 0,
  following: 0,
  accuracy: 0,
  averageReturn: 0
};

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
  | { type: "signInLocal"; email: string }
  | { type: "signInSupabase"; email: string; userId: string }
  | { type: "signOut" }
  | { type: "hydrate"; state: AppState };

export const initialAppState: AppState = {
  posts: [],
  likedPostIds: [],
  bookmarkedPostIds: [],
  watchlistSymbols: [],
  commentsByPostId: {},
  chats: [],
  session: {
    id: "local-session",
    email: "local@finsight.dev",
    profile: localUser,
    mode: "local"
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
      const author = state.session?.profile ?? localUser;
      const post: ThesisPost = {
        id: `local-${Date.now()}`,
        author,
        asset: action.input.asset,
        stance: action.input.stance,
        horizon: action.input.horizon,
        title: action.input.title.trim(),
        body: action.input.body.trim(),
        createdAt: "now",
        locked: true,
        candles: action.input.candles,
        forecast: createForecast(action.input.candles, action.input.horizon, action.input.stance),
        result: { status: "pending" },
        likes: 0,
        comments: 0,
        bookmarks: 0
      };

      return {
        ...state,
        posts: [post, ...state.posts],
        watchlistSymbols: unique([action.input.asset.symbol, ...state.watchlistSymbols])
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
        author: state.session?.profile ?? localUser,
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
    case "signInLocal":
      return {
        ...state,
        session: {
          id: "local-session",
          email: action.email.trim() || "local@finsight.dev",
          profile: localUser,
          mode: "local"
        }
      };
    case "signInSupabase":
      return {
        ...state,
        session: {
          id: action.userId,
          email: action.email,
          profile: {
            ...localUser,
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
