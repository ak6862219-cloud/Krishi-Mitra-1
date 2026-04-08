/**
 * weatherService.js
 * Proxies all weather calls through the backend /api/weather endpoint.
 * Uses lat/lon whenever available, falls back to city name.
 * 5-minute client-side cache to avoid re-fetching on component remounts.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── District → Lat/Lon map ────────────────────────────────────────────────
export const DISTRICT_COORDS = {
  // Kerala
  "Thiruvananthapuram": [8.5241,  76.9366],
  "Kollam":             [8.8932,  76.6141],
  "Pathanamthitta":     [9.2668,  76.7870],
  "Alappuzha":          [9.4981,  76.3388],
  "Kottayam":           [9.5916,  76.5222],
  "Idukki":             [9.9189,  77.1025],
  "Ernakulam":          [9.9312,  76.2673],
  "Thrissur":           [10.5276, 76.2144],
  "Palakkad":           [10.7867, 76.6548],
  "Malappuram":         [11.0730, 76.0740],
  "Kozhikode":          [11.2588, 75.7804],
  "Wayanad":            [11.6854, 76.1320],
  "Kannur":             [11.8745, 75.3704],
  "Kasaragod":          [12.4996, 74.9869],
  // Maharashtra
  "Mumbai":             [19.0760, 72.8777],
  "Pune":               [18.5204, 73.8567],
  "Nagpur":             [21.1458, 79.0882],
  "Nashik":             [19.9975, 73.7898],
  "Aurangabad":         [19.8762, 75.3433],
  "Solapur":            [17.6599, 75.9064],
  "Kolhapur":           [16.7050, 74.2433],
  "Amravati":           [20.9320, 77.7523],
  "Latur":              [18.4088, 76.5604],
  "Akola":              [20.7002, 77.0082],
  "Jalgaon":            [21.0077, 75.5626],
  "Chandrapur":         [19.9615, 79.2961],
  // Punjab
  "Ludhiana":           [30.9010, 75.8573],
  "Amritsar":           [31.6340, 74.8723],
  "Jalandhar":          [31.3260, 75.5762],
  "Patiala":            [30.3398, 76.3869],
  "Bathinda":           [30.2110, 74.9455],
  // UP
  "Lucknow":            [26.8467, 80.9462],
  "Agra":               [27.1767, 78.0081],
  "Kanpur":             [26.4499, 80.3319],
  "Varanasi":           [25.3176, 82.9739],
  "Allahabad":          [25.4358, 81.8463],
  "Meerut":             [28.9845, 77.7064],
  "Ghaziabad":          [28.6692, 77.4538],
  "Gorakhpur":          [26.7606, 83.3732],
  // Other major cities
  "New Delhi":          [28.6139, 77.2090],
  "Bengaluru":          [12.9716, 77.5946],
  "Chennai":            [13.0827, 80.2707],
  "Hyderabad":          [17.3850, 78.4867],
  "Kolkata":            [22.5726, 88.3639],
  "Ahmedabad":          [23.0225, 72.5714],
  "Surat":              [21.1702, 72.8311],
  "Vadodara":           [22.3072, 73.1812],
  "Jaipur":             [26.9124, 75.7873],
  "Patna":              [25.5941, 85.1376],
  "Bhopal":             [23.2599, 77.4126],
  "Raipur":             [21.2514, 81.6296],
  "Ranchi":             [23.3441, 85.3096],
  "Bhubaneswar":        [20.2961, 85.8245],
  "Chandigarh":         [30.7333, 76.7794],
  "Guwahati":           [26.1445, 91.7362],
  "Shimla":             [31.1048, 77.1734],
  "Dehradun":           [30.3165, 78.0322],
  "Visakhapatnam":      [17.6868, 83.2185],
  "Coimbatore":         [11.0168, 76.9558],
  "Madurai":            [9.9252,  78.1198],
  "Imphal":             [24.8170, 93.9368],
  "Shillong":           [25.5788, 91.8933],
  "Aizawl":             [23.7271, 92.7176],
  "Kohima":             [25.6742, 94.1106],
  "Agartala":           [23.8315, 91.2868],
  "Itanagar":           [27.0844, 93.6053],
  "Gangtok":            [27.3314, 88.6138],
  "Leh":                [34.1526, 77.5771],
  "Srinagar":           [34.0836, 74.7973],
  "Jammu":              [32.7266, 74.8570],
  "Panaji":             [15.4989, 73.8278],
};

// ─── All India states+districts ─────────────────────────────────────────────
export const INDIA_DISTRICTS = {
  "Andhra Pradesh":  ["Visakhapatnam","Vijayawada","Guntur","Kurnool","Nellore","Tirupati","Kadapa","Anantapur","Rajahmundry","Kakinada"],
  "Arunachal Pradesh": ["Itanagar","Naharlagun","Pasighat","Tawang","Ziro"],
  "Assam":           ["Guwahati","Dibrugarh","Jorhat","Silchar","Nagaon","Tezpur","Tinsukia","Bongaigaon"],
  "Bihar":           ["Patna","Gaya","Bhagalpur","Muzaffarpur","Darbhanga","Arrah","Begusarai","Chapra","Purnia"],
  "Chhattisgarh":    ["Raipur","Bilaspur","Durg","Korba","Rajnandgaon","Jagdalpur","Ambikapur"],
  "Goa":             ["Panaji","Margao","Vasco","Mapusa","Ponda"],
  "Gujarat":         ["Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar","Jamnagar","Junagadh","Gandhinagar","Anand","Mehsana"],
  "Haryana":         ["Gurugram","Faridabad","Ambala","Hisar","Rohtak","Karnal","Panipat","Yamunanagar","Sonipat"],
  "Himachal Pradesh":["Shimla","Dharamshala","Mandi","Solan","Kangra","Kullu","Hamirpur","Una"],
  "Jharkhand":       ["Ranchi","Jamshedpur","Dhanbad","Bokaro","Hazaribagh","Giridih","Deoghar","Dumka"],
  "Karnataka":       ["Bengaluru","Mysuru","Hubballi","Mangaluru","Belagavi","Kalaburagi","Ballari","Tumakuru","Davangere","Shivamogga"],
  "Kerala":          ["Thiruvananthapuram","Kollam","Pathanamthitta","Alappuzha","Kottayam","Idukki","Ernakulam","Thrissur","Palakkad","Malappuram","Kozhikode","Wayanad","Kannur","Kasaragod"],
  "Madhya Pradesh":  ["Bhopal","Indore","Jabalpur","Gwalior","Ujjain","Sagar","Rewa","Satna","Ratlam","Dewas"],
  "Maharashtra":     ["Mumbai","Pune","Nagpur","Nashik","Aurangabad","Solapur","Kolhapur","Amravati","Latur","Akola","Jalgaon","Chandrapur"],
  "Manipur":         ["Imphal","Thoubal","Bishnupur","Churachandpur","Ukhrul"],
  "Meghalaya":       ["Shillong","Tura","Jowai","Nongstoin"],
  "Mizoram":         ["Aizawl","Lunglei","Champhai","Serchhip"],
  "Nagaland":        ["Kohima","Dimapur","Mokokchung","Wokha","Tuensang"],
  "Odisha":          ["Bhubaneswar","Cuttack","Rourkela","Berhampur","Sambalpur","Puri","Balasore","Baripada","Jharsuguda"],
  "Punjab":          ["Ludhiana","Amritsar","Jalandhar","Patiala","Bathinda","Mohali","Gurdaspur","Firozpur","Hoshiarpur"],
  "Rajasthan":       ["Jaipur","Jodhpur","Kota","Bikaner","Udaipur","Ajmer","Alwar","Bharatpur","Sikar","Bhilwara"],
  "Sikkim":          ["Gangtok","Namchi","Gyalshing","Mangan"],
  "Tamil Nadu":      ["Chennai","Coimbatore","Madurai","Salem","Tiruchirappalli","Tirunelveli","Vellore","Erode","Tiruppur","Thoothukudi","Thanjavur"],
  "Telangana":       ["Hyderabad","Warangal","Nizamabad","Karimnagar","Khammam","Nalgonda","Mahbubnagar","Adilabad","Ramagundam"],
  "Tripura":         ["Agartala","Udaipur","Dharmanagar","Kailashahar"],
  "Uttar Pradesh":   ["Lucknow","Agra","Kanpur","Varanasi","Allahabad","Meerut","Ghaziabad","Mathura","Aligarh","Bareilly","Moradabad","Gorakhpur","Firozabad"],
  "Uttarakhand":     ["Dehradun","Haridwar","Roorkee","Rishikesh","Nainital","Haldwani","Rudrapur","Kashipur"],
  "West Bengal":     ["Kolkata","Howrah","Durgapur","Asansol","Siliguri","Bardhaman","Malda","Murshidabad","Jalpaiguri"],
  "Delhi":           ["New Delhi","North Delhi","South Delhi","East Delhi","West Delhi","Dwarka","Rohini"],
  "Jammu and Kashmir":["Srinagar","Jammu","Anantnag","Baramulla","Sopore","Kathua","Udhampur"],
  "Ladakh":          ["Leh","Kargil"],
  "Chandigarh":      ["Chandigarh"],
  "Puducherry":      ["Puducherry","Karaikal","Mahe","Yanam"],
};

// ─── Farming advisory engine ────────────────────────────────────────────────
export const getFarmingAdvisory = (weather) => {
  const advisories = [];
  const { temperature, humidity, windSpeed, condition, hourlyForecast } = weather;
  const rainChance = hourlyForecast?.[0]?.rain || 0;
  const condLower  = (condition || "").toLowerCase();

  if (windSpeed > 20 || rainChance > 40) {
    advisories.push({ type:"warning", icon:"🚫", title:"Do Not Spray Today",
      detail:`Wind ${windSpeed} km/h or rain chance ${rainChance}% — spray will drift and be ineffective. Wait for calmer conditions.` });
  } else if (windSpeed < 12 && rainChance < 20) {
    advisories.push({ type:"success", icon:"✅", title:"Safe Spray Window",
      detail:`Low wind (${windSpeed} km/h) and low rain risk. Best time to spray: early morning 6–9 am.` });
  }
  if (humidity > 80 && temperature > 22 && temperature < 32) {
    advisories.push({ type:"warning", icon:"🍄", title:"High Fungal Disease Risk",
      detail:`Humidity ${humidity}% and temp ${temperature}°C — ideal for Blast, Blight, and Downy Mildew. Apply preventive fungicide now.` });
  }
  if (!condLower.includes("rain") && !condLower.includes("drizzle") && temperature > 30) {
    advisories.push({ type:"info", icon:"💧", title:"Irrigation Recommended",
      detail:`High temperature (${temperature}°C) with no rain forecast. Water crops in the evening to reduce heat stress.` });
  }
  if (temperature > 38) {
    advisories.push({ type:"danger", icon:"🌡️", title:"Extreme Heat Alert",
      detail:`${temperature}°C may cause crop wilting. Provide shade nets for vegetables and nurseries. Avoid field work 11 am–3 pm.` });
  }
  if (temperature < 10) {
    advisories.push({ type:"danger", icon:"🥶", title:"Cold Stress Warning",
      detail:`Temperature ${temperature}°C — risk of frost damage. Cover nurseries and young plants overnight.` });
  }
  if (condLower.includes("thunderstorm") || rainChance > 70) {
    advisories.push({ type:"danger", icon:"⛈️", title:"Heavy Rain — Clear Drainage",
      detail:`High rain probability (${rainChance}%). Ensure field drainage channels are clear to avoid waterlogging and root rot.` });
  }
  if (advisories.length === 0) {
    advisories.push({ type:"success", icon:"🌱", title:"Favourable Conditions Today",
      detail:"Weather is suitable for normal field operations. Good day for sowing, weeding, or light fertilizer application." });
  }
  return advisories;
};

// ─── Client-side 5-minute cache ─────────────────────────────────────────────
const _wCache = {};
function wCacheGet(key) {
  const entry = _wCache[key];
  if (entry && Date.now() - entry.ts < 5 * 60 * 1000) return entry.data;
  return null;
}
function wCacheSet(key, data) { _wCache[key] = { data, ts: Date.now() }; }

// ─── Weather service ─────────────────────────────────────────────────────────
export const weatherService = {
  /**
   * Fetch weather for a district/city.
   * Prefers lat/lon lookup; falls back to city name query.
   */
  getCurrentWeather: async (city = "Thiruvananthapuram") => {
    const coords = DISTRICT_COORDS[city];
    const cacheKey = coords ? `ll_${coords[0]}_${coords[1]}` : `city_${city}`;

    const cached = wCacheGet(cacheKey);
    if (cached) return cached;

    let url = `${API_URL}/api/weather?`;
    if (coords) {
      url += `lat=${coords[0]}&lon=${coords[1]}`;
    } else {
      url += `city=${encodeURIComponent(city)}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Weather API error ${res.status}`);
    }
    const data = await res.json();
    wCacheSet(cacheKey, data);
    return data;
  },

  getIndiaDistricts: () => INDIA_DISTRICTS["Kerala"],
};
