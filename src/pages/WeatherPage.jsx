import { useState, useEffect } from "react";
import { useWeather } from "../hooks/useWeather";
import { weatherService, INDIA_DISTRICTS, getFarmingAdvisory } from "../services/weatherService";
import SkeletonLoader from "../components/SkeletonLoader";

const WeatherPage = () => {
  const [selectedState, setSelectedState] = useState("Kerala");
  const [city, setCity] = useState("Thiruvananthapuram");
  const [currentDate, setCurrentDate] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { weather, loading, error } = useWeather(city, refreshKey);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      setCurrentDate(now.toLocaleDateString("en-US", options));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Save state + weather to localStorage for chatbot context
  useEffect(() => {
    localStorage.setItem("km_state", selectedState);
  }, [selectedState]);

  useEffect(() => {
    if (weather) {
      localStorage.setItem(
        "km_weather",
        JSON.stringify({
          temp: weather.temperature,
          humidity: weather.humidity,
          condition: weather.condition,
          windSpeed: weather.windSpeed,
        })
      );
    }
  }, [weather]);

  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);
    const firstDistrict = INDIA_DISTRICTS[state]?.[0] || "";
    setCity(firstDistrict);
  };

  const handleCityChange = (e) => {
    setCity(e.target.value);
  };

  const getWeatherIcon = (condition) => {
    const icons = {
      sunny: "☀️",
      clear: "☀️",
      "partly cloudy": "⛅",
      clouds: "☁️",
      cloudy: "☁️",
      rain: "🌦️",
      rainy: "🌦️",
      drizzle: "🌧️",
      thunderstorm: "⛈️",
      snow: "❄️",
      mist: "🌫️",
      night: "🌙",
    };
    return icons[condition?.toLowerCase()] || "⛅";
  };

  const getAdvisoryStyle = (type) => {
    const styles = {
      success: { background: "#f0fdf4", borderLeft: "4px solid #16a34a", color: "#14532d" },
      warning: { background: "#fffbeb", borderLeft: "4px solid #f59e0b", color: "#78350f" },
      danger:  { background: "#fef2f2", borderLeft: "4px solid #ef4444", color: "#7f1d1d" },
      info:    { background: "#eff6ff", borderLeft: "4px solid #3b82f6", color: "#1e3a5f" },
    };
    return styles[type] || styles.info;
  };

  const farmingAdvisories = weather ? getFarmingAdvisory(weather) : [];
  const stateList = Object.keys(INDIA_DISTRICTS).sort();
  const districtList = INDIA_DISTRICTS[selectedState] || [];

  return (
    <div className="weather-page">
      <div className="weather-container">

        {/* Header */}
        <div className="weather-header">
          <h1 className="weather-title">🌾 Agricultural Weather Dashboard</h1>
          <p className="weather-subtitle">Smart farming with real-time weather insights</p>
          <p className="weather-date">{currentDate}</p>

          {/* Two-step State → District Selector */}
          <div className="weather-search" style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <select value={selectedState} onChange={handleStateChange} className="weather-select">
              {stateList.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <select value={city} onChange={handleCityChange} className="weather-select">
              {districtList.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <SkeletonLoader type="weather" />
            <SkeletonLoader type="hourly" />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "#dc2626", fontSize: "16px", margin: "0 0 8px" }}>⚠️ {error}</p>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 20px" }}>
              Try a different district or check the backend is running.
            </p>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              style={{
                padding: "10px 24px", background: "#16a34a", color: "white",
                border: "none", borderRadius: "10px", cursor: "pointer",
                fontSize: "14px", fontWeight: "600", fontFamily: "inherit",
              }}
            >
              🔄 Retry
            </button>
          </div>
        ) : (
          <div>
            {/* Current Weather Cards */}
            <div className="weather-current-grid">
              <div className="weather-card current-temp">
                <div className="weather-card-label">Current Temp</div>
                <div className="weather-card-content">
                  <div className="weather-main-info">
                    <div className="weather-temp">{weather?.temperature ?? "--"}°C</div>
                    <div className="weather-feels">Feels {weather?.feels_like ?? ((weather?.temperature ?? 24) + 2)}°C</div>
                  </div>
                  <div className="weather-icon-large">{getWeatherIcon(weather?.condition)}</div>
                </div>
                <div className="weather-condition">{weather?.condition ?? "—"}</div>
              </div>

              <div className="weather-card humidity">
                <div className="weather-card-label">Humidity</div>
                <div className="weather-card-content">
                  <div className="weather-main-info">
                    <div className="weather-temp">{weather?.humidity ?? "--"}%</div>
                    <div className="weather-feels">
                      {(weather?.humidity ?? 0) > 80 ? "Very High" : (weather?.humidity ?? 0) > 60 ? "High" : "Normal"}
                    </div>
                  </div>
                  <div className="weather-icon-large">💧</div>
                </div>
              </div>

              <div className="weather-card wind">
                <div className="weather-card-label">Wind Speed</div>
                <div className="weather-card-content">
                  <div className="weather-main-info">
                    <div className="weather-temp">{weather?.windSpeed ?? "--"} km/h</div>
                    <div className="weather-feels">
                      {(weather?.windSpeed ?? 0) > 20 ? "Strong" : "Moderate"}
                    </div>
                  </div>
                  <div className="weather-icon-large">🌪️</div>
                </div>
              </div>

              <div className="weather-card uv">
                <div className="weather-card-label">UV Index</div>
                <div className="weather-card-content">
                  <div className="weather-main-info">
                    <div className="weather-temp">6</div>
                    <div className="weather-uv-badge">High</div>
                  </div>
                  <div className="weather-icon-large">☀️</div>
                </div>
              </div>
            </div>

            {/* Farming Advisory Section */}
            {farmingAdvisories.length > 0 && (
              <div className="weather-section farming-advisory-section">
                <h3 className="weather-section-title">🌾 Today's Farming Advisory</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {farmingAdvisories.map((adv, i) => (
                    <div
                      key={i}
                      style={{
                        ...getAdvisoryStyle(adv.type),
                        display: "flex",
                        gap: "14px",
                        alignItems: "flex-start",
                        borderRadius: "0 12px 12px 0",
                        padding: "1rem 1.25rem",
                      }}
                    >
                      <span style={{ fontSize: "22px", flexShrink: 0, marginTop: "2px" }}>{adv.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "3px" }}>{adv.title}</div>
                        <div style={{ fontSize: "13px", lineHeight: 1.5 }}>{adv.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hourly Forecast */}
            <div className="weather-section">
              <h3 className="weather-section-title">🕐 Hourly Forecast</h3>
              <div className="weather-hourly-grid">
                {(weather?.hourlyForecast ?? []).map((hour, index) => (
                  <div key={index} className="weather-forecast-box">
                    <div className="forecast-time">{hour.time}</div>
                    <div className="forecast-icon">
                      {hour.icon ? (
                        <img
                          src={`https://openweathermap.org/img/w/${hour.icon}.png`}
                          alt={hour.condition}
                          className="forecast-weather-icon"
                        />
                      ) : (
                        getWeatherIcon(hour.condition)
                      )}
                    </div>
                    <div className="forecast-temp">{hour.temp}°C</div>
                    <div className="forecast-rain">Rain: {hour.rain}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5-Day Forecast */}
            <div className="weather-section weather-weekly">
              <div className="weather-weekly-header">
                <h3 className="weather-section-title">📅 5-Day Forecast</h3>
              </div>
              <div className="weather-weekly-grid">
                {(weather?.weeklyForecast ?? []).map((day, index) => (
                  <div key={index} className="weather-forecast-box">
                    <div className="forecast-day">{day.day}</div>
                    <div className="forecast-icon-large">
                      {day.icon ? (
                        <img
                          src={`https://openweathermap.org/img/w/${day.icon}.png`}
                          alt={day.condition}
                          className="forecast-weather-icon-large"
                        />
                      ) : (
                        getWeatherIcon(day.condition)
                      )}
                    </div>
                    <div className="forecast-condition">{day.condition}</div>
                    <div className="forecast-temps">
                      <span className="forecast-high">H: {day.high}°</span>
                      <span className="forecast-low">L: {day.low}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="weather-footer">
          🌱 Empowering farmers with accurate weather data for better crop decisions
          {weather?.lastUpdated && (
            <span style={{ marginLeft: "12px", opacity: 0.65, fontSize: "12px" }}>
              · Updated {new Date(weather.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherPage;
