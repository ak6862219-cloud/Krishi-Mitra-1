import { useState, useEffect } from 'react'
import { marketService } from '../services/marketService'

export const useMarketPrices = (state = 'Maharashtra', commodity = 'Tomato') => {
  const [prices, setPrices] = useState([])
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true)
        const data = await marketService.getMarketPrices(state, commodity)
        setPrices(data.data)
        setSource(data.source)
        setLastUpdated(data.lastUpdated)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
    
    // Refresh every 5 minutes for real-time updates
    const interval = setInterval(fetchPrices, 300000)
    return () => clearInterval(interval)
  }, [state, commodity])

  return { prices, loading, error, lastUpdated, source }
}