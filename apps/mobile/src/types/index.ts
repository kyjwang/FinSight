export type Stance = "bullish" | "neutral" | "bearish";

export type Horizon = "1D" | "1W" | "1M";

export type AssetType = "stock" | "crypto";

export type User = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number;
  accuracy: number;
  averageReturn: number;
};

export type Asset = {
  symbol: string;
  name: string;
  type: AssetType;
  exchange: string;
  price: number;
  changePercent: number;
};

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ForecastPoint = {
  time: string;
  mean: number;
  upper: number;
  lower: number;
};

export type Forecast = {
  id: string;
  modelName: string;
  generatedAt: string;
  horizon: Horizon;
  summary: string;
  confidence: number;
  points: ForecastPoint[];
  backtest: {
    directionAccuracy: number;
    meanAbsoluteError: number;
    sampleSize: number;
  };
  provider?: string;
  providerStatus?: string;
  fallbackReason?: string | null;
  lookback?: number;
};

export type ThesisPost = {
  id: string;
  author: User;
  asset: Asset;
  stance: Stance;
  horizon: Horizon;
  title: string;
  body: string;
  createdAt: string;
  locked: boolean;
  candles: Candle[];
  forecast?: Forecast;
  result?: {
    status: "pending" | "hit" | "miss";
    realizedMovePercent?: number;
    forecastErrorPercent?: number;
  };
  likes: number;
  comments: number;
  bookmarks: number;
};

export type ChatPreview = {
  id: string;
  participant: User;
  lastMessage: string;
  unread: number;
  updatedAt: string;
};

export type Comment = {
  id: string;
  postId: string;
  author: User;
  body: string;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  email: string;
  profile: User;
  mode: "local" | "supabase";
};

export type CreateThesisInput = {
  asset: Asset;
  candles: Candle[];
  stance: Stance;
  horizon: Horizon;
  title: string;
  body: string;
};
