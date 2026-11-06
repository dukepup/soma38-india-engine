/**
 * Google Places API & Holistic Bach Flower Remedy Provider Lookup Service — SOMA·38 (India Edition)
 * Finds nearby homeopathic & holistic pharmacies across India, with instant Tata 1mg, Homeomart & Healthmug online fulfillment.
 */

const ONLINE_REMEDY_SUPPLIERS = [
  {
    name: "Tata 1mg (Pan-India Express Delivery)",
    website: "https://www.1mg.com/search/all?name=bach%20flower",
    service: "Authentic Bach Flower Remedies & Dr. Willmar Schwabe / B. Jain / Bhandari stock bottles delivered across India."
  },
  {
    name: "Homeomart India",
    website: "https://homeomart.com/collections/bach-flower-remedies",
    service: "Complete 38 Bach Flower Remedy collection, custom combination kits, and pan-India courier delivery."
  },
  {
    name: "Healthmug India",
    website: "https://www.healthmug.com/search?keywords=bach%20flower",
    service: "Authentic English & Indian Bach Flower stock remedies and Rescue Remedy drops with fast shipping."
  }
];

const CURATED_CITY_DIRECTORY = {
  mumbai: [
    { name: "Roy & Company Homeopathic Chemists", address: "176 Princess St, Marine Lines, Mumbai, Maharashtra 400002", phone: "+91 22 2201 0500" },
    { name: "New Era Homeopathic Pharmacy", address: "Dadar West, Mumbai, Maharashtra 400028", phone: "+91 22 2430 6212" },
    { name: "Tata 1mg Express Fulfillment (Mumbai)", address: "https://www.1mg.com/search/all?name=bach%20flower", phone: "Online Order" }
  ],
  bengaluru: [
    { name: "medihomeo & Holistic Pharmacy", address: "Indiranagar 100 Feet Rd, Bengaluru, Karnataka 560038", phone: "+91 80 2525 1100" },
    { name: "Hahnemann Holistic Pharmacy", address: "Jayanagar 4th Block, Bengaluru, Karnataka 560011", phone: "+91 80 2663 4455" },
    { name: "Homeomart Bengaluru Hub", address: "https://homeomart.com/collections/bach-flower-remedies", phone: "Online Order" }
  ],
  delhi: [
    { name: "Dr. Willmar Schwabe India Holistic Center", address: "Green Park Extension, New Delhi, Delhi 110016", phone: "+91 11 2619 2345" },
    { name: "Bhandari Homeopathic & Bach Remedies", address: "Connaught Place / Lajpat Nagar, New Delhi 110024", phone: "+91 11 2983 1122" }
  ],
  pune: [
    { name: "Deccan Holistic & Homeopathic Pharmacy", address: "FC Road, Shivajinagar, Pune, Maharashtra 411004", phone: "+91 20 2553 2100" },
    { name: "Koregaon Park Wellness & Bach Apothecary", address: "Koregaon Park, Pune, Maharashtra 411001", phone: "+91 20 2615 4400" }
  ],
  hyderabad: [
    { name: "Banjara Hills Holistic & Homeo Pharmacy", address: "Road No. 12, Banjara Hills, Hyderabad, Telangana 500034", phone: "+91 40 2331 5566" }
  ],
  chennai: [
    { name: "Bahola & Bach Flower Holistic Pharmacy", address: "Anna Salai / T. Nagar, Chennai, Tamil Nadu 600017", phone: "+91 44 2815 3344" }
  ],
  kolkata: [
    { name: "Hapco & Holistic Flower Remedies", address: "Bepin Behari Ganguly St, Kolkata, West Bengal 700012", phone: "+91 33 2225 1100" }
  ]
};

export async function findRemedySources({ city, latitude, longitude, apiKey }) {
  const result = {
    cityProvided: !!city,
    localSources: [],
    onlineSuppliers: ONLINE_REMEDY_SUPPLIERS,
    textSnippet: ""
  };

  if (!city && (!latitude || !longitude)) {
    result.textSnippet = "You can order your 6-flower Pushpa Upaya blend online across India via Tata 1mg, Homeomart, or Healthmug, or at any local holistic/homeopathic pharmacy.";
    return result;
  }

  if (apiKey && (city || (latitude && longitude))) {
    try {
      const query = encodeURIComponent(`Bach flower remedies homeopathic pharmacy in ${city || "India"}`);
      const endpoint = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        result.localSources = data.results.slice(0, 3).map(p => ({
          name: p.name,
          address: p.formatted_address,
          rating: p.rating || "N/A"
        }));
      }
    } catch (err) {
      console.warn("Google Places lookup failed, falling back to curated directory:", err.message);
    }
  }

  if (result.localSources.length === 0 && city) {
    const cityKey = city.toLowerCase().replace(/[^a-z]/g, "_");
    for (const [key, spots] of Object.entries(CURATED_CITY_DIRECTORY)) {
      if (cityKey.includes(key) || key.includes(cityKey)) {
        result.localSources = spots;
        break;
      }
    }
  }

  return result;
}

