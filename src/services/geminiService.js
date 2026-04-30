/**
 * geminiService.js
 * Calls the Krishi Mitra FastAPI backend /api/chat endpoint.
 * The Gemini API key stays on the server — never exposed to the browser.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const geminiService = {
  /**
   * Send a question to the backend and get an AI response.
   * Falls back gracefully if the backend is unreachable.
   * @param {string} question
   * @param {string} language  - "en" | "hi" | "ml"
   * @param {object} context   - { state, weatherSummary, activeCrops }
   * @returns {{ response: string, timestamp: string, isFallback: boolean }}
   */
  generateResponse: async (question, language = "en", context = {}) => {
    const { state = "India", weatherSummary = "", activeCrops = "" } = context;

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          language,
          state,
          weather_summary: weatherSummary,
          active_crops: activeCrops,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      return {
        response:   data.response,
        timestamp:  data.timestamp || new Date().toLocaleString(),
        isFallback: data.fallback || false,
      };
    } catch (err) {
      console.error("geminiService error:", err);
      return {
        response:   "⚠️ Could not reach the AI server. Please ensure the backend is running on port 8000.",
        timestamp:  new Date().toLocaleString(),
        isFallback: true,
      };
    }
  },
};
