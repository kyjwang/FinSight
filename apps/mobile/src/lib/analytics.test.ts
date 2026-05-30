import { describe, expect, it } from "vitest";
import { testPosts } from "@/test/fixtures";
import { communitySentiment, thesisScore } from "./analytics";

describe("analytics", () => {
  it("computes normalized community sentiment", () => {
    const sentiment = communitySentiment(testPosts());
    const total = sentiment.bullish + sentiment.neutral + sentiment.bearish;

    expect(total).toBeCloseTo(1);
    expect(sentiment.bullish).toBeGreaterThan(0);
  });

  it("scores theses from credibility, engagement, and result", () => {
    const [post] = testPosts();
    expect(thesisScore(post)).toBeGreaterThan(thesisScore({ ...post, likes: 0, comments: 0, bookmarks: 0 }));
  });
});
