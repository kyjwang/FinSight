import { describe, expect, it } from "vitest";
import { demoAssets, demoCandles } from "@/data/demo";
import { fetchCandles, requestForecast, searchAssets } from "./api";

describe("api fallback behavior", () => {
  it("returns fallback candles when no API base URL is configured", async () => {
    const fallback = demoCandles("NVDA");
    await expect(fetchCandles("NVDA", fallback)).resolves.toBe(fallback);
  });

  it("returns local forecast when no API base URL is configured", async () => {
    const forecast = await requestForecast("NVDA", demoCandles("NVDA"), "1W", "bullish");
    expect(forecast.modelName).toContain("FinSight");
  });

  it("returns fallback asset search when no API base URL is configured", async () => {
    await expect(searchAssets("NVDA", demoAssets)).resolves.toBe(demoAssets);
  });
});
