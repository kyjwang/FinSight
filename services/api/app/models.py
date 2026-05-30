from typing import Literal

from pydantic import BaseModel, Field


Horizon = Literal["1D", "1W", "1M"]
Stance = Literal["bullish", "neutral", "bearish"]
AssetType = Literal["stock", "crypto"]


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


class ForecastRequest(BaseModel):
    symbol: str
    candles: list[Candle]
    horizon: Horizon = "1W"
    stance: Stance = "neutral"


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
