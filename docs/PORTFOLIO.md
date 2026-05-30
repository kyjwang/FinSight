# FinSight Portfolio Notes

## Engineering Highlights

- Fullstack monorepo with Expo React Native web, FastAPI, Supabase SQL/RLS, and Vercel static deployment.
- Social product model: feed, post detail, creator profiles, comments, likes, bookmarks, watchlists, and chat previews.
- AI boundary: forecast scenarios include model name, confidence, confidence bands, and backtest metrics.
- Kronos Forecast Lab: symbol pages can call a FastAPI Kronos adapter and render model/fallback metadata in the UI.
- Free-first architecture: static web app deploys freely, while real candles, Kronos, and Supabase activate through env vars.
- Deployment story: static web app for public CV sharing, optional API/Supabase services for a fuller system design discussion.

## CV Bullets

- Built a cross-platform social investing app with Expo React Native, TypeScript, Expo Router, and responsive web deployment on Vercel.
- Designed Supabase Postgres schema and RLS policies for profiles, social graph, thesis posts, forecasts, comments, watchlists, and realtime chat.
- Implemented FastAPI market-data and forecasting service with explainable scenario output, confidence bands, and backtest metrics.
- Added a Kronos-ready inference boundary that supports optional local model execution and clearly labeled fallback behavior.
- Created a free public web path with browser-local persistence, SPA deep links, and production static export.

## What I Would Scale Next

- Add Redis-backed feed caching and background jobs for candle ingestion and forecast evaluation.
- Replace the deterministic baseline forecast with Kronos/TimesFM/Chronos model adapters and compare model performance by symbol/horizon.
- Add Supabase Realtime subscriptions for comments, likes, notifications, and chat.
- Add observability with structured API logs, client event analytics, and forecast quality dashboards.
- Add CI/CD with typecheck, unit tests, API tests, web export, and preview deployments per pull request.
