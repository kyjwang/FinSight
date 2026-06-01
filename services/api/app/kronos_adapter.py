import importlib
import os
import sys
from pathlib import Path
from typing import Any

from .forecasting import generate_forecast
from .models import Candle, ForecastPoint, ForecastResponse, Horizon
from .signals import build_market_signal

_PREDICTOR_CACHE: dict[tuple[str, str, str, str], Any] = {}


def generate_kronos_forecast(symbol: str, candles: list[Candle], horizon: Horizon) -> ForecastResponse:
    if len(candles) < 8:
        raise ValueError("At least 8 candles are required for a Kronos forecast.")

    lookback_candles = candles[-512:]

    if os.getenv("KRONOS_ENABLED", "").lower() not in {"1", "true", "yes"}:
        return fallback_forecast(
            symbol,
            lookback_candles,
            horizon,
            "KRONOS_ENABLED is not true, so FinSight used the local baseline forecast.",
        )

    repo_path = os.getenv("KRONOS_REPO_PATH")
    if not repo_path:
        return fallback_forecast(
            symbol,
            lookback_candles,
            horizon,
            "KRONOS_REPO_PATH is not configured.",
        )

    try:
        return run_real_kronos(symbol, lookback_candles, horizon, Path(repo_path))
    except Exception as exc:
        return fallback_forecast(symbol, lookback_candles, horizon, f"{type(exc).__name__}: {exc}")


def fallback_forecast(symbol: str, candles: list[Candle], horizon: Horizon, reason: str) -> ForecastResponse:
    forecast = generate_forecast(symbol, candles, horizon, "neutral")
    forecast.modelName = "Kronos unavailable - FinSight Baseline"
    forecast.provider = "kronos"
    forecast.providerStatus = "fallback"
    forecast.fallbackReason = reason
    forecast.lookback = len(candles)
    attach_signal_metadata(symbol, candles, horizon, forecast)
    forecast.summary = f"Kronos adapter fallback for {symbol}. {forecast.summary}"
    return forecast


def run_real_kronos(symbol: str, candles: list[Candle], horizon: Horizon, repo_path: Path) -> ForecastResponse:
    if not repo_path.exists():
        raise FileNotFoundError(f"Kronos repo path does not exist: {repo_path}")

    pandas = importlib.import_module("pandas")
    tokenizer_name = os.getenv("KRONOS_TOKENIZER", "NeoQuasar/Kronos-Tokenizer-base")
    model_name = os.getenv("KRONOS_MODEL", "NeoQuasar/Kronos-small")
    device = os.getenv("KRONOS_DEVICE", "cpu")
    sample_count = int(os.getenv("KRONOS_SAMPLE_COUNT", "3"))

    predictor = load_predictor(repo_path, model_name, tokenizer_name, device)

    rows = [
        {
            "timestamps": candle.time,
            "open": candle.open,
            "high": candle.high,
            "low": candle.low,
            "close": candle.close,
            "volume": candle.volume,
            "amount": candle.close * candle.volume,
        }
        for candle in candles
    ]
    df = pandas.DataFrame(rows)
    df["timestamps"] = pandas.to_datetime(df["timestamps"], errors="coerce")
    if df["timestamps"].isna().any():
        df["timestamps"] = pandas.date_range(end=pandas.Timestamp.utcnow(), periods=len(df), freq=infer_future_frequency(symbol))

    pred_len = {"1D": 6, "1W": 8, "1M": 12}[horizon]
    last_timestamp = df["timestamps"].iloc[-1]
    y_timestamp = pandas.date_range(start=last_timestamp, periods=pred_len + 1, freq=infer_future_frequency(symbol))[1:]

    pred_df = predictor.predict(
        df=df[["open", "high", "low", "close", "volume", "amount"]],
        x_timestamp=df["timestamps"],
        y_timestamp=pandas.Series(y_timestamp),
        pred_len=pred_len,
        T=float(os.getenv("KRONOS_TEMPERATURE", "0.8")),
        top_p=float(os.getenv("KRONOS_TOP_P", "0.92")),
        sample_count=sample_count,
    )

    forecast = generate_forecast(symbol, candles, horizon, "neutral")
    forecast.modelName = model_name
    forecast.provider = "kronos"
    forecast.providerStatus = "ready"
    forecast.fallbackReason = None
    forecast.lookback = len(candles)
    forecast.summary = (
        f"Kronos generated a {horizon} K-line scenario for {symbol} using {len(candles)} candles, "
        f"business-day timestamps for stocks, and sample_count={sample_count}."
    )
    forecast.points = [
        ForecastPoint(
            time=str(index),
            mean=round(float(row["close"]), 2),
            upper=round(float(max(row["high"], row["close"])), 2),
            lower=round(float(min(row["low"], row["close"])), 2),
        )
        for index, row in pred_df.head(pred_len).iterrows()
    ]
    attach_signal_metadata(symbol, candles, horizon, forecast)
    return forecast


def load_predictor(repo_path: Path, model_name: str, tokenizer_name: str, device: str) -> Any:
    cache_key = (str(repo_path), model_name, tokenizer_name, device)
    cached = _PREDICTOR_CACHE.get(cache_key)
    if cached is not None:
        return cached

    repo_string = str(repo_path)
    if repo_string not in sys.path:
        sys.path.insert(0, repo_string)

    kronos_model = importlib.import_module("model")
    tokenizer = kronos_model.KronosTokenizer.from_pretrained(tokenizer_name)
    model = kronos_model.Kronos.from_pretrained(model_name)
    predictor = kronos_model.KronosPredictor(model, tokenizer, max_context=512, device=device)
    _PREDICTOR_CACHE[cache_key] = predictor
    return predictor


def attach_signal_metadata(symbol: str, candles: list[Candle], horizon: Horizon, forecast: ForecastResponse) -> None:
    if len(candles) < 30:
        return

    signal = build_market_signal(symbol, candles, horizon)
    forecast.signalScore = signal.score
    forecast.expectedMovePercent = signal.expectedMovePercent
    forecast.riskReward = signal.riskReward


def infer_future_frequency(symbol: str) -> str:
    normalized = symbol.upper()
    if "-" in normalized or normalized in {"BTC", "ETH", "SOL", "DOGE"}:
        return "D"
    return "B"