const MAJOR_WORLD_CITIES = [
  // --- INDIA (TIER-1, TIER-2 & SPIRITUAL HUBS) ---
  { name: "Mumbai", state: "Maharashtra", country: "India", latitude: 19.0760, longitude: 72.8777 },
  { name: "Bengaluru", state: "Karnataka", country: "India", latitude: 12.9716, longitude: 77.5946 },
  { name: "New Delhi", state: "Delhi NCR", country: "India", latitude: 28.6139, longitude: 77.2090 },
  { name: "Gurugram", state: "Haryana (NCR)", country: "India", latitude: 28.4595, longitude: 77.0266 },
  { name: "Noida", state: "Uttar Pradesh (NCR)", country: "India", latitude: 28.5355, longitude: 77.3910 },
  { name: "Pune", state: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567 },
  { name: "Hyderabad", state: "Telangana", country: "India", latitude: 17.3850, longitude: 78.4867 },
  { name: "Chennai", state: "Tamil Nadu", country: "India", latitude: 13.0827, longitude: 80.2707 },
  { name: "Kolkata", state: "West Bengal", country: "India", latitude: 22.5726, longitude: 88.3639 },
  { name: "Ahmedabad", state: "Gujarat", country: "India", latitude: 23.0225, longitude: 72.5714 },
  { name: "Jaipur", state: "Rajasthan", country: "India", latitude: 26.9124, longitude: 75.7873 },
  { name: "Chandigarh", state: "Punjab / Haryana", country: "India", latitude: 30.7333, longitude: 76.7794 },
  { name: "Kochi", state: "Kerala", country: "India", latitude: 9.9312, longitude: 76.2673 },
  { name: "Thiruvananthapuram", state: "Kerala", country: "India", latitude: 8.5241, longitude: 76.9366 },
  { name: "Panaji (Goa)", state: "Goa", country: "India", latitude: 15.4909, longitude: 73.8278 },
  { name: "Indore", state: "Madhya Pradesh", country: "India", latitude: 22.7196, longitude: 75.8577 },
  { name: "Lucknow", state: "Uttar Pradesh", country: "India", latitude: 26.8467, longitude: 80.9462 },
  { name: "Surat", state: "Gujarat", country: "India", latitude: 21.1702, longitude: 72.8311 },
  { name: "Vadodara", state: "Gujarat", country: "India", latitude: 22.3072, longitude: 73.1812 },
  { name: "Coimbatore", state: "Tamil Nadu", country: "India", latitude: 11.0168, longitude: 76.9558 },
  { name: "Nagpur", state: "Maharashtra", country: "India", latitude: 21.1458, longitude: 79.0882 },
  { name: "Visakhapatnam", state: "Andhra Pradesh", country: "India", latitude: 17.6868, longitude: 83.2185 },
  { name: "Bhopal", state: "Madhya Pradesh", country: "India", latitude: 23.2599, longitude: 77.4126 },
  { name: "Patna", state: "Bihar", country: "India", latitude: 25.5941, longitude: 85.1376 },
  { name: "Ludhiana", state: "Punjab", country: "India", latitude: 30.9010, longitude: 75.8573 },
  { name: "Amritsar", state: "Punjab", country: "India", latitude: 31.6340, longitude: 74.8723 },
  { name: "Varanasi", state: "Uttar Pradesh", country: "India", latitude: 25.3176, longitude: 82.9739 },
  { name: "Rishikesh", state: "Uttarakhand", country: "India", latitude: 30.0869, longitude: 78.2676 },
  { name: "Dehradun", state: "Uttarakhand", country: "India", latitude: 30.3165, longitude: 78.0322 },
  { name: "Udaipur", state: "Rajasthan", country: "India", latitude: 24.5854, longitude: 73.7125 },
  { name: "Mysuru", state: "Karnataka", country: "India", latitude: 12.2958, longitude: 76.6394 },
  { name: "Mangaluru", state: "Karnataka", country: "India", latitude: 12.9141, longitude: 74.8560 },
  { name: "Bhubaneswar", state: "Odisha", country: "India", latitude: 20.2961, longitude: 85.8245 },
  { name: "Guwahati", state: "Assam", country: "India", latitude: 26.1445, longitude: 91.7362 },

  // --- GLOBAL DIASPORA HUBS ---
  { name: "London", state: "England", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278 },
  { name: "Dubai", state: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708 },
  { name: "Singapore", state: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198 },
  { name: "New York", state: "NY", country: "United States", latitude: 40.7128, longitude: -74.0060 },
  { name: "San Francisco", state: "CA", country: "United States", latitude: 37.7749, longitude: -122.4194 },
  { name: "Toronto", state: "Ontario", country: "Canada", latitude: 43.6532, longitude: -79.3832 },
  { name: "Sydney", state: "NSW", country: "Australia", latitude: -33.8688, longitude: 151.2093 },
  { name: "Lisboa", state: "Lisboa", country: "Portugal", latitude: 38.7223, longitude: -9.1393 }
];

export async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];
  const cleanQ = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const localMatches = MAJOR_WORLD_CITIES.filter(c => {
    const target = `${c.name} ${c.state || ''} ${c.country}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return target.includes(cleanQ);
  }).map(c => ({
    label: `${c.name}${c.state ? ', ' + c.state : ''}, ${c.country}`,
    city: c.name,
    country: c.country,
    latitude: c.latitude,
    longitude: c.longitude
  }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`, {
      signal: controller.signal,
      headers: { "User-Agent": "Soma38IndiaVedicApp/1.0" }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const apiMatches = data.features.map(f => {
          const props = f.properties || {};
          const name = props.name || props.city || query;
          const state = props.state || props.county || "";
          const country = props.country || "";
          const label = `${name}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`;
          const [lon, lat] = f.geometry.coordinates;
          return {
            label,
            city: name,
            country,
            latitude: lat,
            longitude: lon
          };
        });

        const merged = [...localMatches, ...apiMatches];
        const seen = new Set();
        return merged.filter(item => {
          const key = item.label.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 10);
      }
    }
  } catch (err) {
    // Fallback to local
  }

  return localMatches.slice(0, 10);
}
