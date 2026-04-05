import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import "./App.css";

import TopStrip from "./components/TopStrip";
import Header from "./components/Header";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MarketPricePage from "./pages/MarketPricePage";
import WeatherPage from "./pages/WeatherPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import SchemesPage from "./pages/SchemesPage";
import AdvisoriesPage from "./pages/AdvisoriesPage";
import ContactPage from "./pages/ContactPage";

function AppContent() {
  const location = useLocation();

  return (
    <div className="App">
      <TopStrip />
      <Header />

      <main>
        <Routes>
          <Route path="/"               element={<HomePage />} />
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/market-prices"  element={<MarketPricePage />} />
          <Route path="/weather"        element={<WeatherPage />} />
          <Route path="/chat"           element={<ChatPage />} />
          <Route path="/profile"        element={<ProfilePage />} />
          <Route path="/schemes"        element={<SchemesPage />} />
          <Route path="/advisories"     element={<AdvisoriesPage />} />
          <Route path="/contact"        element={<ContactPage />} />
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
