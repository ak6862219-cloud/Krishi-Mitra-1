import { useState, useRef, useEffect } from 'react'
import { geminiService } from '../services/geminiService'
import { voiceService } from '../services/voiceService'
import { useLanguage } from '../context/LanguageContext'
import FarmerHelper from '../components/FarmerHelper'
import ResponseFormatter from '../components/ResponseFormatter'
import '../styles/ChatPage.css'

const ChatPage = () => {
  const { t, currentLanguage } = useLanguage()
  
  const getWelcomeMessage = () => {
    const welcomeMessages = {
      en: "Hello! I'm your AI farming assistant. I can help you with crop diseases, fertilizers, planting advice, and more. How can I assist you today?",
      ml: "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ AI കൃഷി സഹായിയാണ്. വിള രോഗങ്ങൾ, വളങ്ങൾ, നടീൽ ഉപദേശങ്ങൾ എന്നിവയിൽ ഞാൻ സഹായിക്കാം. ഇന്ന് എങ്ങനെ സഹായിക്കാം?",
      hi: "नमस्ते! मैं आपका AI कृषि सहायक हूं। मैं फसल की बीमारियों, उर्वरकों, बुआई की सलाह और अन्य चीजों में आपकी मदद कर सकता हूं। आज मैं आपकी कैसे सहायता कर सकता हूं?"
    }
    return welcomeMessages[currentLanguage] || welcomeMessages.en
  }

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: getWelcomeMessage(),
      timestamp: new Date().toLocaleTimeString()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const recognitionRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    setMessages([{
      id: 1,
      type: 'bot',
      content: getWelcomeMessage(),
      timestamp: new Date().toLocaleTimeString()
    }])
  }, [currentLanguage])

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputText,
      timestamp: new Date().toLocaleTimeString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const response = await geminiService.generateResponse(inputText, currentLanguage)
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.response,
        timestamp: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, botMessage])
      
      // Speak the response if voice is enabled
      if (voiceEnabled && response.response) {
        speakResponse(response.response)
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (file) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageMessage = {
        id: Date.now(),
        type: 'user',
        content: 'Image uploaded for analysis',
        image: e.target.result,
        timestamp: new Date().toLocaleTimeString()
      }

      setMessages(prev => [...prev, imageMessage])
      setIsLoading(true)

      try {
        const base64 = e.target.result.split(',')[1]
        const response = await geminiService.analyzeImage(base64, currentLanguage)
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.response,
          timestamp: new Date().toLocaleTimeString()
        }
        setMessages(prev => [...prev, botMessage])
        
        // Speak the response if voice is enabled
        if (voiceEnabled && response.response) {
          speakResponse(response.response)
        }
      } catch (error) {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: 'Sorry, I couldn\'t analyze the image. Please try again.',
          timestamp: new Date().toLocaleTimeString(),
          isError: true
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    // Set recognition language based on current language
    const langMap = {
      'en': 'en-US',
      'ml': 'ml-IN',
      'hi': 'hi-IN'
    }
    recognitionRef.current.lang = langMap[currentLanguage] || 'en-US'

    recognitionRef.current.onstart = () => setIsListening(true)
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInputText(transcript)
      setIsListening(false)
    }
    recognitionRef.current.onerror = () => setIsListening(false)
    recognitionRef.current.onend = () => setIsListening(false)

    recognitionRef.current.start()
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuestionSelect = (question) => {
    setInputText(question)
  }

  const speakResponse = async (text) => {
    if (!voiceEnabled || !text) return
    
    try {
      setIsSpeaking(true)
      // Clean text for better speech (remove markdown, emojis, etc.)
      const cleanText = text
        .replace(/[#*_`]/g, '') // Remove markdown
        .replace(/[🌾🤖👨🌾📷🎤➤]/g, '') // Remove emojis
        .replace(/\n+/g, '. ') // Replace newlines with periods
        .trim()
      
      await voiceService.speak(cleanText, currentLanguage, {
        rate: 0.9,
        pitch: 1,
        volume: 0.8
      })
    } catch (error) {
      console.warn('Speech synthesis failed:', error)
    } finally {
      setIsSpeaking(false)
    }
  }

  const toggleVoice = () => {
    if (isSpeaking) {
      voiceService.stop()
      setIsSpeaking(false)
    }
    setVoiceEnabled(!voiceEnabled)
  }

  const stopSpeaking = () => {
    voiceService.stop()
    setIsSpeaking(false)
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="chat-avatar">
              <span className="avatar-icon">🌾</span>
            </div>
            <div className="chat-info">
              <h1 className="chat-title">{t('chatTitle')}</h1>
              <p className="chat-subtitle">{t('chatSubtitle')}</p>
            </div>
            <div className="chat-controls">
              <button 
                className={`voice-toggle-btn ${voiceEnabled ? 'enabled' : 'disabled'}`}
                onClick={toggleVoice}
                title={voiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}
              >
                {voiceEnabled ? '🔊' : '🔇'}
              </button>
              {isSpeaking && (
                <button 
                  className="stop-speaking-btn"
                  onClick={stopSpeaking}
                  title="Stop speaking"
                >
                  ⏹️
                </button>
              )}
            </div>
            <div className="chat-status">
              <span className="status-indicator"></span>
              <span className="status-text">{t('online')}</span>
              {isSpeaking && <span className="speaking-indicator">🗣️</span>}
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 1 && (
            <FarmerHelper onQuestionSelect={handleQuestionSelect} />
          )}
          
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                {message.type === 'bot' && (
                  <div className="message-avatar">
                    <span>🤖</span>
                  </div>
                )}
                <div className="message-bubble">
                  {message.image && (
                    <img src={message.image} alt="Uploaded" className="message-image" />
                  )}
                  {message.type === 'bot' && !message.isError ? (
                    <ResponseFormatter content={message.content} />
                  ) : (
                    <p className={message.isError ? 'error-text' : ''}>{message.content}</p>
                  )}
                  <span className="message-time">{message.timestamp}</span>
                </div>
                {message.type === 'user' && (
                  <div className="message-avatar">
                    <span>👨‍🌾</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message bot">
              <div className="message-content">
                <div className="message-avatar">
                  <span>🤖</span>
                </div>
                <div className="message-bubble typing">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <button 
              className="input-action-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Upload image"
            >
              📷
            </button>
            <button 
              className={`input-action-btn ${isListening ? 'listening' : ''}`}
              onClick={startVoiceRecognition}
              title="Voice input"
            >
              🎤
            </button>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('askQuestion')}
              className="chat-input"
              rows="1"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="send-btn"
            >
              <span className="send-icon">➤</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}

export default ChatPage