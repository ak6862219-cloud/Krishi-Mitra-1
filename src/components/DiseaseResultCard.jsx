import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION PARSER
// Parses the structured advisory from main.py into named sections.
// Keys match the labels in build_detailed_prompt().
// ─────────────────────────────────────────────────────────────────────────────
export function parseAdvisoryText(text) {
  if (!text) return {};

  const KEYS = [
    "DISEASE_SUMMARY", "SEVERITY", "VISIBLE_SYMPTOMS",
    "IMMEDIATE_ACTION_48H", "CHEMICAL_TREATMENT", "ORGANIC_ALTERNATIVE",
    "PREVENTION_NEXT_SEASON", "CALL_OFFICER_IF", "FARMER_TIP",
  ];

  const sections = {};
  const lines = text.split("\n");
  let currentKey = null;
  let buffer = [];

  const flush = () => {
    if (currentKey) {
      sections[currentKey] = buffer.join("\n").trim();
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const matchedKey = KEYS.find(k => line.startsWith(k + ":") || line === k + ":");
    if (matchedKey) {
      flush();
      currentKey = matchedKey;
      buffer = [];
      const inline = line.slice(matchedKey.length + 1).trim();
      if (inline) buffer.push(inline);
    } else if (currentKey) {
      buffer.push(raw);
    }
  }
  flush();

  // Parse bullet lists into arrays
  const bulletKeys = ["VISIBLE_SYMPTOMS", "IMMEDIATE_ACTION_48H", "PREVENTION_NEXT_SEASON"];
  for (const k of bulletKeys) {
    if (sections[k]) {
      sections[k] = sections[k]
        .split("\n")
        .map(l => l.trim().replace(/^[-•*]\s*/, "").trim())
        .filter(l => l.length > 3);
    }
  }

  return sections;
}

// Legacy parser kept for backwards compatibility (when geminiResponse string is passed directly)
export function parseDiagnosisResponse(rawText) {
  if (!rawText) return null;
  const sections = parseAdvisoryText(rawText);
  const text = rawText.toLowerCase();

  // Severity
  const sevText = (sections.SEVERITY || "").toLowerCase();
  let severity = "medium";
  if (/severe|high|critical/.test(sevText)) severity = "high";
  else if (/low|mild|minimal/.test(sevText)) severity = "low";
  else if (/\b(severe|critical|dangerous|advanced)\b/.test(text)) severity = "high";
  else if (/\b(moderate|medium|significant)\b/.test(text)) severity = "medium";
  else if (/\b(low|mild|minimal|slight)\b/.test(text)) severity = "low";

  const isHealthy = /\b(healthy|no disease|no infection|looks healthy)\b/i.test(rawText);

  return {
    diseaseName: isHealthy ? "Healthy Plant" : "Disease Detected",
    confidence: null,
    severity: isHealthy ? "low" : severity,
    symptoms: sections.VISIBLE_SYMPTOMS || [],
    immediateAction: Array.isArray(sections.IMMEDIATE_ACTION_48H)
      ? sections.IMMEDIATE_ACTION_48H[0]
      : sections.IMMEDIATE_ACTION_48H,
    isHealthy,
    rawText,
    sections,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const SEV = {
  low:    { label:"Low",      color:"#16a34a", bg:"#f0fdf4", border:"#86efac", tagBg:"#dcfce7", tagColor:"#166534", icon:"✓", barColor:"#22c55e", barWidth:"28%" },
  medium: { label:"Moderate", color:"#d97706", bg:"#fffbeb", border:"#fcd34d", tagBg:"#fef3c7", tagColor:"#92400e", icon:"⚠", barColor:"#f59e0b", barWidth:"58%" },
  high:   { label:"Severe",   color:"#dc2626", bg:"#fff5f5", border:"#fca5a5", tagBg:"#fee2e2", tagColor:"#991b1b", icon:"✕", barColor:"#ef4444", barWidth:"90%" },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE ARC
// ─────────────────────────────────────────────────────────────────────────────
function ConfidenceArc({ value, color }) {
  const [disp, setDisp] = useState(0);
  const r = 36, cx = 48, cy = 48, circ = Math.PI * r;

  useEffect(() => {
    if (value == null) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisp(Math.round(ease * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  const offset = value != null ? circ - (disp / 100) * circ : circ;

  return (
    <svg width="96" height="60" viewBox="0 0 96 60" style={{ overflow: "visible" }}>
      <path d={`M${cx-r},${cy} A${r},${r} 0 0,1 ${cx+r},${cy}`}
        fill="none" stroke="#e5e7eb" strokeWidth="7" strokeLinecap="round"/>
      <path d={`M${cx-r},${cy} A${r},${r} 0 0,1 ${cx+r},${cy}`}
        fill="none" stroke={value != null ? color : "#e5e7eb"} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.04s linear" }}/>
      <text x={cx} y={cy-4} textAnchor="middle" fontSize="15" fontWeight="700"
        fontFamily="'Courier New',monospace" fill={value != null ? color : "#9ca3af"}>
        {value != null ? `${disp}%` : "—"}
      </text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize="9"
        fontFamily="sans-serif" fill="#9ca3af" letterSpacing="0.08em">CONFIDENCE</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVISORY SECTION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function AdvisorySection({ icon, title, children, accentColor, delay = 0 }) {
  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid #f3f4f6",
      background: "#ffffff",
      overflow: "hidden",
      animationDelay: `${delay}s`,
    }} className="adv-section">
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "9px 14px",
        background: "#f9fafb",
        borderBottom: "1px solid #f3f4f6",
      }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: accentColor || "#6b7280",
        }}>{title}</span>
      </div>
      <div style={{ padding: "12px 14px", fontSize: 13, color: "#374151", lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}

function BulletList({ items, color }) {
  if (!items?.length) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 9, alignItems: "baseline" }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%", background: color,
            flexShrink: 0, marginTop: 6, opacity: 0.75,
          }}/>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function DiseaseResultCard({
  geminiResponse,   // raw advisory string (legacy)
  parsed,           // pre-parsed object with { diseaseName, confidence, severity, sections, ... }
  onGetAdvisory,
  onScanAgain,
  language = "en",
  className = "",
}) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, [parsed, geminiResponse]);

  // Normalise input — accept either raw string or parsed object
  let data = parsed;
  if (!data && geminiResponse) {
    data = parseDiagnosisResponse(geminiResponse);
  }
  if (!data) return null;

  // Ensure sections exist
  const sections = data.sections || parseAdvisoryText(data.rawText || "");
  const sev = SEV[data.severity] ?? SEV.medium;

  const L = {
    en: { detected:"Detected", healthy:"Healthy", report:"CROP HEALTH REPORT",
          severity:"Severity", summary:"What is this?", symptoms:"Visible symptoms",
          action:"Action in 48 hours", chemical:"Chemical treatment",
          organic:"Organic alternative", prevention:"Prevention (next season)",
          callOfficer:"When to call officer", tip:"Farmer tip",
          advisory:"Full Advisory", again:"Scan Another",
          showMore:"Show full report", showLess:"Hide report" },
    hi: { detected:"पता चला", healthy:"स्वस्थ", report:"फसल स्वास्थ्य रिपोर्ट",
          severity:"गंभीरता", summary:"यह क्या है?", symptoms:"दिखाई देने वाले लक्षण",
          action:"48 घंटे में करें", chemical:"रासायनिक उपचार",
          organic:"जैविक विकल्प", prevention:"रोकथाम (अगला सीजन)",
          callOfficer:"अधिकारी को कब बुलाएं", tip:"किसान सुझाव",
          advisory:"पूरी सलाह", again:"फिर स्कैन करें",
          showMore:"पूरी रिपोर्ट दिखाएं", showLess:"रिपोर्ट छुपाएं" },
    ml: { detected:"കണ്ടെത്തി", healthy:"ആരോഗ്യകരം", report:"വിള ആരോഗ്യ റിപ്പോർട്ട്",
          severity:"തീവ്രത", summary:"ഇത് എന്താണ്?", symptoms:"ദൃശ്യ ലക്ഷണങ്ങൾ",
          action:"48 മണിക്കൂറിനുള്ളിൽ", chemical:"രാസ ചികിത്സ",
          organic:"ജൈവ ബദൽ", prevention:"പ്രതിരോധം (അടുത്ത സീസൺ)",
          callOfficer:"ഓഫീസറെ വിളിക്കേണ്ടത്", tip:"കർഷക നിർദേശം",
          advisory:"പൂർണ ഉപദേശം", again:"വീണ്ടും സ്കാൻ",
          showMore:"പൂർണ റിപ്പോർട്ട്", showLess:"റിപ്പോർട്ട് മറയ്ക്കുക" },
  };
  const T = L[language] ?? L.en;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Courier+Prime:wght@700&display=swap');
        @keyframes drcIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes drcMeterFill { from{width:0} to{width:var(--bar-w)} }
        @keyframes drcSpin { to{transform:rotate(360deg)} }
        .drc-wrap { font-family:'DM Sans',system-ui,sans-serif; color:#111827; }
        .drc-wrap.in { animation: drcIn .35s ease forwards; }
        .drc-wrap.out { opacity:0; }
        .adv-section { animation: drcIn .35s ease both; }
        .drc-meter-fill-anim { animation: drcMeterFill .9s cubic-bezier(.34,1.56,.64,1) both; }
      `}</style>

      <div
        className={`drc-wrap ${visible ? "in" : "out"} ${className}`}
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          overflow: "hidden",
          maxWidth: 520,
          width: "100%",
          boxShadow: "0 1px 12px rgba(0,0,0,0.07)",
          /* Force light mode — override any dark mode CSS */
          colorScheme: "light",
        }}
      >
        {/* ── Report header ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "7px 18px",
          background: "#f9fafb",
          borderBottom: "1px solid #f3f4f6",
        }}>
          <span style={{
            fontFamily: "'Courier New', monospace", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.14em", color: "#9ca3af", textTransform: "uppercase",
          }}>{T.report}</span>
          <span style={{
            fontFamily: "'Courier New', monospace", fontSize: 9, color: "#d1d5db",
          }}>
            {new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
          </span>
        </div>

        {/* ── Severity colour bar ── */}
        <div style={{ height: 4, background: sev.color, width: "100%" }} />

        {/* ── Main body ── */}
        <div style={{ padding: "18px 20px 16px" }}>

          {/* Top row: name + arc */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: sev.color, marginBottom: 3 }}>
                {data.isHealthy ? T.healthy : T.detected}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 10px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                {data.diseaseName}
              </h2>
              {/* Crop badge if present */}
              {data.crop && (
                <span style={{
                  display: "inline-block", fontSize: 11, fontWeight: 500,
                  background: "#f3f4f6", color: "#6b7280",
                  padding: "2px 10px", borderRadius: 12, marginBottom: 8,
                }}>
                  {data.crop}
                </span>
              )}
              {/* Severity badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: sev.tagBg, color: sev.tagColor, border: `1px solid ${sev.border}`,
              }}>
                <span>{sev.icon}</span>
                <span>{T.severity}: {sev.label}</span>
              </div>
            </div>
            {/* Confidence arc */}
            <div style={{ flexShrink: 0, paddingTop: 4 }}>
              <ConfidenceArc value={data.confidence} color={sev.color} />
            </div>
          </div>

          {/* Severity meter */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden", marginBottom: 5 }}>
              <div
                className="drc-meter-fill-anim"
                style={{
                  height: "100%", borderRadius: 3,
                  background: sev.barColor,
                  "--bar-w": sev.barWidth,
                  width: visible ? sev.barWidth : "0%",
                  animationDelay: visible ? "0.3s" : "999s",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: 600, letterSpacing: "0.04em" }}>
              <span style={{ color: SEV.low.color }}>Low</span>
              <span style={{ color: SEV.medium.color }}>Moderate</span>
              <span style={{ color: SEV.high.color }}>Severe</span>
            </div>
          </div>

          {/* ── Advisory sections ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {/* Disease summary — always show */}
            {sections.DISEASE_SUMMARY && (
              <AdvisorySection icon="🔬" title={T.summary} accentColor="#6366f1" delay={0.05}>
                <p style={{ margin: 0 }}>{sections.DISEASE_SUMMARY}</p>
              </AdvisorySection>
            )}

            {/* Symptoms */}
            {Array.isArray(sections.VISIBLE_SYMPTOMS) && sections.VISIBLE_SYMPTOMS.length > 0 && (
              <AdvisorySection icon="👁" title={T.symptoms} accentColor={sev.color} delay={0.1}>
                <BulletList items={sections.VISIBLE_SYMPTOMS} color={sev.color} />
              </AdvisorySection>
            )}

            {/* Immediate action — always show, with alert styling */}
            {Array.isArray(sections.IMMEDIATE_ACTION_48H) && sections.IMMEDIATE_ACTION_48H.length > 0 && (
              <AdvisorySection icon="⚡" title={T.action} accentColor="#dc2626" delay={0.15}>
                <div style={{
                  background: sev.bg, border: `1px solid ${sev.border}`,
                  borderRadius: 8, padding: "10px 12px",
                }}>
                  <BulletList items={sections.IMMEDIATE_ACTION_48H} color={sev.color} />
                </div>
              </AdvisorySection>
            )}

            {/* Expandable sections */}
            {expanded && (
              <>
                {sections.CHEMICAL_TREATMENT && (
                  <AdvisorySection icon="🧪" title={T.chemical} accentColor="#7c3aed" delay={0.0}>
                    <p style={{ margin: 0 }}>{sections.CHEMICAL_TREATMENT}</p>
                  </AdvisorySection>
                )}

                {sections.ORGANIC_ALTERNATIVE && (
                  <AdvisorySection icon="🌿" title={T.organic} accentColor="#16a34a" delay={0.0}>
                    <p style={{ margin: 0 }}>{sections.ORGANIC_ALTERNATIVE}</p>
                  </AdvisorySection>
                )}

                {Array.isArray(sections.PREVENTION_NEXT_SEASON) && sections.PREVENTION_NEXT_SEASON.length > 0 && (
                  <AdvisorySection icon="🛡" title={T.prevention} accentColor="#0891b2" delay={0.0}>
                    <BulletList items={sections.PREVENTION_NEXT_SEASON} color="#0891b2" />
                  </AdvisorySection>
                )}

                {sections.CALL_OFFICER_IF && (
                  <AdvisorySection icon="📞" title={T.callOfficer} accentColor="#dc2626" delay={0.0}>
                    <p style={{ margin: 0 }}>{sections.CALL_OFFICER_IF}</p>
                  </AdvisorySection>
                )}

                {sections.FARMER_TIP && (
                  <AdvisorySection icon="💡" title={T.tip} accentColor="#d97706" delay={0.0}>
                    <p style={{ margin: 0, fontStyle: "italic", color: "#92400e" }}>{sections.FARMER_TIP}</p>
                  </AdvisorySection>
                )}
              </>
            )}

            {/* Show more / less toggle — only if there are more sections to show */}
            {(sections.CHEMICAL_TREATMENT || sections.ORGANIC_ALTERNATIVE || sections.FARMER_TIP) && (
              <button
                onClick={() => setExpanded(v => !v)}
                style={{
                  width: "100%", padding: "9px", borderRadius: 9,
                  border: "1px dashed #d1d5db", background: "transparent",
                  color: "#6b7280", fontSize: 12, fontWeight: 500,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 6, fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
                onMouseOver={e => e.currentTarget.style.background = "#f9fafb"}
                onMouseOut={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontSize: 11, transform: expanded ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
                {expanded ? T.showLess : T.showMore}
              </button>
            )}
          </div>

          {/* ── CTA buttons ── */}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {onGetAdvisory && (
              <button
                onClick={onGetAdvisory}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 7, padding: "11px 16px", borderRadius: 10, border: "none",
                  background: sev.color, color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", transition: "opacity .15s, transform .15s",
                }}
                onMouseOver={e => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseOut={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
                </svg>
                {T.advisory}
              </button>
            )}
            {onScanAgain && (
              <button
                onClick={onScanAgain}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, padding: "11px 14px", borderRadius: 10,
                  border: "1.5px solid #e5e7eb", background: "transparent",
                  color: "#6b7280", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  transition: "background .15s, transform .15s",
                }}
                onMouseOver={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "none"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                {T.again}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Re-export SEV for ChatPage to reference colors
export { SEV };
