import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import useDiseaseScan from "../hooks/useDiseaseScan";
import DiseaseResultCard, { parseAdvisoryText } from "./DiseaseResultCard";

// ─── Inline styles kept scoped to avoid App.css conflicts ─────────────────────
const S = {
  hero: {
    background: "linear-gradient(160deg, #052e0f 0%, #0a4016 40%, #145a20 100%)",
    padding: "72px 24px 80px",
    color: "white",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  glow: {
    position: "absolute", inset: 0, pointerEvents: "none",
    backgroundImage:
      "radial-gradient(circle at 15% 50%, rgba(74,222,128,0.07) 0%, transparent 55%), " +
      "radial-gradient(circle at 85% 20%, rgba(74,222,128,0.05) 0%, transparent 45%)",
  },
  inner: { maxWidth: "900px", margin: "0 auto", position: "relative" },
  badge: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)",
    borderRadius: "50px", padding: "5px 16px", fontSize: "13px",
    marginBottom: "24px", backdropFilter: "blur(4px)", letterSpacing: "0.015em",
  },
  h1: {
    fontSize: "clamp(32px, 5.5vw, 58px)", fontWeight: "800",
    lineHeight: 1.15, margin: "0 0 16px", letterSpacing: "-0.025em",
  },
  sub: {
    fontSize: "clamp(15px, 2.2vw, 18px)", opacity: 0.8,
    lineHeight: 1.7, maxWidth: "560px", margin: "0 auto 40px",
    fontWeight: "400",
  },
  // ── Upload card ──
  uploadCard: {
    background: "rgba(255,255,255,0.05)",
    border: "2px dashed rgba(74,222,128,0.35)",
    borderRadius: "20px",
    padding: "40px 24px",
    textAlign: "center",
    maxWidth: "560px",
    margin: "0 auto 32px",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
  },
  uploadCardHover: {
    borderColor: "rgba(74,222,128,0.7)",
    background: "rgba(74,222,128,0.06)",
  },
  uploadIcon: { fontSize: "52px", lineHeight: 1, marginBottom: "14px" },
  uploadTitle: {
    fontSize: "18px", fontWeight: "700", marginBottom: "6px",
  },
  uploadSub: { fontSize: "13px", opacity: 0.65, marginBottom: "20px" },
  btnRow: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" },
  scanBtn: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    background: "#4ade80", color: "#052e0f",
    padding: "12px 28px", borderRadius: "12px",
    fontWeight: "700", fontSize: "15px",
    border: "none", cursor: "pointer",
    transition: "transform 0.18s, box-shadow 0.18s",
    boxShadow: "0 4px 20px rgba(74,222,128,0.4)",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  cameraBtn: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    background: "rgba(255,255,255,0.1)", color: "white",
    padding: "12px 24px", borderRadius: "12px",
    fontWeight: "600", fontSize: "15px",
    border: "1.5px solid rgba(255,255,255,0.2)",
    cursor: "pointer", backdropFilter: "blur(4px)",
    transition: "background 0.2s",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  // ── Loading / stage ──
  stage: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "14px 20px", background: "rgba(74,222,128,0.1)",
    border: "1px solid rgba(74,222,128,0.25)", borderRadius: "14px",
    fontSize: "14px", color: "#4ade80",
    maxWidth: "560px", margin: "0 auto 24px",
  },
  spinner: {
    width: "18px", height: "18px",
    border: "2px solid #4ade80", borderTopColor: "transparent",
    borderRadius: "50%", flexShrink: 0,
    animation: "spin 0.7s linear infinite",
  },
  // ── Error ──
  errorBox: {
    padding: "14px 18px",
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "14px", color: "#fca5a5", fontSize: "14px",
    maxWidth: "560px", margin: "0 auto 24px",
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px",
  },
  retryBtn: {
    fontSize: "13px", fontWeight: "600",
    background: "rgba(239,68,68,0.2)", color: "#fca5a5",
    border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px",
    padding: "6px 14px", cursor: "pointer", flexShrink: 0,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  // ── Stats row ──
  stats: { display: "flex", justifyContent: "center", gap: "36px", flexWrap: "wrap", marginTop: "36px" },
  stat:  { textAlign: "center" },
  statNum:   { fontSize: "26px", fontWeight: "800", color: "#4ade80" },
  statLabel: { fontSize: "12px", opacity: 0.65, marginTop: "2px" },
  // ── Nav links ──
  navLinks: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "24px" },
  navLink: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    padding: "10px 20px", borderRadius: "10px",
    fontWeight: "600", fontSize: "14px", textDecoration: "none",
    background: "rgba(255,255,255,0.1)", color: "white",
    border: "1px solid rgba(255,255,255,0.18)",
    transition: "background 0.2s",
  },
  previewImg: {
    maxWidth: "100%", maxHeight: "160px", objectFit: "contain",
    borderRadius: "12px", margin: "0 auto 16px", display: "block",
  },
};

