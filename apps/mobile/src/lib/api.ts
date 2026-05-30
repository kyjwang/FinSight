import { Asset, Candle, Forecast, Horizon, Stance } from "@/types";
import { createForecast } from "./forecast";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function fetchCandles(symbol: string, fallback: Candle[]): Promise<Candle[]> {
  if (!apiBaseUrl) return fallback;

  try {
    const response = await fetch(`${apiBaseUrl}/market/${encodeURIComponent(symbol)}/candles?interval=1d&horizon=1M`);
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
