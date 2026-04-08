import { Link } from "react-router-dom";

const FEATURES = [
  {
    emoji: "🤖",
    title: "AI Crop Doctor",
    description: "Upload a photo of your crop. Get instant disease diagnosis, severity assessment, and treatment plan from Gemini AI.",
    link: "/chat",
    linkLabel: "Try AI Chat",
    accent: "#16a34a",
  },
  {
    emoji: "🌤️",
    title: "Smart Weather Alerts",
    description: "Location-specific forecasts with farming advisories — spray windows, fungal risk alerts, irrigation reminders.",
    link: "/weather",
    linkLabel: "Check Weather",
    accent: "#0891b2",
  },
  {
    emoji: "📊",
    title: "Live Mandi Prices",
    description: "Real-time Agmarknet data for 2700+ mandis across India. Min, Max, and Modal prices per district.",
    link: "/market",
    linkLabel: "View Prices",
    accent: "#d97706",
  },
  {
    emoji: "🏛️",
    title: "Government Schemes",
    description: "Filter 30+ central and state schemes by your location. Get exact eligibility, documents needed, and apply links.",
    link: "/schemes",
    linkLabel: "Find Schemes",
    accent: "#7c3aed",
  },
];

const Features = () => {
  return (
    <section style={{ padding: "80px 24px", background: "#f8fafb" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <div style={{
            display: "inline-block", fontSize: "12px", fontWeight: "700",
            letterSpacing: "0.15em", textTransform: "uppercase",
            color: "#16a34a", marginBottom: "12px",
          }}>
            Everything You Need
          </div>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 40px)", fontWeight: "800",
            color: "#0f172a", margin: 0, letterSpacing: "-0.02em",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            Built for Indian Farmers
          </h2>
          <p style={{ color: "#64748b", fontSize: "17px", marginTop: "12px", lineHeight: 1.6 }}>
            Every tool you need to farm smarter — from soil to sale.
          </p>
        </div>

        {/* Feature cards grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "24px",
        }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: "white",
              borderRadius: "20px",
              padding: "32px 28px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
              border: "1px solid #f1f5f9",
              display: "flex", flexDirection: "column", gap: "14px",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.1)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)"; }}
            >
              {/* Icon */}
              <div style={{
                width: "52px", height: "52px", borderRadius: "14px",
                background: f.accent + "18",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "26px",
              }}>
                {f.emoji}
              </div>

              <div>
                <h3 style={{
                  fontSize: "18px", fontWeight: "700", color: "#0f172a",
                  margin: "0 0 8px", fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.65", margin: 0 }}>
                  {f.description}
                </p>
              </div>

              <Link to={f.link} style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                color: f.accent, fontSize: "14px", fontWeight: "600",
                textDecoration: "none", marginTop: "auto",
                transition: "gap 0.2s",
              }}
                onMouseOver={e => e.currentTarget.style.gap = "10px"}
                onMouseOut={e => e.currentTarget.style.gap = "6px"}
              >
                {f.linkLabel} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;