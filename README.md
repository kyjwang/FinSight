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

The deployed web app needs `EXPO_PUBLIC_API_BASE_URL` to load real candles and call Kronos. Without it, the UI stays clean and shows setup states instead of fake market data.

## Kronos Forecast Lab

FinSight includes a Kronos-ready forecast flow on each symbol page:

1. Open a symbol such as `/symbol/NVDA`.
2. Choose `1D`, `1W`, or `1M`.
3. Tap **Analyze with Kronos**.
4. Review the forecast overlay, model card, lookback, provider status, and backtest metrics.

The public web app requires `EXPO_PUBLIC_API_BASE_URL` for real market candles. If the API URL is missing, Kronos analysis cannot use real stock data and the app shows a setup message instead of fake candles. Forecast code still has a clearly labeled local fallback for API outages:

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

The adapter sends up to the latest 512 candles to Kronos and falls back safely if model imports or downloads fail.

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
- Kronos-ready Forecast Lab with backend inference boundary and clearly labeled fallback behavior.
- Vercel SPA deployment with deep-link refresh support.

## What I Would Scale Next

- Add a hosted API worker and scheduled market-data ingestion.
- Replace the baseline forecaster with a Kronos/TimesFM/Chronos adapter and model comparison dashboard.
- Add Supabase Realtime for comments, chat, notifications, and feed updates.
- Add CI preview deployments and a visual regression pass for mobile Safari.
