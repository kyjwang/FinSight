import { describe, expect, it } from "vitest";
import { appReducer, initialAppState } from "./appStateModel";

describe("appReducer", () => {
  it("adds a created thesis to the top of the feed and watchlist", () => {
    const next = appReducer(initialAppState, {
      type: "createThesis",
      input: {
        symbol: "ETH-USD",
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
    const liked = appReducer(initialAppState, { type: "toggleLike", postId: "p2" });
    const bookmarked = appReducer(liked, { type: "toggleBookmark", postId: "p3" });
    const commented = appReducer(bookmarked, { type: "addComment", postId: "p3", body: "Useful risk framing." });
    const watched = appReducer(commented, { type: "toggleWatchlist", symbol: "AAPL" });

    expect(watched.likedPostIds).toContain("p2");
    expect(watched.bookmarkedPostIds).toContain("p3");
    expect(watched.commentsByPostId.p3[0].body).toBe("Useful risk framing.");
    expect(watched.watchlistSymbols).toContain("AAPL");
  });
});
