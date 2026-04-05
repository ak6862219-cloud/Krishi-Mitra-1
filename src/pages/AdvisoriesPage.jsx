import { useState } from "react";

const advisories = [
  {
    id: 1,
    category: "Pest Alert",
    icon: "🐛",
    color: "#dc2626",
    bgColor: "#fef2f2",
    borderColor: "#fecaca",
    title: "Fall Armyworm Alert — Maize & Paddy",
    date: "April 5, 2026",
    district: "All Districts",
    severity: "High",
    body: "Fall Armyworm (Spodoptera frugiperda) has been detected in maize and paddy fields across multiple districts. Larvae cause significant leaf damage and can destroy up to 70% of yield if untreated.",
    actions: [
      "Inspect fields at dawn or dusk when larvae are most active",
      "Apply Emamectin Benzoate 5% SG at 0.4g/litre of water",
      "Use pheromone traps (1 per acre) for early monitoring",
      "Spray Neem-based pesticide (Azadirachtin 0.03%) as organic option",
    ],
    source: "ICAR — Kerala Agricultural University",
  },
  {
    id: 2,
    category: "Disease Alert",
    icon: "🍄",
    color: "#d97706",
    bgColor: "#fffbeb",
    borderColor: "#fcd34d",
    title: "Blast Disease in Paddy — High Risk Period",
    date: "April 4, 2026",
    district: "Palakkad, Thrissur, Malappuram",
    severity: "Moderate",
    body: "Current weather conditions (high humidity 75-85%, temperature 25-28°C) are highly conducive for Rice Blast (Magnaporthe oryzae). Farmers in Palakkad and Thrissur should begin preventive spraying.",
    actions: [
      "Apply Tricyclazole 75% WP at 0.6g/litre before heading stage",
      "Avoid excess nitrogen fertilizer — it increases susceptibility",
      "Ensure proper drainage to reduce humidity in crop canopy",
      "Second spray after 10-14 days if weather remains humid",
    ],
    source: "Department of Agriculture, Kerala",
  },
  {
    id: 3,
    category: "Weather Advisory",
    icon: "🌧️",
    color: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    title: "Pre-Monsoon Rain Expected — Prepare Fields",
    date: "April 3, 2026",
    district: "Kozhikode, Kannur, Kasaragod",
    severity: "Info",
    body: "IMD has forecast heavy pre-monsoon showers (50-70mm) in northern Kerala districts from April 7-10. Farmers with standing crops should take preventive measures to avoid waterlogging and associated disease outbreaks.",
    actions: [
      "Ensure field drainage channels are clear and functional",
      "Harvest any mature crops before April 7 if possible",
      "Apply prophylactic copper fungicide on susceptible crops",
      "Postpone fertilizer application until after rain event",
    ],
    source: "India Meteorological Department (IMD)",
  },
  {
    id: 4,
    category: "Seasonal Advisory",
    icon: "🌱",
    color: "#16a34a",
    bgColor: "#f0fdf4",
    borderColor: "#86efac",
    title: "Kharif Season Preparation — Best Practices",
    date: "April 2, 2026",
    district: "All Districts",
    severity: "Info",
    body: "With Kharif season approaching, farmers should begin soil preparation and seed procurement. Soil testing is recommended before applying fertilizers. Use certified, disease-resistant seed varieties for better yield.",
    actions: [
      "Conduct soil testing through nearest Krishi Vigyan Kendra (KVK)",
      "Procure certified seeds early — avoid delays due to shortage",
      "Apply lime/dolomite if soil pH is below 5.5",
      "Clean and prepare irrigation channels before sowing",
    ],
    source: "Krishi Vigyan Kendra Network",
  },
  {
    id: 5,
    category: "Market Advisory",
    icon: "📊",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    borderColor: "#c4b5fd",
    title: "Coconut Price Expected to Rise — Hold Stocks",
    date: "April 1, 2026",
    district: "Ernakulam, Thrissur, Alappuzha",
    severity: "Info",
    body: "Market analysis indicates coconut prices are likely to increase 8-12% in the next 30 days due to festival demand and reduced supply from Tamil Nadu. Farmers with stored coconuts may benefit from waiting before selling.",
    actions: [
      "Store mature coconuts in dry, ventilated conditions for up to 4 weeks",
      "Monitor daily prices via KrishiAI Market Prices page",
      "Contact nearest Coconut Development Board office for buying centers",
      "Avoid distress selling at current prices if storage is available",
    ],
    source: "Kerala Coconut Development Board",
  },
  {
    id: 6,
    category: "Subsidy Alert",
    icon: "💰",
    color: "#0891b2",
    bgColor: "#ecfeff",
    borderColor: "#a5f3fc",
    title: "PM-KISAN 17th Installment — Verify eKYC",
    date: "March 30, 2026",
    district: "All Districts",
    severity: "Action Required",
    body: "The 17th installment of PM-KISAN (₹2,000 per farmer) will be released soon. Farmers who have not completed eKYC verification will not receive the payment. Deadline for eKYC is April 15, 2026.",
    actions: [
      "Visit pmkisan.gov.in and complete eKYC with Aadhaar OTP",
      "Alternatively, visit nearest Common Service Centre (CSC)",
      "Check your bank account details are correct in the portal",
      "Contact local agriculture department if facing issues",
    ],
    source: "Ministry of Agriculture & Farmers' Welfare",
  },
];

