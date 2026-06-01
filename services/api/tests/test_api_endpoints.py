from fastapi.testclient import TestClient

from services.api.app.main import app
from services.api.app.market_data import horizon_to_period
from services.api.tests.fixtures import make_candles


client = TestClient(app)


def test_health_and_asset_search():
    assert client.get("/health").json() == {"status": "ok"}

    response = client.get("/assets/search?q=btc")
    assert response.status_code == 200
    assert response.json()["assets"][0]["symbol"] == "BTC-USD"


def test_candles_include_market_source(monkeypatch):
    monkeypatch.setattr("services.api.app.market_data.fetch_yfinance_candles", lambda *args, **kwargs: make_candles())

    response = client.get("/market/NVDA/candles")
    payload = response.json()

    assert response.status_code == 200
    assert payload["source"] == "yfinance"
    assert len(payload["candles"]) >= 30


def test_market_horizons_map_to_yfinance_periods():
    assert horizon_to_period("1M") == "1mo"
    assert horizon_to_period("3M") == "3mo"
    assert horizon_to_period("1Y") == "1y"


def test_signal_endpoint_returns_quality_components(monkeypatch):
    monkeypatch.setattr("services.api.app.market_data.fetch_yfinance_candles", lambda *args, **kwargs: make_candles(count=80))

    response = client.get("/signals/NVDA?horizon=1W")
    payload = response.json()

    assert response.status_code == 200
    assert payload["symbol"] == "NVDA"
    assert payload["signal"] in {"bullish", "neutral", "bearish"}
    assert -100 <= payload["score"] <= 100
    assert payload["components"]
    assert payload["notFinancialAdvice"]


def test_kronos_forecast_falls_back_when_disabled(monkeypatch):
    monkeypatch.setattr("services.api.app.market_data.fetch_yfinance_candles", lambda *args, **kwargs: make_candles())
    candles = client.get("/market/NVDA/candles").json()["candles"]
    response = client.post(
        "/forecast/kronos",
        json={"symbol": "NVDA", "candles": candles, "horizon": "1W"},
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["provider"] == "kronos"
    assert payload["providerStatus"] == "fallback"
    assert payload["fallbackReason"]
    assert payload["lookback"] == len(candles)
    assert len(payload["points"]) == 8
    assert payload["signalScore"] is not None
    assert payload["riskReward"] is not None


def test_kronos_forecast_rejects_short_context():
    response = client.post(
        "/forecast/kronos",
        json={
            "symbol": "NVDA",
            "horizon": "1W",
            "candles": [
                {"time": "D-1", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 1}
            ],
        },
    )

    assert response.status_code == 422
