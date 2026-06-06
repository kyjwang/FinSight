import { Asset, Candle } from "@/types";

export type BookLevel = {
  price: number;
  size: number;
  total: number;
};

export type TradePrint = {
  time: string;
  price: number;
  size: number;
  side: "buy" | "sell";
};

export type TradingSnapshot = {
  lastPrice: number;
  change: number;
  changePercent: number;
  dayLow: number;
  dayHigh: number;
  bid: number;
  ask: number;
  spread: number;
  spreadPercent: number;
  vwap: number;
  averageVolume: number;
  totalVolume: number;
  depth: {
    bids: BookLevel[];
    asks: BookLevel[];
  };
  trades: TradePrint[];
};

export function buildTradingSnapshot(asset: Asset, candles: Candle[]): TradingSnapshot {
  const latest = candles.at(-1);
  const previous = candles.at(-2);
  const lastPrice = Math.max(0, latest?.close ?? asset.price);
  const previousClose = previous?.close ?? lastPrice;
  const change = round(lastPrice - previousClose, 2);
  const changePercent = previousClose === 0 ? 0 : round((change / previousClose) * 100, 2);
  const dayLow = latest?.low ?? lastPrice;
  const dayHigh = latest?.high ?? lastPrice;
  const totalVolume = candles.reduce((sum, candle) => sum + candle.volume, 0);
  const averageVolume = candles.length > 0 ? Math.round(totalVolume / candles.length) : 0;
  const vwap = calculateVwap(candles, lastPrice);
  const spread = lastPrice > 0 ? Math.max(0.01, lastPrice * 0.0006) : 0;
  const bid = lastPrice > 0 ? round(Math.max(0, lastPrice - spread / 2), priceDigits(lastPrice)) : 0;
  const ask = lastPrice > 0 ? round(lastPrice + spread / 2, priceDigits(lastPrice)) : 0;

  return {
    lastPrice,
    change,
    changePercent,
    dayLow,
    dayHigh,
    bid,
    ask,
    spread: round(ask - bid, priceDigits(lastPrice)),
    spreadPercent: round(((ask - bid) / Math.max(lastPrice, 0.01)) * 100, 3),
    vwap,
    averageVolume,
    totalVolume,
    depth: buildDepth(bid, ask, lastPrice, averageVolume),
    trades: buildTradeTape(candles)
  };
}

function buildDepth(bid: number, ask: number, lastPrice: number, averageVolume: number): TradingSnapshot["depth"] {
  const digits = priceDigits(lastPrice);
  const tick = tickSize(lastPrice);
  const baseSize = Math.max(100, Math.round(averageVolume / 120));
  let bidTotal = 0;
  let askTotal = 0;

  const bids = Array.from({ length: 5 }, (_, index) => {
    const size = baseSize + index * Math.max(25, Math.round(baseSize * 0.18));
    bidTotal += size;
    return {
      price: round(bid - tick * index, digits),
      size,
      total: bidTotal
    };
  });

  const asks = Array.from({ length: 5 }, (_, index) => {
    const size = baseSize + index * Math.max(25, Math.round(baseSize * 0.16));
    askTotal += size;
    return {
      price: round(ask + tick * index, digits),
      size,
      total: askTotal
    };
  });

  return { bids, asks };
}

function buildTradeTape(candles: Candle[]): TradePrint[] {
  return candles.slice(-8).reverse().map((candle) => ({
    time: candle.time,
    price: candle.close,
    size: candle.volume,
    side: candle.close >= candle.open ? "buy" : "sell"
  }));
}

function calculateVwap(candles: Candle[], fallback: number): number {
  if (candles.length === 0) return fallback;

  const totals = candles.reduce(
    (acc, candle) => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      return {
        tradedValue: acc.tradedValue + typicalPrice * candle.volume,
        volume: acc.volume + candle.volume
      };
    },
    { tradedValue: 0, volume: 0 }
  );

  if (totals.volume === 0) return fallback;
  return round(totals.tradedValue / totals.volume, 2);
}

function tickSize(price: number): number {
  if (price >= 1000) return 0.5;
  if (price >= 100) return 0.05;
  if (price >= 10) return 0.01;
  return 0.001;
}

function priceDigits(price: number): number {
  if (price >= 1000) return 1;
  if (price >= 100) return 2;
  if (price >= 10) return 2;
  return 3;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
