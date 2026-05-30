import { Asset, Candle } from "@/types";

export function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase().replace("/", "-").replace(/\s+/g, "");
}

export function assetFromSymbol(symbol: string): Asset {
  const normalized = normalizeSymbol(symbol);
  return {
    symbol: normalized,
    name: normalized,
    type: normalized.endsWith("-USD") ? "crypto" : "stock",
    exchange: "Yahoo Finance",
    price: 0,
    changePercent: 0
  };
}

export function assetWithCandleStats(asset: Asset, candles: Candle[]): Asset {
  const latest = candles.at(-1);
  const previous = candles.at(-2);
  if (!latest) return asset;

  const changePercent = previous && previous.close !== 0
    ? ((latest.close - previous.close) / previous.close) * 100
    : asset.changePercent;

  return {
    ...asset,
    price: latest.close,
    changePercent
  };
}
