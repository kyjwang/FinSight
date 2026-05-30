import { describe, expect, it } from "vitest";
import { testAsset, testCandles } from "@/test/fixtures";
import { assetWithCandleStats, normalizeSymbol } from "./symbols";

describe("symbols", () => {
  it("normalizes ticker input", () => {
    expect(normalizeSymbol(" btc/usd ")).toBe("BTC-USD");
  });

  it("derives asset price and daily change from candles", () => {
    const candles = testCandles().slice(0, 2);
    const asset = assetWithCandleStats(testAsset, candles);

    expect(asset.price).toBe(candles[1].close);
    expect(asset.changePercent).toBeCloseTo(((candles[1].close - candles[0].close) / candles[0].close) * 100);
  });
});
