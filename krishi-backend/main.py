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
from collections import deque

import httpx
import numpy as np
from PIL import Image
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── NEW SDK: google-genai (replaces deprecated google-generativeai) ──────────
try:
    from google import genai
    from google.genai import types as genai_types
    _GENAI_NEW_SDK = True
except ImportError:
    # graceful fallback — warn loudly
    _GENAI_NEW_SDK = False
    logging.warning("google-genai not installed. AI features disabled. Run: pip install google-genai")

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

# ─── Model chain (fallback order when primary is overloaded) ─────────────────
# gemini-2.0-flash is quota-exhausted on this project — excluded from chain
PRIMARY_MODEL    = "gemini-2.5-flash"
FALLBACK_MODEL   = "gemini-2.5-flash-lite"
FALLBACK_MODEL_2 = "gemini-flash-latest"

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("krishi")

app = FastAPI(title="Krishi Mitra API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # dev — lock to ALLOWED_ORIGINS in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Rate Limiter (global, in-memory) ─────────────────────────────────────────
# Protects the free-tier Gemini quota (20 RPD / ~2 RPM on free tier)
_rate_window   = deque()          # timestamps of recent AI calls
RATE_LIMIT_RPM = 12               # max requests per minute (conservative)
RATE_LIMIT_RPD = 18               # max requests per day (leave 2 buffer)
_daily_count   = 0
_daily_reset   = time.time()

def _check_rate_limit() -> tuple[bool, str]:
    """Returns (allowed: bool, reason: str)."""
    global _daily_count, _daily_reset
    now = time.time()

    # Reset daily counter every 24h
    if now - _daily_reset > 86400:
        _daily_count = 0
        _daily_reset = now

    if _daily_count >= RATE_LIMIT_RPD:
        log.warning(f"Daily AI quota reached ({_daily_count}/{RATE_LIMIT_RPD})")
        return False, "daily_quota"

    # Sliding-window RPM check (keep only last 60 seconds)
    while _rate_window and now - _rate_window[0] > 60:
        _rate_window.popleft()

    if len(_rate_window) >= RATE_LIMIT_RPM:
        log.warning(f"Minute rate limit hit ({len(_rate_window)}/{RATE_LIMIT_RPM})")
        return False, "minute_quota"

    return True, "ok"

def _record_ai_call():
    global _daily_count
    _rate_window.append(time.time())
    _daily_count += 1
    log.info(f"AI call recorded — daily: {_daily_count}/{RATE_LIMIT_RPD}, rpm: {len(_rate_window)}/{RATE_LIMIT_RPM}")

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

def _estimate_severity_from_confidence(confidence: float) -> str:
    """Pre-estimate severity from model confidence for use in Gemini prompt."""
    if confidence >= 0.85: return "Severe"
    if confidence >= 0.60: return "Moderate"
    return "Low"


def build_detailed_prompt(disease: str, confidence: float, crop: str,
                           region: str, season: str, language: str,
                           severity: str = "Moderate", land_acres: float = 2.0) -> str:
    lang_name = {"en": "English", "hi": "Hindi", "ml": "Malayalam"}.get(language, "English")

    return f"""You are an expert agricultural advisor for Indian farmers. Respond ONLY in the exact format below. Do not add any extra text, markdown, or explanation outside these keys.

A farmer's crop photo was analyzed by an AI model:
- Crop: {crop}
- Disease Detected: {disease}
- Model Confidence: {confidence:.0%}
- Farmer's Region: {region}
- Current Season: {season}
- Land Size: {land_acres} acres

DISEASE_SUMMARY: [2-3 sentences explaining what this disease is, how it spreads, in simple language]
SEVERITY: [{severity}]
VISIBLE_SYMPTOMS:
- [symptom 1]
- [symptom 2]
- [symptom 3]
IMMEDIATE_ACTION_48H:
- [specific action 1]
- [specific action 2]
- [specific action 3]
CHEMICAL_TREATMENT: [specific chemical name, dosage, application method. Mention cheapest generic option, not branded]
ORGANIC_ALTERNATIVE: [organic/home remedy option that is low cost]
PREVENTION_NEXT_SEASON:
- [prevention tip 1]
- [prevention tip 2]
ECONOMIC_IMPACT: [Estimate rupee loss if untreated for {land_acres} acres. Format: "Potential loss: ₹X,XXX - ₹X,XXX if not treated within 48 hours"]
CALL_OFFICER_IF: [specific condition when farmer should escalate to expert]
FARMER_TIP: [one practical memorable tip in simple Hindi-friendly language]

Disease: {disease}
Crop: {crop}
Severity: {severity}
Land size: {land_acres} acres
Respond in: {"Hindi" if language == "hi" else "Malayalam" if language == "ml" else "English"}

FORMATTING RULES:
- Keep ALL section LABELS in English — do not translate them
- NO markdown, NO asterisks, NO bold, NO headers with #
- Each bullet point starts with a hyphen (-)
- Be specific with amounts, timings, and percentages
- Tone: expert but warm, like a trusted village doctor"""


def build_short_prompt(disease: str, confidence: float, crop: str,
                        region: str, season: str, language: str) -> str:
    lang_name = {"en": "English", "hi": "Hindi", "ml": "Malayalam",
                 "bn": "Bengali", "te": "Telugu", "mr": "Marathi"}.get(language, "Hindi")
    return f"""You are a helpful farm advisor. Write a SHORT WhatsApp message for a farmer.
STRICT: Only agriculture topics. Do NOT hallucinate or guess location.

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
    lang_name = {
        "en": "English", "hi": "Hindi", "ml": "Malayalam",
        "bn": "Bengali", "te": "Telugu", "mr": "Marathi",
    }.get(language, "Hindi")

    system_prompt = f"""You are Krishi Mitra, an expert AI farming assistant for Indian farmers.

LANGUAGE RULE: You MUST respond ONLY in {lang_name}. Never switch languages mid-response.

YOUR EXPERTISE:
- Crop diseases: diagnosis, treatment, prevention
- Fertilizers: which to use, dosage, timing
- Weather: how to act on weather changes
- Market prices: when to sell, which mandi
- Government schemes: PM-KISAN, Fasal Bima, state schemes
- Soil health: NPK, pH, improvement methods
- Irrigation: scheduling, water conservation

RESPONSE RULES:
1. Keep responses SHORT — 3-5 sentences max for simple questions
2. Always give ACTIONABLE advice, not just information
3. Always mention RUPEE COST impact where relevant ("Isse aapko ₹500-1000 ka faida hoga")
4. For disease questions, always ask: "Kya aap photo upload kar sakte hain for exact diagnosis?"
5. Never recommend expensive branded products — always mention generic/cheaper alternatives
6. If question is unclear, ask ONE clarifying question only

PERSONALITY: You are like a trusted friend who happens to be an agriculture expert. Warm, simple language, no jargon.

### CONTEXT
- Farmer location: {state}, India
- Current weather: {weather_summary or 'not provided'}
- Crops mentioned: {active_crops or 'not specified'}

### STRICT RULES
- ONLY answer about: Crops, Plant diseases, Fertilizers, Pesticides, Weather impact on crops, Market prices, Government agricultural schemes
- DO NOT hallucinate or invent details
- DO NOT say things like "Nice to connect from [random place]"
- If unsure: say "I'm not fully certain. Please consult your local KVK or agriculture officer."

Farmer's question: {question}"""

    return system_prompt


# ─── Gemini AI helper (new SDK) ───────────────────────────────────────────────

def _is_quota_error(e: Exception) -> bool:
    """Detect 429 / quota exceeded errors only — NOT 503 service unavailable."""
    msg = str(e).lower()
    return "429" in msg or "quota" in msg or "resource_exhausted" in msg

def _call_model(client, model_name: str, prompt: str, max_tokens: int) -> str:
    """Single model call — raises on error."""
    log.info(f"Gemini call — model: {model_name}")
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=max_tokens,
        ),
    )
    return response.text.strip()


