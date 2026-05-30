---
title: FinSight API
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
---

# FinSight API

FastAPI backend for FinSight Social. It serves market candles, baseline forecasts, and Kronos-backed K-line scenario analysis.

Public endpoints:

- `GET /health`
- `GET /assets/search?q=NVDA`
- `GET /market/NVDA/candles?interval=1d&horizon=6M`
- `POST /forecast/kronos`
- `GET /docs`
