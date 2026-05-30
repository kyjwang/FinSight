from fastapi.testclient import TestClient

from services.api.app.main import app


client = TestClient(app)


def test_health_and_asset_search():
    assert client.get("/health").json() == {"status": "ok"}

    response = client.get("/assets/search?q=btc")
    assert response.status_code == 200
    assert response.json()["assets"][0]["symbol"] == "BTC-USD"


def test_candles_include_cache_source():
    response = client.get("/market/NVDA/candles")
    payload = response.json()

    assert response.status_code == 200
    assert payload["source"] == "committed-demo-cache"
    assert len(payload["candles"]) >= 30
