import { describe, expect, it } from "vitest";
import { appReducer, initialAppState } from "./appStateModel";
import { testAsset, testCandles, testPosts } from "@/test/fixtures";

describe("appReducer", () => {
  it("adds a created thesis to the top of the feed and watchlist", () => {
    const next = appReducer(initialAppState, {
      type: "createThesis",
      input: {
        asset: { ...testAsset, symbol: "ETH-USD", type: "crypto" },
        candles: testCandles(),
        stance: "bullish",
        horizon: "1W",
        title: "ETH reclaim setup",
        body: "Watching whether buyers can reclaim the prior breakdown level."
      }
    });

    expect(next.posts[0].title).toBe("ETH reclaim setup");
    expect(next.posts[0].forecast?.points.length).toBe(8);
    expect(next.watchlistSymbols).toContain("ETH-USD");
  });

  it("toggles likes, bookmarks, comments, and watchlist rows locally", () => {
    const stateWithPost = { ...initialAppState, posts: testPosts() };
    const postId = stateWithPost.posts[0].id;
    const liked = appReducer(stateWithPost, { type: "toggleLike", postId });
    const bookmarked = appReducer(liked, { type: "toggleBookmark", postId });
    const commented = appReducer(bookmarked, { type: "addComment", postId, body: "Useful risk framing." });
    const watched = appReducer(commented, { type: "toggleWatchlist", symbol: "AAPL" });

    expect(watched.likedPostIds).toContain(postId);
    expect(watched.bookmarkedPostIds).toContain(postId);
    expect(watched.commentsByPostId[postId][0].body).toBe("Useful risk framing.");
    expect(watched.watchlistSymbols).toContain("AAPL");
  });
});
