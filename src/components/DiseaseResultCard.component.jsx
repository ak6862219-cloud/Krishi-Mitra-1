import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────
// PARSER — extracts structured data from raw Gemini text output
// ─────────────────────────────────────────────────────────────
export function parseDiagnosisResponse(rawText) {
  if (!rawText) return null;

  const text = rawText.toLowerCase();

  // ── 1. Disease name ──────────────────────────────────────
  //  Tries: "Disease: X", "diagnosed with X", "identified as X",
  //  "disease identified: X", or first bold-ish phrase
  const namePatterns = [
    /(?:disease(?:\s+identified)?|diagnosis|condition|infection|disorder)\s*[:\-–]\s*([^\n\r.,;(]{4,60})/i,
    /(?:identified|detected|found|shows?|appears?\s+to\s+be|diagnosed\s+with)\s+(?:as\s+)?([A-Z][^\n\r.,;(]{4,60})/i,
    /\*\*([^*]{4,60})\*\*/,
    /^([A-Z][a-zA-Z\s]{5,50})(?:\s+disease|\s+blight|\s+rust|\s+spot|\s+rot|\s+mold|\s+wilt|\s+virus|\s+infection)/im,
  ];

  let diseaseName = "Unknown Disease";
  for (const pattern of namePatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      diseaseName = match[1]
        .trim()
        .replace(/\*+/g, "")
        .replace(/^\w/, (c) => c.toUpperCase());
      break;
    }
  }
  // Clean up trailing noise
  diseaseName = diseaseName
    .replace(/\s+(disease|infection|condition|identified|detected)\s*$/i, "")
    .trim();

  // ── 2. Confidence ────────────────────────────────────────
  //  Tries: "confidence: 87%", "87% confidence", "~85%", "approximately 90%"
  const confPatterns = [
    /confidence\s*[:\-–]?\s*~?(\d{1,3})\s*%/i,
    /~?(\d{1,3})\s*%\s*(?:confidence|certain|accurate|sure|probability|likely)/i,
    /approximately\s+(\d{1,3})\s*%/i,
    /(\d{1,3})\s*%\s*(?:match|accuracy)/i,
    /probability[:\s]+(\d{1,3})\s*%/i,
  ];

  let confidence = null;
  for (const pattern of confPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 1 && val <= 100) {
        confidence = val;
        break;
      }
    }
  }

  // ── 3. Severity ──────────────────────────────────────────
  const severityMap = {
    low: ["low", "mild", "minimal", "minor", "early stage", "initial", "slight"],
    medium: ["moderate", "medium", "intermediate", "significant", "developing"],
    high: ["high", "severe", "critical", "serious", "advanced", "extreme", "acute", "dangerous"],
  };

  let severity = "medium"; // default
  for (const [level, keywords] of Object.entries(severityMap)) {
    if (keywords.some((kw) => text.includes(kw))) {
      severity = level;
      break;
    }
  }
  // High overrides medium if both found
  if (
    severityMap.high.some((kw) => text.includes(kw)) &&
    !severityMap.medium.some((kw) => text.includes(kw) && text.indexOf(kw) < text.indexOf("severe"))
  ) {
    severity = "high";
  }

  // ── 4. Key symptoms (first 2–3 bullet-ish points) ────────
  const symptomPatterns = [
    /(?:symptoms?|signs?|characteristics?)[:\s]+([^\n]{10,120})/gi,
    /[-•*]\s+([A-Z][^\n]{10,80})/g,
  ];

  const symptoms = [];
  for (const pattern of symptomPatterns) {
    let m;
    while ((m = pattern.exec(rawText)) !== null && symptoms.length < 3) {
      const s = m[1].replace(/\*+/g, "").trim();
      if (s.length > 10 && !symptoms.includes(s)) symptoms.push(s);
    }
    if (symptoms.length) break;
  }

  // ── 5. First immediate action ────────────────────────────
  const actionPattern =
    /(?:immediate(?:ly)?|action|recommend|treat|apply|spray|remove)[:\s]+([^\n.]{10,140}[.!]?)/i;
  const actionMatch = rawText.match(actionPattern);
  const immediateAction = actionMatch
    ? actionMatch[1].replace(/\*+/g, "").trim()
    : null;

  // ── 6. Healthy flag ──────────────────────────────────────
  const isHealthy =
    /\b(healthy|no disease|no infection|looks healthy|appears healthy|normal|no signs of disease)\b/i.test(rawText);

  return {
    diseaseName: isHealthy ? "Healthy Plant" : diseaseName,
    confidence,
    severity: isHealthy ? "low" : severity,
    symptoms: symptoms.slice(0, 3),
    immediateAction,
    isHealthy,
    rawText,
  };
}