def _call_gemini_sync(prompt: str, max_tokens: int = 1200) -> Optional[str]:
    """
    Call Gemini using new google-genai SDK.
    Model chain: gemini-2.5-flash → gemini-2.5-flash-lite → gemini-flash-latest → static fallback.
    Retries once on transient errors. Skips retry on 429 (quota).
    Returns None only if ALL models are quota-exhausted.
    """
    if not _GENAI_NEW_SDK:
        raise RuntimeError("google-genai SDK not installed")
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")

    allowed, reason = _check_rate_limit()
    if not allowed:
        log.warning(f"Internal rate limit ({reason}) — skipping AI call")
        return None

    client = genai.Client(api_key=GEMINI_API_KEY)
    models_to_try = [PRIMARY_MODEL, FALLBACK_MODEL, FALLBACK_MODEL_2]

    for model_name in models_to_try:
        for attempt in range(2):  # retry once per model on transient errors
            try:
                result = _call_model(client, model_name, prompt, max_tokens)
                _record_ai_call()
                log.info(f"Gemini success — model: {model_name}")
                return result

            except Exception as e:
                log.error(f"Gemini error [{model_name}] attempt {attempt + 1}: {type(e).__name__}: {e}")

                if _is_quota_error(e):
                    log.warning(f"Quota/429 on {model_name} — trying next model in chain")
                    break  # move to next model, don't retry same model on 429

                if attempt == 0:
                    log.info(f"Transient error on {model_name} — retrying in 2s")
                    time.sleep(2.0)
                else:
                    log.warning(f"Transient error on {model_name} persisted after retry — trying next model")
                    break

    log.error("All models in chain exhausted or quota-exceeded — returning None for static fallback")
    return None


