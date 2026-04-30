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
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }
`;

const LANG_CODES = { hi:'hi-IN', ml:'ml-IN', bn:'bn-IN', te:'te-IN', mr:'mr-IN', en:'en-US' };

const LANGUAGE_OPTIONS = [
  { code:'hi', label:'हिंदी',   flag:'🇮🇳' },
  { code:'ml', label:'Malayalam', flag:'🌴' },
  { code:'bn', label:'বাংলা',   flag:'🌾' },
  { code:'te', label:'తెలుగు',  flag:'☀️' },
  { code:'mr', label:'मराठी',   flag:'🏔️' },
  { code:'en', label:'English', flag:'🔤' },
];

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
  const [micError, setMicError]         = useState(null)   // null | 'no-support' | 'not-allowed' | 'no-speech' | 'network'
  const [advisoryMode, setAdvisoryMode] = useState("detailed")
  const [selectedLanguage, setSelectedLanguage] = useState(() => currentLanguage || 'hi')
  const messagesEndRef = useRef(null)
  const fileInputRef   = useRef(null)
  const recognitionRef = useRef(null)

  const { scan, getFullAdvisory, reset: resetScan, result: scanResult, loading: scanLoading, error: scanError, stage: scanStage, STAGES } = useDiseaseScan()

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages, scanStage, scanResult])
  useEffect(() => {
    setMessages([{ id:1, type:'bot', content:getWelcomeMessage(), timestamp:new Date().toLocaleTimeString() }])
  }, [currentLanguage])

  const handleSendMessage = async (overrideText) => {
    const text = (typeof overrideText === 'string' ? overrideText : inputText).trim()
    if (!text) return
    const userMessage = { id:Date.now(), type:'user', content:text, timestamp:new Date().toLocaleTimeString() }
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)
    try {
      const savedState = localStorage.getItem('km_state') || 'India';
      const savedWeather = JSON.parse(localStorage.getItem('km_weather') || '{}');
      const weatherSummary = savedWeather.temp
        ? `${savedWeather.temp}°C, ${savedWeather.humidity}% humidity, ${savedWeather.condition}`
        : '';

      // geminiService never throws — always returns { response, timestamp, isFallback }
      const response = await geminiService.generateResponse(text, selectedLanguage, {
        state: savedState,
        weatherSummary
      });

      const botMessage = {
        id:        Date.now() + 1,
        type:      'bot',
        content:   response.response,
        timestamp: new Date().toLocaleTimeString(),
        isFallback: response.isFallback || false,
        isError:   false,
        lang:      selectedLanguage,
      }
      setMessages(prev => [...prev, botMessage])
      // Don't speak fallback / error messages
      if (voiceEnabled && response.response && !response.isFallback) speakResponse(response.response, selectedLanguage)
    } catch (err) {
      const errMsg = '⚠️ AI is temporarily unavailable. Showing basic guidance.';
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
    // ── Toggle: stop if already listening ──────────────────────────────────
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMicError('no-support')
      return
    }

    // Request mic permission explicitly so we get a clear error
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => {
        setMicError(null)
        const recognition = new SpeechRecognition()
        recognition.lang = LANG_CODES[selectedLanguage] || 'hi-IN'
        recognition.interimResults = false
        recognition.maxAlternatives = 1
        recognition.continuous = false

        // ── Assign ALL handlers BEFORE start() — fixes the race condition ──
        recognition.onstart  = () => setIsListening(true)

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          setInputText(transcript)
          setIsListening(false)
          // Small delay so React state flushes before we read it
          setTimeout(() => handleSendMessage(transcript), 300)
        }

        recognition.onerror = (event) => {
          setIsListening(false)
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setMicError('not-allowed')
          } else if (event.error === 'no-speech') {
            setMicError('no-speech')
            setTimeout(() => setMicError(null), 3000)
          } else if (event.error === 'network') {
            setMicError('network')
          } else {
            setMicError(null)
          }
        }

        recognition.onend = () => setIsListening(false)

        recognitionRef.current = recognition  // store ref BEFORE start()
        recognition.start()
      })
      .catch(() => setMicError('not-allowed'))
  }

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }
  const handleQuestionSelect = (q) => setInputText(q)

  const speakResponse = (text, lang) => {
    if (!window.speechSynthesis || !voiceEnabled || !text) return
    const clean = text.replace(/[#*_`]/g,'').replace(/\n+/g,'. ').trim()

    // Chrome bug: cancel() then small delay before speaking — otherwise it stalls silently
    window.speechSynthesis.cancel()
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(clean)
      utterance.lang  = LANG_CODES[lang || selectedLanguage] || 'hi-IN'
      utterance.rate  = 0.85
      utterance.pitch = 1
      utterance.volume = 1

      // Try to pick a matching installed voice
      const voices = window.speechSynthesis.getVoices()
      const targetLang = LANG_CODES[lang || selectedLanguage] || 'hi-IN'
      const match = voices.find(v => v.lang.toLowerCase().startsWith(targetLang.toLowerCase().slice(0,5)))
        || voices.find(v => v.lang.toLowerCase().startsWith('en'))
      if (match) utterance.voice = match

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend   = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }, 100)
  }

  const speakMessage = (text, lang) => speakResponse(text, lang)

  const toggleVoice = () => {
    if (isSpeaking) { window.speechSynthesis?.cancel(); setIsSpeaking(false) }
    setVoiceEnabled(!voiceEnabled)
  }

  const stopSpeaking = () => { window.speechSynthesis?.cancel(); setIsSpeaking(false) }

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
                <div className={`message-bubble${message.isError ? ' error-bubble' : ''}`}>
                  {message.image && <img src={message.image} alt="Uploaded" className="message-image" />}
                  {message.type === 'bot' && !message.isError
                    ? message.isImageAnalysis
                      ? <DiseaseResultCard geminiResponse={message.content} language={currentLanguage} onGetAdvisory={() => setInputText("Please provide a detailed chemical control plan for this diagnosis.")} onScanAgain={() => fileInputRef.current?.click()} />
                      : <ResponseFormatter content={message.content} />
                    : message.isError
                    ? <p className="error-text">{message.content}</p>
                    : <p>{message.content}</p>
                  }
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4 }}>
                    <span className="message-time">{message.timestamp}</span>
                    {message.type === 'bot' && !message.isError && (
                      <button
                        onClick={() => speakMessage(message.content, message.lang)}
                        title="Read aloud"
                        style={{
                          background:'none', border:'none', cursor:'pointer', padding:'2px 4px',
                          color:'#9ca3af', fontSize:13, lineHeight:1, borderRadius:4,
                          transition:'color .15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.color='#16a34a'}
                        onMouseOut={e => e.currentTarget.style.color='#9ca3af'}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                        </svg>
                      </button>
                    )}
                  </div>
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
                <span>⚠️ AI is temporarily unavailable. Showing basic guidance.</span>
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
                  economicImpact={scanResult?.economic_impact}
                  redAlertTriggered={scanResult?.red_alert_triggered}
                  weatherAdvisory={scanResult?.weather_advisory || (() => {
                    try {
                      const w = JSON.parse(localStorage.getItem('km_weather') || '{}');
                      if (w.temp) return `Current conditions: ${w.temp}°C, ${w.humidity}% humidity, ${w.condition}. ${scanResult?.weather_advisory || 'Check the Weather tab for a 5-day forecast to plan your spray schedule.'}`;
                    } catch {}
                    return scanResult?.weather_advisory;
                  })()}
                  mandiAdvisory={scanResult?.mandi_advisory}
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
          {/* Language Selector */}
          <div style={{
            display:'flex', gap:6, padding:'8px 12px 4px', flexWrap:'wrap', alignItems:'center',
          }}>
            <span style={{ fontSize:10, fontWeight:600, color:'#9ca3af', letterSpacing:'0.08em', textTransform:'uppercase', flexShrink:0 }}>Lang:</span>
            {LANGUAGE_OPTIONS.map(({ code, label, flag }) => (
              <button
                key={code}
                onClick={() => setSelectedLanguage(code)}
                title={label}
                style={{
                  fontSize:11, padding:'3px 10px', borderRadius:20, border:'1px solid',
                  fontFamily:'inherit', cursor:'pointer', transition:'all .15s',
                  borderColor: selectedLanguage===code ? '#16a34a' : '#e5e7eb',
                  background:  selectedLanguage===code ? '#16a34a' : 'transparent',
                  color:       selectedLanguage===code ? '#fff'    : '#6b7280',
                  fontWeight:  selectedLanguage===code ? 600       : 400,
                }}
              >{flag} {label}</button>
            ))}
          </div>
          {/* Mic error banner */}
          {micError && (
            <div style={{
              padding:'7px 14px', fontSize:12, fontWeight:500,
              display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
              background: micError === 'not-allowed' ? '#fef2f2' : micError === 'no-support' ? '#fefce8' : '#f0f9ff',
              color:      micError === 'not-allowed' ? '#dc2626' : micError === 'no-support' ? '#b45309' : '#0369a1',
              borderTop: '1px solid',
              borderColor: micError === 'not-allowed' ? '#fecaca' : micError === 'no-support' ? '#fcd34d' : '#bae6fd',
            }}>
              <span>
                {micError === 'not-allowed' && '🎙️ Microphone permission denied. Click the 🔒 icon in your browser address bar → allow mic.'}
                {micError === 'no-support'  && '⚠️ Voice not supported. Use Chrome or Edge browser for voice input.'}
                {micError === 'no-speech'   && '🔇 No speech detected. Tap mic and speak clearly.'}
                {micError === 'network'     && '🌐 Voice needs internet. Check your connection.'}
              </span>
              <button onClick={() => setMicError(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, lineHeight:1 }}>✕</button>
            </div>
          )}
          <div className="chat-input-wrapper">
            <button className="input-action-btn" onClick={() => fileInputRef.current?.click()} title="Upload crop photo">📷</button>
            <button
              className={`input-action-btn ${isListening ? 'listening' : ''}`}
              onClick={startVoiceRecognition}
              title={isListening ? 'Listening…' : `Voice input (${selectedLanguage.toUpperCase()})`}
              style={{ position:'relative' }}
            >
              {isListening && (
                <span style={{
                  position:'absolute', inset:0, borderRadius:'50%',
                  border:'2px solid #ef4444',
                  animation:'pulse-ring 1s cubic-bezier(.4,0,.6,1) infinite',
                  pointerEvents:'none',
                }}/>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={isListening ? '#ef4444' : 'currentColor'} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M19 10a7 7 0 0 1-14 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="9" y1="22" x2="15" y2="22"/>
              </svg>
            </button>
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
