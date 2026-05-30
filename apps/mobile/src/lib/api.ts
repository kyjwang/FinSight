import { Asset, Candle, Forecast, Horizon, Stance } from "@/types";
import { createForecast } from "./forecast";

const defaultApiBaseUrl = process.env.NODE_ENV === "test" ? "" : "https://kyjwang-finsight-api.hf.space";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || defaultApiBaseUrl;

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
