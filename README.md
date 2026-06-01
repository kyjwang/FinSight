# FinSight Social

FinSight Social is a portfolio-grade fullstack mobile app that combines an Instagram-style social feed with stock/crypto candlestick charts, AI-assisted forecast overlays, chat, profiles, watchlists, and prediction accountability.

The product promise is intentionally responsible: FinSight helps users share and evaluate market scenarios. It does not provide financial advice or guaranteed trade signals.

## Stack

- Mobile: Expo SDK 55, React Native, TypeScript, Expo Router
- Social/backend: Supabase Auth, Postgres, Realtime, Storage, Row Level Security
- ML/data service: FastAPI, Pydantic, deterministic baseline forecasting with room for Kronos/TimesFM/Chronos integration
- Charts: React Native SVG candlestick renderer
- Tests: Vitest for mobile logic, Pytest for API forecast/backtest logic

## Project Structure

```text
apps/mobile      Expo mobile app
services/api     FastAPI market-data and forecast service
supabase         SQL schema, RLS policies, and seed data
docs             Architecture and portfolio notes
```

## Quick Start

Install mobile dependencies:

```bash
npm install
```

Run the mobile app locally:

```bash
npm run mobile
```

Run the web app locally:

```bash
npm run web
```

Export the production web build:

```bash
npm run web:export
```

Serve the exported production build locally:

```bash
npm run web:serve
```

Run the API:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/api/requirements.txt
npm run api
```

Run tests:

```bash
npm run mobile:test
npm run api:test
```

The app no longer ships fake market candles or seeded social posts. For real stock analysis, run the FastAPI backend and set `EXPO_PUBLIC_API_BASE_URL`.

## Free Web Deployment

Live app: add your Vercel URL here after running `vercel`.

The recommended free web path is a static Expo deployment. This gives you a public URL that works on iPhone Safari without Expo Go, TestFlight, or a paid Apple Developer account.

Deploy on Vercel:

```bash
npm install -g vercel
vercel
```

The root `vercel.json` is already configured for this monorepo:

- Build command: `npm --workspace apps/mobile run web:export`
- Output directory: `apps/mobile/dist`
- SPA rewrites for deep links such as `/symbol/NVDA` and `/post/p1`

After deployment, open the Vercel URL on your iPhone in Safari. To make it feel like an app, tap Share, then Add to Home Screen.

The deployed web app defaults to the hosted Hugging Face backend at `https://kyjwang-finsight-api.hf.space`. You can override it with `EXPO_PUBLIC_API_BASE_URL` if you deploy another backend.

## Free Backend Deployment

For an online backend that works when your computer is off, deploy the FastAPI service to a Hugging Face Docker Space.

1. Create a Docker Space at `https://huggingface.co/spaces/kyjwang/finsight-api`.
2. Push the latest FinSight code to GitHub, because the Space Dockerfile clones `https://github.com/kyjwang/FinSight.git`.
3. Clone the Space repo locally:

```bash
git clone https://huggingface.co/spaces/kyjwang/finsight-api /tmp/finsight-api-space
```

4. Copy the prepared Space files:

```bash
cp deploy/huggingface-api/README.md /tmp/finsight-api-space/README.md
cp deploy/huggingface-api/Dockerfile /tmp/finsight-api-space/Dockerfile
```

5. Commit and push the Space:

```bash
cd /tmp/finsight-api-space
git add README.md Dockerfile
git commit -m "Deploy FinSight FastAPI backend"
git push
```

6. After Hugging Face finishes building, test:

```text
https://kyjwang-finsight-api.hf.space/health
https://kyjwang-finsight-api.hf.space/docs
```

7. In Vercel, optionally set:

```bash
EXPO_PUBLIC_API_BASE_URL=https://kyjwang-finsight-api.hf.space
```

Then redeploy the web app. The frontend also has this same URL as its default public backend, so this env var is mainly useful if you switch backend hosts later.

## Kronos Forecast Lab

FinSight includes a Kronos-ready forecast flow on each symbol page:

1. Open a symbol such as `/symbol/NVDA`.
2. Choose `1D`, `1W`, or `1M`.
3. Review the **AI Signal Quality** card for trend, momentum, moving-average structure, volume confirmation, volatility, expected move, and risk/reward.
4. Tap **Analyze with Kronos**.
5. Review the forecast overlay, model card, lookback, provider status, signal score, risk/reward, and backtest metrics.

The stronger output now comes from two layers:

- Kronos predicts a future K-line scenario from up to 512 recent candles.
- FinSight wraps that output with market-context scoring using SMA20/SMA50, RSI, MACD, ATR-style volatility, volume ratio, expected move, and risk/reward.

The public web app uses the hosted Hugging Face API by default for real market candles. Forecast code still has a clearly labeled local fallback for API outages:

```text
Kronos unavailable - FinSight Baseline
```

Real Kronos inference runs in FastAPI, not in the browser. To enable it locally, clone and install the Kronos project separately, then set:

```bash
KRONOS_ENABLED=true
KRONOS_REPO_PATH=/absolute/path/to/Kronos
KRONOS_MODEL=NeoQuasar/Kronos-small
KRONOS_TOKENIZER=NeoQuasar/Kronos-Tokenizer-base
KRONOS_DEVICE=cpu
```

Then run:

```bash
source .venv/bin/activate
npm run api
```

In another terminal, point the web app at the API:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run web
```

The adapter sends up to the latest 512 candles to Kronos and falls back safely if model imports or downloads fail. It also caches the loaded Kronos predictor after the first request, uses business-day future timestamps for stocks, daily timestamps for crypto, and defaults to `KRONOS_SAMPLE_COUNT=3` for smoother scenario output.

Useful API checks:

```bash
curl http://127.0.0.1:8000/signals/NVDA?horizon=1W
```

For Kronos, use the app button after candles are loaded, or send a real candle payload to:

```bash
POST http://127.0.0.1:8000/forecast/kronos
```


## Portfolio Story

FinSight demonstrates the pieces big tech/startup interviewers care about:

- End-to-end product flow from auth/feed/composer to charted thesis publishing
- Data modeling for social graphs, chats, watchlists, forecasts, and results
- Realtime interaction design using Supabase channels
- ML service boundary with explicit model metadata, confidence bands, and backtesting
- Responsible AI framing with locked forecasts and measurable outcomes

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design.
See [docs/PORTFOLIO.md](docs/PORTFOLIO.md) for CV bullets, engineering highlights, and scale-up ideas.

## Engineering Highlights

- Mobile-first social investing UI that also exports as a static web app for free public sharing.
- Browser-local persistence for posts, likes, bookmarks, comments, watchlists, chats, and auth state.
- Supabase adapter and SQL/RLS schema ready for real email auth and persistent social data.
- FastAPI forecast service with cache-shaped market data endpoints, explainable scenarios, and backtest metrics.
- Kronos Forecast Lab with cached backend inference, signal quality scoring, expected move, and risk/reward metadata.
- Vercel SPA deployment with deep-link refresh support.

## What I Would Scale Next

- Add a hosted API worker and scheduled market-data ingestion.
- Add walk-forward model comparison for Kronos, TimesFM, Chronos, and simple statistical baselines.
- Add Supabase Realtime for comments, chat, notifications, and feed updates.
- Add CI preview deployments and a visual regression pass for mobile Safari.
