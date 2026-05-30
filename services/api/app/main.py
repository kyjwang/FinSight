from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .forecasting import generate_forecast, run_backtest
from .kronos_adapter import generate_kronos_forecast
from .market_data import MarketDataError, get_cached_candles, search_assets as search_market_assets
from .models import BacktestRequest, ForecastRequest, KronosForecastRequest

app = FastAPI(
    title="FinSight API",
    version="0.1.0",
    description="Market candles, explainable forecast scenarios, and backtest endpoints for FinSight Social.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/assets/search")
def search_assets(q: str = Query(default="", max_length=32)) -> dict[str, list[dict]]:
    assets = search_market_assets(q)
    return {"assets": [asset.model_dump() for asset in assets]}


@app.get("/market/{symbol}/candles")
def get_candles(symbol: str, horizon: str = "1M", interval: str = "1d") -> dict[str, object]:
    try:
        source, candles = get_cached_candles(symbol, interval=interval, horizon=horizon)
    except MarketDataError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "symbol": symbol.upper(),
        "horizon": horizon,
        "interval": interval,
        "source": source,
        "candles": [candle.model_dump() for candle in candles],
    }


@app.post("/forecast")
def forecast(request: ForecastRequest):
    try:
        return generate_forecast(request.symbol.upper(), request.candles, request.horizon, request.stance)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/forecast/kronos")
def kronos_forecast(request: KronosForecastRequest):
    try:
        return generate_kronos_forecast(request.symbol.upper(), request.candles, request.horizon)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/forecast/{forecast_id}")
def get_forecast(forecast_id: str) -> dict[str, str]:
    return {
        "id": forecast_id,
        "status": "generated",
        "note": "Persisted forecast lookup is implemented through Supabase in production mode.",
    }


@app.post("/backtest/run")
def backtest(request: BacktestRequest):
    try:
        return run_backtest(request.candles, request.horizon)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
