from .models import Candle
from .sample_data import demo_candles


SUPPORTED_SYMBOLS = {"NVDA", "AAPL", "BTC-USD", "ETH-USD", "TSLA"}


def get_cached_candles(symbol: str) -> tuple[str, list[Candle]]:
    normalized = symbol.upper()
    if normalized not in SUPPORTED_SYMBOLS:
        return "demo-cache-fallback", demo_candles(normalized)

    # This module is the boundary where a free provider such as Stooq,
    # Alpha Vantage, or CoinGecko can be added. The portfolio demo remains
    # deterministic and free by returning a committed cache-shaped series.
    return "committed-demo-cache", demo_candles(normalized)