const STAGE_LABELS = {
  uploading:  "Uploading image…",
  predicting: "AI analysing your crop…",
  advising:   "Generating treatment advisory…",
};

const STATS = [
  { num: "38", label: "Crop Diseases Detected" },
  { num: "2700+", label: "Mandis Tracked" },
  { num: "30+", label: "Schemes Listed" },
];

export default function Hero() {
  const { t, currentLanguage } = useLanguage();
  const { scan, reset, result, loading, error, stage } = useDiseaseScan();

  const fileInputRef   = useRef(null);
  const cameraInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file?.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    await scan(file);
  }, [scan]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleScanAgain = () => {
    reset();
    setPreview(null);
  };

  const buildParsed = (r) => {
    if (!r) return null;
    const text = r.advisory_detail || r.advisory_short || "";
    return {
      diseaseName: r.disease || "Unknown",
      crop:        r.crop,
      confidence:  r.confidence || 0,
      severity:    r.severity || "medium",
      isHealthy:   r.is_healthy || false,
      sections:    parseAdvisoryText(text),
      rawText:     text || "No advisory available.",
    };
  };

  const cardStyle = {
    ...S.uploadCard,
    ...(hovered || dragging ? S.uploadCardHover : {}),
  };

  return (
    <section style={S.hero}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hero-nav-link:hover { background: rgba(255,255,255,0.18) !important; }
        .hero-scan-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(74,222,128,0.5) !important; }
        .hero-cam-btn:hover  { background: rgba(255,255,255,0.18) !important; }
      `}</style>

      <div style={S.glow} />

      <div style={S.inner}>
        {/* Badge */}
        <div style={{ textAlign: "center" }}>
          <div style={S.badge}>
            <span>🌾</span>
            <span>India's AI-Powered Farm Intelligence Platform</span>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ ...S.h1, textAlign: "center" }}>
          {t("heroTitle") || "Scan Your Crop."}<br />
          <span style={{ color: "#4ade80" }}>Get Instant Disease Advice.</span>
        </h1>

        <p style={{ ...S.sub, textAlign: "center" }}>
          Upload a leaf photo to detect disease, check severity, and get a treatment plan in seconds, free.
        </p>

        {/* ── Disease Detection Hero Card ─────────────────────────── */}
        {!result && (
          <>
            <div
              style={cardStyle}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !loading && fileInputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="Crop preview" style={S.previewImg} />
              ) : (
                <div style={S.uploadIcon}>🌿</div>
              )}
              {!preview && (
                <>
                  <div style={S.uploadTitle}>Drag & Drop Your Crop Photo</div>
                  <div style={S.uploadSub}>or click to browse — JPG, PNG up to 10 MB</div>
                </>
              )}
              {preview && !loading && (
                <div style={{ ...S.uploadTitle, fontSize: "15px" }}>
                  {loading ? "Analysing…" : "Click again to change image"}
                </div>
              )}
              <div style={S.btnRow} onClick={(e) => e.stopPropagation()}>
                <button
                  className="hero-scan-btn"
                  style={S.scanBtn}
                  disabled={loading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  📷 Scan Your Crop
                </button>
                <button
                  className="hero-cam-btn"
                  style={S.cameraBtn}
                  disabled={loading}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  📸 Use Camera
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={onFileChange}
            />
          </>
        )}

        {/* Loading state */}
        {loading && (
          <div style={S.stage}>
            <div style={S.spinner} />
            <span>{STAGE_LABELS[stage] || "Processing…"}</span>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div style={S.errorBox}>
            <span>⚠️ {error}</span>
            <button style={S.retryBtn} onClick={handleScanAgain}>
              Try Again
            </button>
          </div>
        )}

        {/* ── Result Card ── */}
        {result && !loading && (
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            <DiseaseResultCard
              parsed={buildParsed(result)}
              language={currentLanguage}
              onGetAdvisory={() => {}}
              onScanAgain={handleScanAgain}
            />
          </div>
        )}

        {/* Stats + Nav links shown when no result */}
        {!result && (
          <>
            <div style={S.stats}>
              {STATS.map(s => (
                <div key={s.num} style={S.stat}>
                  <div style={S.statNum}>{s.num}</div>
                  <div style={S.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={S.navLinks}>
              {[
                { to: "/chat",          icon: "🤖", label: t("startAIChat") || "Ask AI" },
                { to: "/weather",       icon: "🌤️", label: "Weather" },
                { to: "/market-prices", icon: "📊", label: "Mandi Prices" },
                { to: "/schemes",       icon: "📋", label: "Schemes" },
              ].map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="hero-nav-link"
                  style={S.navLink}
                >
                  <span>{link.icon}</span> {link.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
