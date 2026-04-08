"""
Krishi Mitra — FastAPI Backend (Production)
============================================
Endpoints:
  POST /analyze          → ML model + Gemini advisory
  POST /advisory         → Gemini advisory only
  GET  /health           → Status check
  GET  /classes          → All 38 class names
  POST /api/chat         → Secure Gemini chat proxy
  GET  /api/weather      → OpenWeatherMap proxy (lat/lon or city)
  GET  /api/mandi        → Agmarknet data proxy

Run:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import os, io, logging, time, asyncio
from pathlib import Path
from typing import Optional

import httpx
import numpy as np
from PIL import Image
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
WEATHER_API_KEY  = os.getenv("WEATHER_API_KEY", "")
AGMARKNET_KEY    = os.getenv("AGMARKNET_KEY", "")
MODEL_PATH       = os.getenv("MODEL_PATH", "./model/krishi_model.h5")
USE_MOCK_MODEL   = os.getenv("USE_MOCK_MODEL", "false").lower() == "true"
ALLOWED_ORIGINS  = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("krishi")

app = FastAPI(title="Krishi Mitra API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # dev — lock to ALLOWED_ORIGINS in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Simple in-memory cache ────────────────────────────────────────────────────
_cache: dict[str, tuple[dict, float]] = {}

def cache_get(key: str, ttl: int = 300) -> Optional[dict]:
    if key in _cache:
        value, ts = _cache[key]
        if time.time() - ts < ttl:
            return value
        del _cache[key]
    return None

def cache_set(key: str, value: dict):
    _cache[key] = (value, time.time())

# ─── 38 PlantVillage class names ──────────────────────────────────────────────
CLASS_NAMES = [
    "Apple___Apple_scab", "Apple___Black_rot",
    "Apple___Cedar_apple_rust", "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot", "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot", "Peach___healthy",
    "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy",
    "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy",
    "Raspberry___healthy", "Soybean___healthy", "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch", "Strawberry___healthy",
    "Tomato___Bacterial_spot", "Tomato___Early_blight",
    "Tomato___Late_blight", "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus", "Tomato___healthy",
]

def parse_class_name(raw: str) -> tuple[str, str, bool]:
    parts   = raw.split("___")
    crop    = parts[0].replace("_", " ").strip()
    disease = parts[1].replace("_", " ").replace("  ", " ").strip().title() if len(parts) > 1 else "Unknown"
    healthy = "healthy" in disease.lower()
    return crop, disease, healthy

# ─── ML model ─────────────────────────────────────────────────────────────────
_ml_model = None

def get_ml_model():
    global _ml_model
    if _ml_model is not None:
        return _ml_model
    if USE_MOCK_MODEL:
        log.warning("MOCK MODE — random predictions")
        return None
    model_file = Path(MODEL_PATH)
    if not model_file.exists():
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. Set USE_MOCK_MODEL=true in .env for dev mode."
        )
    import tensorflow as tf
    log.info(f"Loading ML model from {MODEL_PATH} …")
    _ml_model = tf.keras.models.load_model(MODEL_PATH)
    log.info("Model loaded ✓")
    return _ml_model

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)

def predict_disease(image_bytes: bytes):
    model = get_ml_model()
    if model is None:
        idx        = np.random.randint(0, len(CLASS_NAMES))
        confidence = float(np.random.uniform(0.72, 0.98))
        raw_class  = CLASS_NAMES[idx]
        crop, disease, healthy = parse_class_name(raw_class)
        log.info(f"[MOCK] {raw_class} ({confidence:.1%})")
        return raw_class, confidence, crop, disease, healthy
    arr         = preprocess_image(image_bytes)
    preds       = model.predict(arr, verbose=0)
    idx         = int(np.argmax(preds[0]))
    confidence  = float(np.max(preds[0]))
    raw_class   = CLASS_NAMES[idx]
    crop, disease, healthy = parse_class_name(raw_class)
    log.info(f"Predicted: {raw_class} ({confidence:.1%})")
    return raw_class, confidence, crop, disease, healthy

# ─── Gemini prompts ───────────────────────────────────────────────────────────

def build_detailed_prompt(disease: str, confidence: float, crop: str,
                           region: str, season: str, language: str) -> str:
    lang_name = {"en": "English", "hi": "Hindi", "ml": "Malayalam"}.get(language, "English")

    return f"""You are Dr. Krishi, an expert plant pathologist and agricultural advisor for Indian farmers.

