import { useState, useEffect } from 'react'
import { weatherService } from '../services/weatherService'

export const useWeather = (city = 'Thiruvananthapuram') => {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true)
        const data = await weatherService.getCurrentWeather(city)
        setWeather(data)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 600000)
    return () => clearInterval(interval)
  }, [city])

  return { weather, loading, error }
}