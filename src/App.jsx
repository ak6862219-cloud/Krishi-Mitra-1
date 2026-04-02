import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import "./App.css";

// Components
import TopStrip from "./components/TopStrip";
import Header from "./components/Header";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MarketPricePage from "./pages/MarketPricePage";
import WeatherPage from "./pages/WeatherPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import SchemesPage from "./pages/SchemesPage";

function AppContent() {
  const location = useLocation();

  return (
    <div className="App">
      <TopStrip />
      <Header />

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/market-prices"
            element={
              <ProtectedRoute>
                <MarketPricePage />
              </ProtectedRoute>
            }
          />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/schemes" element={<SchemesPage />} />
          <Route
            path="/advisories"
            element={
              <div className="page-placeholder">
                Advisories Page - Coming Soon
              </div>
            }
          />
          <Route
            path="/contact"
            element={
              <div className="page-placeholder">Contact Page - Coming Soon</div>
            }
          />
        </Routes>
      </main>

      {location.pathname === "/" && (
        <div className="footer-wrapper">
          <Footer />
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
