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

The mobile app ships with seeded demo data, so it can be reviewed without Supabase credentials. Add real credentials later using `apps/mobile/.env.example` and `services/api/.env.example`.

## Free Web Deployment

Live demo: add your Vercel URL here after running `vercel`.

The recommended free demo path is a static Expo web deployment. This gives you a public URL that works on iPhone Safari without Expo Go, TestFlight, or a paid Apple Developer account.

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

The deployed demo works from seeded data by default. `EXPO_PUBLIC_API_BASE_URL` is optional and only needed later if you deploy the FastAPI backend too.

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

- Mobile-first social investing UI that also exports as a static web app for free public demos.
- Local demo persistence for posts, likes, bookmarks, comments, watchlists, chats, and auth state.
- Supabase adapter and SQL/RLS schema ready for real email auth and persistent social data.
- FastAPI forecast service with cache-shaped market data endpoints, explainable scenarios, and backtest metrics.
- Vercel SPA deployment with deep-link refresh support.

## What I Would Scale Next

- Add a hosted API worker and scheduled market-data ingestion.
- Replace the baseline forecaster with a Kronos/TimesFM/Chronos adapter and model comparison dashboard.
- Add Supabase Realtime for comments, chat, notifications, and feed updates.
- Add CI preview deployments and a visual regression pass for mobile Safari.