async def _call_gemini_async(prompt: str, max_tokens: int = 800) -> Optional[str]:
    """Async wrapper for chat endpoint — runs sync call in thread pool."""
    loop = asyncio.get_event_loop()
    return await asyncio.wait_for(
        loop.run_in_executor(None, lambda: _call_gemini_sync(prompt, max_tokens)),
        timeout=30.0
    )


def get_gemini_advisory(disease: str, confidence: float, crop: str,
                         region: str, season: str, language: str, mode: str,
                         severity: str = "Moderate", land_acres: float = 2.0) -> str:
    """
    Get advisory from Gemini with proper fallback.
    ALWAYS returns a non-empty string — never fails visibly to the user.
    """
    if not GEMINI_API_KEY or not _GENAI_NEW_SDK:
        log.warning("AI unavailable — using static fallback advisory")
        return _fallback_advisory(disease, crop, mode)

    if mode == "short":
        prompt = build_short_prompt(disease, confidence, crop, region, season, language)
    else:
        prompt = build_detailed_prompt(disease, confidence, crop, region, season, language,
                                       severity=severity, land_acres=land_acres)

    try:
        result = _call_gemini_sync(prompt, max_tokens=1200 if mode == "detailed" else 300)
        if result is None:
            log.info("Gemini returned None (quota/rate limit) — using structured fallback")
            return _fallback_advisory(disease, crop, mode)
        if mode == "detailed":
            return _normalize_detailed_advisory(
                result,
                disease=disease,
                crop=crop,
                severity=severity,
                land_acres=land_acres,
            )
        return result
    except Exception as e:
        log.error(f"Advisory generation failed: {e}")
        return _fallback_advisory(disease, crop, mode)


