import { describe, expect, it } from "vitest";
import { createForecast } from "./forecast";
import { demoCandles } from "../data/demo";

describe("createForecast", () => {
  it("creates bounded forecast points and backtest metadata", () => {
    const forecast = createForecast(demoCandles("NVDA"), "1W", "bullish");

    expect(forecast.points.length).toBe(8);
    expect(forecast.confidence).toBeGreaterThanOrEqual(0.52);
    expect(forecast.confidence).toBeLessThanOrEqual(0.78);
    expect(forecast.backtest.sampleSize).toBe(180);
    expect(forecast.points[0].lower).toBeLessThan(forecast.points[0].mean);
    expect(forecast.points[0].upper).toBeGreaterThan(forecast.points[0].mean);
  });
});
