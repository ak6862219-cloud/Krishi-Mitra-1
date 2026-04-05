import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini AI service for agricultural chatbot
const GEMINI_API_KEY = import.meta.env.VITE_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("VITE_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const geminiService = {
  generateResponse: async (question, language = "en") => {
    try {
      const modelName = import.meta.env.VITE_WEATHER_API_KEY || "gemini-2.5-flash";
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `You are an expert agricultural advisor for India, India. ALWAYS provide EXACTLY 4 key points. Answer in this EXACT format:

**SUMMARY:** [Brief summary of issue and solution]

**KEY POINTS:**
• Point 1 - Immediate action
• Point 2 - Treatment method  
• Point 3 - Prevention steps
• Point 4 - Follow-up care

Rules:
- MUST have exactly 4 bullet points
- Use simple farmer language
- Include specific amounts/timing
- Keep each point under 15 words
- Language: ${
        language === "ml"
          ? "Malayalam"
          : language === "hi"
          ? "Hindi"
          : "English"
      }

Question: ${question}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;

      return {
        response: response.text(),
        timestamp: new Date().toLocaleString(),
      };
    } catch (error) {
      console.error("Gemini API error:", error);

      if (!GEMINI_API_KEY) {
        return {
          response:
            "API key not configured. Please check environment variables.",
          timestamp: new Date().toLocaleString(),
        };
      }

      // Fallback response for demo
      return {
        response: `I apologize, but I'm currently experiencing connectivity issues. Here's general advice for your question about "${question}":

For common agricultural issues in India:
• Ensure proper drainage during monsoon season
• Use organic fertilizers suitable for India's soil
• Contact your local Krishi Vigyan Kendra for specific guidance
• Monitor crops regularly for pest and disease symptoms

Please try again later for AI-powered responses.`,
        timestamp: new Date().toLocaleString(),
      };
    }
  },

  analyzeImage: async (imageBase64, language = "en") => {
    try {
      const modelName = import.meta.env.VITE_WEATHER_API_KEY || "gemini-1.5-flash";
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `Analyze this image and respond in EXACT format with EXACTLY 4 points:

**SUMMARY:** [What you see and main issue]

**KEY POINTS:**
• Point 1 - Crop identification
• Point 2 - Problem diagnosis
• Point 3 - Immediate treatment
• Point 4 - Prevention method

Rules:
- MUST have exactly 4 bullet points
- Simple farmer language
- Specific actions only
- Language: ${
        language === "ml"
          ? "Malayalam"
          : language === "hi"
          ? "Hindi"
          : "English"
      }`;

      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: imageBase64.startsWith("/9j") ? "image/jpeg" : "image/png",
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;

      return {
        response: response.text(),
        timestamp: new Date().toLocaleString(),
      };
    } catch (error) {
      console.error("Gemini Vision API error:", error);
      // Fallback response for image analysis
      return {
        response: `I'm currently unable to analyze the image due to connectivity issues. However, here are general steps for crop analysis:

1. Check for discoloration in leaves (yellowing, browning, spots)
2. Look for pest damage (holes, chewed edges)
3. Examine plant structure and growth patterns
4. Consider recent weather conditions in India
5. Consult with local agricultural experts

For immediate help, please contact your nearest Krishi Vigyan Kendra or agricultural extension officer.`,
        timestamp: new Date().toLocaleString(),
      };
    }
  },
};
