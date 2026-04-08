/**
 * geminiService.js
 * Routes ALL AI chat through the backend /api/chat endpoint.
 * No API keys in frontend.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const geminiService = {
  generateResponse: async (question, language = "en", context = {}) => {
    const { state = "India", weatherSummary = "", activeCrops = "" } = context;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question,
          language,
          state,
          weather_summary: weatherSummary,
          active_crops: activeCrops,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      return {
        response:  data.response,
        timestamp: data.timestamp || new Date().toLocaleString(),
      };
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error("Request timed out. Please try again.");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  },
};
