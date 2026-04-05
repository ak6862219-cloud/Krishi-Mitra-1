import { useState, useEffect } from "react";
import { useWeather } from "../hooks/useWeather";
import { weatherService } from "../services/weatherService";
import SkeletonLoader from "../components/SkeletonLoader";

const WeatherPage = () => {
  const [city, setCity] = useState("Thiruvananthapuram");
  const [currentDate, setCurrentDate] = useState("");
  const { weather, loading, error } = useWeather(city);
  const districts = weatherService.getIndiaDistricts();

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

  const handleCityChange = (e) => {
    setCity(e.target.value);
  };

  const getWeatherIcon = (condition) => {
    const icons = {
      sunny: "☀️",
      clear: "☀️",
      "partly cloudy": "⛅",
      cloudy: "☁️",
      rainy: "🌦️",
      thunderstorm: "⛈️",
      night: "🌙",
    };
    return icons[condition?.toLowerCase()] || "⛅";
  };

  // Removed early return for loading state

  return (
    <div className="weather-page">
      <div className="weather-container">
        {/* Header */}
        <div className="weather-header">
          <h1 className="weather-title">🌾 Agricultural Weather Dashboard</h1>
          <p className="weather-subtitle">
            Smart farming with real-time weather insights
          </p>
          <p className="weather-date">{currentDate}</p>

          {/* District Selector */}
          <div className="weather-search">
            <select
              value={city}
              onChange={handleCityChange}
              className="weather-select"
            >
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <SkeletonLoader type="weather" />
            <SkeletonLoader type="hourly" />
          </div>
        ) : (
          <>
            {/* Current Weather Cards */}
            <div className="weather-current-grid">
          <div className="weather-card current-temp">
            <div className="weather-card-label">Current Temp</div>
            <div className="weather-card-content">
              <div className="weather-main-info">
                <div className="weather-temp">
                  {weather?.temperature || 24}°C
                </div>
                <div className="weather-feels">
                  Feels {(weather?.temperature || 24) + 2}°C
                </div>
              </div>
              <div className="weather-icon-large">
                {getWeatherIcon(weather?.condition)}
              </div>
            </div>
            <div className="weather-condition">
              {weather?.condition || "Partly Cloudy"}
            </div>
          </div>

          <div className="weather-card humidity">
            <div className="weather-card-label">Humidity</div>
            <div className="weather-card-content">
              <div className="weather-main-info">
                <div className="weather-temp">{weather?.humidity || 68}%</div>
                <div className="weather-feels">Good</div>
              </div>
              <div className="weather-icon-large">💧</div>
            </div>
          </div>

          <div className="weather-card wind">
            <div className="weather-card-label">Wind Speed</div>
            <div className="weather-card-content">
              <div className="weather-main-info">
                <div className="weather-temp">
                  {weather?.windSpeed || 12} km/h
                </div>
                <div className="weather-feels">SW</div>
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

        {/* Hourly Forecast */}
        <div className="weather-section">
          <h3 className="weather-section-title">🕐 Hourly Forecast</h3>
          <div className="weather-hourly-grid">
            {weather?.hourlyForecast?.map((hour, index) => (
              <div key={index} className="weather-forecast-box">
                <div className="forecast-time">{hour.time}</div>
                <div className="forecast-icon">
                  <img
                    src={`https://openweathermap.org/img/w/${hour.icon}.png`}
                    alt={hour.condition}
                    className="forecast-weather-icon"
                  />
                </div>
                <div className="forecast-temp">{hour.temp}°C</div>
                <div className="forecast-rain">Rain: {hour.rain}%</div>
              </div>
            )) ||
              [
                { time: "9:00", icon: "🌤️", temp: 22, rain: 10 },
                { time: "12:00", icon: "☀️", temp: 26, rain: 0 },
                { time: "15:00", icon: "☀️", temp: 28, rain: 5 },
                { time: "18:00", icon: "⛅", temp: 25, rain: 15 },
                { time: "21:00", icon: "🌙", temp: 23, rain: 20 },
                { time: "00:00", icon: "🌙", temp: 20, rain: 25 },
              ].map((hour, index) => (
                <div key={index} className="weather-forecast-box">
                  <div className="forecast-time">{hour.time}</div>
                  <div className="forecast-icon">{hour.icon}</div>
                  <div className="forecast-temp">{hour.temp}°C</div>
                  <div className="forecast-rain">Rain: {hour.rain}%</div>
                </div>
              ))}
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="weather-section weather-weekly">
          <div className="weather-weekly-header">
            <h3 className="weather-section-title">📅 7-Day Weather Forecast</h3>
          </div>
          <div className="weather-weekly-grid">
            {weather?.weeklyForecast?.map((day, index) => (
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
            )) ||
              [
                {
                  day: "Tomorrow",
                  icon: "☀️",
                  condition: "Sunny",
                  high: 26,
                  low: 18,
                },
                {
                  day: "Friday",
                  icon: "⛅",
                  condition: "Partly Cloudy",
                  high: 28,
                  low: 20,
                },
                {
                  day: "Saturday",
                  icon: "🌦️",
                  condition: "Light Rain",
                  high: 22,
                  low: 16,
                },
                {
                  day: "Sunday",
                  icon: "☁️",
                  condition: "Cloudy",
                  high: 25,
                  low: 17,
                },
                {
                  day: "Monday",
                  icon: "☀️",
                  condition: "Sunny",
                  high: 27,
                  low: 19,
                },
                {
                  day: "Tuesday",
                  icon: "⛅",
                  condition: "Partly Cloudy",
                  high: 29,
                  low: 21,
                },
                {
                  day: "Wednesday",
                  icon: "⛈️",
                  condition: "Thunderstorms",
                  high: 24,
                  low: 18,
                },
              ].map((day, index) => (
                <div key={index} className="weather-forecast-box">
                  <div className="forecast-day">{day.day}</div>
                  <div className="forecast-icon-large">{day.icon}</div>
                  <div className="forecast-condition">{day.condition}</div>
                  <div className="forecast-temps">
                    <span className="forecast-high">H: {day.high}°</span>
                    <span className="forecast-low">L: {day.low}°</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
        </>
        )}

        {/* Footer */}
        <div className="weather-footer">
          🌱 Empowering farmers with accurate weather data for better crop
          decisions
        </div>
      </div>
    </div>
  );
};

export default WeatherPage;
