/**
 * diseaseService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all communication with the Krishi Mitra FastAPI backend.
 *
 * Drop this file at:  src/services/diseaseService.js
 *
 * Usage in ChatPage.jsx:
 *   import { analyzeImage, getAdvisory } from '../services/diseaseService';
 */

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const USE_MOCK = false;

// ─── Helper ───────────────────────────────────────────────────────────────────
async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── analyzeImage ─────────────────────────────────────────────────────────────
/**
 * Send a leaf photo to the backend.
 * The backend runs the ML model → calls Gemini → returns everything.
 *
 * @param {File}   imageFile   — the File object from the file input
 * @param {object} farmerCtx   — { region, season, language }
 * @returns {Promise<AnalysisResult>}
 */
export async function analyzeImage(imageFile, farmerCtx = {}) {
  const {
    region   = "India",
    season   = "Kharif",
    language = "English",
  } = farmerCtx;

  if (USE_MOCK) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(MOCK_RESPONSE);
      }, 1500); // simulate 1.5s delay
    });
  }

  const formData = new FormData();
  formData.append("file",     imageFile);
  formData.append("region",   region);
  formData.append("season",   season);
  formData.append("language", language);

  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    body:   formData,
    // Do NOT set Content-Type header — browser sets it with boundary automatically
  });

  return handleResponse(res);
}

// ─── getAdvisory ─────────────────────────────────────────────────────────────
/**
 * Get a fresh advisory for a known disease (no image needed).
 * Useful for the "Get Full Advisory" button on an existing result.
 *
 * @param {object} params
 * @returns {Promise<AdvisoryResult>}
 */
export async function getAdvisory({
  disease_name,
  confidence  = 0.9,
  crop,
  region      = "India",
  season      = "Kharif",
  language    = "English",
  mode        = "detailed",     // "short" | "detailed"
}) {
    const res = await fetch(`${API_URL}/advisory`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disease_name,
        confidence,
        crop,
        region,
        season,
        language,
        mode,
      }),
    });
    return handleResponse(res);
}

// ─── healthCheck ─────────────────────────────────────────────────────────────
/**
 * Ping the backend to confirm it's up.
 * Call on app load to show connection status.
 */
export async function healthCheck() {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// ─── LANGUAGE MAP ─────────────────────────────────────────────────────────────
/**
 * Maps your LanguageContext keys to what the backend expects.
 * Your app uses "en" / "hi" / "ml" — Gemini needs "English" / "Hindi" / "Malayalam"
 */
export const LANGUAGE_MAP = {
  en: "English",
  hi: "Hindi",
  ml: "Malayalam",
};

// ─── SEASON HELPER ────────────────────────────────────────────────────────────
/**
 * Auto-detect the current Indian agricultural season from month.
 * Kharif: June–October | Rabi: November–March | Zaid: April–May
 */
export function getCurrentSeason() {
  const month = new Date().getMonth() + 1;  // 1–12
  if (month >= 6  && month <= 10) return "Kharif";
  if (month >= 11 || month <= 3)  return "Rabi";
  return "Zaid";
}
