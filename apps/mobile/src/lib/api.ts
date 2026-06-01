import { Asset, Candle, Forecast, Horizon, MarketSignal, Stance } from "@/types";
import { createForecast } from "./forecast";

const defaultApiBaseUrl = process.env.NODE_ENV === "test" ? "" : "https://kyjwang-finsight-api.hf.space";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || defaultApiBaseUrl;

export async function checkApiHealth(): Promise<"online" | "offline" | "local"> {
  if (!apiBaseUrl) return "local";

  try {
    const response = await fetch(`${apiBaseUrl}/health`);
    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export async function fetchCandles(symbol: string, fallback: Candle[], horizon = "1M"): Promise<Candle[]> {
  if (!apiBaseUrl) return fallback;

  try {
    const response = await fetch(`${apiBaseUrl}/market/${encodeURIComponent(symbol)}/candles?interval=1d&horizon=${encodeURIComponent(horizon)}`);
    if (!response.ok) return fallback;
    const json = await response.json();
    return json.candles ?? fallback;
  } catch {
    return fallback;
  }
}


export async function requestMarketSignal(symbol: string, candles: Candle[], horizon: Horizon): Promise<MarketSignal | null> {
  const fallback = createLocalSignal(symbol, candles, horizon);
  if (!apiBaseUrl) return fallback;

  try {
    const response = await fetch(`${apiBaseUrl}/signals/${encodeURIComponent(symbol)}?interval=1d&horizon=${encodeURIComponent(horizon)}`);
    if (!response.ok) return fallback;
    return response.json();
  } catch {
    return fallback;
  }
}

function createLocalSignal(symbol: string, candles: Candle[], horizon: Horizon): MarketSignal | null {
  if (candles.length < 30) return null;

  const lookback = candles.slice(-120);
  const closes = lookback.map((candle) => candle.close);
  const volumes = lookback.map((candle) => candle.volume);
  const latest = lookback[lookback.length - 1];
  const sma20 = average(closes.slice(-20));
  const sma50 = average(closes.slice(-Math.min(50, closes.length)));
  const trendReturn = percentChange(closes[Math.max(0, closes.length - 20)], latest.close);
  const volatility = average(lookback.slice(-14).map((candle) => candle.high - candle.low)) / Math.max(latest.close, 0.01) * 100;
  const volumeRatio = latest.volume / Math.max(1, average(volumes.slice(-20)));
  const trendScore = clamp(((latest.close - sma50) / latest.close) * 420 + trendReturn * 2.4, -100, 100);
  const structureScore = clamp(((sma20 - sma50) / latest.close) * 650, -100, 100);
  const volumeScore = clamp((volumeRatio - 1) * 80 * (trendReturn >= 0 ? 1 : -1), -100, 100);
  const volatilityScore = clamp(35 - volatility * 7, -100, 100);
  const score = round(clamp(trendScore * 0.42 + structureScore * 0.25 + volumeScore * 0.15 + volatilityScore * 0.18, -100, 100), 1);
  const signal = score >= 18 ? "bullish" : score <= -18 ? "bearish" : "neutral";
  const horizonMultiplier = horizon === "1D" ? 0.75 : horizon === "1W" ? 1.35 : 2.35;
  const expectedMovePercent = round((score / 100) * Math.max(volatility, 0.4) * horizonMultiplier, 2);
  const stopLossPercent = round(Math.max(volatility * 1.15, 0.6), 2);
  const takeProfitPercent = round(Math.max(Math.abs(expectedMovePercent), volatility * 0.75), 2);
  const riskReward = round(takeProfitPercent / Math.max(stopLossPercent, 0.01), 2);
  const confidence = round(clamp(0.46 + Math.abs(score) / 220 - Math.max(0, volatility - 5) / 90, 0.35, 0.8), 2);

  return {
    symbol,
    generatedAt: new Date().toISOString(),
    horizon,
    signal,
    score,
    confidence,
    expectedMovePercent,
    riskReward,
    stopLossPercent,
    takeProfitPercent,
    volatilityPercent: round(volatility, 2),
    components: [
      { label: "Trend", value: `${trendReturn >= 0 ? "+" : ""}${trendReturn.toFixed(2)}% / SMA50 ${distanceText(latest.close, sma50)}`, score: round(trendScore, 1), detail: "Recent price direction and medium-term average distance." },
      { label: "Structure", value: `SMA20 ${distanceText(sma20, sma50)} vs SMA50`, score: round(structureScore, 1), detail: "Fast moving average compared with slower average." },
      { label: "Volume", value: `${volumeRatio.toFixed(2)}x 20-day average`, score: round(volumeScore, 1), detail: "Whether participation confirms the move." },
      { label: "Volatility", value: `Range ${round(volatility, 2)}%`, score: round(volatilityScore, 1), detail: "Higher volatility lowers signal quality." }
    ],
    summary: `${symbol} shows a ${signal} local research signal for ${horizon}: score ${score >= 0 ? "+" : ""}${score}, expected move ${expectedMovePercent >= 0 ? "+" : ""}${expectedMovePercent}%, risk/reward ${riskReward}.`,
    notFinancialAdvice: "Research signal only. Not financial advice, not a trade recommendation."
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function percentChange(start: number, end: number): number {
  if (start === 0) return 0;
  return ((end - start) / start) * 100;
}

function distanceText(value: number, reference: number): string {
  const distance = percentChange(reference, value);
  return `${distance >= 0 ? "+" : ""}${distance.toFixed(2)}%`;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, lower: number, upper: number): number {
  return Math.max(lower, Math.min(upper, value));
}

export async function requestForecast(
  symbol: string,
  candles: Candle[],
  horizon: Horizon,
  stance: Stance
): Promise<Forecast> {
  if (!apiBaseUrl) return createForecast(candles, horizon, stance);

  try {
    const response = await fetch(`${apiBaseUrl}/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, candles, horizon, stance })
    });
    if (!response.ok) return createForecast(candles, horizon, stance);
    return response.json();
  } catch {
    return createForecast(candles, horizon, stance);
  }
}

export async function requestKronosForecast(symbol: string, candles: Candle[], horizon: Horizon): Promise<Forecast> {
  if (candles.length < 8) {
    throw new Error("Load at least 8 real candles before running Kronos.");
  }

  const fallback = {
    ...createForecast(candles, horizon, "neutral"),
    modelName: "Kronos unavailable - FinSight Baseline",
    provider: "kronos",
    providerStatus: "fallback",
    fallbackReason: apiBaseUrl
      ? "Kronos endpoint was unavailable, so the web app used the local baseline forecast."
      : "No API URL configured, so FinSight used the local baseline forecast.",
    lookback: Math.min(candles.length, 512)
  };

  if (!apiBaseUrl) return fallback;

  try {
    const response = await fetch(`${apiBaseUrl}/forecast/kronos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, candles: candles.slice(-512), horizon })
    });
    if (!response.ok) return fallback;
    return response.json();
  } catch {
    return fallback;
  }
}

export async function searchAssets(query: string, fallback: Asset[]): Promise<Asset[]> {
  if (!apiBaseUrl || query.trim().length === 0) return fallback;

  try {
    const response = await fetch(`${apiBaseUrl}/assets/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) return fallback;
    const json = await response.json();
    return json.assets ?? fallback;
  } catch {
    return fallback;
  }
}