A farmer's crop photo was analyzed by an AI model:
- Crop: {crop}
- Disease Detected: {disease}
- Model Confidence: {confidence:.0%}
- Farmer's Region: {region}
- Current Season: {season}
- Response Language: {lang_name}

Generate a COMPLETE clinical advisory report. You MUST include ALL sections below with EXACTLY these labels on their own line (even in non-English responses, keep the label in English):

DISEASE_SUMMARY:
[Write 2-3 sentences explaining what this disease is, how it spreads, and why it is dangerous for {crop}. Simple words only — imagine explaining to a farmer who has never heard of it.]

SEVERITY:
[Write ONLY one word: Low OR Moderate OR Severe]

VISIBLE_SYMPTOMS:
- [Symptom 1: specific visual sign the farmer can look for]
- [Symptom 2: another visible sign]
- [Symptom 3: third sign]

IMMEDIATE_ACTION_48H:
- [Specific action to do TODAY — be very precise]
- [Second action within 48 hours]
- [Third action if applicable]

CHEMICAL_TREATMENT:
[Name the specific fungicide/pesticide/bactericide with generic chemical name (NOT brand name). Include dosage: how many grams or ml per litre of water. Include how many times to spray and at what interval.]

ORGANIC_ALTERNATIVE:
[One organic/home remedy that works — neem oil, copper spray, etc. with specific preparation method.]

PREVENTION_NEXT_SEASON:
- [Prevention tip 1 for next planting season]
- [Prevention tip 2]

CALL_OFFICER_IF:
[Specific threshold: e.g. "If more than 30% of leaves show symptoms" or "If disease spreads to stem within 3 days" — be precise.]

FARMER_TIP:
[One encouraging, practical tip in very simple conversational language. This should feel warm and personal.]

RULES:
- Write ALL content in {lang_name}
- Keep the section LABELS (DISEASE_SUMMARY:, SEVERITY:, etc.) in English — do not translate them
- NO markdown formatting, NO asterisks, NO bold, NO headers with #
- Each bullet point starts with a hyphen (-)
- Be specific with amounts, timings, and percentages
- Tone: expert but warm, like a trusted village doctor"""


def build_short_prompt(disease: str, confidence: float, crop: str,
                        region: str, season: str, language: str) -> str:
    lang_name = {"en": "English", "hi": "Hindi", "ml": "Malayalam"}.get(language, "English")
    return f"""You are a helpful farm advisor. Write a SHORT WhatsApp message for a farmer.

Disease: {disease} on {crop}
Confidence: {confidence:.0%}
Region: {region}

Rules:
- MAXIMUM 3 sentences total
- First sentence: what the farmer should do TODAY (one specific action)
- Second sentence: what product to use (generic name, not brand)
- Third sentence: one prevention tip
- Write in {lang_name} only
- Conversational tone, like texting a friend
- NO greetings, NO "Hello", start directly with the advice"""


def build_chat_prompt(question: str, state: str, weather_summary: str,
                       active_crops: str, language: str) -> str:
    lang_name = {"en": "English", "hi": "Hindi", "ml": "Malayalam"}.get(language, "English")
    return (
        "You are Krishi Mitra, an expert AI agricultural advisor for Indian farmers.\n\n"
        "Context about this farmer:\n"
        f"- Location: {state}, India\n"
        f"- Current weather: {weather_summary or 'not provided'}\n"
        f"- Crops mentioned: {active_crops or 'not specified'}\n\n"
        "Your response rules:\n"
        "1. Always give practical, actionable advice specific to Indian farming conditions\n"
        "2. Mention specific fertilizer/pesticide names with exact quantities when relevant\n"
        "3. Reference Indian seasons: Kharif (June-Oct), Rabi (Oct-Mar), Zaid (Mar-Jun)\n"
        "4. For disease/pest queries, suggest both chemical AND organic options\n"
        "5. If the question is about a government scheme, mention the scheme name and application link\n"
        "6. Keep responses under 150 words — clear and simple for farmers\n"
        f"7. Language: {lang_name}\n\n"
        "IMPORTANT: If you are not sure, say 'Please consult your local KVK (Krishi Vigyan Kendra)' rather than guessing.\n\n"
        f"Farmer question: {question}"
    )


def get_gemini_advisory(disease: str, confidence: float, crop: str,
                         region: str, season: str, language: str, mode: str) -> str:
    if not GEMINI_API_KEY:
        log.warning("No GEMINI_API_KEY — using fallback advisory")
        return _fallback_advisory(disease, crop, mode)

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = (build_short_prompt if mode == "short" else build_detailed_prompt)(
        disease, confidence, crop, region, season, language
    )

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,
                max_output_tokens=1200,
            ),
        )
        return response.text.strip()
    except Exception as e:
        log.error(f"Gemini error: {e}")
        return _fallback_advisory(disease, crop, mode)


def _fallback_advisory(disease: str, crop: str, mode: str) -> str:
    if mode == "short":
        return (
            f"Your {crop} has {disease} — isolate affected plants immediately and avoid overhead watering. "
            f"Apply copper-based fungicide (2g per litre of water) as a first measure. "
            f"Next season, use certified disease-resistant seeds to prevent recurrence."
        )
    return f"""DISEASE_SUMMARY:
{disease} is a plant infection detected on your {crop} crop. It can spread rapidly under humid conditions and cause significant yield loss if not treated early.

