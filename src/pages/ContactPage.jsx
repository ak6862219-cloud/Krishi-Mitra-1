import { useState } from "react";

const offices = [
  { name: "Krishi Vigyan Kendra — Thiruvananthapuram", phone: "0471-2348988", address: "Vellayani, Thiruvananthapuram, Kerala 695522", type: "KVK" },
  { name: "Krishi Vigyan Kendra — Ernakulam", phone: "0484-2454125", address: "Kolenchery, Ernakulam, Kerala 682311", type: "KVK" },
  { name: "Krishi Vigyan Kendra — Thrissur", phone: "0480-2705677", address: "Vellanikkara, Thrissur, Kerala 680656", type: "KVK" },
  { name: "Kerala Agriculture Helpline", phone: "1800-425-4075", address: "Toll-free, Available Mon-Sat 9AM–5PM", type: "Helpline" },
  { name: "ICAR — National Helpline for Farmers", phone: "1800-180-1551", address: "Kisan Call Centre — 24/7 toll-free", type: "Helpline" },
];

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", phone: "", district: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const districts = ["Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod"];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "2rem 1rem 5rem" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#166534", margin: "0 0 0.5rem" }}>
            📞 Contact & Support
          </h1>
          <p style={{ color: "#4b5563", margin: 0 }}>
            Reach out to your nearest agricultural office or send us a message.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* Contact form */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: "24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>
              Send us a message
            </h2>

            {submitted ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3 style={{ color: "#166534", margin: "0 0 8px" }}>Message Sent!</h3>
                <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 16px" }}>
                  We'll get back to you within 24 hours.
                </p>
                <button onClick={() => { setSubmitted(false); setForm({ name:"", phone:"", district:"", message:"" }); }}
                  style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #16a34a", background: "transparent", color: "#16a34a", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Your Name", name: "name", type: "text", placeholder: "Ramesh Kumar" },
                  { label: "Phone Number", name: "phone", type: "tel", placeholder: "+91 98765 43210" },
                ].map(f => (
                  <div key={f.name}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type} required value={form[f.name]} placeholder={f.placeholder}
                      onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>District</label>
                  <select required value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, outline: "none", background: "#fff" }}>
                    <option value="">Select your district</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Your Question / Message</label>
                  <textarea required rows={4} value={form.message} placeholder="Describe your farming issue or question..."
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>

                <button type="submit" style={{ padding: "11px", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Send Message
                </button>
              </form>
            )}
          </div>

          {/* Offices */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>
              Agricultural Offices
            </h2>
            {offices.map((office, i) => (
              <div key={i} style={{
                background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
                padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1 }}>{office.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                    background: office.type === "Helpline" ? "#eff6ff" : "#f0fdf4",
                    color: office.type === "Helpline" ? "#1d4ed8" : "#166534",
                    marginLeft: 8, flexShrink: 0,
                  }}>{office.type}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>📍 {office.address}</div>
                <a href={`tel:${office.phone}`} style={{
                  fontSize: 13, color: "#16a34a", fontWeight: 600, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>📞 {office.phone}</a>
              </div>
            ))}

            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "14px 16px", marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 6 }}>💡 Quick Tip</div>
              <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                For immediate help with crop disease or pest identification, use the <strong>AI Chat</strong> feature — upload a photo of your crop and get an instant diagnosis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
