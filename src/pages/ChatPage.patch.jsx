/**
 * ChatPage.patch.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * This is NOT a complete replacement of ChatPage.jsx.
 * It shows EXACTLY what to add / change in your existing file.
 *
 * Search for the markers below in your ChatPage.jsx and make the changes.
 * Each section is labelled: ADD, REPLACE, or REMOVE.
 * ─────────────────────────────────────────────────────────────────────────────
 */


// ════════════════════════════════════════════════════════════════════
// STEP 1 — ADD at top of ChatPage.jsx, with existing imports
// ════════════════════════════════════════════════════════════════════

import useDiseaseScan from "../hooks/useDiseaseScan";
import DiseaseResultCard from "../components/DiseaseResultCard";
// Your existing imports stay exactly as they are ↑


// ════════════════════════════════════════════════════════════════════
// STEP 2 — ADD inside ChatPage() function, near your existing useState hooks
// ════════════════════════════════════════════════════════════════════

const {
  scan,
  getFullAdvisory,
  reset: resetScan,
  result: scanResult,
  loading: scanLoading,
  error: scanError,
  stage: scanStage,
  STAGES,
} = useDiseaseScan();

// Advisory mode toggle: "short" = WhatsApp message, "detailed" = full report
const [advisoryMode, setAdvisoryMode] = useState("detailed");


// ════════════════════════════════════════════════════════════════════
// STEP 3 — REPLACE your existing image upload handler
//
// Find your current handleImageUpload (or whatever sends image to Gemini)
// and REPLACE the body with this:
// ════════════════════════════════════════════════════════════════════

const handleImageUpload = async (file) => {
  // Clears previous result, shows loading states, calls backend
  await scan(file);

  // The result is now in `scanResult` — DiseaseResultCard reads it automatically.
  // You don't need to call setMessages or anything else here.
  // The card renders below the chat input automatically (see STEP 4).
};


// ════════════════════════════════════════════════════════════════════
// STEP 4 — ADD this JSX block in your return(), BELOW the chat messages
//          and ABOVE (or in place of) your existing image result display.
// ════════════════════════════════════════════════════════════════════

const DiseaseResultSection = () => {
  // Stage messages shown while processing
  const STAGE_LABELS = {
    uploading:  { en: "Uploading image…",      hi: "छवि अपलोड हो रही है…",   ml: "ചിത്രം അപ്‌ലോഡ് ചെയ്യുന്നു…" },
    predicting: { en: "Analysing crop…",        hi: "फसल का विश्लेषण हो रहा है…", ml: "വിള വിശകലനം ചെയ്യുന്നു…" },
    advising:   { en: "Writing advisory…",      hi: "सलाह तैयार हो रही है…",  ml: "ഉപദേശം തയ്യാറാക്കുന്നു…" },
    error:      { en: "Analysis failed",        hi: "विश्लेषण विफल",           ml: "വിശകലനം പരാജയപ്പെട്ടു" },
  };

  // Get current app language from your LanguageContext
  // (replace `language` with however your app stores "en"/"hi"/"ml")
  const currentLang = language;   // from your LanguageContext

  if (!scanLoading && !scanResult && !scanError) return null;

  return (
    <div style={{ padding: "0 16px 16px" }}>

      {/* ── Loading states ── */}
      {scanLoading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px",
          background: "#f0fdf4", borderRadius: 12,
          border: "1px solid #bbf7d0",
          fontSize: 13, color: "#166534",
        }}>
          <span style={{
            width: 16, height: 16, border: "2px solid #16a34a",
            borderTopColor: "transparent", borderRadius: "50%",
            animation: "spin 0.7s linear infinite", flexShrink: 0,
          }}/>
          {STAGE_LABELS[scanStage]?.[currentLang] ?? STAGE_LABELS[scanStage]?.en}
        </div>
      )}

      {/* ── Error state ── */}
      {scanError && (
        <div style={{
          padding: "12px 16px", background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: 12,
          fontSize: 13, color: "#dc2626",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{scanError}</span>
          <button onClick={resetScan} style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Try again
          </button>
        </div>
      )}

      {/* ── Result card ── */}
      {scanResult && !scanLoading && (
        <>
          {/* Short / Detailed toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {["short", "detailed"].map(m => (
              <button
                key={m}
                onClick={() => { setAdvisoryMode(m); getFullAdvisory(m); }}
                style={{
                  fontSize: 11, padding: "5px 14px", borderRadius: 20,
                  border: "1px solid",
                  borderColor: advisoryMode === m ? "#16a34a" : "#e5e7eb",
                  background: advisoryMode === m ? "#16a34a" : "transparent",
                  color: advisoryMode === m ? "#fff" : "#6b7280",
                  cursor: "pointer", fontWeight: 500,
                }}
              >
                {m === "short" ? "WhatsApp Message" : "Full Advisory"}
              </button>
            ))}
          </div>

          <DiseaseResultCard
            parsed={{
              diseaseName:     scanResult.disease,
              confidence:      scanResult.confidence,
              severity:        scanResult.severity,
              isHealthy:       scanResult.is_healthy,
              // Parse symptoms & action from the advisory text
              symptoms:        extractBulletPoints(
                advisoryMode === "short"
                  ? scanResult.advisory_short
                  : scanResult.advisory_detail
              ),
              immediateAction: extractImmediateAction(
                advisoryMode === "short"
                  ? scanResult.advisory_short
                  : scanResult.advisory_detail
              ),
              rawText: advisoryMode === "short"
                ? scanResult.advisory_short
                : scanResult.advisory_detail,
            }}
            language={currentLang}
            onGetAdvisory={() => getFullAdvisory("detailed")}
            onScanAgain={resetScan}
          />

          {/* Full advisory text below the card */}
          {advisoryMode === "detailed" && (
            <div style={{
              marginTop: 10, padding: "14px 16px",
              background: "#f9fafb", borderRadius: 12,
              border: "1px solid #f3f4f6",
              fontSize: 13, color: "#374151",
              lineHeight: 1.7, whiteSpace: "pre-wrap",
            }}>
              {scanResult.advisory_detail}
            </div>
          )}

          {advisoryMode === "short" && (
            <div style={{
              marginTop: 10, padding: "14px 16px",
              background: "#f0fdf4", borderRadius: 12,
              border: "1px solid #bbf7d0",
              fontSize: 14, color: "#166534", lineHeight: 1.7,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6, color: "#86efac" }}>
                WHATSAPP MESSAGE
              </div>
              {scanResult.advisory_short}
            </div>
          )}
        </>
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════════════
// STEP 5 — ADD these two helper functions inside ChatPage()
//          (they're used by DiseaseResultSection above)
// ════════════════════════════════════════════════════════════════════

const extractBulletPoints = (text) => {
  if (!text) return [];
  const bullets = [];
  const regex = /[-•*]\s+([A-Z][^\n]{10,80})/g;
  let m;
  while ((m = regex.exec(text)) !== null && bullets.length < 3) {
    bullets.push(m[1].replace(/\*+/g, "").trim());
  }
  return bullets;
};

const extractImmediateAction = (text) => {
  if (!text) return null;
  const m = text.match(/(?:immediate(?:ly)?|action|treat|apply|spray)\s*[:\s]+([^\n.]{10,140}[.!]?)/i);
  return m ? m[1].replace(/\*+/g, "").trim() : null;
};


// ════════════════════════════════════════════════════════════════════
// STEP 6 — ADD the spin keyframe in your CSS (or global styles)
// ════════════════════════════════════════════════════════════════════

const SPIN_CSS = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
// Inject it once somewhere in your ChatPage JSX:
// <style>{SPIN_CSS}</style>