SEVERITY:
Moderate

VISIBLE_SYMPTOMS:
- Discolored or spotted areas on leaves
- Wilting or yellowing of affected plant parts
- Unusual growth patterns or lesions

IMMEDIATE_ACTION_48H:
- Remove and destroy all visibly infected leaves and plant parts
- Avoid watering from above — water only at the base of the plant
- Isolate severely affected plants from healthy ones

CHEMICAL_TREATMENT:
Apply Mancozeb 75% WP at 2.5 grams per litre of water. Spray every 7 days for 3 consecutive weeks. Spray in the morning or evening, not in direct afternoon sun.

ORGANIC_ALTERNATIVE:
Mix 10ml neem oil with 1 litre of water and a few drops of liquid soap. Spray on all leaf surfaces every 5-7 days.

PREVENTION_NEXT_SEASON:
- Use certified disease-free or disease-resistant seeds for next planting
- Maintain proper spacing between plants for air circulation

CALL_OFFICER_IF:
If more than 30% of your plants show symptoms, or if the disease spreads to the stem or fruits within 3 days of treatment.

FARMER_TIP:
Act quickly — early treatment saves your crop. Even treating half the field today is better than waiting."""


def extract_severity(advisory: str) -> str:
    for line in advisory.splitlines():
        if line.strip().upper().startswith("SEVERITY:"):
            val = line.split(":", 1)[1].strip().lower()
            if "severe" in val or "high" in val or "critical" in val:
                return "high"
            if "moderate" in val or "medium" in val:
                return "medium"
            return "low"
    text = advisory.lower()
    if any(w in text for w in ["severe", "critical", "dangerous", "advanced"]):
        return "high"
    if any(w in text for w in ["moderate", "medium", "significant"]):
        return "medium"
    return "low"

# ─── Schemas ──────────────────────────────────────────────────────────────────
class AdvisoryRequest(BaseModel):
    disease_name: str
    confidence:   float
    crop:         str
    region:       str = "India"
    season:       str = "Kharif"
    language:     str = "en"
    mode:         str = "detailed"

class ChatRequest(BaseModel):
    question:       str
    language:       str = "en"
    state:          str = "India"
    weather_summary: str = ""
    active_crops:   str = ""

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "mock_mode": USE_MOCK_MODEL,
        "model_path": MODEL_PATH,
        "services": {
            "gemini":    bool(GEMINI_API_KEY),
            "weather":   bool(WEATHER_API_KEY),
            "agmarknet": bool(AGMARKNET_KEY),
        }
    }

@app.get("/classes")
def get_classes():
    return {
        "count": len(CLASS_NAMES),
        "classes": [
            {"id": i, "raw": c, "crop": parse_class_name(c)[0],
             "disease": parse_class_name(c)[1], "healthy": parse_class_name(c)[2]}
            for i, c in enumerate(CLASS_NAMES)
        ],
    }

@app.post("/analyze")
async def analyze_image(
    file:     UploadFile = File(...),
    region:   str = Form("India"),
    season:   str = Form("Kharif"),
    language: str = Form("en"),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image (JPEG or PNG).")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image too large. Max 10 MB.")

    try:
        raw_class, confidence, crop, disease, is_healthy = predict_disease(image_bytes)
    except FileNotFoundError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        log.exception("Prediction failed")
        raise HTTPException(500, f"Prediction error: {e}")

    if confidence < 0.55:
        return {
            "raw_class": "Unrecognised", "disease": "Unrecognised", "crop": "Unknown",
            "confidence": round(confidence * 100, 1), "is_healthy": False, "severity": "low",
            "advisory_short": "Image not clear enough. Please upload a clear, well-lit photo of the affected leaf.",
            "advisory_detail": "DISEASE_SUMMARY:\nThe AI could not confidently identify a disease from this image.\n\nSEVERITY:\nLow\n\nIMMEDIATE_ACTION_48H:\n- Take a new photo in good daylight\n- Ensure the diseased leaf fills the frame\n- Avoid shadows or blurry shots\n\nCALL_OFFICER_IF:\nIf the plant is visibly dying, contact your agricultural officer immediately.",
        }

    advisory_short  = get_gemini_advisory(disease, confidence, crop, region, season, language, "short")
    advisory_detail = get_gemini_advisory(disease, confidence, crop, region, season, language, "detailed")
    severity = "low" if is_healthy else extract_severity(advisory_detail)

    return {
        "raw_class":       raw_class,
        "disease":         disease,
        "crop":            crop,
        "confidence":      round(confidence * 100, 1),
        "is_healthy":      is_healthy,
        "severity":        severity,
        "advisory_short":  advisory_short,
        "advisory_detail": advisory_detail,
    }

@app.post("/advisory")
def get_advisory(req: AdvisoryRequest):
    advisory = get_gemini_advisory(
        req.disease_name, req.confidence, req.crop,
        req.region, req.season, req.language, req.mode,
    )
    return {
        "disease":  req.disease_name,
        "crop":     req.crop,
        "language": req.language,
        "mode":     req.mode,
        "advisory": advisory,
        "severity": extract_severity(advisory),
    }

# ─── NEW: Secure Gemini Chat Proxy ────────────────────────────────────────────
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Secure chat endpoint — Gemini API key never leaves the server.
    Frontend sends questions, backend adds context and calls Gemini.
    """
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty.")

    if not GEMINI_API_KEY:
        raise HTTPException(503, "AI service not configured. Please set GEMINI_API_KEY.")

    prompt = build_chat_prompt(
        req.question,
        req.state,
        req.weather_summary,
        req.active_crops,
        req.language,
    )

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    try:
        response = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None,
                lambda: model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.4,
                        max_output_tokens=400,
                    ),
                )
            ),
            timeout=10.0
        )
        return {
            "response":  response.text.strip(),
            "timestamp": __import__("datetime").datetime.now().isoformat(),
        }
    except asyncio.TimeoutError:
        log.error("Gemini chat timed out")
        raise HTTPException(504, "AI response timed out. Please try again.")
    except Exception as e:
        log.error(f"Gemini chat error: {e}")
        raise HTTPException(500, f"AI service error: {str(e)}")


