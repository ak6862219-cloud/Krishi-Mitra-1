/**
 * marketService.js
 * Routes mandi data through backend /api/mandi — no API key in frontend.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const marketService = {
  getMarketPrices: async (state = "Maharashtra", commodity = "Tomato") => {
    const url = `${API_URL}/api/mandi?state=${encodeURIComponent(state)}&commodity=${encodeURIComponent(commodity)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Market API error ${res.status}`);
    }
    const json = await res.json();
    return {
      data:        json.data,
      source:      json.source,
      lastUpdated: json.lastUpdated,
      count:       json.count,
    };
  },
};