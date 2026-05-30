from services.api.app.forecasting import generate_forecast, run_backtest
from services.api.app.sample_data import demo_candles


def test_generate_forecast_returns_confidence_band():
    candles = demo_candles("NVDA")
    forecast = generate_forecast("NVDA", candles, "1W", "bullish")

    assert len(forecast.points) == 8
    assert 0.52 <= forecast.confidence <= 0.78
    assert forecast.points[0].lower < forecast.points[0].mean < forecast.points[0].upper
    assert forecast.backtest.sampleSize == 180


def test_backtest_returns_samples_and_error():
    candles = demo_candles("BTC-USD")
    metrics = run_backtest(candles, "1D")

    assert metrics.sampleSize > 0
    assert 0 <= metrics.directionAccuracy <= 1
    assert metrics.meanAbsoluteError >= 0
