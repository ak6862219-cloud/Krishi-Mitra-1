<div align="center">

# 🌾 Krishi Mitra

**AI-powered farmer query support and advisory system, built for India's farmers.**

Crop disease detection · Multilingual voice support · SMS for keypad phones · Hyperlocal weather · Live mandi prices powered by **TinyFish**

[Live Demo](https://krishi-mitra-nu.vercel.app) · [Report Bug](https://github.com/ak6862219-cloud/Krishi-Mitra-1/issues) · Team **NEXAURA**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?logo=fastapi&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=google&logoColor=white)
![TinyFish](https://img.shields.io/badge/Data-TinyFish%20API-0A84FF)

</div>

---

## 📖 Overview

Most Indian farmers still lack timely, trustworthy answers to everyday questions: *What is wrong with my crop? Will it rain this week? What price will I get at the mandi today?* Information is scattered across government portals, in English-only interfaces, and often needs a smartphone and data connection.

**Krishi Mitra** brings it into one place. A farmer can ask a question in their own language (text or voice), upload a photo of a diseased leaf, check local weather, and see current mandi prices. For farmers without smartphones, answers can be delivered by **SMS** to a basic keypad phone.

## ✨ Features

| Feature | Description |
|---|---|
| 🔬 **Crop disease detection** | Upload a leaf photo; a **MobileNetV2 CNN** classifies the disease. |
| 🤖 **AI advisory (Gemini)** | Natural-language farmer queries answered through Google Gemini. |
| 🗣️ **Multilingual voice support** | Ask and listen in regional languages, so literacy is not a barrier. |
| 📩 **SMS for keypad phones** | Advisory delivered by SMS to rural users without smartphones. |
| 🌤️ **Hyperlocal weather** | Current conditions, 5-day forecast, and weather-based crop advisory. |
| 📊 **Live mandi prices (TinyFish)** | Real-time crop prices fetched from live web sources via the TinyFish API. |
| 🔐 **Farmer authentication** | Login/signup with protected routes for personalised features. |

## 🐟 TinyFish API Integration

Krishi Mitra uses the **[TinyFish API](https://docs.tinyfish.ai)** as its live web-data layer. Mandi prices and market information live on government and agri-market websites that have no clean public API, so we use TinyFish to read them in real time instead of relying on stale or hard-coded data.

| TinyFish API | Endpoint | How Krishi Mitra uses it |
|---|---|---|
| **Agent API** | `POST https://agent.tinyfish.ai/v1/automation/run` | Given a plain-English *goal*, TinyFish opens a mandi/market website and extracts today's price for a crop and region as structured JSON. |
| **Search API** | `GET https://api.search.tinyfish.ai` | Finds relevant, up-to-date pages (market reports, advisories) for a farmer's query. |
| **Fetch API** | `POST https://api.fetch.tinyfish.ai` | Renders a known URL in a real browser and returns clean page content for the AI advisory context. |

> Per the TinyFish docs, Search and Fetch do not use credits; credits are consumed only by Agent and Browser runs.

### Data flow

```
Farmer ──▶ React UI ──▶ FastAPI backend ──▶ TinyFish API ──▶ live mandi / market websites
                              │
                              ├──▶ Gemini (advisory generation)
                              └──▶ MobileNetV2 (disease detection)
```

The TinyFish API key stays on the **backend only**; it is never exposed to the browser. Results are cached for 5 minutes to save credits.

### Backend: `krishi-backend/tinyfish_market.py`

```python
"""
TinyFish-powered mandi price endpoint for Krishi Mitra.

Register in your FastAPI app:
    from tinyfish_market import router as market_router
    app.include_router(market_router)

Env vars:
    TINYFISH_API_KEY   (required)
    MANDI_SOURCE_URL   (optional, default: https://agmarknet.gov.in)
"""
import json
import os
import time

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api", tags=["market"])

TINYFISH_RUN_URL = "https://agent.tinyfish.ai/v1/automation/run"
DEFAULT_SOURCE = os.getenv("MANDI_SOURCE_URL", "https://agmarknet.gov.in")
CACHE_TTL = 300  # seconds

_cache: dict[tuple[str, str], tuple[float, dict]] = {}


def _build_goal(crop: str, district: str) -> str:
    return (
        f"Find today's mandi prices for {crop} in {district}. "
        "Return ONLY valid JSON of the form "
        '{"prices": [{"crop": str, "variety": str, "market": str, '
        '"min_price": number, "max_price": number, "modal_price": number, '
        '"unit": "INR/quintal", "date": str}]}. '
        "If no data is found, return {\"prices\": []}. Do not invent values."
    )


def _normalize(result) -> list[dict]:
    """TinyFish returns a JSON object directly, or wraps lists/text in result.result."""
    if isinstance(result, dict) and "result" in result and "prices" not in result:
        result = result["result"]
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except json.JSONDecodeError:
            return []
    if isinstance(result, dict):
        result = result.get("prices", [])
    return result if isinstance(result, list) else []


async def fetch_mandi_prices(crop: str, district: str, source_url: str = DEFAULT_SOURCE) -> dict:
    api_key = os.getenv("TINYFISH_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="TINYFISH_API_KEY not configured")

    key = (crop.lower(), district.lower())
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_TTL:
        return {**hit[1], "cached": True}

    payload = {"url": source_url, "goal": _build_goal(crop, district)}
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(TINYFISH_RUN_URL, json=payload, headers=headers)
            resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"TinyFish error {e.response.status_code}")
    except httpx.HTTPError:
        raise HTTPException(status_code=504, detail="TinyFish request failed or timed out")

    body = resp.json()
    prices = _normalize(body.get("result", body))
    data = {
        "crop": crop,
        "district": district,
        "source": source_url,
        "fetched_at": int(time.time()),
        "prices": prices,
        "cached": False,
    }
    if prices:  # don't cache empty results
        _cache[key] = (time.time(), data)
    return data


@router.get("/market-prices")
async def market_prices(
    crop: str = Query(..., min_length=2),
    district: str = Query(..., min_length=2),
):
    return await fetch_mandi_prices(crop, district)
```

### Frontend: `src/services/tinyfishMarketService.js`

```javascript
// Frontend client for the TinyFish-backed /api/market-prices endpoint.
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function getMarketPrices({ crop, district }) {
  const { data } = await axios.get(`${API_BASE}/api/market-prices`, {
    params: { crop, district },
    timeout: 200000, // TinyFish agent runs can take a while
  });

  return {
    fetchedAt: new Date(data.fetched_at * 1000),
    cached: data.cached,
    source: data.source,
    prices: (data.prices || []).map((p) => ({
      crop: p.crop,
      variety: p.variety,
      market: p.market,
      min: p.min_price,
      max: p.max_price,
      modal: p.modal_price,
      unit: p.unit || "INR/quintal",
      date: p.date,
    })),
  };
}
```

### Quick test

```bash
curl "http://localhost:8000/api/market-prices?crop=Tomato&district=Ernakulam"
```

## 🏗️ Tech Stack

**Frontend:** React 18, Vite 5, React Router 6, Axios, CSS variables (responsive)
**Backend:** FastAPI (Python), in `krishi-backend/`
**AI / ML:** Google Gemini (`@google/generative-ai`), MobileNetV2 CNN for disease detection
**Live data:** TinyFish API (Agent, Search, Fetch)
**Weather:** OpenWeather API
**Deployment:** Vercel (frontend)

## 📁 Project Structure

```
Krishi-Mitra-1/
├── krishi-backend/          # FastAPI backend (AI, disease detection, TinyFish calls)
│   └── tinyfish_market.py   # TinyFish mandi price endpoint
├── src/                     # React frontend
│   ├── components/          # TopStrip, Header, Hero, QueryInterface, Features,
│   │                        # AdvancedFeatures, ResponseSection, Footer,
│   │                        # WeatherWidget, ProtectedRoute
│   ├── pages/               # HomePage, LoginPage, MarketPricePage
│   ├── context/             # AuthContext (global auth state)
│   ├── hooks/               # useWeather, useMarketPrices
│   ├── services/            # weatherService, tinyfishMarketService
│   ├── App.jsx              # Routing
│   └── main.jsx             # Entry point
├── index.html
├── vite.config.js
├── vercel.json
├── package.json
└── PROJECT_STRUCTURE.md     # Detailed frontend notes
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- A **TinyFish API key**: create one at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)
- A **Google Gemini API key**
- An **OpenWeather API key**

### 1. Clone

```bash
git clone https://github.com/ak6862219-cloud/Krishi-Mitra-1.git
cd Krishi-Mitra-1
```

### 2. Configure environment variables

Backend (`krishi-backend/.env`):

```env
TINYFISH_API_KEY=your_tinyfish_api_key
GEMINI_API_KEY=your_gemini_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
# optional
MANDI_SOURCE_URL=https://agmarknet.gov.in
```

Frontend (`.env` in the project root):

```env
VITE_API_BASE_URL=http://localhost:8000
```

> ⚠️ Never commit `.env` files or API keys. Keep `.env` in `.gitignore`.

### 3. Run the backend

```bash
cd krishi-backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install fastapi uvicorn httpx python-dotenv
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Run the frontend

```bash
# from the project root
npm install
npm run dev
```

Open **http://localhost:5173**.

### Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## 🗺️ Roadmap

- [ ] Expand TinyFish-powered price coverage to more states and mandis
- [ ] Price-trend alerts delivered over SMS
- [ ] More regional languages for voice and SMS
- [ ] Offline-capable edge model (TensorFlow Lite) for disease detection
- [ ] Soil-health and crop-recommendation modules

## 🤝 Contributing

Contributions are welcome. Fork the repo, create a feature branch, and open a pull request.

## 👥 Team

Built by **Team NEXAURA**.

## 🙏 Acknowledgements

- [TinyFish](https://tinyfish.ai) for the live web-data APIs
- [Google Gemini](https://ai.google.dev) for AI advisory
- [PlantVillage](https://plantvillage.psu.edu) dataset for disease-detection training
- Indian government agri-market portals and open data sources
