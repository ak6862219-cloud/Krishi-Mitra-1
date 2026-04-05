import { useState } from "react";
import { useMarketPrices } from "../hooks/useMarketPrices";
import SkeletonLoader from "../components/SkeletonLoader";

const MarketPricePage = () => {
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedCrop, setSelectedCrop] = useState("all");
  const { prices, loading, error, lastUpdated } =
    useMarketPrices(selectedRegion);

  const regions = [
    { id: "all", name: "All Regions" },
    { id: "thiruvananthapuram", name: "Thiruvananthapuram" },
    { id: "ernakulam", name: "Ernakulam" },
    { id: "thrissur", name: "Thrissur" },
    { id: "kannur", name: "Kannur" },
  ];

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up":
        return "📈";
      case "down":
        return "📉";
      default:
        return "➡️";
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case "up":
        return "var(--primary-600)";
      case "down":
        return "var(--red-500)";
      default:
        return "var(--orange-500)";
    }
  };

  const filteredPrices =
    selectedCrop === "all"
      ? prices
      : prices.filter((item) =>
          item.crop.toLowerCase().includes(selectedCrop.toLowerCase())
        );

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
              <label htmlFor="region-select">
                <span className="label-icon">📍</span>
                Region
              </label>
              <select
                id="region-select"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="filter-select"
              >
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="crop-select">
                <span className="label-icon">🌱</span>
                Crop
              </label>
              <select
                id="crop-select"
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Crops</option>
                <option value="rice">Rice</option>
                <option value="coconut">Coconut</option>
                <option value="banana">Banana</option>
                <option value="pepper">Black Pepper</option>
                <option value="rubber">Rubber</option>
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
            Showing <strong>{filteredPrices.length}</strong>{" "}
            {filteredPrices.length === 1 ? "item" : "items"}
            {selectedCrop !== "all" && ` for ${selectedCrop}`}
            {selectedRegion !== "all" &&
              ` in ${regions.find((r) => r.id === selectedRegion)?.name}`}
          </p>
        </div>

        {/* Price Cards Grid */}
        <div className="price-cards">
          {filteredPrices.length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">📊</div>
              <h3>No prices found</h3>
              <p>
                Try adjusting your filters or check back later for updated
                prices.
              </p>
            </div>
          ) : (
            filteredPrices.map((item, index) => (
              <div key={index} className="price-card">
                <div className="price-card-header">
                  <div className="crop-info">
                    <h3 className="crop-name">{item.crop}</h3>
                    <p className="variety">Variety: {item.variety}</p>
                  </div>
                  <div
                    className="trend-indicator"
                    style={{ color: getTrendColor(item.trend) }}
                  >
                    <span className="trend-icon">
                      {getTrendIcon(item.trend)}
                    </span>
                    <span className="trend-text">{item.trend || "stable"}</span>
                  </div>
                </div>

                <div className="price-list">
                  <div className="price-row">
                    <span className="location">Thiruvananthapuram</span>
                    <span className="price">₹{item.thiruvananthapuram}/kg</span>
                  </div>
                  <div className="price-row">
                    <span className="location">Ernakulam</span>
                    <span className="price">₹{item.ernakulam}/kg</span>
                  </div>
                  <div className="price-row">
                    <span className="location">Thrissur</span>
                    <span className="price">₹{item.thrissur}/kg</span>
                  </div>
                  <div className="price-row">
                    <span className="location">Kannur</span>
                    <span className="price">₹{item.kannur}/kg</span>
                  </div>
                </div>

                <div className="card-footer">
                  <span className="update-time">
                    Updated: {item.lastUpdated || "Recently"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Market Insights */}
        {filteredPrices.length > 0 && (
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
