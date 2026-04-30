/**
 * useDiseaseScan.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom React hook that manages the full image → prediction → advisory flow.
 *
 * Drop this file at:  src/hooks/useDiseaseScan.js
 *
 * Usage in ChatPage.jsx:
 *   import useDiseaseScan from '../hooks/useDiseaseScan';
 *   const { scan, getFullAdvisory, reset, result, loading, error, stage } = useDiseaseScan();
 */

import { useState, useCallback, useContext } from "react";
import { analyzeImage, getAdvisory, LANGUAGE_MAP, getCurrentSeason } from "../services/diseaseService";
import { useLanguage } from "../context/LanguageContext";

/**
 * Stages shown to the user while processing:
 *  "idle"       → nothing happening
 *  "uploading"  → sending image to server
 *  "predicting" → ML model running
 *  "advising"   → Gemini writing the advisory
 *  "done"       → result ready
 *  "error"      → something went wrong
 */
const STAGES = {
  IDLE:       "idle",
  UPLOADING:  "uploading",
  PREDICTING: "predicting",
  ADVISING:   "advising",
  DONE:       "done",
  ERROR:      "error",
};

export default function useDiseaseScan() {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [stage,   setStage]   = useState(STAGES.IDLE);

  // Pull language from your existing context using hook
  const langCtx = useLanguage();
  // langCtx.currentLanguage is "en" | "hi" | "ml" in your app
  const language = LANGUAGE_MAP[langCtx?.currentLanguage] ?? "English";

  // Farmer region from context or localStorage (set during onboarding)
  const region = localStorage.getItem("krishi_region") || "India";
  const season = getCurrentSeason();

  /**
   * scan(imageFile)
   * ────────────────
   * Main function. Call with the File object from your upload input.
   * Drives through uploading → predicting → advising → done.
   */
  const scan = useCallback(async (imageFile) => {
    if (!imageFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setStage(STAGES.UPLOADING);
      // Small delay so the UI can render the uploading state before the
      // network request blocks. Feels more responsive.
      await new Promise(r => setTimeout(r, 120));

      setStage(STAGES.PREDICTING);
      // The server does model prediction + Gemini in one call,
      // but we show two stages so the user knows what's happening.
      await new Promise(r => setTimeout(r, 80));

      setStage(STAGES.ADVISING);

      const data = await analyzeImage(imageFile, { region, season, language });

      setStage(STAGES.DONE);
      setResult(data);
    } catch (err) {
      setStage(STAGES.ERROR);
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [region, season, language]);

  /**
   * getFullAdvisory(mode)
   * ──────────────────────
   * Call after scan() to refresh advisory in a different mode
   * ("short" for WhatsApp message, "detailed" for full report).
   * Updates the advisory fields on the existing result without re-scanning.
   */
  const getFullAdvisory = useCallback(async (mode = "detailed") => {
    if (!result) return;
    setLoading(true);
    try {
      const advisory = await getAdvisory({
        disease_name: result.disease,
        confidence:   result.confidence / 100,
        crop:         result.crop,
        region,
        season,
        language,
        mode,
      });

      // GUARD: only update if advisory field is genuinely non-empty
      const text = advisory?.advisory?.trim();
      if (!text) {
        console.warn("getFullAdvisory: empty advisory returned, keeping existing data");
        return; // keep existing result — don't wipe it
      }

      setResult(prev => ({
        ...prev,
        advisory_short:  mode === "short"    ? text : prev.advisory_short,
        advisory_detail: mode === "detailed"  ? text : prev.advisory_detail,
      }));
    } catch (err) {
      // Don't surface errors to the user — just log and keep existing result
      console.warn("getFullAdvisory error (non-fatal):", err.message);
      // Don't call setError here — the scan result is still valid
    } finally {
      setLoading(false);
    }
  }, [result, region, season, language]);

  /**
   * reset()
   * ────────
   * Clear everything — called when farmer taps "Scan Another".
   */
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setStage(STAGES.IDLE);
    setLoading(false);
  }, []);

  return {
    scan,
    getFullAdvisory,
    reset,
    result,
    loading,
    error,
    stage,
    STAGES,
  };
}
