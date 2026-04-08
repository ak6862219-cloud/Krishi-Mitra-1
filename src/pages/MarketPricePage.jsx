import { useState } from "react";
import { useMarketPrices } from "../hooks/useMarketPrices";
import SkeletonLoader from "../components/SkeletonLoader";

const ALL_STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Gujarat","Haryana",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha",
  "Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh",
  "Uttarakhand","West Bengal"
]

const COMMODITIES = [
  "Tomato","Onion","Potato","Rice","Wheat","Maize","Banana",
  "Coconut","Cotton","Groundnut","Soyabean","Sugarcane","Paddy"
]

const MarketPricePage = () => {
  const [selectedState, setSelectedState] = useState("Maharashtra");
  const [commodity, setCommodity] = useState("Tomato");
  const { prices, loading, error, lastUpdated, source } =
    useMarketPrices(selectedState, commodity);

  const getInsight = (min, max, modal) => {
    if(!min || !max || !modal) return { text: 'Prices available', color: 'var(--blue-500)' };
    const spread = ((max - min) / modal * 100).toFixed(0);
    if (spread > 30) return { text: 'High price variation — compare mandis', color: 'var(--orange-500)' };
    if (modal > (min + max) / 2) return { text: 'Prices trending upward', color: 'var(--green-500)' };
    return { text: 'Stable market conditions', color: 'var(--blue-500)' };
  };

  if (loading) {
    return (
      <div className="market-page">
        <div className="container">
          <SkeletonLoader type="market" rows={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="market-page">
        <div className="container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Unable to load market prices</h3>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="market-page">
      <div className="container">
        {/* Header Section */}
        <div className="market-header">
          <div className="header-content">
            <div className="header-text">
              <h1>🌾 Market Prices</h1>
              <p className="subtitle">
                Real-time agricultural commodity prices across India
              </p>
            </div>
            <div className="last-updated">
              <span className="update-icon">🕒</span>
              <span>Last updated: {lastUpdated || "Just now"}</span>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="market-controls">
          <div className="controls-grid">
            <div className="filter-group">
              <label htmlFor="state-select">
                <span className="label-icon">📍</span>
                State
              </label>
              <select
                id="state-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="filter-select"
              >
                {ALL_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="commodity-select">
                <span className="label-icon">🌱</span>
                Commodity
              </label>
              <select
                id="commodity-select"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="filter-select"
              >
                {COMMODITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="refresh-btn"
              title="Refresh prices"
            >
              <span className="btn-icon">🔄</span>
              <span className="btn-text">Refresh</span>
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="results-summary">
          <p>
            Showing <strong>{prices.length}</strong>{" "}
            {prices.length === 1 ? "mandi" : "mandis"}
            {commodity && ` for ${commodity}`}
            {selectedState && ` in ${selectedState}`}
          </p>
          {source && (
            <p style={{marginTop: '4px', fontSize: '13px', color: 'var(--primary-600)'}}>
              Data source: <strong>{source}</strong>
            </p>
          )}
        </div>

        {/* Price Cards Grid */}
        <div className="price-cards">
          {prices.length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">📊</div>
              <h3>No prices found</h3>
              <p>
                Try adjusting your filters or check back later for updated
                prices.
              </p>
            </div>
          ) : (
            prices.map((item, index) => {
              const insight = getInsight(item.minPrice, item.maxPrice, item.modalPrice);
              return (
                <div key={index} className="price-card">
                  <div className="price-card-header">
                    <div className="crop-info">
                      <h3 className="crop-name">{item.mandi}</h3>
                      <p className="variety">{item.district} District | Variety: {item.variety}</p>
                    </div>
                    <div
                      className="trend-indicator"
                      style={{ color: insight.color, fontSize: '0.85em', textAlign: 'right', fontWeight: '500' }}
                    >
                      <span className="trend-text">{insight.text}</span>
                    </div>
                  </div>

                  <div className="price-list">
                    <div className="price-row">
                      <span className="location">Minimum</span>
                      <span className="price" style={{color: 'var(--text-secondary)'}}>₹{item.minPrice}/q</span>
                    </div>
                    <div className="price-row">
                      <span className="location">Maximum</span>
                      <span className="price" style={{color: 'var(--text-secondary)'}}>₹{item.maxPrice}/q</span>
                    </div>
                    <div className="price-row">
                      <span className="location" style={{fontWeight: 'bold'}}>Modal (Average)</span>
                      <span className="price" style={{fontWeight: 'bold'}}>₹{item.modalPrice}/q</span>
                    </div>
                  </div>

                  <div className="card-footer">
                    <span className="update-time">
                      Arrival Date: {item.date}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Market Insights */}
        {prices.length > 0 && (
          <div className="market-insights">
            <h2>📈 Market Insights</h2>
            <div className="insights-grid">
              <div className="insight-card">
                <h4>Average Price Range</h4>
                <p>Most crops are trading within expected seasonal ranges</p>
              </div>
              <div className="insight-card">
                <h4>Price Trends</h4>
                <p>Monitor daily changes to make informed selling decisions</p>
              </div>
              <div className="insight-card">
                <h4>Best Markets</h4>
                <p>
                  Compare prices across different regions for better profits
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketPricePage;
