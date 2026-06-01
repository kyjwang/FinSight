from typing import Literal

from pydantic import BaseModel, Field


Horizon = Literal["1D", "1W", "1M"]
Stance = Literal["bullish", "neutral", "bearish"]
AssetType = Literal["stock", "crypto"]
SignalDirection = Literal["bullish", "neutral", "bearish"]


class Candle(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class ForecastPoint(BaseModel):
    time: str
    mean: float
    upper: float
    lower: float


class BacktestMetrics(BaseModel):
    directionAccuracy: float = Field(ge=0, le=1)
    meanAbsoluteError: float = Field(ge=0)
    sampleSize: int = Field(ge=0)


class ForecastResponse(BaseModel):
    id: str
    modelName: str
    generatedAt: str
    horizon: Horizon
    summary: str
    confidence: float = Field(ge=0, le=1)
    points: list[ForecastPoint]
    backtest: BacktestMetrics
    provider: str | None = None
    providerStatus: str | None = None
    fallbackReason: str | None = None
    lookback: int | None = Field(default=None, ge=0)
    signalScore: float | None = Field(default=None, ge=-100, le=100)
    expectedMovePercent: float | None = None
    riskReward: float | None = Field(default=None, ge=0)


class SignalComponent(BaseModel):
    label: str
    value: str
    score: float = Field(ge=-100, le=100)
    detail: str


class SignalResponse(BaseModel):
    symbol: str
    generatedAt: str
    horizon: Horizon
    signal: SignalDirection
    score: float = Field(ge=-100, le=100)
    confidence: float = Field(ge=0, le=1)
    expectedMovePercent: float
    riskReward: float = Field(ge=0)
    stopLossPercent: float = Field(ge=0)
    takeProfitPercent: float = Field(ge=0)
    volatilityPercent: float = Field(ge=0)
    components: list[SignalComponent]
    summary: str
    notFinancialAdvice: str


class ForecastRequest(BaseModel):
    symbol: str
    candles: list[Candle]
    horizon: Horizon = "1W"
    stance: Stance = "neutral"


class KronosForecastRequest(BaseModel):
    symbol: str
    candles: list[Candle]
    horizon: Horizon = "1W"


class Asset(BaseModel):
    symbol: str
    name: str
    type: AssetType
    exchange: str
    price: float
    changePercent: float


class BacktestRequest(BaseModel):
    symbol: str
    candles: list[Candle]
    horizon: Horizon = "1W"
