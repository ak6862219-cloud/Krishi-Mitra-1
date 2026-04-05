"""
Krishi Mitra — FastAPI Backend (Production)
============================================
Endpoints:
  POST /analyze    → ML model + Gemini advisory (short + detailed)
  POST /advisory   → Gemini advisory only
  GET  /health     → Status check
  GET  /classes    → All 38 class names

Run:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import os, io, logging
from pathlib import Path

import numpy as np
from PIL import Image
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "")
MODEL_PATH      = os.getenv("MODEL_PATH", "./model/krishi_disease_model.h5")
USE_MOCK_MODEL  = os.getenv("USE_MOCK_MODEL", "false").lower() == "true"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("krishi")

app = FastAPI(title="Krishi Mitra API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    """
    Returns a strict JSON-keyed prompt so the response is always machine-parseable
    AND human-readable. The markers (DISEASE:, SEVERITY:, etc.) are guaranteed
    to appear even in Hindi/Malayalam because they are labels, not translated words.
    """
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
                temperature=0.3,          # lower = more consistent, structured output
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
    """Parse the SEVERITY: line from the structured advisory."""
    for line in advisory.splitlines():
        if line.strip().upper().startswith("SEVERITY:"):
            val = line.split(":", 1)[1].strip().lower()
            if "severe" in val or "high" in val or "critical" in val:
                return "high"
            if "moderate" in val or "medium" in val:
                return "medium"
            return "low"
    # Fallback: scan full text
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

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "mock_mode": USE_MOCK_MODEL, "model_path": MODEL_PATH}

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
