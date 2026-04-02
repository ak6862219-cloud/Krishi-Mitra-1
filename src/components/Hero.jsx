import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const Hero = () => {
  const { t } = useLanguage();

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroSubtitle")}</p>

          <div className="hero-buttons">
            <Link to="/chat" className="btn btn-primary btn-small ">
              {t("startAIChat")}
            </Link>
            <Link to="/weather" className="btn btn-secondary btn-small ">
              {t("checkWeather")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
