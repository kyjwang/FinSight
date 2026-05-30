import re
from datetime import datetime, timezone

from .models import Asset, Candle


class MarketDataError(RuntimeError):
    pass


def search_assets(query: str) -> list[Asset]:
    symbol = normalize_symbol(query)
    if not symbol:
        return []

    return [asset_from_symbol(symbol)]


def get_cached_candles(symbol: str, interval: str = "1d", horizon: str = "1Y") -> tuple[str, list[Candle]]:
    normalized = normalize_symbol(symbol)
    if not normalized:
        raise MarketDataError("Enter a valid ticker symbol, for example NVDA or BTC-USD.")

    candles = fetch_yfinance_candles(normalized, interval=interval, period=horizon_to_period(horizon))
    if len(candles) < 8:
        raise MarketDataError(f"Not enough market data returned for {normalized}.")

    return "yfinance", candles


def asset_from_symbol(symbol: str) -> Asset:
    normalized = normalize_symbol(symbol)
    asset_type = "crypto" if normalized.endswith("-USD") and normalized[:-4] in {"BTC", "ETH", "SOL", "DOGE"} else "stock"
    return Asset(
        symbol=normalized,
        name=normalized,
        type=asset_type,
        exchange="Yahoo Finance",
        price=0,
        changePercent=0,
    )


def fetch_yfinance_candles(symbol: str, interval: str, period: str) -> list[Candle]:
    try:
        import yfinance as yf
    except ImportError as exc:
        raise MarketDataError("Install yfinance with `pip install -r services/api/requirements.txt`.") from exc

    try:
        data = yf.download(
            tickers=symbol,
            period=period,
            interval=interval,
            auto_adjust=False,
            progress=False,
            threads=False,
        )
    except Exception as exc:
        raise MarketDataError(f"Market data provider failed for {symbol}: {exc}") from exc

    if data is None or data.empty:
        raise MarketDataError(f"No market data found for {symbol}.")

    if hasattr(data.columns, "nlevels") and data.columns.nlevels > 1:
        data.columns = data.columns.get_level_values(0)

    candles: list[Candle] = []
    for timestamp, row in data.tail(512).iterrows():
        values = extract_ohlcv(row)
        if values is None:
            continue

        open_price, high, low, close, volume = values
        candles.append(
            Candle(
                time=format_timestamp(timestamp),
                open=round(open_price, 4),
                high=round(high, 4),
                low=round(low, 4),
                close=round(close, 4),
                volume=int(max(0, volume)),
            )
        )

    return candles


def extract_ohlcv(row) -> tuple[float, float, float, float, float] | None:
    keys = ("Open", "High", "Low", "Close", "Volume")
    try:
        values = tuple(float(row[key]) for key in keys)
    except Exception:
        return None

    if any(value != value for value in values):
        return None

    return values


def normalize_symbol(query: str) -> str:
    symbol = query.strip().upper().replace("/", "-").replace(" ", "")
    if not re.match(r"^[A-Z0-9.-]{1,15}$", symbol):
        return ""
    if symbol in {"BTC", "ETH", "SOL", "DOGE"}:
        return f"{symbol}-USD"
    return symbol


def horizon_to_period(horizon: str) -> str:
    normalized = horizon.upper()
    period_map = {
        "1M": "1mo",
        "3M": "3mo",
        "6M": "6mo",
        "1Y": "1y",
        "2Y": "2y",
        "5Y": "5y",
    }
    if normalized in period_map:
        return period_map[normalized]
    return "1y"


def format_timestamp(timestamp) -> str:
    if hasattr(timestamp, "to_pydatetime"):
        timestamp = timestamp.to_pydatetime()
    if isinstance(timestamp, datetime):
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        return timestamp.date().isoformat()
    return str(timestamp)