// ─────────────────────────────────────────────────────────────
// SEVERITY CONFIG
// ─────────────────────────────────────────────────────────────
const SEVERITY = {
  low: {
    label: "Low",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#86efac",
    track: "#dcfce7",
    tagBg: "#dcfce7",
    tagColor: "#166534",
    icon: "✓",
    bar: "#22c55e",
  },
  medium: {
    label: "Moderate",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
    track: "#fef9c3",
    tagBg: "#fef3c7",
    tagColor: "#92400e",
    icon: "⚠",
    bar: "#f59e0b",
  },
  high: {
    label: "Severe",
    color: "#dc2626",
    bg: "#fff5f5",
    border: "#fca5a5",
    track: "#fee2e2",
    tagBg: "#fee2e2",
    tagColor: "#991b1b",
    icon: "✕",
    bar: "#ef4444",
  },
};

// ─────────────────────────────────────────────────────────────
// CONFIDENCE ARC (SVG)
// ─────────────────────────────────────────────────────────────
function ConfidenceArc({ value, color, animated }) {
  const r = 36;
  const cx = 48;
  const cy = 48;
  const circumference = Math.PI * r; // half arc (180°)
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!animated) { setDisplayed(value ?? 0); return; }
    let start = null;
    const duration = 1000;
    const target = value ?? 0;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, animated]);

  const offset =
    value != null
      ? circumference - (displayed / 100) * circumference
      : circumference;

  return (
    <svg width="96" height="60" viewBox="0 0 96 60" style={{ overflow: "visible" }}>
      {/* Track */}
      <path
        d={`M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.05s linear" }}
      />
      {/* Value */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fontFamily="'Courier Prime', 'Courier New', monospace"
        fill={value != null ? color : "#9ca3af"}
      >
        {value != null ? `${displayed}%` : "—"}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fontSize="9"
        fontFamily="'DM Sans', sans-serif"
        fill="#9ca3af"
        letterSpacing="0.08em"
      >
        CONFIDENCE
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function DiseaseResultCard({
  geminiResponse,      // raw string from Gemini
  parsed,              // OR pass already-parsed object
  onGetAdvisory,       // callback() → triggers full Gemini advisory
  onScanAgain,         // callback() → resets upload
  language = "en",     // "en" | "hi" | "ml"
  className = "",
}) {
  const data = parsed ?? parseDiagnosisResponse(geminiResponse);
  const [visible, setVisible] = useState(false);
  const [arcAnimated, setArcAnimated] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setArcAnimated(true), 300);
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  if (!data) return null;

  const sev = SEVERITY[data.severity] ?? SEVERITY.medium;

  const LABELS = {
    en: {
      detected: "Detected",
      healthy: "Healthy",
      severity: "Severity",
      symptoms: "Key Symptoms",
      action: "Immediate Action",
      advisory: "Get Full Advisory",
      again: "Scan Another",
      noConf: "Analyse image for confidence",
      report: "CROP HEALTH REPORT",
    },
    hi: {
      detected: "पता चला",
      healthy: "स्वस्थ",
      severity: "गंभीरता",
      symptoms: "मुख्य लक्षण",
      action: "तुरंत करें",
      advisory: "पूरी सलाह लें",
      again: "फिर स्कैन करें",
      noConf: "विश्वास स्तर अज्ञात",
      report: "फसल स्वास्थ्य रिपोर्ट",
    },
    ml: {
      detected: "കണ്ടെത്തി",
      healthy: "ആരോഗ്യകരം",
      severity: "തീവ്രത",
      symptoms: "പ്രധാന ലക്ഷണങ്ങൾ",
      action: "ഉടനടി ചെയ്യേണ്ടത്",
      advisory: "പൂർണ ഉപദേശം",
      again: "വീണ്ടും സ്കാൻ",
      noConf: "ആത്മവിശ്വാസം അജ്ഞാതം",
      report: "വിള ആരോഗ്യ റിപ്പോർട്ട്",
    },
  };

  const L = LABELS[language] ?? LABELS.en;

  return (
    <>
      <style>{CSS}</style>
      <div
        ref={cardRef}
        className={`drc-root ${visible ? "drc-visible" : ""} ${className}`}
        style={{ "--sev-color": sev.color, "--sev-bg": sev.bg, "--sev-border": sev.border }}
      >
        {/* ── Report header strip ── */}
        <div className="drc-header-strip">
          <span className="drc-report-label">{L.report}</span>
          <span className="drc-timestamp">
            {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>

        {/* ── Severity accent bar ── */}
        <div className="drc-accent-bar" style={{ background: sev.color }} />

        <div className="drc-body">
          {/* ── Top row: name + arc ── */}
          <div className="drc-top-row" style={{ animationDelay: "0.05s" }}>
            <div className="drc-name-block">
              <div className="drc-detected-label" style={{ color: sev.color }}>
                {data.isHealthy ? L.healthy : L.detected}
              </div>
              <h2 className="drc-disease-name">{data.diseaseName}</h2>

              {/* Severity badge */}
              <div
                className="drc-severity-badge"
                style={{ background: sev.tagBg, color: sev.tagColor, border: `1px solid ${sev.border}` }}
              >
                <span className="drc-sev-icon">{sev.icon}</span>
                <span className="drc-sev-label">{L.severity}: {sev.label}</span>
              </div>
            </div>

            {/* Confidence arc */}
            <div className="drc-arc-block">
              <ConfidenceArc
                value={data.confidence}
                color={sev.color}
                animated={arcAnimated}
              />
              {data.confidence == null && (
                <div className="drc-no-conf">{L.noConf}</div>
              )}
            </div>
          </div>

          {/* ── Severity meter bar ── */}
          <div className="drc-meter-row" style={{ animationDelay: "0.15s" }}>
            <div className="drc-meter-track">
              <div
                className="drc-meter-fill"
                style={{
                  width: visible
                    ? data.severity === "low" ? "28%" : data.severity === "medium" ? "58%" : "90%"
                    : "0%",
                  background: sev.bar,
                  transitionDelay: "0.3s",
                }}
              />
            </div>
            <div className="drc-meter-ticks">
              <span style={{ color: SEVERITY.low.color }}>Low</span>
              <span style={{ color: SEVERITY.medium.color }}>Moderate</span>
              <span style={{ color: SEVERITY.high.color }}>Severe</span>
            </div>
          </div>

          {/* ── Symptoms ── */}
          {data.symptoms?.length > 0 && (
            <div className="drc-section" style={{ animationDelay: "0.22s" }}>
              <div className="drc-section-title">{L.symptoms}</div>
              <ul className="drc-symptom-list">
                {data.symptoms.map((s, i) => (
                  <li key={i} className="drc-symptom-item">
                    <span
                      className="drc-symptom-dot"
                      style={{ background: sev.color }}
                    />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Immediate action ── */}
          {data.immediateAction && (
            <div
              className="drc-action-box"
              style={{
                background: sev.bg,
                borderColor: sev.border,
                animationDelay: "0.30s",
              }}
            >
              <div className="drc-action-title" style={{ color: sev.color }}>
                {L.action}
              </div>
              <p className="drc-action-text">{data.immediateAction}</p>
            </div>
          )}

          {/* ── CTA buttons ── */}
          <div className="drc-cta-row" style={{ animationDelay: "0.38s" }}>
            {onGetAdvisory && (
              <button
                className="drc-btn-primary"
                style={{ background: sev.color }}
                onClick={onGetAdvisory}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
                </svg>
                {L.advisory}
              </button>
            )}
            {onScanAgain && (
              <button className="drc-btn-ghost" onClick={onScanAgain}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                {L.again}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Courier+Prime:wght@400;700&display=swap');

  .drc-root {
    font-family: 'DM Sans', system-ui, sans-serif;
    background: #fefefe;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    overflow: hidden;
    width: 100%;
    max-width: 480px;
    position: relative;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.4s ease, transform 0.4s ease;
    box-shadow: 0 2px 16px rgba(0,0,0,0.06);
  }

  .drc-root.drc-visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* ── Header strip ── */
  .drc-header-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 18px;
    background: #f9fafb;
    border-bottom: 1px solid #f3f4f6;
  }

  .drc-report-label {
    font-family: 'Courier Prime', 'Courier New', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #9ca3af;
    text-transform: uppercase;
  }

  .drc-timestamp {
    font-family: 'Courier Prime', 'Courier New', monospace;
    font-size: 9px;
    color: #d1d5db;
    letter-spacing: 0.06em;
  }

  /* ── Accent bar ── */
  .drc-accent-bar {
    height: 4px;
    width: 100%;
    transition: background 0.4s ease;
  }

  /* ── Body ── */
  .drc-body {
    padding: 20px 20px 16px;
  }

  /* ── Animated sections ── */
  .drc-top-row,
  .drc-meter-row,
  .drc-section,
  .drc-action-box,
  .drc-cta-row {
    opacity: 0;
    transform: translateY(8px);
    animation: drcFadeUp 0.4s ease forwards;
  }

  .drc-root.drc-visible .drc-top-row,
  .drc-root.drc-visible .drc-meter-row,
  .drc-root.drc-visible .drc-section,
  .drc-root.drc-visible .drc-action-box,
  .drc-root.drc-visible .drc-cta-row {
    animation-play-state: running;
  }

  @keyframes drcFadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Top row ── */
  .drc-top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    gap: 12px;
  }

  .drc-name-block {
    flex: 1;
    min-width: 0;
  }

  .drc-detected-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 4px;
    transition: color 0.3s;
  }

  .drc-disease-name {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    line-height: 1.25;
    margin: 0 0 10px;
    letter-spacing: -0.02em;
  }

  .drc-severity-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }

  .drc-sev-icon {
    font-size: 10px;
    line-height: 1;
  }

  .drc-sev-label {
    letter-spacing: 0.02em;
  }

  /* ── Arc block ── */
  .drc-arc-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    padding-top: 4px;
  }

  .drc-no-conf {
    font-size: 9px;
    color: #9ca3af;
    text-align: center;
    max-width: 80px;
    line-height: 1.4;
    margin-top: 4px;
  }

  /* ── Meter ── */
  .drc-meter-row {
    margin-bottom: 18px;
  }

  .drc-meter-track {
    height: 6px;
    background: #f3f4f6;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 5px;
  }

  .drc-meter-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .drc-meter-ticks {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.04em;
    opacity: 0.7;
  }

  /* ── Symptoms ── */
  .drc-section {
    margin-bottom: 14px;
  }

  .drc-section-title {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 8px;
  }

  .drc-symptom-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .drc-symptom-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;
    color: #374151;
    line-height: 1.45;
  }

  .drc-symptom-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 5px;
    opacity: 0.7;
  }

  /* ── Action box ── */
  .drc-action-box {
    border-radius: 10px;
    border: 1px solid;
    padding: 12px 14px;
    margin-bottom: 16px;
  }

  .drc-action-title {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .drc-action-text {
    font-size: 13px;
    color: #374151;
    margin: 0;
    line-height: 1.5;
  }

  /* ── CTA buttons ── */
  .drc-cta-row {
    display: flex;
    gap: 10px;
  }

  .drc-btn-primary {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 11px 16px;
    border-radius: 10px;
    border: none;
    color: #ffffff;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    letter-spacing: 0.01em;
  }

  .drc-btn-primary:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .drc-btn-primary:active {
    transform: scale(0.98);
  }

  .drc-btn-ghost {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 11px 14px;
    border-radius: 10px;
    border: 1.5px solid #e5e7eb;
    background: transparent;
    color: #6b7280;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
    white-space: nowrap;
  }

  .drc-btn-ghost:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateY(-1px);
  }

  .drc-btn-ghost:active {
    transform: scale(0.98);
  }

  /* ── Dark mode ── */
  @media (prefers-color-scheme: dark) {
    .drc-root {
      background: #0f1d10;
      border-color: #1e3020;
      box-shadow: 0 2px 20px rgba(0,0,0,0.3);
    }
    .drc-header-strip {
      background: #111c14;
      border-color: #1e3020;
    }
    .drc-disease-name { color: #f9fafb; }
    .drc-symptom-item { color: #d1d5db; }
    .drc-action-text  { color: #d1d5db; }
    .drc-meter-track  { background: #1e3020; }
    .drc-btn-ghost {
      border-color: #1e3020;
      color: #9ca3af;
    }
    .drc-btn-ghost:hover {
      background: #162018;
      border-color: #2d4a30;
    }
  }
`;
