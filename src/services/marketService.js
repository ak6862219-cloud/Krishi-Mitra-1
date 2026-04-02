// Market price service for real-time crop prices
export const marketService = {
  getMarketPrices: async (region = 'all') => {
    try {
      // Mock real-time market data - replace with actual API
      const baseData = [
        { 
          crop: 'Rice', 
          variety: 'Jaya',
          thiruvananthapuram: 32 + Math.floor(Math.random() * 5), 
          ernakulam: 30 + Math.floor(Math.random() * 5), 
          thrissur: 31 + Math.floor(Math.random() * 5), 
          kannur: 33 + Math.floor(Math.random() * 5),
          trend: 'up',
          lastUpdated: new Date().toLocaleTimeString()
        },
        { 
          crop: 'Coconut', 
          variety: 'Dwarf',
          thiruvananthapuram: 18 + Math.floor(Math.random() * 3), 
          ernakulam: 17 + Math.floor(Math.random() * 3), 
          thrissur: 16 + Math.floor(Math.random() * 3), 
          kannur: 19 + Math.floor(Math.random() * 3),
          trend: 'down',
          lastUpdated: new Date().toLocaleTimeString()
        },
        { 
          crop: 'Banana', 
          variety: 'Robusta',
          thiruvananthapuram: 28 + Math.floor(Math.random() * 4), 
          ernakulam: 26 + Math.floor(Math.random() * 4), 
          thrissur: 25 + Math.floor(Math.random() * 4), 
          kannur: 27 + Math.floor(Math.random() * 4),
          trend: 'stable',
          lastUpdated: new Date().toLocaleTimeString()
        },
        { 
          crop: 'Black Pepper', 
          variety: 'Panniyur',
          thiruvananthapuram: 420 + Math.floor(Math.random() * 20), 
          ernakulam: 415 + Math.floor(Math.random() * 20), 
          thrissur: 425 + Math.floor(Math.random() * 20), 
          kannur: 418 + Math.floor(Math.random() * 20),
          trend: 'up',
          lastUpdated: new Date().toLocaleTimeString()
        },
        { 
          crop: 'Rubber', 
          variety: 'RRII 105',
          thiruvananthapuram: 170 + Math.floor(Math.random() * 10), 
          ernakulam: 168 + Math.floor(Math.random() * 10), 
          thrissur: 172 + Math.floor(Math.random() * 10), 
          kannur: 169 + Math.floor(Math.random() * 10),
          trend: 'down',
          lastUpdated: new Date().toLocaleTimeString()
        }
      ]

      return {
        data: baseData,
        lastUpdated: new Date().toLocaleString(),
        region: region
      }
    } catch (error) {
      console.error('Market data fetch error:', error)
      throw error
    }
  },

  getPriceHistory: async (crop, days = 7) => {
    try {
      // Mock price history
      const history = []
      for (let i = days; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        history.push({
          date: date.toISOString().split('T')[0],
          price: 25 + Math.floor(Math.random() * 15),
          volume: 100 + Math.floor(Math.random() * 200)
        })
      }
      return history
    } catch (error) {
      console.error('Price history fetch error:', error)
      throw error
    }
  }
}