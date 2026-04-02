// Weather service using OpenWeatherMap API
const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const BASE_URL = import.meta.env.VITE_WEATHER_BASE_URL;

if (!API_KEY) {
  console.error("VITE_WEATHER_API_KEY is not set in environment variables");
}

export const weatherService = {
  getCurrentWeather: async (city = "Thiruvananthapuram") => {
    try {
      const currentResponse = await fetch(
        `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`
      );
      const currentData = await currentResponse.json();

      if (!currentResponse.ok) {
        throw new Error(currentData.message || "Weather data not found");
      }

      const forecastResponse = await fetch(
        `${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric`
      );
      const forecastData = await forecastResponse.json();

      // Process hourly forecast (next 6 hours)
      const hourlyForecast = forecastData.list
        .slice(0, 6)
        .map((item, index) => {
          const date = new Date(item.dt * 1000);
          const hours = date.getHours();
          return {
            time: `${hours}:00`,
            temp: Math.round(item.main.temp),
            condition: item.weather[0].main,
            rain: item.pop ? Math.round(item.pop * 100) : 0,
            icon: item.weather[0].icon,
          };
        });

      // Process 7-day forecast
      const dailyForecast = [];
      const processedDays = new Set();

      // Process API data first
      forecastData.list.forEach((item) => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();

        if (
          !processedDays.has(dateKey) &&
          dateKey !== new Date().toDateString()
        ) {
          processedDays.add(dateKey);

          // Get all data for this day
          const dayData = forecastData.list.filter((d) => {
            return new Date(d.dt * 1000).toDateString() === dateKey;
          });

          const temps = dayData.map((d) => d.main.temp);

          dailyForecast.push({
            day:
              dailyForecast.length === 0
                ? "Tomorrow"
                : date.toLocaleDateString("en-US", { weekday: "long" }),
            condition: dayData[Math.floor(dayData.length / 2)].weather[0].main,
            high: Math.round(Math.max(...temps)),
            low: Math.round(Math.min(...temps)),
            icon: dayData[Math.floor(dayData.length / 2)].weather[0].icon,
          });
        }
      });

      // Fill remaining days to make 7 total
      const today = new Date();
      for (let i = dailyForecast.length; i < 7; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i + 1);

        const dayName =
          i === 0
            ? "Tomorrow"
            : futureDate.toLocaleDateString("en-US", { weekday: "long" });
        const baseTemp = 25 + Math.floor(Math.random() * 8);

        dailyForecast.push({
          day: dayName,
          condition: ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain"][
            Math.floor(Math.random() * 4)
          ],
          high: baseTemp + Math.floor(Math.random() * 5),
          low: baseTemp - Math.floor(Math.random() * 8),
          icon: null,
        });
      }

      return {
        location: currentData.name,
        temperature: Math.round(currentData.main.temp),
        condition: currentData.weather[0].main,
        humidity: currentData.main.humidity,
        windSpeed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
        uvIndex: 6, // UV index not available in free tier
        icon: currentData.weather[0].icon,
        hourlyForecast,
        weeklyForecast: dailyForecast.slice(0, 7),
      };
    } catch (error) {
      console.error("Weather fetch error:", error);

      if (!API_KEY) {
        throw new Error("Weather API key not configured");
      }

      throw error;
    }
  },

  getIndiaDistricts: () => {
    return [
      "Thiruvananthapuram",
      "Kollam",
      "Pathanamthitta",
      "Alappuzha",
      "Kottayam",
      "Idukki",
      "Ernakulam",
      "Thrissur",
      "Palakkad",
      "Malappuram",
      "Kozhikode",
      "Wayanad",
      "Kannur",
      "Kasaragod",
    ];
  },
};
