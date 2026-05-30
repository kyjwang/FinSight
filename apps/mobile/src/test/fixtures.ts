import { Asset, Candle, ThesisPost, User } from "@/types";
import { createForecast } from "@/lib/forecast";

export const testUser: User = {
  id: "test-user",
  handle: "test_user",
  name: "Test User",
  bio: "Test profile",
  avatar: "TU",
  followers: 0,
  following: 0,
  accuracy: 0.5,
  averageReturn: 0
};

export const testAsset: Asset = {
  symbol: "NVDA",
  name: "NVDA",
  type: "stock",
  exchange: "Yahoo Finance",
  price: 0,
  changePercent: 0
};

export function testCandles(count = 36): Candle[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index;
    return {
      time: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1_000_000 + index * 1000
    };
  });
}

export function testPosts(): ThesisPost[] {
  const candles = testCandles();
  return [
    {
      id: "test-post-1",
      author: testUser,
      asset: testAsset,
      stance: "bullish",
      horizon: "1W",
      title: "Test thesis",
      body: "Testing a realistic thesis with loaded candles.",
      createdAt: "now",
      locked: true,
      candles,
      forecast: createForecast(candles, "1W", "bullish"),
      result: { status: "pending" },
      likes: 10,
      comments: 2,
      bookmarks: 3
    }
  ];
}
