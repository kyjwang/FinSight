import importlib
import os
import sys
from pathlib import Path

from .forecasting import generate_forecast
from .models import Candle, ForecastPoint, ForecastResponse, Horizon


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
    forecast.summary = f"Kronos adapter fallback for {symbol}. {forecast.summary}"
    return forecast


def run_real_kronos(symbol: str, candles: list[Candle], horizon: Horizon, repo_path: Path) -> ForecastResponse:
    if not repo_path.exists():
        raise FileNotFoundError(f"Kronos repo path does not exist: {repo_path}")

    sys.path.insert(0, str(repo_path))
    kronos_model = importlib.import_module("model")
    pandas = importlib.import_module("pandas")

    tokenizer_name = os.getenv("KRONOS_TOKENIZER", "NeoQuasar/Kronos-Tokenizer-base")
    model_name = os.getenv("KRONOS_MODEL", "NeoQuasar/Kronos-small")
    device = os.getenv("KRONOS_DEVICE", "cpu")

    tokenizer = kronos_model.KronosTokenizer.from_pretrained(tokenizer_name)
    model = kronos_model.Kronos.from_pretrained(model_name)
    predictor = kronos_model.KronosPredictor(model, tokenizer, max_context=512, device=device)

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
        df["timestamps"] = pandas.date_range(end=pandas.Timestamp.utcnow(), periods=len(df), freq="D")

    pred_len = {"1D": 6, "1W": 8, "1M": 12}[horizon]
    last_timestamp = df["timestamps"].iloc[-1]
    y_timestamp = pandas.date_range(start=last_timestamp, periods=pred_len + 1, freq="D")[1:]

    pred_df = predictor.predict(
        df=df[["open", "high", "low", "close", "volume", "amount"]],
        x_timestamp=df["timestamps"],
        y_timestamp=pandas.Series(y_timestamp),
        pred_len=pred_len,
        T=float(os.getenv("KRONOS_TEMPERATURE", "1.0")),
        top_p=float(os.getenv("KRONOS_TOP_P", "0.9")),
        sample_count=int(os.getenv("KRONOS_SAMPLE_COUNT", "1")),
    )

    baseline = generate_forecast(symbol, candles, horizon, "neutral")
    baseline.modelName = model_name
    baseline.provider = "kronos"
    baseline.providerStatus = "ready"
    baseline.fallbackReason = None
    baseline.lookback = len(candles)
    baseline.summary = f"Kronos generated a {horizon} K-line scenario for {symbol} using {len(candles)} candles."
    baseline.points = [
        ForecastPoint(
            time=str(index),
            mean=round(float(row["close"]), 2),
            upper=round(float(max(row["high"], row["close"])), 2),
            lower=round(float(min(row["low"], row["close"])), 2),
        )
        for index, row in pred_df.head(pred_len).iterrows()
    ]
    return baseline
