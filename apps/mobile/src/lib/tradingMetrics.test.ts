import { describe, expect, it } from "vitest";
import { buildTradingSnapshot } from "./tradingMetrics";
import { Asset, Candle } from "@/types";

const asset: Asset = {
  symbol: "NVDA",
  name: "NVIDIA",
  type: "stock",
  exchange: "NASDAQ",
  price: 124,
  changePercent: 1.2
};

const candles: Candle[] = [
  { time: "2026-01-02", open: 100, high: 105, low: 98, close: 104, volume: 1000 },
  { time: "2026-01-03", open: 104, high: 110, low: 103, close: 108, volume: 2000 },
  { time: "2026-01-04", open: 108, high: 112, low: 107, close: 111, volume: 3000 }
];

describe("tradingMetrics", () => {
  it("builds a quote snapshot from the latest candle", () => {
    const snapshot = buildTradingSnapshot(asset, candles);

    expect(snapshot.lastPrice).toBe(111);
    expect(snapshot.change).toBe(3);
    expect(snapshot.changePercent).toBeCloseTo(2.78, 2);
    expect(snapshot.dayLow).toBe(107);
    expect(snapshot.dayHigh).toBe(112);
    expect(snapshot.averageVolume).toBe(2000);
    expect(snapshot.vwap).toBeCloseTo(107.72, 2);
  });

  it("derives executable-looking paper bid ask levels without crossing the spread", () => {
    const snapshot = buildTradingSnapshot(asset, candles);

    expect(snapshot.bid).toBeLessThan(snapshot.ask);
    expect(snapshot.spreadPercent).toBeGreaterThan(0);
    expect(snapshot.depth.bids).toHaveLength(5);
    expect(snapshot.depth.asks).toHaveLength(5);
    expect(snapshot.depth.bids[0].price).toBe(snapshot.bid);
    expect(snapshot.depth.asks[0].price).toBe(snapshot.ask);
    expect(snapshot.depth.bids[1].price).toBeLessThan(snapshot.depth.bids[0].price);
    expect(snapshot.depth.asks[1].price).toBeGreaterThan(snapshot.depth.asks[0].price);
  });

  it("returns recent trade tape in newest-first order", () => {
    const snapshot = buildTradingSnapshot(asset, candles);

    expect(snapshot.trades.map((trade) => trade.time)).toEqual(["2026-01-04", "2026-01-03", "2026-01-02"]);
    expect(snapshot.trades[0]).toMatchObject({
      price: 111,
      side: "buy",
      size: 3000
    });
  });

  it("falls back to the asset quote when candles are unavailable", () => {
    const snapshot = buildTradingSnapshot(asset, []);

    expect(snapshot.lastPrice).toBe(asset.price);
    expect(snapshot.change).toBe(0);
    expect(snapshot.dayLow).toBe(asset.price);
    expect(snapshot.dayHigh).toBe(asset.price);
    expect(snapshot.trades).toEqual([]);
  });

  it("keeps empty zero-price quotes non-negative while data is loading", () => {
    const snapshot = buildTradingSnapshot({ ...asset, price: 0 }, []);

    expect(snapshot.lastPrice).toBe(0);
    expect(snapshot.bid).toBe(0);
    expect(snapshot.ask).toBe(0);
    expect(snapshot.spread).toBe(0);
    expect(snapshot.spreadPercent).toBe(0);
  });
});
