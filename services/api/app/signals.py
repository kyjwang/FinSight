from __future__ import annotations

from datetime import datetime, timezone
from statistics import mean

from .models import Candle, Horizon, SignalComponent, SignalResponse


def build_market_signal(symbol: str, candles: list[Candle], horizon: Horizon) -> SignalResponse:
    if len(candles) < 30:
        raise ValueError("At least 30 candles are required for a market signal.")

    lookback = candles[-120:]
    closes = [candle.close for candle in lookback]
    volumes = [candle.volume for candle in lookback]
    latest = lookback[-1]

    sma20 = simple_moving_average(closes, 20)
    sma50 = simple_moving_average(closes, min(50, len(closes)))
    ema12 = exponential_moving_average(closes, 12)
    ema26 = exponential_moving_average(closes, 26)
    macd = ema12 - ema26
    rsi = relative_strength_index(closes, 14)
    atr_percent = average_true_range_percent(lookback, 14)
    volume_ratio = latest.volume / max(1, mean(volumes[-20:]))
    trend_return = percent_change(closes[-min(20, len(closes))], closes[-1])

    trend_score = clamp(((latest.close - sma50) / latest.close) * 420 + trend_return * 2.4, -100, 100)
    momentum_score = clamp((50 - rsi) * -2.1 + (macd / max(latest.close, 0.01)) * 1200, -100, 100)
    structure_score = clamp(((sma20 - sma50) / latest.close) * 650, -100, 100)
    volume_score = clamp((volume_ratio - 1) * 80 * (1 if trend_return >= 0 else -1), -100, 100)
    volatility_score = clamp(35 - atr_percent * 7, -100, 100)

    score = round(
        clamp(
            trend_score * 0.32
            + momentum_score * 0.25
            + structure_score * 0.18
            + volume_score * 0.12
            + volatility_score * 0.13,
            -100,
            100,
        ),
        1,
    )
    signal = "bullish" if score >= 18 else "bearish" if score <= -18 else "neutral"

    horizon_multiplier = {"1D": 0.75, "1W": 1.35, "1M": 2.35}[horizon]
    expected_move = round((score / 100) * max(atr_percent, 0.4) * horizon_multiplier, 2)
    stop_loss = round(max(atr_percent * 1.15, 0.6), 2)
    take_profit = round(max(abs(expected_move), atr_percent * 0.75), 2)
    risk_reward = round(take_profit / max(stop_loss, 0.01), 2)
    confidence = round(clamp(0.48 + abs(score) / 210 - max(0, atr_percent - 5) / 80, 0.35, 0.84), 2)

    components = [
        SignalComponent(
            label="Trend",
            value=f"{trend_return:+.2f}% / SMA50 {distance_text(latest.close, sma50)}",
            score=round(trend_score, 1),
            detail="Recent price direction and distance from the medium-term average.",
        ),
        SignalComponent(
            label="Momentum",
            value=f"RSI {rsi:.1f} / MACD {macd:.2f}",
            score=round(momentum_score, 1),
            detail="RSI and MACD pressure; useful for spotting strengthening or fading moves.",
        ),
        SignalComponent(
            label="Structure",
            value=f"SMA20 {distance_text(sma20, sma50)} vs SMA50",
            score=round(structure_score, 1),
            detail="Whether the faster moving average is above or below the slower average.",
        ),
        SignalComponent(
            label="Volume",
            value=f"{volume_ratio:.2f}x 20-day average",
            score=round(volume_score, 1),
            detail="Whether the move has above-average participation behind it.",
        ),
        SignalComponent(
            label="Volatility",
            value=f"ATR {atr_percent:.2f}%",
            score=round(volatility_score, 1),
            detail="High volatility lowers signal quality because forecast error usually widens.",
        ),
    ]

    summary = (
        f"{symbol} shows a {signal} research signal for {horizon}: score {score:+.1f}, "
        f"expected move {expected_move:+.2f}%, confidence {round(confidence * 100)}%, "
        f"risk/reward {risk_reward:.2f}."
    )

    return SignalResponse(
        symbol=symbol,
        generatedAt=datetime.now(timezone.utc).isoformat(),
        horizon=horizon,
        signal=signal,
        score=score,
        confidence=confidence,
        expectedMovePercent=expected_move,
        riskReward=risk_reward,
        stopLossPercent=stop_loss,
        takeProfitPercent=take_profit,
        volatilityPercent=round(atr_percent, 2),
        components=components,
        summary=summary,
        notFinancialAdvice="Research signal only. Not financial advice, not a trade recommendation.",
    )


def simple_moving_average(values: list[float], period: int) -> float:
    return mean(values[-period:])


def exponential_moving_average(values: list[float], period: int) -> float:
    multiplier = 2 / (period + 1)
    ema = mean(values[:period]) if len(values) >= period else values[0]
    for value in values[period:]:
        ema = value * multiplier + ema * (1 - multiplier)
    return ema


def relative_strength_index(values: list[float], period: int) -> float:
    gains: list[float] = []
    losses: list[float] = []
    for previous, current in zip(values[-period - 1 : -1], values[-period:]):
        delta = current - previous
        gains.append(max(delta, 0))
        losses.append(abs(min(delta, 0)))

    average_gain = mean(gains) if gains else 0
    average_loss = mean(losses) if losses else 0
    if average_loss == 0:
        return 100.0 if average_gain > 0 else 50.0
    rs = average_gain / average_loss
    return 100 - (100 / (1 + rs))


def average_true_range_percent(candles: list[Candle], period: int) -> float:
    ranges: list[float] = []
    recent = candles[-period:]
    for index, candle in enumerate(recent):
        previous_close = candles[-period + index - 1].close if index > 0 else candle.close
        true_range = max(
            candle.high - candle.low,
            abs(candle.high - previous_close),
            abs(candle.low - previous_close),
        )
        ranges.append(true_range)
    latest_close = max(candles[-1].close, 0.01)
    return (mean(ranges) / latest_close) * 100


def percent_change(start: float, end: float) -> float:
    if start == 0:
        return 0
    return ((end - start) / start) * 100


def distance_text(value: float, reference: float) -> str:
    return f"{percent_change(reference, value):+.2f}%"


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))
