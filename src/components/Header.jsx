import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const Header = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setShowUserMenu(false)
  }, [location.pathname])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.mobile-menu') && !event.target.closest('.mobile-menu-btn')) {
        setIsMobileMenuOpen(false)
      }
      if (!event.target.closest('.user-menu')) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const navItems = [
    { name: t('home'), path: '/' },
    { name: t('chat'), path: '/chat' },
    { name: t('weather'), path: '/weather' },
    { name: t('marketPrices'), path: '/market-prices' },
    { name: t('schemes'), path: '/schemes' },
    { name: t('advisories'), path: '/advisories' },
    { name: t('contact'), path: '/contact' }
  ]

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    setIsMobileMenuOpen(false)
  }

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">🌱</span>
            <span className="logo-text">KrishiAI</span>
          </Link>
          
          <nav className="desktop-nav">
            <ul>
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link 
                    to={item.path}
                    className={location.pathname === item.path ? 'active' : ''}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="auth-section desktop-auth">
            {user ? (
              <div className="user-menu">
                <button 
                  className="user-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <i className="fas fa-user"></i>
                  {user.name}
                </button>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <Link to="/profile">Profile</Link>
                    <Link to="/dashboard">Dashboard</Link>
                    <button onClick={handleLogout}>Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary">
                {t('login')}
              </Link>
            )}
          </div>

          <button 
            className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>

        <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          <div className="mobile-menu-content">
            <nav>
              {navItems.map((item) => (
                <Link 
                  key={item.name}
                  to={item.path}
                  className={location.pathname === item.path ? 'active' : ''}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="mobile-auth">
              {user ? (
                <>
                  <div className="user-info">
                    <i className="fas fa-user"></i>
                    {user.name}
                  </div>
                  <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>Profile</Link>
                  <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                  <button onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <Link to="/login" className="btn btn-primary" onClick={() => setIsMobileMenuOpen(false)}>
                  {t('login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header