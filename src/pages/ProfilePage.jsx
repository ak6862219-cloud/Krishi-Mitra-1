import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useNavigate } from 'react-router-dom'
import '../styles/ProfilePage.css'

const ProfilePage = () => {
  const { user, logout } = useAuth()
  const { currentLanguage } = useLanguage()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: user?.name || 'Farmer',
    email: user?.email || 'farmer@example.com'
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    // Update user data logic here
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData({
      name: user?.name || 'Farmer',
      email: user?.email || 'farmer@example.com'
    })
    setIsEditing(false)
  }

  const profileLabels = {
    en: {
      title: 'Profile',
      name: 'Name',
      email: 'Email',
      language: 'Language',
      joinedDate: 'Joined Date',
      logout: 'Logout',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel'
    },
    ml: {
      title: 'പ്രൊഫൈൽ',
      name: 'പേര്',
      email: 'ഇമെയിൽ',
      language: 'ഭാഷ',
      joinedDate: 'ചേർന്ന തീയതി',
      logout: 'ലോഗൗട്ട്',
      edit: 'എഡിറ്റ്',
      save: 'സേവ്',
      cancel: 'റദ്ദാക്കുക'
    },
    hi: {
      title: 'प्रोफाइल',
      name: 'नाम',
      email: 'ईमेल',
      language: 'भाषा',
      joinedDate: 'शामिल होने की तारीख',
      logout: 'लॉगआउट',
      edit: 'संपादित करें',
      save: 'सहेजें',
      cancel: 'रद्द करें'
    }
  }

  const labels = profileLabels[currentLanguage] || profileLabels.en

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <span>👨‍🌾</span>
          </div>
          <h1>{labels.title}</h1>
        </div>

        <div className="profile-content">
          <div className="profile-info">
            <div className="info-item">
              <label>{labels.name}</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editData.name} 
                  onChange={(e) => setEditData({...editData, name: e.target.value})}
                  className="edit-input"
                />
              ) : (
                <span>{user?.name || 'Farmer'}</span>
              )}
            </div>
            <div className="info-item">
              <label>{labels.email}</label>
              {isEditing ? (
                <input 
                  type="email" 
                  value={editData.email} 
                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                  className="edit-input"
                />
              ) : (
                <span>{user?.email || 'farmer@example.com'}</span>
              )}
            </div>
            <div className="info-item">
              <label>{labels.language}</label>
              <span>{currentLanguage === 'en' ? 'English' : currentLanguage === 'ml' ? 'മലയാളം' : 'हिंदी'}</span>
            </div>
            <div className="info-item">
              <label>{labels.joinedDate}</label>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="profile-actions">
            {isEditing ? (
              <>
                <button className="save-btn" onClick={handleSave}>
                  <span className="save-icon">💾</span>
                  {labels.save}
                </button>
                <button className="cancel-btn" onClick={handleCancel}>
                  <span className="cancel-icon">❌</span>
                  {labels.cancel}
                </button>
              </>
            ) : (
              <button className="edit-btn" onClick={handleEdit}>
                <span className="edit-icon">✏️</span>
                {labels.edit}
              </button>
            )}
            <button className="logout-btn" onClick={handleLogout}>
              <span className="logout-icon">🚪</span>
              {labels.logout}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage