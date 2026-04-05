import { useState, useRef } from 'react'
import useDiseaseScan from '../hooks/useDiseaseScan'
import DiseaseResultCard from './DiseaseResultCard'
import { useLanguage } from '../context/LanguageContext'

const AdvancedFeatures = () => {
  const { currentLanguage } = useLanguage()
  const {
    scan,
    getFullAdvisory,
    reset: resetScan,
    result: scanResult,
    loading: scanLoading,
    error: scanError,
    stage: scanStage,
  } = useDiseaseScan();

  const fileInputRef = useRef(null)

  const extractBulletPoints = (text) => {
    if (!text) return [];
    const bullets = [];
    const regex = /[-•*]\s+([A-Z][^\n]{10,80})/g;
    let m;
    while ((m = regex.exec(text)) !== null && bullets.length < 3) {
      bullets.push(m[1].replace(/\*+/g, "").trim());
    }
    return bullets;
  };

  const extractImmediateAction = (text) => {
    if (!text) return null;
    const m = text.match(/(?:immediate(?:ly)?|action|treat|apply|spray)\s*[:\s]+([^\n.]{10,140}[.!]?)/i);
    return m ? m[1].replace(/\*+/g, "").trim() : null;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file");
      return;
    }
    await scan(file);
  }
  const [activeTab, setActiveTab] = useState('advisory')
  const [activeRegion, setActiveRegion] = useState('all')

  const tabs = [
    { id: 'advisory', name: 'Real-Time Advisory' },
    { id: 'recommendation', name: 'Smart Recommendations' },
    { id: 'disease', name: 'Disease Detection' }
  ]

  const regions = [
    { id: 'all', name: 'All Regions' },
    { id: 'thiruvananthapuram', name: 'Thiruvananthapuram' },
    { id: 'ernakulam', name: 'Ernakulam' },
    { id: 'thrissur', name: 'Thrissur' },
    { id: 'kannur', name: 'Kannur' }
  ]

  const marketData = [
    { crop: 'Rice', thiruvananthapuram: 32, ernakulam: 30, thrissur: 31, kannur: 33 },
    { crop: 'Coconut', thiruvananthapuram: 18, ernakulam: 17, thrissur: 16, kannur: 19 },
    { crop: 'Banana', thiruvananthapuram: 28, ernakulam: 26, thrissur: 25, kannur: 27 },
    { crop: 'Black Pepper', thiruvananthapuram: 420, ernakulam: 415, thrissur: 425, kannur: 418 },
    { crop: 'Rubber', thiruvananthapuram: 170, ernakulam: 168, thrissur: 172, kannur: 169 }
  ]

  const handleRegionChange = (regionId) => {
    setActiveRegion(regionId)
    const region = regions.find(r => r.id === regionId)
    alert("Showing market data for: " + region.name)
  }



  const renderAdvisoryContent = () => (
    <div className="feature-content active">
      <h3><i className="fas fa-cloud-sun"></i> Real-Time Crop, Soil & Weather Advisory</h3>
      <div className="content-grid">
        <div className="content-item">
          <h4><i className="fas fa-cloud-rain"></i> Weather Forecast</h4>
          <p>Get accurate 7-day weather forecasts tailored to your specific location for better farming decisions.</p>
          <p><strong>Today:</strong> Moderate rainfall expected in the afternoon</p>
        </div>
        <div className="content-item">
          <h4><i className="fas fa-seedling"></i> Crop Advisory</h4>
          <p>Personalized advice based on your crops, growth stage, and local conditions.</p>
          <p><strong>Current:</strong> Rice crops in flowering stage need careful water management</p>
        </div>
        <div className="content-item">
          <h4><i className="fas fa-cubes"></i> Soil Health</h4>
          <p>Monitor soil moisture, nutrient levels, and get recommendations for soil improvement.</p>
          <p><strong>Alert:</strong> Soil pH levels slightly acidic in your region - consider adding lime</p>
        </div>
      </div>
    </div>
  )

  const renderRecommendationContent = () => (
    <div className="feature-content active">
      <h3><i className="fas fa-robot"></i> Smart Recommendations</h3>
      <div className="content-grid">
        <div className="content-item">
          <h4><i className="fas fa-cube"></i> Fertilizer Recommendations</h4>
          <p>Get precise fertilizer suggestions based on your soil test results and crop requirements.</p>
          <p><strong>For your paddy field:</strong> 50kg N, 25kg P₂O₅, 25kg K₂O per acre</p>
        </div>
        <div className="content-item">
          <h4><i className="fas fa-vial"></i> Soil Health Advisory</h4>
          <p>Detailed analysis of your soil health with customized improvement plans.</p>
          <p><strong>Recommendation:</strong> Add organic compost to improve soil structure</p>
        </div>
        <div className="content-item">
          <h4><i className="fas fa-seedling"></i> Seed Selection</h4>
          <p>Choose the best seeds for your soil type, climate conditions, and market demand.</p>
          <p><strong>This season:</strong> Consider Jaya variety for rice cultivation</p>
        </div>
        <div className="content-item">
          <h4><i className="fas fa-tint"></i> Water Management</h4>
          <p>Optimize irrigation schedules and methods to conserve water and improve yield.</p>
          <p><strong>Advisory:</strong> Switch to drip irrigation for vegetable crops</p>
        </div>
      </div>
    </div>
  )

  const renderMarketContent = () => (
    <div className="feature-content active">
      <h3><i className="fas fa-chart-line"></i> Regional Market Values</h3>
      <div className="region-selector">
        {regions.map((region) => (
          <div 
            key={region.id}
            className={`region-btn ${activeRegion === region.id ? 'active' : ''}`}
            onClick={() => handleRegionChange(region.id)}
          >
            {region.name}
          </div>
        ))}
      </div>

      <div className="price-table-container">
        <table className="price-table">
          <thead>
            <tr>
              <th>Region</th>
              <th>Rice</th>
              <th>Coconut</th>
              <th>Banana</th>
              <th>Black Pepper</th>
              <th>Rubber</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Thiruvananthapuram</td>
              <td>32</td>
              <td>18</td>
              <td>28</td>
              <td>420</td>
              <td>170</td>
            </tr>
            <tr>
              <td>Ernakulam</td>
              <td>30</td>
              <td>17</td>
              <td>26</td>
              <td>415</td>
              <td>168</td>
            </tr>
            <tr>
              <td>Thrissur</td>
              <td>31</td>
              <td>16</td>
              <td>25</td>
              <td>425</td>
              <td>172</td>
            </tr>
            <tr>
              <td>Kannur</td>
              <td>33</td>
              <td>19</td>
              <td>27</td>
              <td>418</td>
              <td>169</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderDiseaseContent = () => (
    <div className="feature-content active">
      <h3><i className="fas fa-camera"></i> Image-Based Crop Disease Detection</h3>
      
      {!scanLoading && !scanResult && (
        <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
          <div className="upload-icon">
            <i className="fas fa-cloud-upload-alt"></i>
          </div>
          <p>Upload an image of your crop for instant disease detection</p>
          <p className="small">Supported formats: JPG, PNG | Max size: 5MB</p>
          <button className="btn btn-primary">Select Image</button>
        </div>
      )}

      {scanLoading && (
        <div className="upload-area" style={{ opacity: 0.7 }}>
          <div className="upload-icon">
            <i className="fas fa-spinner fa-spin" style={{fontSize: "40px", color: "#16a34a"}}></i>
          </div>
          <p style={{ marginTop: '15px', fontWeight: 'bold' }}>Processing Image...</p>
          <p className="small">{scanStage}</p>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: "none" }} 
        accept="image/*" 
        onChange={handleFileChange} 
      />

      <div className="result-area" style={{ marginTop: '20px' }}>
        {scanError && (
          <div style={{ color: '#dc2626', background: '#fef2f2', padding: '15px', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span>{scanError}</span>
             <button onClick={resetScan} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Try Again</button>
          </div>
        )}

        {scanResult && !scanLoading && (
          <DiseaseResultCard
            parsed={{
              diseaseName:     scanResult?.disease,
              confidence:      scanResult?.confidence,
              severity:        scanResult?.severity,
              isHealthy:       scanResult?.is_healthy,
              symptoms:        extractBulletPoints(scanResult?.advisory_detail),
              immediateAction: extractImmediateAction(scanResult?.advisory_detail),
              rawText:         scanResult?.advisory_detail,
            }}
            language={currentLanguage}
            onGetAdvisory={() => getFullAdvisory("detailed")}
            onScanAgain={resetScan}
          />
        )}
        
        {!scanResult && !scanLoading && !scanError && (
          <>
            <h4>Detection Results Will Appear Here</h4>
            <p>After uploading an image, our AI system will analyze it and provide:</p>
            <ul>
              <li>Disease identification</li>
              <li>Severity assessment</li>
              <li>Treatment recommendations</li>
              <li>Prevention strategies</li>
            </ul>
          </>
        )}
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'advisory':
        return renderAdvisoryContent()
      case 'recommendation':
        return renderRecommendationContent()
      case 'disease':
        return renderDiseaseContent()
      default:
        return renderAdvisoryContent()
    }
  }

  return (
    <section className="advanced-features">
      <div className="container">
        <h2 className="section-title">Advanced Features</h2>

        <div className="feature-tabs">
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              className={`feature-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </div>
          ))}
        </div>

        {renderContent()}
      </div>
    </section>
  )
}

export default AdvancedFeatures