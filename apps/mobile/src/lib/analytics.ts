import { ThesisPost } from "@/types";

export function communitySentiment(posts: ThesisPost[]): { bullish: number; neutral: number; bearish: number } {
  const total = Math.max(1, posts.length);
  return {
    bullish: posts.filter((post) => post.stance === "bullish").length / total,
    neutral: posts.filter((post) => post.stance === "neutral").length / total,
    bearish: posts.filter((post) => post.stance === "bearish").length / total
  };
}

export function thesisScore(post: ThesisPost): number {
  const engagement = post.likes * 1.2 + post.comments * 2 + post.bookmarks * 2.4;
  const credibility = post.author.accuracy * 100;
  const resultBonus = post.result?.status === "hit" ? 24 : post.result?.status === "miss" ? -12 : 0;
  return Math.round(engagement + credibility + resultBonus);
}
