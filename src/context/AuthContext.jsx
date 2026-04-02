import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('krishiUser')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    // Simulate API call
    const userData = { email, name: email.split('@')[0], id: Date.now() }
    setUser(userData)
    localStorage.setItem('krishiUser', JSON.stringify(userData))
    return userData
  }

  const loginWithGoogle = async () => {
    // Simulate Google OAuth
    const userData = { 
      email: 'farmer@gmail.com', 
      name: 'Farmer User', 
      id: Date.now(),
      provider: 'google'
    }
    setUser(userData)
    localStorage.setItem('krishiUser', JSON.stringify(userData))
    return userData
  }

  const signup = async (email, password, name) => {
    // Simulate API call
    const userData = { email, name, id: Date.now() }
    setUser(userData)
    localStorage.setItem('krishiUser', JSON.stringify(userData))
    return userData
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('krishiUser')
  }

  const value = {
    user,
    login,
    loginWithGoogle,
    signup,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}