def _fallback_advisory(disease: str, crop: str, mode: str) -> str:
    """
    Structured fallback advisory — disease-specific where possible.
    NEVER returns an empty string.
    """
    # Disease-specific fallbacks for common diseases
    disease_lower = disease.lower()

    disease_tips = {
        "early blight": {
            "summary": f"Early Blight is a fungal disease caused by Alternaria solani that creates dark brown spots with yellow rings on {crop} leaves. It spreads through infected soil, water splash, and wind. It can cause up to 50% yield loss if not treated early.",
            "chemical": "Apply Mancozeb 75% WP at 2.5 grams per litre of water. Spray every 7 days for 3 consecutive weeks.",
            "organic": "Mix 10ml neem oil with 1 litre water and a few drops of soap. Spray every 5 days on all leaf surfaces.",
        },
        "late blight": {
            "summary": f"Late Blight is caused by Phytophthora infestans — a highly destructive water mold that can destroy a {crop} field within days. It spreads rapidly in cool, wet conditions.",
            "chemical": "Apply Cymoxanil + Mancozeb (72% WP) at 3 grams per litre. Spray every 5-7 days. Start at first sign of infection.",
            "organic": "Spray copper sulphate solution (3 grams per litre water) every 5 days. Remove and burn all infected leaves immediately.",
        },
        "bacterial spot": {
            "summary": f"Bacterial Spot is caused by Xanthomonas bacteria and creates water-soaked spots on {crop} leaves and fruits. It spreads through rain splash, contaminated tools, and infected seeds.",
            "chemical": "Spray copper hydroxide (Kocide) at 3 grams per litre every 7 days. Do not spray in hot afternoon sun.",
            "organic": "Apply neem leaf extract solution or copper soap spray every week. Remove infected plant debris from the field.",
        },
        "powdery mildew": {
            "summary": f"Powdery Mildew is a fungal disease that forms a white powdery coating on {crop} leaves, stems, and flowers. It thrives in dry, warm conditions with high humidity.",
            "chemical": "Apply Sulphur 80% WP at 2-3 grams per litre of water. Spray every 10 days. Or use Hexaconazole 5% EC at 1ml per litre.",
            "organic": "Mix 1 tablespoon baking soda + few drops liquid soap in 1 litre water. Spray on affected areas every 5-7 days.",
        },
        "leaf scorch": {
            "summary": f"Leaf Scorch causes brown, dry edges on {crop} leaves, often due to fungal infection, heat stress, or drought. It can weaken the plant and reduce fruit quality significantly.",
            "chemical": "Apply Carbendazim 50% WP at 1 gram per litre if fungal. Spray twice at 10-day intervals.",
            "organic": "Spray neem oil (5ml per litre) to reduce fungal spread. Ensure adequate and regular watering at the plant base.",
        },
        "mosaic virus": {
            "summary": f"Mosaic Virus is a viral disease spread by aphids and whiteflies that causes mottled yellow-green patterns on {crop} leaves. There is no chemical cure — only prevention and control.",
            "chemical": "Spray Imidacloprid 17.8% SL at 0.5ml per litre to control vector insects (aphids/whiteflies) that spread the virus.",
            "organic": "Spray diluted neem oil (10ml per litre) to repel virus-carrying insects. Remove and destroy all infected plants to stop spread.",
        },
    }

    # Match disease to specific tips
    specific = None
    for key, tips in disease_tips.items():
        if key in disease_lower:
            specific = tips
            break

    # Generic fallback if no specific match
    if not specific:
        specific = {
            "summary": f"{disease} is a plant infection detected on your {crop} crop. It can spread rapidly under humid or warm conditions and cause significant yield loss if not treated early.",
            "chemical": "Apply Mancozeb 75% WP at 2.5 grams per litre of water. Spray every 7 days for 3 consecutive weeks. Spray in the morning or evening.",
            "organic": "Mix 10ml neem oil with 1 litre of water and a few drops of liquid soap. Spray on all leaf surfaces every 5-7 days.",
        }

    if mode == "short":
        return (
            f"Your {crop} has {disease} — remove infected leaves and avoid overhead watering immediately. "
            f"{specific['chemical'].split('.')[0]}. "
            f"Next season, use certified disease-resistant seeds to prevent recurrence."
        )

    return f"""DISEASE_SUMMARY:
{specific['summary']}

SEVERITY:
Moderate

VISIBLE_SYMPTOMS:
- Discolored, spotted, or unusual areas on leaves or stems
- Wilting or yellowing of affected plant parts
- Unusual growth patterns, lesions, or coating on leaves

IMMEDIATE_ACTION_48H:
- Remove and destroy all visibly infected leaves and plant parts immediately
- Avoid watering from above — water only at the base of the plant
- Isolate severely affected plants from healthy ones to prevent spread

CHEMICAL_TREATMENT:
{specific['chemical']}

ORGANIC_ALTERNATIVE:
{specific['organic']}

PREVENTION_NEXT_SEASON:
- Use certified disease-free or disease-resistant seeds for next planting
- Maintain proper spacing between plants for air circulation and sunlight

ECONOMIC_IMPACT:
Potential loss: ₹3,000 - ₹8,000 if not treated within 48 hours

CALL_OFFICER_IF:
If more than 30% of your plants show symptoms, or if the disease spreads to the stem or fruits within 3 days of treatment.

FARMER_TIP:
Act quickly — early treatment saves your crop. Even treating half the field today is better than waiting for tomorrow. You can do this!"""


def _parse_advisory_section(advisory: str, key: str) -> str:
    """Extract a section value from structured advisory (supports multiline values)."""
    sections = _extract_advisory_sections(advisory)
    return sections.get(key, "")