# ─── NEW: Weather Proxy (lat/lon or city) ─────────────────────────────────────
@app.get("/api/weather")
async def weather_endpoint(
    lat:  Optional[float] = Query(None),
    lon:  Optional[float] = Query(None),
    city: Optional[str]   = Query(None),
):
    """
    Proxy OpenWeatherMap — keeps WEATHER_API_KEY server-side.
    Accepts lat/lon (preferred) or city name.
    5-minute cache to avoid rate limits.
    """
    if not WEATHER_API_KEY:
        raise HTTPException(503, "Weather service not configured. Set WEATHER_API_KEY in backend .env.")

    if lat is not None and lon is not None:
        cache_key  = f"weather_ll_{lat:.2f}_{lon:.2f}"
        query_part = f"lat={lat}&lon={lon}"
    elif city:
        cache_key  = f"weather_city_{city.lower().strip()}"
        query_part = f"q={city}"
    else:
        raise HTTPException(400, "Provide lat+lon or city parameter.")

    cached = cache_get(cache_key, ttl=300)
    if cached:
        log.info(f"Weather cache hit: {cache_key}")
        return cached

    base = "https://api.openweathermap.org/data/2.5"
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            cur_resp  = await client.get(f"{base}/weather?{query_part}&appid={WEATHER_API_KEY}&units=metric")
            fore_resp = await client.get(f"{base}/forecast?{query_part}&appid={WEATHER_API_KEY}&units=metric")
        except httpx.TimeoutException:
            raise HTTPException(504, "Weather API timed out.")

    if cur_resp.status_code != 200:
        err = cur_resp.json().get("message", "Weather data unavailable")
        raise HTTPException(cur_resp.status_code, err)

    cur  = cur_resp.json()
    fore = fore_resp.json() if fore_resp.status_code == 200 else {"list": []}

    # Hourly (next 6 slots = 18h)
    hourly = []
    for item in fore["list"][:6]:
        d = __import__("datetime").datetime.fromtimestamp(item["dt"])
        hourly.append({
            "time":      d.strftime("%H:%M"),
            "temp":      round(item["main"]["temp"]),
            "condition": item["weather"][0]["main"],
            "rain":      round((item.get("pop") or 0) * 100),
            "icon":      item["weather"][0]["icon"],
        })

    # 5-day daily (skip today)
    seen, daily = set(), []
    today = __import__("datetime").date.today().isoformat()
    for item in fore["list"]:
        d = __import__("datetime").datetime.fromtimestamp(item["dt"])
        dk = d.date().isoformat()
        if dk == today or dk in seen or len(daily) >= 5:
            continue
        seen.add(dk)
        day_items = [x for x in fore["list"]
                     if __import__("datetime").datetime.fromtimestamp(x["dt"]).date().isoformat() == dk]
        temps = [x["main"]["temp"] for x in day_items]
        mid   = day_items[len(day_items)//2]
        daily.append({
            "day":       d.strftime("%A") if len(daily) > 0 else "Tomorrow",
            "condition": mid["weather"][0]["main"],
            "high":      round(max(temps)),
            "low":       round(min(temps)),
            "icon":      mid["weather"][0]["icon"],
        })

    result = {
        "location":      cur["name"],
        "country":       cur.get("sys", {}).get("country", "IN"),
        "temperature":   round(cur["main"]["temp"]),
        "feels_like":    round(cur["main"]["feels_like"]),
        "condition":     cur["weather"][0]["main"],
        "description":   cur["weather"][0]["description"],
        "humidity":      cur["main"]["humidity"],
        "windSpeed":     round(cur["wind"]["speed"] * 3.6),
        "pressure":      cur["main"]["pressure"],
        "visibility":    round(cur.get("visibility", 0) / 1000, 1),
        "icon":          cur["weather"][0]["icon"],
        "lat":           cur["coord"]["lat"],
        "lon":           cur["coord"]["lon"],
        "hourlyForecast":  hourly,
        "weeklyForecast":  daily,
        "lastUpdated":   __import__("datetime").datetime.now().isoformat(),
    }

    cache_set(cache_key, result)
    log.info(f"Weather fetched for {result['location']}")
    return result


# ─── NEW: Mandi (Agmarknet) Proxy ─────────────────────────────────────────────
# District → approximate coordinates for common cities
CITY_COORDS: dict[str, tuple[float, float]] = {
    "Thiruvananthapuram": (8.5241, 76.9366),
    "Kochi": (9.9312, 76.2673),
    "Kozhikode": (11.2588, 75.7804),
    "Mumbai": (19.0760, 72.8777),
    "Pune": (18.5204, 73.8567),
    "Delhi": (28.6139, 77.2090),
    "Bengaluru": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Hyderabad": (17.3850, 78.4867),
    "Kolkata": (22.5726, 88.3639),
    "Ahmedabad": (23.0225, 72.5714),
    "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462),
    "Patna": (25.5941, 85.1376),
    "Bhopal": (23.2599, 77.4126),
    "Chandigarh": (30.7333, 76.7794),
    "Guwahati": (26.1445, 91.7362),
    "Ranchi": (23.3441, 85.3096),
    "Bhubaneswar": (20.2961, 85.8245),
    "Raipur": (21.2514, 81.6296),
    "Amritsar": (31.6340, 74.8723),
    "Ludhiana": (30.9010, 75.8573),
    "Nagpur": (21.1458, 79.0882),
    "Visakhapatnam": (17.6868, 83.2185),
    "Coimbatore": (11.0168, 76.9558),
    "Madurai": (9.9252, 78.1198),
    "Surat": (21.1702, 72.8311),
    "Vadodara": (22.3072, 73.1812),
    "Shimla": (31.1048, 77.1734),
    "Dehradun": (30.3165, 78.0322),
}

@app.get("/api/mandi")
async def mandi_endpoint(
    state:     str = Query("Maharashtra"),
    commodity: str = Query("Tomato"),
    limit:     int = Query(20, ge=1, le=100),
):
    """
    Proxy Agmarknet (data.gov.in) — keeps API key server-side.
    Falls back to state-specific mock data if key not set or API fails.
    Returns clean format with trend calculation.
    """
    cache_key = f"mandi_{state.lower()}_{commodity.lower()}"
    cached = cache_get(cache_key, ttl=300)
    if cached:
        log.info(f"Mandi cache hit: {cache_key}")
        return cached

    AGMARKNET_BASE = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

    if AGMARKNET_KEY:
        url = (
            f"{AGMARKNET_BASE}?api-key={AGMARKNET_KEY}&format=json&limit={limit}"
            f"&filters[State]={state}&filters[Commodity]={commodity}"
        )
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(url)
            data = res.json()

            if res.status_code == 200 and data.get("records"):
                def calc_trend(records):
                    """Simple trend from first two records by date."""
                    if len(records) < 2:
                        return "stable"
                    try:
                        p1 = float(records[0].get("Modal_Price", 0))
                        p2 = float(records[1].get("Modal_Price", 0))
                        if p1 > p2 * 1.02:
                            return "up"
                        if p1 < p2 * 0.98:
                            return "down"
                    except Exception:
                        pass
                    return "stable"

                records = data["records"]
                trend   = calc_trend(records)
                cleaned = []
                for r in records:
                    cleaned.append({
                        "mandi":      r.get("Market", "—"),
                        "district":   r.get("District", state),
                        "commodity":  r.get("Commodity", commodity),
                        "variety":    r.get("Variety", "Common"),
                        "minPrice":   r.get("Min_Price"),
                        "maxPrice":   r.get("Max_Price"),
                        "modalPrice": r.get("Modal_Price"),
                        "price":      r.get("Modal_Price"),   # convenience alias
                        "trend":      trend,
                        "date":       r.get("Arrival_Date"),
                        "state":      r.get("State", state),
                    })

                result = {
                    "data":        cleaned,
                    "source":      "Agmarknet / data.gov.in",
                    "lastUpdated": __import__("datetime").datetime.now().isoformat(),
                    "count":       len(cleaned),
                }
                cache_set(cache_key, result)
                return result

        except Exception as e:
            log.error(f"Agmarknet fetch error: {e}")

    # ── Fallback mock ──
    log.warning(f"Using mock mandi data for {state}/{commodity}")
    state_prices = {
        "Maharashtra": {"Tomato": [800,1200], "Onion": [500,900], "Wheat": [2100,2400], "Potato": [1100,1500]},
        "Punjab":      {"Wheat": [2100,2500], "Rice": [1800,2200], "Maize": [1700,2000], "Potato": [1000,1400]},
        "Uttar Pradesh": {"Potato": [1200,1600], "Wheat": [2000,2300], "Sugarcane": [350,420], "Onion": [600,1000]},
        "Karnataka":   {"Tomato": [900,1400], "Onion": [600,1000], "Groundnut": [5000,6500], "Coconut": [1400,1900]},
        "Kerala":      {"Coconut": [1500,2000], "Banana": [2000,3500], "Rice": [2800,3500], "Tomato": [1200,1800]},
        "West Bengal": {"Rice": [2200,2800], "Potato": [900,1300], "Banana": [1800,2800], "Tomato": [700,1100]},
        "Tamil Nadu":  {"Rice": [2500,3200], "Tomato": [800,1400], "Onion": [500,900], "Banana": [1500,2500]},
        "Gujarat":     {"Groundnut": [4800,6000], "Cotton": [5500,6800], "Wheat": [2000,2400], "Tomato": [700,1200]},
        "Rajasthan":   {"Wheat": [2000,2400], "Onion": [400,800], "Tomato": [600,1100], "Maize": [1600,1900]},
        "Madhya Pradesh": {"Soyabean": [3800,4600], "Wheat": [1900,2300], "Maize": [1600,2000], "Tomato": [600,1100]},
    }
    prices = state_prices.get(state, {}).get(commodity, [1000, 2000])
    mid    = (prices[0] + prices[1]) // 2

    mock_result = {
        "data": [{
            "mandi":      f"{state} Main Mandi",
            "district":   state,
            "commodity":  commodity,
            "variety":    "Local",
            "minPrice":   prices[0],
            "maxPrice":   prices[1],
            "modalPrice": mid,
            "price":      mid,
            "trend":      "stable",
            "date":       __import__("datetime").date.today().isoformat(),
            "state":      state,
        }],
        "source":      "Estimated (Agmarknet key not configured)",
        "lastUpdated": __import__("datetime").datetime.now().isoformat(),
        "count":       1,
    }
    cache_set(cache_key, mock_result)
    return mock_result
