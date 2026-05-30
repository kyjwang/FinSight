from services.api.app.models import Candle


def make_candles(symbol: str = "NVDA", count: int = 36) -> list[Candle]:
    base = 100 + len(symbol)
    candles: list[Candle] = []
    for index in range(count):
        close = base + index * 0.8
        candles.append(
            Candle(
                time=f"2026-01-{(index % 28) + 1:02d}",
                open=round(close - 0.4, 2),
                high=round(close + 1.2, 2),
                low=round(close - 1.1, 2),
                close=round(close, 2),
                volume=1_000_000 + index * 1000,
            )
        )
    return candles
