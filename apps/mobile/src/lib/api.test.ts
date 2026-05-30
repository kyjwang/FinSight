import { describe, expect, it } from "vitest";
import { testAsset, testCandles } from "@/test/fixtures";
import { fetchCandles, requestForecast, requestKronosForecast, searchAssets } from "./api";

describe("api fallback behavior", () => {
  it("returns fallback candles when no API base URL is configured", async () => {
    const fallback = testCandles();
    await expect(fetchCandles("NVDA", fallback)).resolves.toBe(fallback);
  });

  it("returns local forecast when no API base URL is configured", async () => {
    const forecast = await requestForecast("NVDA", testCandles(), "1W", "bullish");
    expect(forecast.modelName).toContain("FinSight");
  });

  it("returns Kronos fallback metadata when no API base URL is configured", async () => {
    const forecast = await requestKronosForecast("NVDA", testCandles(), "1W");
    expect(forecast.modelName).toContain("Kronos unavailable");
    expect(forecast.provider).toBe("kronos");
    expect(forecast.providerStatus).toBe("fallback");
  });

  it("returns fallback asset search when no API base URL is configured", async () => {
    const fallback = [testAsset];
    await expect(searchAssets("NVDA", fallback)).resolves.toBe(fallback);
  });
});
