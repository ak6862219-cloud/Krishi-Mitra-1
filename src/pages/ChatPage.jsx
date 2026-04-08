import { useState, useRef, useEffect } from 'react'
import { geminiService } from '../services/geminiService'
import { voiceService } from '../services/voiceService'
import { useLanguage } from '../context/LanguageContext'
import FarmerHelper from '../components/FarmerHelper'
import ResponseFormatter from '../components/ResponseFormatter'
import DiseaseResultCard, { parseAdvisoryText } from '../components/DiseaseResultCard'
import useDiseaseScan from '../hooks/useDiseaseScan'
import '../styles/ChatPage.css'

const SPIN_CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:0.4} }
`;

const STAGE_LABELS = {
  uploading:  { en: "Uploading image…",           hi: "छवि अपलोड हो रही है…",        ml: "ചിത്രം അപ്‌ലോഡ് ചെയ്യുന്നു…" },
  predicting: { en: "Analyzing...",               hi: "AI से फसल का विश्लेषण…",       ml: "AI ഉപയോഗിച്ച് വിള വിശകലനം…" },
  advising:   { en: "Writing your advisory…",     hi: "आपकी सलाह तैयार हो रही है…",  ml: "നിങ്ങളുടെ ഉപദേശം തയ്യാറാക്കുന്നു…" },
  error:      { en: "Analysis failed",            hi: "विश्लेषण विफल",                ml: "വിശകലനം പരാജയപ്പെട്ടു" },
};

const ChatPage = () => {
  const { t, currentLanguage } = useLanguage()

  const getWelcomeMessage = () => ({
    en: "Hello! I'm your AI farming assistant. I can help you with crop diseases, fertilizers, planting advice, and more. How can I assist you today?",
    ml: "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ AI കൃഷി സഹായിയാണ്. വിള രോഗങ്ങൾ, വളങ്ങൾ, നടീൽ ഉപദേശങ്ങൾ എന്നിവയിൽ ഞാൻ സഹായിക്കാം.",
    hi: "नमस्ते! मैं आपका AI कृषि सहायक हूं। फसल की बीमारियों, उर्वरकों, बुआई की सलाह में मदद कर सकता हूं।",
  })[currentLanguage] || "Hello! I'm your AI farming assistant."

  const [messages, setMessages]       = useState([{ id:1, type:'bot', content:getWelcomeMessage(), timestamp:new Date().toLocaleTimeString() }])
  const [inputText, setInputText]     = useState('')
  const [isLoading, setIsLoading]     = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking]   = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [advisoryMode, setAdvisoryMode] = useState("detailed")
  const messagesEndRef = useRef(null)
  const fileInputRef   = useRef(null)
  const recognitionRef = useRef(null)

  const { scan, getFullAdvisory, reset: resetScan, result: scanResult, loading: scanLoading, error: scanError, stage: scanStage, STAGES } = useDiseaseScan()

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages, scanStage, scanResult])
  useEffect(() => {
    setMessages([{ id:1, type:'bot', content:getWelcomeMessage(), timestamp:new Date().toLocaleTimeString() }])
  }, [currentLanguage])

  const handleSendMessage = async () => {
    if (!inputText.trim()) return
    const userMessage = { id:Date.now(), type:'user', content:inputText, timestamp:new Date().toLocaleTimeString() }
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)
    try {
      const savedState = localStorage.getItem('km_state') || 'India';
      const savedWeather = JSON.parse(localStorage.getItem('km_weather') || '{}');
      const weatherSummary = savedWeather.temp
        ? `${savedWeather.temp}°C, ${savedWeather.humidity}% humidity, ${savedWeather.condition}`
        : '';

      const response = await geminiService.generateResponse(inputText, currentLanguage, {
        state: savedState,
        weatherSummary
      });
      const botMessage = { id:Date.now()+1, type:'bot', content:response.response, timestamp:new Date().toLocaleTimeString() }
      setMessages(prev => [...prev, botMessage])
      if (voiceEnabled && response.response) speakResponse(response.response)
    } catch (err) {
      const errMsg = err.message?.includes('timed out')
        ? 'The AI took too long to respond. Please try again.'
        : err.message?.includes('503') || err.message?.includes('not configured')
        ? 'AI service is not available right now. Please check the backend is running.'
        : (err.message || 'Something went wrong. Please try again.');
      setMessages(prev => [...prev, { id:Date.now()+1, type:'bot', content:errMsg, timestamp:new Date().toLocaleTimeString(), isError:true }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (file) => {
    if (!file.type.startsWith('image/')) return
    await scan(file)
  }

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser'); return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SR()
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = { en:'en-US', ml:'ml-IN', hi:'hi-IN' }[currentLanguage] || 'en-US'
    recognitionRef.current.onstart  = () => setIsListening(true)
    recognitionRef.current.onresult = (e) => { setInputText(e.results[0][0].transcript); setIsListening(false) }
    recognitionRef.current.onerror  = () => setIsListening(false)
    recognitionRef.current.onend    = () => setIsListening(false)
    recognitionRef.current.start()
  }

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }
  const handleQuestionSelect = (q) => setInputText(q)

  const speakResponse = async (text) => {
    if (!voiceEnabled || !text) return
    try {
      setIsSpeaking(true)
      const clean = text.replace(/[#*_`]/g,'').replace(/\n+/g,'. ').trim()
      await voiceService.speak(clean, currentLanguage, { rate:0.9, pitch:1, volume:0.8 })
    } catch { /* ignore */ } finally { setIsSpeaking(false) }
  }

  const toggleVoice = () => {
    if (isSpeaking) { voiceService.stop(); setIsSpeaking(false) }
    setVoiceEnabled(!voiceEnabled)
  }

  const stopSpeaking = () => { voiceService.stop(); setIsSpeaking(false) }

  // Build the parsed object for DiseaseResultCard from the scan result
  const buildParsedResult = (result) => {
    if (!result) return null
    const text = advisoryMode === 'short' ? result?.advisory_short : result?.advisory_detail;
    const sections = parseAdvisoryText(text || "")
    return {
      diseaseName: result?.disease || "Unknown",
      crop:        result?.crop,
      confidence:  result?.confidence || 0,
      severity:    result?.severity || "medium",
      isHealthy:   result?.is_healthy || false,
      sections,
      rawText:     text || "No advisory available.",
    }
  }

  return (
    <div className="chat-page">
      <style>{SPIN_CSS}</style>
      <div className="chat-container">

        {/* ── Header ── */}
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="chat-avatar"><span className="avatar-icon">🌾</span></div>
            <div className="chat-info">
              <h1 className="chat-title">{t('chatTitle')}</h1>
              <p className="chat-subtitle">{t('chatSubtitle')}</p>
            </div>
            <div className="chat-controls">
              <button className={`voice-toggle-btn ${voiceEnabled ? 'enabled' : 'disabled'}`} onClick={toggleVoice} title={voiceEnabled ? 'Disable voice' : 'Enable voice'}>
                {voiceEnabled ? '🔊' : '🔇'}
              </button>
              {isSpeaking && <button className="stop-speaking-btn" onClick={stopSpeaking} title="Stop speaking">⏹️</button>}
            </div>
            <div className="chat-status">
              <span className="status-indicator"/>
              <span className="status-text">{t('online')}</span>
              {isSpeaking && <span className="speaking-indicator">🗣️</span>}
            </div>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="chat-messages">
          {messages.length === 1 && <FarmerHelper onQuestionSelect={handleQuestionSelect} />}

          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                {message.type === 'bot' && <div className="message-avatar"><span>🤖</span></div>}
                <div className="message-bubble">
                  {message.image && <img src={message.image} alt="Uploaded" className="message-image" />}
                  {message.type === 'bot' && !message.isError
                    ? message.isImageAnalysis
                      ? <DiseaseResultCard geminiResponse={message.content} language={currentLanguage} onGetAdvisory={() => setInputText("Please provide a detailed chemical control plan for this diagnosis.")} onScanAgain={() => fileInputRef.current?.click()} />
                      : <ResponseFormatter content={message.content} />
                    : <p className={message.isError ? 'error-text' : ''}>{message.content}</p>
                  }
                  <span className="message-time">{message.timestamp}</span>
                </div>
                {message.type === 'user' && <div className="message-avatar"><span>👨‍🌾</span></div>}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message bot">
              <div className="message-content">
                <div className="message-avatar"><span>🤖</span></div>
                <div className="message-bubble typing">
                  <div className="typing-indicator"><span/><span/><span/></div>
                </div>
              </div>
            </div>
          )}

          {/* ── Disease scan results ── */}
          <div style={{ padding: "0 4px 8px" }}>

            {/* Loading state */}
            {scanLoading && (
              <div style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"14px 16px", background:"#f0fdf4",
                borderRadius:12, border:"1px solid #bbf7d0",
                fontSize:13, color:"#166534", margin:"4px 0",
              }}>
                <span style={{ width:16, height:16, border:"2px solid #16a34a", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }}/>
                <span>{STAGE_LABELS[scanStage]?.[currentLanguage] ?? STAGE_LABELS[scanStage]?.en}</span>
              </div>
            )}

            {/* Error state */}
            {scanError && (
              <div style={{
                padding:"12px 16px", background:"#fef2f2",
                border:"1px solid #fecaca", borderRadius:12,
                fontSize:13, color:"#dc2626",
                display:"flex", justifyContent:"space-between", alignItems:"center",
              }}>
                <span>{scanError}</span>
                <button onClick={resetScan} style={{ fontSize:12, color:"#dc2626", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Try again</button>
              </div>
            )}

            {/* Result */}
            {scanResult && !scanLoading && (
              <>
                {/* Short / Detailed toggle */}
                <div style={{ display:"flex", gap:8, marginBottom:10, marginTop:4 }}>
                  {[
                    { id:"detailed", label:"Full Advisory" },
                    { id:"short",    label:"Quick Message" },
                  ].map(({ id, label }) => (
                    <button key={id}
                      onClick={() => { setAdvisoryMode(id); if (id !== advisoryMode) getFullAdvisory(id) }}
                      style={{
                        fontSize:11, padding:"6px 16px", borderRadius:20,
                        border:"1px solid", fontFamily:"inherit",
                        borderColor: advisoryMode===id ? "#16a34a" : "#e5e7eb",
                        background:  advisoryMode===id ? "#16a34a" : "transparent",
                        color:       advisoryMode===id ? "#fff"    : "#6b7280",
                        cursor:"pointer", fontWeight:500, transition:"all .15s",
                      }}
                    >{label}</button>
                  ))}
                </div>

                {/* Disease Result Card — parses and renders full structured advisory */}
                <DiseaseResultCard
                  parsed={buildParsedResult(scanResult)}
                  language={currentLanguage}
                  onGetAdvisory={() => getFullAdvisory("detailed")}
                  onScanAgain={resetScan}
                />

                {/* Short mode: WhatsApp message box */}
                {advisoryMode === "short" && scanResult.advisory_short && (
                  <div style={{
                    marginTop:10, padding:"14px 16px",
                    background:"#f0fdf4", borderRadius:12,
                    border:"1px solid #bbf7d0",
                  }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#4ade80", marginBottom:8 }}>
                      QUICK WHATSAPP MESSAGE
                    </div>
                    <p style={{ margin:0, fontSize:14, color:"#166534", lineHeight:1.7 }}>
                      {scanResult.advisory_short}
                    </p>
                    <button
                      onClick={() => navigator.clipboard?.writeText(scanResult.advisory_short)}
                      style={{
                        marginTop:10, fontSize:11, padding:"5px 14px",
                        borderRadius:8, border:"1px solid #86efac",
                        background:"transparent", color:"#16a34a",
                        cursor:"pointer", fontFamily:"inherit",
                      }}
                    >Copy to clipboard</button>
                  </div>
                )}
              </>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar ── */}
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <button className="input-action-btn" onClick={() => fileInputRef.current?.click()} title="Upload crop photo">📷</button>
            <button className={`input-action-btn ${isListening ? 'listening' : ''}`} onClick={startVoiceRecognition} title="Voice input">🎤</button>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('askQuestion')}
              className="chat-input"
              rows="1"
            />
            <button onClick={handleSendMessage} disabled={!inputText.trim() || isLoading} className="send-btn">
              <span className="send-icon">➤</span>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*"
            onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
            style={{ display:'none' }}
          />
        </div>
      </div>
    </div>
  )
}

export default ChatPage