def _extract_advisory_sections(text: str) -> dict[str, str]:
    """Parse advisory text into sections using known keys (markdown-tolerant)."""
    keys = [
        "DISEASE_SUMMARY", "SEVERITY", "VISIBLE_SYMPTOMS",
        "IMMEDIATE_ACTION_48H", "CHEMICAL_TREATMENT", "ORGANIC_ALTERNATIVE",
        "PREVENTION_NEXT_SEASON", "ECONOMIC_IMPACT", "CALL_OFFICER_IF", "FARMER_TIP",
    ]
    sections: dict[str, str] = {}
    current_key: Optional[str] = None
    buffer: list[str] = []

    def flush() -> None:
        if current_key:
            sections[current_key] = "\n".join(buffer).strip()

    for raw in (text or "").splitlines():
        stripped = raw.strip().strip("*")
        matched_key = next((k for k in keys if stripped.upper().startswith(k + ":")), None)
        if matched_key:
            flush()
            current_key = matched_key
            buffer = []
            inline = stripped[len(matched_key) + 1 :].strip().strip("[]")
            if inline:
                buffer.append(inline)
            continue
        if current_key:
            clean = raw.strip().strip("*")
            if clean:
                buffer.append(clean)

    flush()
    return sections


def _normalize_detailed_advisory(advisory: str, disease: str, crop: str,
                                 severity: str = "Moderate", land_acres: float = 2.0) -> str:
    """Ensure detailed advisory always contains all required structured sections."""
    primary = _extract_advisory_sections(advisory)
    fallback = _extract_advisory_sections(_fallback_advisory(disease, crop, "detailed"))

    required = [
        "DISEASE_SUMMARY", "SEVERITY", "VISIBLE_SYMPTOMS", "IMMEDIATE_ACTION_48H",
        "CHEMICAL_TREATMENT", "ORGANIC_ALTERNATIVE", "PREVENTION_NEXT_SEASON",
        "ECONOMIC_IMPACT", "CALL_OFFICER_IF", "FARMER_TIP",
    ]

    merged: dict[str, str] = {}
    for key in required:
        value = (primary.get(key, "") or "").strip()
        if not value:
            value = (fallback.get(key, "") or "").strip()
        merged[key] = value

    if not merged["SEVERITY"]:
        merged["SEVERITY"] = severity

    if not merged["ECONOMIC_IMPACT"]:
        merged["ECONOMIC_IMPACT"] = (
            f"Potential loss: ₹3,000 - ₹8,000 if not treated within 48 hours for {land_acres} acres"
        )

    bullet_keys = {"VISIBLE_SYMPTOMS", "IMMEDIATE_ACTION_48H", "PREVENTION_NEXT_SEASON"}
    lines: list[str] = []

    for key in required:
        lines.append(f"{key}:")
        value = merged[key]
        if key in bullet_keys:
            items = [
                v.strip().lstrip("- ").strip()
                for v in value.splitlines()
                if v.strip()
            ]
            for item in items:
                lines.append(f"- {item}")
            if not items:
                lines.append("- Data not available")
        else:
            lines.append(value or "Data not available")
        lines.append("")

    return "\n".join(lines).strip()


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
        "ai_sdk": "google-genai (new)" if _GENAI_NEW_SDK else "unavailable",
        "primary_model": PRIMARY_MODEL,
        "daily_ai_calls": _daily_count,
        "daily_limit": RATE_LIMIT_RPD,
        "services": {
            "gemini":    bool(GEMINI_API_KEY) and _GENAI_NEW_SDK,
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

    advisory_short  = get_gemini_advisory(disease, confidence, crop, region, season, language, "short")

    # Pre-estimate severity from ML confidence for use in the Gemini prompt
    estimated_severity = _estimate_severity_from_confidence(confidence)
    advisory_detail = get_gemini_advisory(disease, confidence, crop, region, season, language, "detailed",
                                          severity=estimated_severity)

    # Ensure advisory is NEVER empty
    if not advisory_short or not advisory_short.strip():
        advisory_short = _fallback_advisory(disease, crop, "short")
    if not advisory_detail or not advisory_detail.strip():
        advisory_detail = _fallback_advisory(disease, crop, "detailed")

    severity = "low" if is_healthy else extract_severity(advisory_detail)

    # Parse ECONOMIC_IMPACT section from advisory
    economic_impact = _parse_advisory_section(advisory_detail, "ECONOMIC_IMPACT")

    # Build weather advisory using region/season/disease context
    disease_lower = disease.lower()
    if any(w in disease_lower for w in ["blight", "mildew", "rust", "rot", "mold", "spot"]):
        weather_advisory = (
            f"Fungal diseases like {disease} spread rapidly in humid weather (>80% humidity) and rainy conditions. "
            f"Avoid spraying chemicals before expected rain. Check the Weather tab for {region} conditions before scheduling treatment."
        )
    elif any(w in disease_lower for w in ["virus", "mosaic", "bacterial"]):
        weather_advisory = (
            f"Bacterial/viral spread is worsened by wet, windy weather. "
            f"Check the Weather tab for current {region} conditions to time your spraying window correctly."
        )
    else:
        weather_advisory = (
            f"Monitor {region} weather conditions before applying treatment. "
            f"Spray in early morning or evening — avoid hot afternoon sun. Check the Weather tab for a 5-day forecast."
        )

    # Build mandi advisory for the crop
    mandi_advisory = (
        f"Treating {disease} on {crop} promptly helps preserve crop market value. "
        f"Check live {crop} prices in the Market tab to time your sale. "
        f"Healthy {crop} fetches a significant premium over diseased produce."
    )

    log.info(f"Analysis complete — disease: {disease}, crop: {crop}, severity: {severity}, ai_used: {bool(GEMINI_API_KEY)}")

    return {
        "raw_class":           raw_class,
        "disease":             disease,
        "crop":                crop,
        "confidence":          round(confidence * 100, 1),
        "is_healthy":          is_healthy,
        "severity":            severity,
        "advisory_short":      advisory_short,
        "advisory_detail":     advisory_detail,
        "economic_impact":     economic_impact,
        "red_alert_triggered": severity == "high",
        "weather_advisory":    weather_advisory,
        "mandi_advisory":      mandi_advisory,
    }

@app.post("/advisory")
def get_advisory(req: AdvisoryRequest):
    advisory = get_gemini_advisory(
        req.disease_name, req.confidence, req.crop,
        req.region, req.season, req.language, req.mode,
    )

    # GUARANTEE non-empty advisory
    if not advisory or not advisory.strip():
        advisory = _fallback_advisory(req.disease_name, req.crop, req.mode)

    if req.mode == "detailed":
        advisory = _normalize_detailed_advisory(
            advisory,
            disease=req.disease_name,
            crop=req.crop,
            severity="Moderate",
            land_acres=2.0,
        )

    return {
        "disease":  req.disease_name,
        "crop":     req.crop,
        "language": req.language,
        "mode":     req.mode,
        "advisory": advisory,
        "severity": extract_severity(advisory),
    }

# ─── Secure Gemini Chat Proxy ─────────────────────────────────────────────────
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Secure chat endpoint — Gemini API key never leaves the server.
    Frontend sends questions, backend adds context and calls Gemini.
    If AI is unavailable (quota/error), returns a graceful friendly message.
    """
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty.")

    if not GEMINI_API_KEY or not _GENAI_NEW_SDK:
        return {
            "response": "⚠️ AI is temporarily unavailable. Please try again in a few seconds, or consult your local KVK for immediate assistance.",
            "timestamp": __import__("datetime").datetime.now().isoformat(),
            "fallback": True,
        }

    prompt = build_chat_prompt(
        req.question, req.state, req.weather_summary, req.active_crops, req.language
    )

    try:
        result = await _call_gemini_async(prompt, max_tokens=800)

        if result is None:
            # Quota / rate limit — graceful response
            log.warning("Chat: AI quota reached — returning graceful fallback message")
            return {
                "response": "⚠️ AI is busy right now. Please try again in a few seconds. For urgent crop advice, contact your nearest KVK (Krishi Vigyan Kendra).",
                "timestamp": __import__("datetime").datetime.now().isoformat(),
                "fallback": True,
            }

        return {
            "response":  result,
            "timestamp": __import__("datetime").datetime.now().isoformat(),
            "fallback": False,
        }

    except asyncio.TimeoutError:
        log.error("Chat: Gemini timed out")
        return {
            "response": "⚠️ AI took too long to respond. Please try again.",
            "timestamp": __import__("datetime").datetime.now().isoformat(),
            "fallback": True,
        }
    except Exception as e:
        log.error(f"Chat endpoint error: {type(e).__name__}: {e}")
        return {
            "response": "⚠️ AI is temporarily unavailable. Please try again in a few seconds.",
            "timestamp": __import__("datetime").datetime.now().isoformat(),
            "fallback": True,
        }


# ─── Weather Proxy (lat/lon or city) ──────────────────────────────────────────
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


# ─── Mandi (Agmarknet) Proxy ──────────────────────────────────────────────────
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
                        "price":      r.get("Modal_Price"),
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
