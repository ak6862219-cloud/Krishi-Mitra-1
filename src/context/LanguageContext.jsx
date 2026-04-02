import { createContext, useContext, useState } from "react";

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

const translations = {
  en: {
    // Navigation
    home: "Home",
    chat: "AI Chat",
    weather: "Weather",
    marketPrices: "Market Prices",
    schemes: "Schemes",
    advisories: "Advisories",
    contact: "Contact",
    login: "Login",

    // Hero Section
    heroTitle: "India Agricultural Assistance Portal",
    heroSubtitle:
      "Empowering farmers with AI-driven solutions, real-time advisories, and government support for sustainable agriculture.",
    startAIChat: "🤖 Start AI Chat",
    checkWeather: "🌤️ Check Weather",

    // Chat Interface
    chatTitle: "Krishi AI Assistant",
    chatSubtitle: "Your agricultural expert companion",
    online: "Online",
    askQuestion: "Ask about crops, diseases, weather...",
    voiceInput: "Voice Input",
    uploadImage: "Upload Image",

    // Features
    featuresTitle: "AI Agricultural Assistant",
    featuresSubtitle:
      "Get instant expert advice on crops, diseases, weather, and farming practices",
    voiceQueries: "Voice Queries",
    voiceQueriesDesc: "Ask questions using your voice in Malayalam or English",
    imageAnalysis: "Image Analysis",
    imageAnalysisDesc: "Upload crop photos for disease detection and analysis",
    realTimeChat: "Real-time Chat",
    realTimeChatDesc: "Get instant responses from our AI agricultural expert",

    // Common
    available247: "Available 24/7",
    supportsLanguages: "Supports Malayalam & English",
    freeToUse: "Free to use",
    startChatting: "🚀 Start Chatting with AI",

    // Simple Instructions
    howToUse: "How to Use",
    step1: "1. Click on AI Chat",
    step2: "2. Ask your question",
    step3: "3. Get instant answer",

    // Farmer Friendly Messages
    welcomeMessage:
      "Hello! I am your farming assistant. Ask me anything about crops, diseases, or farming.",
    exampleQuestions: "Example Questions:",
    example1: "My rice plants have yellow leaves, what should I do?",
    example2: "When is the best time to plant tomatoes?",
    example3: "How to control pests in coconut trees?",

    // Error Messages
    errorMessage: "Sorry, I could not understand. Please try again.",
    networkError: "Network problem. Please check your internet connection.",

    // Voice Instructions
    voiceInstructions: "Click and speak your question clearly",
    listening: "Listening...",
    stopListening: "Stop",

    // Image Instructions
    imageInstructions: "Take a clear photo of your crop or plant",
    analyzing: "Analyzing your image...",

    // Government Text
    govText: "Government of India - Department of Agriculture",
  },

  ml: {
    // Navigation
    home: "ഹോം",
    chat: "AI ചാറ്റ്",
    weather: "കാലാവസ്ഥ",
    marketPrices: "മാർക്കറ്റ് വില",
    schemes: "പദ്ധതികൾ",
    advisories: "ഉപദേശങ്ങൾ",
    contact: "ബന്ധപ്പെടുക",
    login: "ലോഗിൻ",

    // Hero Section
    heroTitle: "കേരള കാർഷിക സഹായ പോർട്ടൽ",
    heroSubtitle:
      "AI സാങ്കേതികവിദ്യ, തത്സമയ ഉപദേശങ്ങൾ, സർക്കാർ പിന്തുണ എന്നിവയിലൂടെ കർഷകരെ ശാക്തീകരിക്കുന്നു.",
    startAIChat: "🤖 AI ചാറ്റ് ആരംഭിക്കുക",
    checkWeather: "🌤️ കാലാവസ്ഥ പരിശോധിക്കുക",

    // Chat Interface
    chatTitle: "കൃഷി AI സഹായി",
    chatSubtitle: "നിങ്ങളുടെ കാർഷിക വിദഗ്ധ സഹായി",
    online: "ഓൺലൈൻ",
    askQuestion: "വിളകൾ, രോഗങ്ങൾ, കാലാവസ്ഥ എന്നിവയെക്കുറിച്ച് ചോദിക്കുക...",
    voiceInput: "ശബ്ദ ഇൻപുട്ട്",
    uploadImage: "ചിത്രം അപ്‌ലോഡ് ചെയ്യുക",

    // Features
    featuresTitle: "AI കാർഷിക സഹായി",
    featuresSubtitle:
      "വിളകൾ, രോഗങ്ങൾ, കാലാവസ്ഥ, കൃഷി രീതികൾ എന്നിവയെക്കുറിച്ച് തൽക്ഷണ വിദഗ്ധ ഉപദേശം നേടുക",
    voiceQueries: "ശബ്ദ ചോദ്യങ്ങൾ",
    voiceQueriesDesc:
      "മലയാളത്തിലോ ഇംഗ്ലീഷിലോ ശബ്ദം ഉപയോഗിച്ച് ചോദ്യങ്ങൾ ചോദിക്കുക",
    imageAnalysis: "ചിത്ര വിശകലനം",
    imageAnalysisDesc:
      "രോഗ കണ്ടെത്തലിനും വിശകലനത്തിനുമായി വിള ഫോട്ടോകൾ അപ്‌ലോഡ് ചെയ്യുക",
    realTimeChat: "തത്സമയ ചാറ്റ്",
    realTimeChatDesc:
      "ഞങ്ങളുടെ AI കാർഷിക വിദഗ്ധനിൽ നിന്ന് തൽക്ഷണ പ്രതികരണങ്ങൾ നേടുക",

    // Common
    available247: "24/7 ലഭ്യം",
    supportsLanguages: "മലയാളം & ഇംഗ്ലീഷ് പിന്തുണ",
    freeToUse: "സൗജന്യമായി ഉപയോഗിക്കാം",
    startChatting: "🚀 AI യുമായി ചാറ്റിംഗ് ആരംഭിക്കുക",

    // Simple Instructions
    howToUse: "എങ്ങനെ ഉപയോഗിക്കാം",
    step1: "1. AI ചാറ്റിൽ ക്ലിക്ക് ചെയ്യുക",
    step2: "2. നിങ്ങളുടെ ചോദ്യം ചോദിക്കുക",
    step3: "3. തൽക്ഷണ ഉത്തരം നേടുക",

    // Farmer Friendly Messages
    welcomeMessage:
      "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ കൃഷി സഹായിയാണ്. വിളകൾ, രോഗങ്ങൾ, കൃഷി എന്നിവയെക്കുറിച്ച് എന്തും ചോദിക്കുക.",
    exampleQuestions: "ഉദാഹരണ ചോദ്യങ്ങൾ:",
    example1: "എന്റെ നെല്ല് ചെടികൾക്ക് മഞ്ഞ ഇലകൾ ഉണ്ട്, എന്ത് ചെയ്യണം?",
    example2: "തക്കാളി നടാൻ ഏറ്റവും നല്ല സമയം എപ്പോഴാണ്?",
    example3: "തെങ്ങിലെ കീടങ്ങളെ എങ്ങനെ നിയന്ത്രിക്കാം?",

    // Error Messages
    errorMessage:
      "ക്ഷമിക്കണം, എനിക്ക് മനസ്സിലായില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.",
    networkError:
      "നെറ്റ്‌വർക്ക് പ്രശ്നം. ദയവായി നിങ്ങളുടെ ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിക്കുക.",

    // Voice Instructions
    voiceInstructions: "ക്ലിക്ക് ചെയ്ത് നിങ്ങളുടെ ചോദ്യം വ്യക്തമായി പറയുക",
    listening: "കേൾക്കുന്നു...",
    stopListening: "നിർത്തുക",

    // Image Instructions
    imageInstructions:
      "നിങ്ങളുടെ വിളയുടെയോ ചെടിയുടെയോ വ്യക്തമായ ഫോട്ടോ എടുക്കുക",
    analyzing: "നിങ്ങളുടെ ചിത്രം വിശകലനം ചെയ്യുന്നു...",

    // Government Text
    govText: "കേരള സർക്കാർ - കാർഷിക വകുപ്പ്",
  },

  hi: {
    // Navigation
    home: "होम",
    chat: "AI चैट",
    weather: "मौसम",
    marketPrices: "बाजार भाव",
    schemes: "योजनाएं",
    advisories: "सलाह",
    contact: "संपर्क",
    login: "लॉगिन",

    // Hero Section
    heroTitle: "केरल कृषि सहायता पोर्टल",
    heroSubtitle:
      "AI तकनीक, वास्तविक समय की सलाह और सरकारी सहायता के साथ किसानों को सशक्त बनाना।",
    startAIChat: "🤖 AI चैट शुरू करें",
    checkWeather: "🌤️ मौसम देखें",

    // Chat Interface
    chatTitle: "कृषि AI सहायक",
    chatSubtitle: "आपका कृषि विशेषज्ञ साथी",
    online: "ऑनलाइन",
    askQuestion: "फसलों, बीमारियों, मौसम के बारे में पूछें...",
    voiceInput: "आवाज इनपुट",
    uploadImage: "तस्वीर अपलोड करें",

    // Features
    featuresTitle: "AI कृषि सहायक",
    featuresSubtitle:
      "फसलों, बीमारियों, मौसम और खेती के तरीकों पर तुरंत विशेषज्ञ सलाह पाएं",
    voiceQueries: "आवाज से सवाल",
    voiceQueriesDesc:
      "हिंदी या अंग्रेजी में अपनी आवाज का उपयोग करके सवाल पूछें",
    imageAnalysis: "तस्वीर विश्लेषण",
    imageAnalysisDesc:
      "बीमारी की पहचान और विश्लेषण के लिए फसल की तस्वीरें अपलोड करें",
    realTimeChat: "तुरंत चैट",
    realTimeChatDesc: "हमारे AI कृषि विशेषज्ञ से तुरंत जवाब पाएं",

    // Common
    available247: "24/7 उपलब्ध",
    supportsLanguages: "हिंदी और अंग्रेजी समर्थन",
    freeToUse: "मुफ्त में उपयोग करें",
    startChatting: "🚀 AI के साथ चैट शुरू करें",

    // Simple Instructions
    howToUse: "कैसे उपयोग करें",
    step1: "1. AI चैट पर क्लिक करें",
    step2: "2. अपना सवाल पूछें",
    step3: "3. तुरंत जवाब पाएं",

    // Farmer Friendly Messages
    welcomeMessage:
      "नमस्ते! मैं आपका खेती सहायक हूं। फसलों, बीमारियों या खेती के बारे में कुछ भी पूछें।",
    exampleQuestions: "उदाहरण सवाल:",
    example1: "मेरे धान के पौधों की पत्तियां पीली हो रही हैं, क्या करूं?",
    example2: "टमाटर लगाने का सबसे अच्छा समय कब है?",
    example3: "नारियल के पेड़ों में कीड़ों को कैसे नियंत्रित करें?",

    // Error Messages
    errorMessage: "माफ करें, मैं समझ नहीं पाया। कृपया फिर से कोशिश करें।",
    networkError: "नेटवर्क की समस्या। कृपया अपना इंटरनेट कनेक्शन जांचें।",

    // Voice Instructions
    voiceInstructions: "क्लिक करें और अपना सवाल साफ-साफ बोलें",
    listening: "सुन रहा हूं...",
    stopListening: "रोकें",

    // Image Instructions
    imageInstructions: "अपनी फसल या पौधे की साफ तस्वीर लें",
    analyzing: "आपकी तस्वीर का विश्लेषण कर रहा हूं...",

    // Government Text
    govText: "केरल सरकार - कृषि विभाग",
  },
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState("en");

  const t = (key) => {
    return translations[currentLanguage][key] || key;
  };

  const changeLanguage = (lang) => {
    setCurrentLanguage(lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        t,
        languages: [
          { code: "en", name: "English", native: "English" },
          { code: "ml", name: "Malayalam", native: "മലയാളം" },
          { code: "hi", name: "Hindi", native: "हिंदी" },
        ],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
