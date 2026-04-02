class VoiceService {
  constructor() {
    this.synthesis = window.speechSynthesis
    this.voices = []
    this.isInitialized = false
    this.initVoices()
  }

  initVoices() {
    const loadVoices = () => {
      this.voices = this.synthesis.getVoices()
      this.isInitialized = true
    }

    if (this.synthesis.getVoices().length > 0) {
      loadVoices()
    } else {
      this.synthesis.addEventListener('voiceschanged', loadVoices)
    }
  }

  getVoiceForLanguage(language) {
    if (!this.isInitialized || this.voices.length === 0) {
      return null
    }

    const languageMap = {
      'en': ['en-US', 'en-GB', 'en-IN', 'en'],
      'ml': ['ml-IN', 'ml'],
      'hi': ['hi-IN', 'hi']
    }

    const preferredLangs = languageMap[language] || ['en-US']
    
    for (const lang of preferredLangs) {
      const voice = this.voices.find(v => 
        v.lang.toLowerCase().startsWith(lang.toLowerCase())
      )
      if (voice) return voice
    }

    // Fallback to default voice
    return this.voices[0] || null
  }

  speak(text, language = 'en', options = {}) {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported')
      return Promise.reject(new Error('Speech synthesis not supported'))
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      const voice = this.getVoiceForLanguage(language)
      
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      } else {
        // Set language even if no specific voice found
        const langMap = {
          'en': 'en-US',
          'ml': 'ml-IN', 
          'hi': 'hi-IN'
        }
        utterance.lang = langMap[language] || 'en-US'
      }

      // Voice settings
      utterance.rate = options.rate || 0.9
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 1

      utterance.onend = () => resolve()
      utterance.onerror = (error) => reject(error)

      this.synthesis.speak(utterance)
    })
  }

  stop() {
    if (this.synthesis) {
      this.synthesis.cancel()
    }
  }

  isSpeaking() {
    return this.synthesis ? this.synthesis.speaking : false
  }

  getAvailableVoices(language) {
    if (!this.isInitialized) return []
    
    const languageMap = {
      'en': ['en-US', 'en-GB', 'en-IN', 'en'],
      'ml': ['ml-IN', 'ml'],
      'hi': ['hi-IN', 'hi']
    }

    const preferredLangs = languageMap[language] || ['en-US']
    
    return this.voices.filter(voice => 
      preferredLangs.some(lang => 
        voice.lang.toLowerCase().startsWith(lang.toLowerCase())
      )
    )
  }
}

export const voiceService = new VoiceService()