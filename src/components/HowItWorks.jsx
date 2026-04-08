import { Link } from "react-router-dom";

const STEPS = [
  {
    step: "01",
    emoji: "📍",
    title: "Select Your Location",
    description: "Choose your state and district from our all-India database to get localised weather, prices, and schemes.",
  },
  {
    step: "02",
    emoji: "📷",
    title: "Scan Your Crops",
    description: "Upload a photo of any affected crop. Our AI identifies the disease with confidence score and gives a full treatment plan.",
  },
  {
    step: "03",
    emoji: "💰",
    title: "Sell at Best Price",
    description: "Check live Agmarknet mandi prices before you sell. Compare Min, Max, and Modal rates across nearby markets.",
  },
  {
    step: "04",
    emoji: "🏛️",
    title: "Claim Your Benefits",
    description: "Find government schemes you qualify for based on your state, land size, and crop type. Get direct apply links.",
  },
];

const TESTIMONIALS = [
  { name: "Ramesh Patil", state: "Maharashtra", text: "PM-KISAN scheme ka pata chala. Documents bhi pata chal gaye. Bahut helpful!", avatar: "👨‍🌾" },
  { name: "Lakshmi Devi", state: "Telangana", text: "Weather alert se pata chala spray mat karo — bachaya mera pesticide waste.", avatar: "👩‍🌾" },
  { name: "Gurmeet Singh", state: "Punjab", text: "Mandi price check karke Ludhiana mein becha instead of local. Extra ₹200/quintal mila.", avatar: "👨‍🌾" },
];

const HowItWorks = () => {
  return (
    <>
      {/* How it works */}
      <section style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.15em", textTransform: "uppercase", color: "#16a34a", marginBottom: "12px" }}>
              Simple to Use
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: "800", color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
              How Krishi Mitra Works
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "32px" }}>
            {STEPS.map((s) => (
              <div key={s.step} style={{ textAlign: "center", padding: "8px" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #052e0f, #16a34a)",
                  color: "white", fontSize: "14px", fontWeight: "800",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", letterSpacing: "0.05em",
                }}>
                  {s.step}
                </div>
                <div style={{ fontSize: "30px", marginBottom: "12px" }}>{s.emoji}</div>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: "0 0 10px" }}>{s.title}</h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.65", margin: 0 }}>{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "80px 24px", background: "#f0fdf4" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: "800", color: "#0f172a", margin: 0 }}>
              Farmers Love It 🌱
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} style={{
                background: "white", borderRadius: "16px", padding: "28px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #dcfce7",
              }}>
                <div style={{ fontSize: "32px", marginBottom: "14px" }}>{t.avatar}</div>
                <p style={{ fontSize: "15px", color: "#374151", lineHeight: "1.7", margin: "0 0 16px", fontStyle: "italic" }}>
                  "{t.text}"
                </p>
                <div>
                  <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>{t.name}</div>
                  <div style={{ color: "#16a34a", fontSize: "13px" }}>{t.state}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{
        padding: "80px 24px",
        background: "linear-gradient(135deg, #052e0f 0%, #14532d 100%)",
        textAlign: "center", color: "white",
      }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: "800", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
            Ready to Farm Smarter?
          </h2>
          <p style={{ fontSize: "17px", opacity: 0.85, margin: "0 0 36px", lineHeight: "1.6" }}>
            Join thousands of Indian farmers already using AI to make better decisions every day.
          </p>
          <Link to="/chat" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#4ade80", color: "#052e0f",
            padding: "16px 36px", borderRadius: "14px",
            fontWeight: "700", fontSize: "17px", textDecoration: "none",
            boxShadow: "0 4px 20px rgba(74,222,128,0.4)",
          }}>
            🤖 Start Using AI Chat
          </Link>
        </div>
      </section>
    </>
  );
};

export default HowItWorks;
