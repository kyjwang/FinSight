import { Asset } from "@/types";

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
