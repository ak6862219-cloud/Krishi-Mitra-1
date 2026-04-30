import { useState, useEffect } from "react";

// ─── Base shimmer block ────────────────────────────────────────────────────────
const Shimmer = ({ className = "", style = {} }) => (
  <div className={`skeleton-shimmer ${className}`} style={style} aria-hidden="true" />
);

// ─── Weather Card Skeleton ─────────────────────────────────────────────────────
const WeatherCardSkeleton = () => (
  <div className="skeleton-card weather-skeleton">
    <div className="skeleton-row" style={{ marginBottom: "20px", alignItems: "center", gap: "10px" }}>
      <Shimmer style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0 }} />
      <Shimmer style={{ width: 140, height: 16, borderRadius: 6 }} />
    </div>
    <Shimmer style={{ width: 100, height: 64, borderRadius: 10, marginBottom: 8 }} />
    <Shimmer style={{ width: 120, height: 14, borderRadius: 6, marginBottom: 24 }} />
    <div className="skeleton-row" style={{ gap: 12, marginBottom: 20 }}>
      {[72, 64, 80].map((w, i) => (
        <div key={i} className="skeleton-stat-pill">
          <Shimmer style={{ width: 18, height: 18, borderRadius: 4, marginBottom: 6 }} />
          <Shimmer style={{ width: w, height: 12, borderRadius: 4, marginBottom: 4 }} />
          <Shimmer style={{ width: w - 20, height: 11, borderRadius: 4 }} />
        </div>
      ))}
    </div>
    <div className="skeleton-divider" />
    <div className="skeleton-row" style={{ gap: 8, marginTop: 16 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton-forecast-day">
          <Shimmer style={{ width: 32, height: 11, borderRadius: 4, marginBottom: 8 }} />
          <Shimmer style={{ width: 28, height: 28, borderRadius: "50%", marginBottom: 8 }} />
          <Shimmer style={{ width: 36, height: 13, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  </div>
);

// ─── Market Price Row Skeleton ─────────────────────────────────────────────────
const MarketPriceRowSkeleton = () => (
  <div className="skeleton-market-row">
    <Shimmer style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
      <Shimmer style={{ width: 110, height: 15, borderRadius: 5 }} />
      <Shimmer style={{ width: 80, height: 11, borderRadius: 4 }} />
    </div>
    <Shimmer style={{ width: 64, height: 28, borderRadius: 6 }} />
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
      <Shimmer style={{ width: 72, height: 18, borderRadius: 5 }} />
      <Shimmer style={{ width: 48, height: 12, borderRadius: 4 }} />
    </div>
  </div>
);

// ─── Market Card Skeleton ──────────────────────────────────────────────────────
const MarketCardSkeleton = ({ rows = 5 }) => (
  <div className="skeleton-card market-skeleton">
    <div className="skeleton-row" style={{ marginBottom: 20, alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Shimmer style={{ width: 22, height: 22, borderRadius: 6 }} />
        <Shimmer style={{ width: 130, height: 18, borderRadius: 6 }} />
      </div>
      <Shimmer style={{ width: 80, height: 32, borderRadius: 20 }} />
    </div>
    <div className="skeleton-row" style={{ gap: 8, marginBottom: 20 }}>
      {[60, 80, 70, 90].map((w, i) => (
        <Shimmer key={i} style={{ width: w, height: 30, borderRadius: 20 }} />
      ))}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          <MarketPriceRowSkeleton />
          {i < rows - 1 && <div className="skeleton-divider" />}
        </div>
      ))}
    </div>
  </div>
);

// ─── Hourly Forecast Skeleton ──────────────────────────────────────────────────
const HourlyForecastSkeleton = ({ slots = 6 }) => (
  <div className="skeleton-card" style={{ padding: "16px 20px" }}>
    <Shimmer style={{ width: 110, height: 14, borderRadius: 5, marginBottom: 16 }} />
    <div className="skeleton-hourly-strip">
      {Array.from({ length: slots }).map((_, i) => (
        <div key={i} className="skeleton-hourly-slot">
          <Shimmer style={{ width: 34, height: 11, borderRadius: 4, marginBottom: 8 }} />
          <Shimmer style={{ width: 28, height: 28, borderRadius: "50%", marginBottom: 8 }} />
          <Shimmer style={{ width: 38, height: 14, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  </div>
);

// ─── Main SkeletonLoader export ────────────────────────────────────────────────
const SkeletonLoader = ({ type = "weather", count = 1, rows = 5 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case "weather": return <WeatherCardSkeleton />;
      case "market": return <MarketCardSkeleton rows={rows} />;
      case "market-row": return Array.from({ length: count }).map((_, i) => <MarketPriceRowSkeleton key={i} />);
      case "hourly": return <HourlyForecastSkeleton />;
      default: return <WeatherCardSkeleton />;
    }
  };
  return (
    <div className="skeleton-root" role="status" aria-label="Loading content">
      {renderSkeleton()}
      <span style={{ position:"absolute", width:1, height:1, padding:0, margin:-1, overflow:"hidden", clip:"rect(0,0,0,0)", whiteSpace:"nowrap", border:0 }}>Loading...</span>
    </div>
  );
};

export { SkeletonLoader };
export default SkeletonLoader;

// ─── PREVIEW APP (for development only — not imported anywhere in production) ──
export function SkeletonPreviewApp() {
  const [activeTab, setActiveTab] = useState("weather");
  const [loaded, setLoaded] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const t = setTimeout(() => setLoaded(true), 2200);
    return () => clearTimeout(t);
  }, [activeTab]);

  const tabs = [
    { id: "weather", label: "Weather card" },
    { id: "hourly", label: "Hourly forecast" },
    { id: "market", label: "Market card" },
    { id: "market-row", label: "Market rows" },
  ];

  const fakeWeather = (
    <div style={{ background: dark ? "#111c14" : "#fff", border: `1px solid ${dark?"#1e3020":"#e8f5e9"}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <span style={{ fontSize:18 }}>📍</span>
        <span style={{ fontSize:15, fontWeight:500, color: dark?"#9FE1CB":"#166534" }}>Thrissur, Kerala</span>
      </div>
      <div style={{ fontSize:56, fontWeight:700, color: dark?"#C0DD97":"#15803d", lineHeight:1, marginBottom:6 }}>28°</div>
      <div style={{ fontSize:14, color: dark?"#6ca87a":"#4b7a59", marginBottom:24 }}>Partly Cloudy</div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        {[["💧","Humidity","72%"],["💨","Wind","14 km/h"],["🌡️","Feels like","30°"]].map(([ico,lbl,val],i)=>(
          <div key={i} style={{ flex:1, background: dark?"#162018":"#f0faf0", borderRadius:12, padding:"10px 12px" }}>
            <div style={{ fontSize:16, marginBottom:4 }}>{ico}</div>
            <div style={{ fontSize:11, color: dark?"#6ca87a":"#4b7a59", marginBottom:2 }}>{lbl}</div>
            <div style={{ fontSize:13, fontWeight:600, color: dark?"#9FE1CB":"#166534" }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ height:1, background: dark?"#1e3020":"#e8f5e9", margin:"0 0 14px" }} />
      <div style={{ display:"flex", gap:8 }}>
        {[["Mon","☀️","30°"],["Tue","🌧️","26°"],["Wed","⛅","28°"],["Thu","☀️","31°"],["Fri","🌤️","29°"]].map(([d,i,t],idx)=>(
          <div key={idx} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:11, color: dark?"#6ca87a":"#4b7a59" }}>{d}</span>
            <span style={{ fontSize:18 }}>{i}</span>
            <span style={{ fontSize:12, fontWeight:600, color: dark?"#9FE1CB":"#166534" }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const fakeMarket = (
    <div style={{ background: dark?"#111c14":"#fff", border:`1px solid ${dark?"#1e3020":"#e8f5e9"}`, borderRadius:16, padding:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>📈</span>
          <span style={{ fontSize:16, fontWeight:600, color: dark?"#C0DD97":"#166534" }}>Mandi Prices</span>
        </div>
        <span style={{ background:"#16a34a", color:"#fff", fontSize:11, padding:"5px 12px", borderRadius:20, fontWeight:500 }}>Live</span>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["All","Grains","Vegetables","Fruits"].map((f,i)=>(
          <span key={i} style={{ fontSize:11, padding:"6px 14px", borderRadius:20, background:i===0?(dark?"#1D9E75":"#16a34a"):(dark?"#162018":"#f0faf0"), color:i===0?"#fff":(dark?"#6ca87a":"#4b7a59"), fontWeight:i===0?600:400, cursor:"pointer" }}>{f}</span>
        ))}
      </div>
      {[["🌾","Rice","Thrissur","₹2,450","▲ 2.3%","up"],["🥥","Coconut","Palakkad","₹18","▼ 1.1%","down"],["🍌","Banana","Kozhikode","₹32","— 0.0%","stable"],["🌶️","Pepper","Idukki","₹680","▲ 4.7%","up"],["🍅","Tomato","Ernakulam","₹28","▼ 3.2%","down"]].map(([ico,crop,mkt,price,chg,dir],i,arr)=>(
        <div key={i}>
          <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0" }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background: dark?"#162018":"#f0faf0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{ico}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500, color: dark?"#C0DD97":"#166534" }}>{crop}</div>
              <div style={{ fontSize:11, color: dark?"#6ca87a":"#4b7a59" }}>{mkt}</div>
            </div>
            <div style={{ width:64, height:28, borderRadius:6, background: dark?"#162018":"#f0faf0", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="60" height="24" viewBox="0 0 60 24">
                <polyline points={dir==="up"?"2,20 15,16 28,18 40,10 55,6":"2,6 15,10 28,8 40,16 55,20"} fill="none" stroke={dir==="up"?"#16a34a":dir==="down"?"#dc2626":"#ca8a04"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:15, fontWeight:600, color: dark?"#C0DD97":"#166534" }}>{price}</div>
              <div style={{ fontSize:11, color: dir==="up"?"#16a34a":dir==="down"?"#dc2626":"#ca8a04", fontWeight:500 }}>{chg}</div>
            </div>
          </div>
          {i < arr.length-1 && <div style={{ height:1, background: dark?"#1e3020":"#e8f5e9" }} />}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans', system-ui, sans-serif", background: dark?"#0a1409":"#f7fdf7", minHeight:"100vh", padding:"24px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .skeleton-shimmer {
          background: ${dark
            ? "linear-gradient(90deg,#1a2e1a 0%,#22382a 40%,#1e3422 60%,#1a2e1a 100%)"
            : "linear-gradient(90deg,#e8f5e9 0%,#f1f8f1 40%,#e0f0e0 60%,#e8f5e9 100%)"
          };
          background-size: 600px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          display: block;
          flex-shrink: 0;
        }
        .skeleton-root { width: 100%; }
        .skeleton-card {
          background: ${dark?"#111c14":"#ffffff"};
          border: 1px solid ${dark?"#1e3020":"#e8f5e9"};
          border-radius: 16px;
          padding: 24px;
          width: 100%;
        }
        .skeleton-row { display:flex; align-items:flex-start; flex-wrap:wrap; }
        .skeleton-divider { height:1px; background:${dark?"#1e3020":"#e8f5e9"}; margin:12px 0; }
        .skeleton-stat-pill {
          flex:1; min-width:80px;
          background:${dark?"#162018":"#f0faf0"};
          border-radius:12px; padding:12px;
          display:flex; flex-direction:column; align-items:flex-start;
        }
        .skeleton-forecast-day { flex:1; display:flex; flex-direction:column; align-items:center; padding:8px 4px; }
        .skeleton-market-row { display:flex; align-items:center; gap:14px; padding:14px 0; }
        .skeleton-hourly-strip { display:flex; gap:8px; overflow:hidden; }
        .skeleton-hourly-slot {
          flex-shrink:0; width:58px;
          display:flex; flex-direction:column; align-items:center;
          background:${dark?"#162018":"#f0faf0"};
          border-radius:12px; padding:10px 4px;
        }
        .tab-pill {
          font-size:12px; font-weight:500; padding:7px 16px;
          border-radius:20px; cursor:pointer; border:none;
          transition:all 0.15s; white-space:nowrap;
        }
        .fade-in { animation: fadeIn 0.35s ease forwards; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, maxWidth:540, margin:"0 auto 24px" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color: dark?"#9FE1CB":"#166534" }}>Krishi Mitra</div>
          <div style={{ fontSize:12, color: dark?"#4a7a58":"#86a08a" }}>SkeletonLoader preview</div>
        </div>
        <button
          onClick={() => setDark(d => !d)}
          style={{ fontSize:11, padding:"6px 14px", borderRadius:20, border:`1px solid ${dark?"#1e3020":"#d1fae5"}`, background: dark?"#162018":"#f0faf0", color: dark?"#9FE1CB":"#166534", cursor:"pointer", fontWeight:500 }}
        >
          {dark ? "Light mode" : "Dark mode"}
        </button>
      </div>

      <div style={{ maxWidth:540, margin:"0 auto" }}>
        {/* Tab row */}
        <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className="tab-pill"
              style={{
                background: activeTab===t.id ? "#16a34a" : (dark?"#162018":"#f0faf0"),
                color: activeTab===t.id ? "#fff" : (dark?"#6ca87a":"#4b7a59"),
              }}
              onClick={() => setActiveTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {/* State toggle */}
        <div style={{ display:"flex", gap:8, marginBottom:20, alignItems:"center" }}>
          <span style={{ fontSize:12, color: dark?"#4a7a58":"#86a08a" }}>State:</span>
          <button
            className="tab-pill"
            style={{ background: !loaded?"#16a34a":(dark?"#162018":"#f0faf0"), color: !loaded?"#fff":(dark?"#6ca87a":"#4b7a59") }}
            onClick={() => setLoaded(false)}
          >Skeleton</button>
          <button
            className="tab-pill"
            style={{ background: loaded?"#16a34a":(dark?"#162018":"#f0faf0"), color: loaded?"#fff":(dark?"#6ca87a":"#4b7a59") }}
            onClick={() => setLoaded(true)}
          >Loaded</button>
          <button
            className="tab-pill"
            style={{ background: dark?"#162018":"#f0faf0", color: dark?"#6ca87a":"#4b7a59" }}
            onClick={() => { setLoaded(false); setTimeout(()=>setLoaded(true), 2200); }}
          >Replay ↺</button>
        </div>

        {/* Content */}
        <div className="fade-in" key={activeTab + loaded}>
          {!loaded ? (
            <div className="skeleton-root" role="status" aria-label="Loading">
              {activeTab==="weather" && <WeatherCardSkeleton />}
              {activeTab==="hourly" && <HourlyForecastSkeleton slots={6} />}
              {activeTab==="market" && <MarketCardSkeleton rows={5} />}
              {activeTab==="market-row" && (
                <div style={{ display:"flex", flexDirection:"column" }}>
                  {[0,1,2].map(i=>(
                    <div key={i}>
                      <MarketPriceRowSkeleton />
                      {i<2 && <div className="skeleton-divider" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="fade-in">
              {(activeTab==="weather" || activeTab==="hourly") && fakeWeather}
              {(activeTab==="market" || activeTab==="market-row") && fakeMarket}
            </div>
          )}
        </div>

        {/* Usage snippet */}
        <div style={{ marginTop:24, background: dark?"#111c14":"#f0fdf4", border:`1px solid ${dark?"#1e3020":"#bbf7d0"}`, borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:11, fontWeight:600, color: dark?"#6ca87a":"#166534", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>Usage in your pages</div>
          <pre style={{ fontSize:11, color: dark?"#9FE1CB":"#166534", margin:0, lineHeight:1.7, overflowX:"auto", fontFamily:"'Courier New', monospace" }}>{
activeTab==="weather"
? `// WeatherPage.jsx
import SkeletonLoader from "@/components/SkeletonLoader";

{isLoading
  ? <SkeletonLoader type="weather" />
  : <WeatherCard data={weather} />
}`
: activeTab==="hourly"
? `// WeatherPage.jsx — hourly section
import SkeletonLoader from "@/components/SkeletonLoader";

{isLoading
  ? <SkeletonLoader type="hourly" />
  : <HourlyForecast data={forecast} />
}`
: activeTab==="market"
? `// MarketPricePage.jsx
import SkeletonLoader from "@/components/SkeletonLoader";

{isLoading
  ? <SkeletonLoader type="market" rows={5} />
  : <MarketPriceList data={prices} />
}`
: `// MarketPricePage.jsx — inline rows
import SkeletonLoader from "@/components/SkeletonLoader";

{isLoading
  ? <SkeletonLoader type="market-row" count={5} />
  : prices.map(p => <PriceRow key={p.id} {...p} />)
}`
          }</pre>
        </div>
      </div>
    </div>
  );
}
