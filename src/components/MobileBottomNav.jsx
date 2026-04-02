import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const MobileBottomNav = () => {
  const location = useLocation()
  const { user } = useAuth()
  const { t } = useLanguage()

  const navItems = [
    { name: t('home'), path: '/', icon: '🏠' },
    { name: t('chat'), path: '/chat', icon: '💬' },
    { name: t('weather'), path: '/weather', icon: '🌤️' },
    { name: t('marketPrices'), path: '/market-prices', icon: '📊' },
    { name: user ? 'Profile' : t('login'), path: user ? '/profile' : '/login', icon: user ? '👤' : '🔐' }
  ]

  return (
    <nav className="mobile-bottom-nav">
      <div className="bottom-nav-container">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default MobileBottomNav