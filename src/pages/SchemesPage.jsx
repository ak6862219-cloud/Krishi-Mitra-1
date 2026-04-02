import React from "react";
import { useLanguage } from "../context/LanguageContext";
import "../styles/SchemesPage.css";

const schemesData = [
  {
    id: "pm-kisan",
    title: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    summary:
      "Income support scheme for small and marginal farmers. Direct benefit transfer to farmers to supplement agricultural income.",
    eligibility:
      "Small and marginal farmers with landholding as per scheme rules.",
    benefits: "Direct cash support to farmers (central scheme).",
    moreInfo: "https://pmkisan.gov.in",
  },
  {
    id: "pmfby",
    title: "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
    summary:
      "Crop insurance scheme that provides financial support to farmers suffering crop loss from natural calamities, pests and diseases.",
    eligibility:
      "Farmers growing notified crops in notified areas who enroll in the season.",
    benefits: "Compensation for crop losses; promotes access to credit.",
    moreInfo: "https://farmer.gov.in",
  },
  {
    id: "kcc",
    title: "Kisan Credit Card (KCC)",
    summary:
      "Provides farmers with timely access to short-term credit for agriculture and allied activities.",
    eligibility:
      "Farmers with cultivable land, tenant farmers and sharecroppers as per bank rules.",
    benefits: "Low-interest credit, flexibility for crop cyclical needs.",
    moreInfo: "https://rbi.org.in",
  },
  {
    id: "rkvy",
    title: "RKVY / State Schemes (Rashtriya Krishi Vikas Yojana / State-level)",
    summary:
      "Scheme to incentivize states to increase public investment in agriculture and allied sectors.",
    eligibility:
      "Projects and farmers supported under state and central guidelines.",
    benefits:
      "State-driven projects, infrastructure and farmer support programmes.",
    moreInfo: "https://agricoop.nic.in",
  },
  {
    id: "india",
    title: "Farmer Support & Subsidy Programmes",
    summary:
      "state government runs multiple farmer-focused programmes (subsidies, input support, training, and insurance top-ups). Please check the India Agriculture Department for latest schemes and application details.",
    eligibility: "Varies by scheme; typically resident farmers of India.",
    benefits:
      "State subsidies, training, input distribution and localized support.",
    moreInfo: "https://india.gov.in/department-of-agriculture",
  },
];

export default function SchemesPage() {
  const { t } = useLanguage();

  return (
    <div className="schemes-page container">
      <header className="schemes-header">
        <h1>{t("schemes")}</h1>
        <p className="schemes-lead">
          A curated list of farmer schemes relevant to India farmers. Tap a card
          for more information.
        </p>
      </header>

      <section className="schemes-grid">
        {schemesData.map((s) => (
          <article key={s.id} className="scheme-card">
            <h2 className="scheme-title">{s.title}</h2>
            <p className="scheme-summary">{s.summary}</p>

            <ul className="scheme-meta">
              <li>
                <strong>Eligibility:</strong> {s.eligibility}
              </li>
              <li>
                <strong>Benefits:</strong> {s.benefits}
              </li>
            </ul>

            <div className="scheme-actions">
              <a
                href={s.moreInfo}
                target="_blank"
                rel="noopener noreferrer"
                className="scheme-link"
              >
                More info
              </a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
