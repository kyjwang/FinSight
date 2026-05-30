import { describe, expect, it } from "vitest";
import { demoPosts } from "@/data/demo";
import { communitySentiment, thesisScore } from "./analytics";

describe("analytics", () => {
  it("computes normalized community sentiment", () => {
    const sentiment = communitySentiment(demoPosts);
    const total = sentiment.bullish + sentiment.neutral + sentiment.bearish;

    expect(total).toBeCloseTo(1);
    expect(sentiment.bullish).toBeGreaterThan(0);
  });

  it("scores theses from credibility, engagement, and result", () => {
    expect(thesisScore(demoPosts[0])).toBeGreaterThan(thesisScore({ ...demoPosts[0], likes: 0, comments: 0, bookmarks: 0 }));
  });
});
