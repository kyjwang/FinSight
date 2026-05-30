from .models import Asset, Candle


ASSETS = [
    Asset(symbol="NVDA", name="NVIDIA Corp.", type="stock", exchange="NASDAQ", price=124.7, changePercent=2.18),
    Asset(symbol="AAPL", name="Apple Inc.", type="stock", exchange="NASDAQ", price=196.4, changePercent=-0.72),
    Asset(symbol="TSLA", name="Tesla Inc.", type="stock", exchange="NASDAQ", price=184.2, changePercent=1.08),
    Asset(symbol="BTC-USD", name="Bitcoin", type="crypto", exchange="Coinbase", price=104830, changePercent=0.94),
    Asset(symbol="ETH-USD", name="Ethereum", type="crypto", exchange="Coinbase", price=3840, changePercent=-1.26),
]


def demo_candles(symbol: str) -> list[Candle]:
    seed = sum(ord(char) for char in symbol)
    start = 97000 if "BTC" in symbol else 3200 if "ETH" in symbol else 90 + (seed % 140)
    volatility = 0.028 if "USD" in symbol else 0.018
    candles: list[Candle] = []

    for index in range(36):
        import math

        wave = math.sin((index + seed) / 4) * volatility
        trend = (index - 18) * 0.0025
        close = start * (1 + wave + trend + math.cos(index / 3) * volatility * 0.4)
        open_price = close * (1 + math.sin(index) * volatility * 0.28)
        high = max(open_price, close) * (1 + volatility * (0.5 + ((index + seed) % 4) / 10))
        low = min(open_price, close) * (1 - volatility * (0.45 + ((index + seed) % 3) / 10))

        candles.append(
            Candle(
                time=f"D-{35 - index}",
                open=round(open_price, 2),
                high=round(high, 2),
                low=round(low, 2),
                close=round(close, 2),
                volume=round(1_000_000 + ((index + seed) % 9) * 220_000),
            )
        )

    return candles
