import { Asset, Candle, ChatPreview, ThesisPost, User } from "@/types";
import { createForecast } from "@/lib/forecast";

export const demoUsers: User[] = [
  {
    id: "u1",
    handle: "mayaquant",
    name: "Maya Chen",
    bio: "Macro charts, semiconductor cycles, and ruthless backtests.",
    avatar: "MC",
    followers: 18420,
    following: 212,
    accuracy: 0.68,
    averageReturn: 4.2
  },
  {
    id: "u2",
    handle: "nordicflow",
    name: "Jonas Berg",
    bio: "Swing trading crypto and high-volume breakouts.",
    avatar: "JB",
    followers: 7320,
    following: 408,
    accuracy: 0.61,
    averageReturn: 2.8
  },
  {
    id: "u3",
    handle: "riskledger",
    name: "Ari Patel",
    bio: "I care more about invalidation than being right.",
    avatar: "AP",
    followers: 12670,
    following: 180,
    accuracy: 0.64,
    averageReturn: 3.1
  }
];

export const demoAssets: Asset[] = [
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", exchange: "NASDAQ", price: 124.7, changePercent: 2.18 },
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", exchange: "NASDAQ", price: 196.4, changePercent: -0.72 },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", exchange: "NASDAQ", price: 184.2, changePercent: 1.08 },
  { symbol: "BTC-USD", name: "Bitcoin", type: "crypto", exchange: "Coinbase", price: 104830, changePercent: 0.94 },
  { symbol: "ETH-USD", name: "Ethereum", type: "crypto", exchange: "Coinbase", price: 3840, changePercent: -1.26 }
];

export function demoCandles(symbol: string): Candle[] {
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const start = symbol.includes("BTC") ? 97000 : symbol.includes("ETH") ? 3200 : 90 + (seed % 140);
  const volatility = symbol.includes("USD") ? 0.028 : 0.018;

  return Array.from({ length: 36 }, (_, index) => {
    const wave = Math.sin((index + seed) / 4) * volatility;
    const trend = (index - 18) * 0.0025;
    const close = start * (1 + wave + trend + Math.cos(index / 3) * volatility * 0.4);
    const open = close * (1 + Math.sin(index) * volatility * 0.28);
    const high = Math.max(open, close) * (1 + volatility * (0.5 + ((index + seed) % 4) / 10));
    const low = Math.min(open, close) * (1 - volatility * (0.45 + ((index + seed) % 3) / 10));

    return {
      time: `D-${35 - index}`,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: Math.round(1_000_000 + ((index + seed) % 9) * 220_000)
    };
  });
}

export const demoPosts: ThesisPost[] = [
  {
    id: "p1",
    author: demoUsers[0],
    asset: demoAssets[0],
    stance: "bullish",
    horizon: "1W",
    title: "NVDA pullback still looks constructive",
    body: "Demand narrative is intact, but I only like this if buyers defend the prior breakout. My invalidation is a daily close under the volume shelf.",
    createdAt: "28m",
    locked: true,
    candles: demoCandles("NVDA"),
    forecast: createForecast(demoCandles("NVDA"), "1W", "bullish"),
    result: { status: "pending" },
    likes: 1240,
    comments: 186,
    bookmarks: 420
  },
  {
    id: "p2",
    author: demoUsers[1],
    asset: demoAssets[3],
    stance: "neutral",
    horizon: "1D",
    title: "BTC compression before the weekend",
    body: "Volatility is shrinking while spot holds the upper half of the range. I am waiting for confirmation instead of chasing the first wick.",
    createdAt: "1h",
    locked: true,
    candles: demoCandles("BTC-USD"),
    forecast: createForecast(demoCandles("BTC-USD"), "1D", "neutral"),
    result: { status: "hit", realizedMovePercent: 1.8, forecastErrorPercent: 0.9 },
    likes: 890,
    comments: 94,
    bookmarks: 312
  },
  {
    id: "p3",
    author: demoUsers[2],
    asset: demoAssets[1],
    stance: "bearish",
    horizon: "1M",
    title: "AAPL needs a catalyst",
    body: "The chart is not broken, but relative strength is fading. I expect sideways-to-lower unless the next event changes the growth story.",
    createdAt: "3h",
    locked: true,
    candles: demoCandles("AAPL"),
    forecast: createForecast(demoCandles("AAPL"), "1M", "bearish"),
    result: { status: "miss", realizedMovePercent: 2.1, forecastErrorPercent: 3.8 },
    likes: 642,
    comments: 78,
    bookmarks: 201
  }
];

export const demoChats: ChatPreview[] = [
  {
    id: "c1",
    participant: demoUsers[0],
    lastMessage: "Your NVDA chart is close to my weekly model. Watching the same shelf.",
    unread: 2,
    updatedAt: "4m"
  },
  {
    id: "c2",
    participant: demoUsers[1],
    lastMessage: "Want to compare BTC ranges before US open?",
    unread: 0,
    updatedAt: "31m"
  },
  {
    id: "c3",
    participant: demoUsers[2],
    lastMessage: "I added a stricter invalidation rule to the thesis.",
    unread: 1,
    updatedAt: "2h"
  }
];

function round(value: number): number {
  return Number(value.toFixed(2));
}