const categories = ["All", "Pest Alert", "Disease Alert", "Weather Advisory", "Seasonal Advisory", "Market Advisory", "Subsidy Alert"];

const AdvisoriesPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = activeCategory === "All"
    ? advisories
    : advisories.filter(a => a.category === activeCategory);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "2rem 1rem 5rem" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#166534", margin: "0 0 0.5rem" }}>
            📢 Agricultural Advisories
          </h1>
          <p style={{ color: "#4b5563", margin: 0 }}>
            Latest alerts, weather warnings, pest bulletins, and seasonal guidance from government sources.
          </p>
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              fontSize: 12, fontWeight: 500, padding: "6px 14px",
              borderRadius: 20, border: "1px solid",
              borderColor: activeCategory === cat ? "#16a34a" : "#e5e7eb",
              background: activeCategory === cat ? "#16a34a" : "#fff",
              color: activeCategory === cat ? "#fff" : "#6b7280",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Advisory cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map(advisory => (
            <div key={advisory.id} style={{
              background: "#fff", border: `1px solid ${advisory.borderColor}`,
              borderRadius: 14, overflow: "hidden",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
              transition: "box-shadow 0.2s",
            }}>
              {/* Card header */}
              <div style={{
                padding: "14px 18px",
                background: advisory.bgColor,
                borderBottom: `1px solid ${advisory.borderColor}`,
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                cursor: "pointer",
              }}
                onClick={() => setExpandedId(expandedId === advisory.id ? null : advisory.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>{advisory.icon}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: advisory.color,
                    }}>{advisory.category}</span>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 10,
                      background: advisory.color, color: "#fff", fontWeight: 600,
                    }}>{advisory.severity}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>
                    {advisory.title}
                  </h3>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280" }}>
                    <span>📅 {advisory.date}</span>
                    <span>📍 {advisory.district}</span>
                  </div>
                </div>
                <span style={{
                  fontSize: 14, color: "#9ca3af", marginLeft: 12, flexShrink: 0,
                  transform: expandedId === advisory.id ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s", display: "inline-block",
                }}>▼</span>
              </div>

              {/* Expanded body */}
              {expandedId === advisory.id && (
                <div style={{ padding: "16px 18px" }}>
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 14px" }}>
                    {advisory.body}
                  </p>

                  <div style={{
                    background: advisory.bgColor, border: `1px solid ${advisory.borderColor}`,
                    borderRadius: 10, padding: "12px 14px", marginBottom: 14,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                      textTransform: "uppercase", color: advisory.color, marginBottom: 10,
                    }}>Recommended Actions</div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                      {advisory.actions.map((action, i) => (
                        <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                          <span style={{
                            width: 20, height: 20, borderRadius: "50%",
                            background: advisory.color, color: "#fff",
                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>{i + 1}</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    Source: {advisory.source}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 32 }}>
          Advisories are updated regularly. Always verify with your local agricultural officer.
        </p>
      </div>
    </div>
  );
};

export default AdvisoriesPage;
