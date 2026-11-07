/**
 * Astrological Calculation Engine
 * Calculates Tropical Zodiac positions, House Cusps (Placidus/Equal), Planetary Aspects,
 * and Modern Rulerships for Natal and Horary charts.
 */

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const VEDIC_RASHI_NAMES = {
  Aries: "Mesha (Aries)",
  Taurus: "Vrishabha (Taurus)",
  Gemini: "Mithuna (Gemini)",
  Cancer: "Karka (Cancer)",
  Leo: "Simha (Leo)",
  Virgo: "Kanya (Virgo)",
  Libra: "Tula (Libra)",
  Scorpio: "Vrishchika (Scorpio)",
  Sagittarius: "Dhanu (Sagittarius)",
  Capricorn: "Makara (Capricorn)",
  Aquarius: "Kumbha (Aquarius)",
  Pisces: "Meena (Pisces)"
};

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

/**
 * Calculates True Chitrapaksha / Lahiri Ayanamsa (Sidereal Zodiac Offset) for a given UTC Date
 * J2000.0 value: 23° 51' 11" (23.853056°), annual precession: 50.290966" (0.0139697°/yr)
 */
export function getLahiriAyanamsa(dateObj = new Date()) {
  const jd = (dateObj.getTime() / 86400000) + 2440587.5;
  const yearsFromJ2000 = (jd - 2451545.0) / 365.25;
  return 23.853056 + yearsFromJ2000 * 0.0139697;
}

const MODERN_RULERSHIPS = {
  "Aries": "Mars",
  "Taurus": "Venus",
  "Gemini": "Mercury",
  "Cancer": "Moon",
  "Leo": "Sun",
  "Virgo": "Mercury",
  "Libra": "Venus",
  "Scorpio": "Mars",
  "Sagittarius": "Jupiter",
  "Capricorn": "Saturn",
  "Aquarius": "Saturn",
  "Pisces": "Jupiter"
};

const ELEMENTS = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water"
};

const ELEMENT_NAMES_PT = {
  Fire: "Fogo",
  Earth: "Terra",
  Air: "Ar",
  Water: "Água"
};

// Orbital elements / Mean planetary motions relative to J2000.0 (Jan 1.5, 2000 TT)
const PLANET_PARAMS = {
  Sun:     { L0: 280.46646, n: 0.98564736, e: 0.016709, M0: 357.52911 },
  Moon:    { L0: 218.3164477, n: 13.17639648, e: 0.054900, M0: 134.9634 },
  Mercury: { L0: 252.250905, n: 4.09233445, e: 0.205635, M0: 174.7947 },
  Venus:   { L0: 181.979801, n: 1.60213034, e: 0.006773, M0: 50.1166 },
  Mars:    { L0: 355.433000, n: 0.52403300, e: 0.093405, M0: 19.3730 },
  Jupiter: { L0: 34.351519,  n: 0.08308529, e: 0.048498, M0: 20.0202 },
  Saturn:  { L0: 50.077444,  n: 0.03344414, e: 0.055546, M0: 317.0207 },
  Uranus:  { L0: 314.055005, n: 0.01172834, e: 0.046381, M0: 142.2386 },
  Neptune: { L0: 304.348665, n: 0.00598103, e: 0.009456, M0: 256.2280 },
  Pluto:   { L0: 238.929,    n: 0.003964,   e: 0.2488,   M0: 14.882 }
};

function normalizeDeg(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

function getJulianDate(dateObj) {
  return (dateObj.getTime() / 86400000) + 2440587.5;
}

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

/**
 * Infers appropriate IANA timezone identifier from coordinates or country name
 */
export function inferTimezoneFromCoordinates(lat, lon, country = "") {
  const c = (country || "").toLowerCase();
  
  // Country specific routing
  if (c.includes("india") || c.includes("bharat")) {
    return "Asia/Kolkata";
  }
  if (c.includes("portugal")) {
    if (lon < -20) return "Atlantic/Azores";
    if (lat < 35 && lon < -14) return "Atlantic/Madeira";
    return "Europe/Lisbon";
  }
  if (c.includes("brazil") || c.includes("brasil")) {
    if (lon < -65) return "America/Rio_Branco";
    if (lon < -54 && lat > -15) return "America/Manaus";
    return "America/Sao_Paulo";
  }
  if (c.includes("spain") || c.includes("espanha") || c.includes("españa")) return "Europe/Madrid";
  if (c.includes("united kingdom") || c.includes("reino unido") || c.includes("england") || c.includes("uk")) return "Europe/London";
  if (c.includes("france") || c.includes("frança")) return "Europe/Paris";
  if (c.includes("germany") || c.includes("alemanha")) return "Europe/Berlin";
  if (c.includes("italy") || c.includes("itália")) return "Europe/Rome";
  if (c.includes("united states") || c.includes("usa") || c.includes("estados unidos")) {
    if (lon < -140) return "Pacific/Honolulu";
    if (lat > 50 && lon < -130) return "America/Anchorage";
    if (lon < -114) return "America/Los_Angeles";
    if (lon < -100) return "America/Denver";
    if (lon < -82) return "America/Chicago";
    return "America/New_York";
  }
  if (c.includes("canada")) {
    if (lon < -115) return "America/Vancouver";
    if (lon < -100) return "America/Edmonton";
    if (lon < -85) return "America/Winnipeg";
    return "America/Toronto";
  }
  if (c.includes("argentina")) return "America/Argentina/Buenos_Aires";
  if (c.includes("chile")) return "America/Santiago";
  if (c.includes("colombia")) return "America/Bogota";
  if (c.includes("peru")) return "America/Lima";
  if (c.includes("mexico") || c.includes("méxico")) return "America/Mexico_City";
  if (c.includes("japan") || c.includes("japão")) return "Asia/Tokyo";
  if (c.includes("australia") || c.includes("austrália")) {
    if (lon < 125) return "Australia/Perth";
    if (lon < 138) return "Australia/Adelaide";
    return "Australia/Sydney";
  }

  // Coordinate bounding boxes
  // India Subcontinent (IST - Asia/Kolkata)
  if (lat >= 6 && lat <= 37 && lon >= 68 && lon <= 97) {
    return "Asia/Kolkata";
  }
  // South America / Brazil
  if (lat >= -34 && lat <= 5 && lon >= -74 && lon <= -34) {
    if (lon < -65) return "America/Rio_Branco";
    if (lon < -54 && lat > -15) return "America/Manaus";
    return "America/Sao_Paulo";
  }

  // Western Europe
  if (lat >= 36 && lat <= 60 && lon >= -10 && lon <= 2) {
    if (lon < -5 && lat < 43) return "Europe/Lisbon";
    if (lat > 50) return "Europe/London";
    return "Europe/Madrid";
  }

  // Central Europe
  if (lat >= 36 && lat <= 60 && lon >= 2 && lon <= 20) {
    return "Europe/Berlin";
  }

  // North America
  if (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -65) {
    if (lon < -114) return "America/Los_Angeles";
    if (lon < -100) return "America/Denver";
    if (lon < -85) return "America/Chicago";
    return "America/New_York";
  }

  const offsetHours = Math.round(lon / 15.0);
  if (offsetHours === 0) return "UTC";
  if (offsetHours === 1) return "Europe/Paris";
  if (offsetHours === 2) return "Europe/Athens";
  if (offsetHours === 3) return "Europe/Moscow";
  if (offsetHours === 8) return "Asia/Singapore";
  if (offsetHours === 9) return "Asia/Tokyo";
  if (offsetHours === 10) return "Australia/Sydney";
  if (offsetHours === -3) return "America/Sao_Paulo";
  if (offsetHours === -4) return "America/Santiago";
  if (offsetHours === -5) return "America/New_York";
  if (offsetHours === -6) return "America/Chicago";
  if (offsetHours === -7) return "America/Denver";
  if (offsetHours === -8) return "America/Los_Angeles";

  return "UTC";
}

/**
 * Resolves an accurate UTC Date object from a local civil birth date, time, and coordinates / location
 */
export function resolveBirthUtcDate(dateStr, timeStr = "12:00", { latitude, longitude, timezone, city, country } = {}) {
  const [y, m, d] = (dateStr || "2000-01-01").split("-").map(Number);
  const timeParts = (timeStr || "12:00").split(":");
  const hour = Number(timeParts[0]) || 12;
  const minute = Number(timeParts[1]) || 0;
  const second = Number(timeParts[2]) || 0;

  let resolvedTimezone = timezone || null;
  if (!resolvedTimezone && typeof latitude === "number" && typeof longitude === "number") {
    resolvedTimezone = inferTimezoneFromCoordinates(latitude, longitude, country);
  }

  if (resolvedTimezone) {
    try {
      const approxUtc = new Date(Date.UTC(y, m - 1, d, hour, minute, second));
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: resolvedTimezone,
        year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
        hour12: false
      });
      const parts = formatter.formatToParts(approxUtc);
      const map = {};
      parts.forEach(p => map[p.type] = p.value);
      const localYear = Number(map.year);
      const localMonth = Number(map.month);
      const localDay = Number(map.day);
      let localHour = Number(map.hour);
      if (localHour === 24) localHour = 0;
      const localMinute = Number(map.minute);
      const localSecond = Number(map.second) || 0;

      const localDateAsUtc = new Date(Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute, localSecond));
      const offsetMs = localDateAsUtc.getTime() - approxUtc.getTime();
      return {
        utcDate: new Date(approxUtc.getTime() - offsetMs),
        timezone: resolvedTimezone
      };
    } catch (e) {
      console.warn("Timezone resolution warning:", e.message);
    }
  }

  return {
    utcDate: new Date(Date.UTC(y, m - 1, d, hour, minute, second)),
    timezone: "UTC"
  };
}

function getSignFromLongitude(longitude) {
  const norm = normalizeDeg(longitude);
  const signIndex = Math.floor(norm / 30);
  const degreeInSign = norm % 30;
  const signName = ZODIAC_SIGNS[signIndex];
  const nakshatraSpan = 360 / 27; // 13.3333° per Nakshatra
  const nakIndex = Math.floor(norm / nakshatraSpan) % 27;
  const pada = Math.floor((norm % nakshatraSpan) / (nakshatraSpan / 4)) + 1;
  return {
    sign: signName,
    rashi: VEDIC_RASHI_NAMES[signName] || signName,
    nakshatra: NAKSHATRAS[nakIndex],
    pada,
    degree: Math.floor(degreeInSign),
    minute: Math.floor((degreeInSign % 1) * 60),
    totalLongitude: norm,
    ruler: MODERN_RULERSHIPS[signName]
  };
}

/**
 * Calculates Sidereal (Lahiri Ayanamsa) planetary positions for a given UTC Date
 */
export function calculatePlanetaryPositions(dateObj) {
  const jd = getJulianDate(dateObj);
  const d = jd - 2451545.0; // days from J2000.0
  const ayanamsa = getLahiriAyanamsa(dateObj);

  const positions = {};

  for (const [planet, params] of Object.entries(PLANET_PARAMS)) {
    let M = normalizeDeg(params.M0 + params.n * d);
    let Mrad = degToRad(M);
    // Equation of center (Keplerian 1st & 2nd harmonic approximation)
    let C = (2 * params.e - (params.e ** 3) / 4) * Math.sin(Mrad) +
            (1.25 * (params.e ** 2)) * Math.sin(2 * Mrad);
    let trueLong = normalizeDeg(params.L0 + params.n * d + radToDeg(C));
    
    // Moon extra perturbations
    if (planet === "Moon") {
      const sunM = degToRad(normalizeDeg(PLANET_PARAMS.Sun.M0 + PLANET_PARAMS.Sun.n * d));
      const evection = 1.2739 * Math.sin(2 * degToRad(trueLong - normalizeDeg(PLANET_PARAMS.Sun.L0 + PLANET_PARAMS.Sun.n * d)) - Mrad);
      const variation = 0.6583 * Math.sin(2 * degToRad(trueLong - normalizeDeg(PLANET_PARAMS.Sun.L0 + PLANET_PARAMS.Sun.n * d)));
      trueLong = normalizeDeg(trueLong + evection + variation);
    }

    const siderealLong = normalizeDeg(trueLong - ayanamsa);
    positions[planet] = getSignFromLongitude(siderealLong);
  }

  // Asteroid/Centaur Chiron (2060 Chiron) - The Wounded Healer (Prarabdha Wound)
  const chironDays = jd - 2450128.0;
  const chironN = 360 / (50.68 * 365.25);
  const chironE = 0.383;
  const chironPerihelionLong = 191.5;
  const chironM = normalizeDeg(chironN * chironDays);
  
  let chironErad = degToRad(chironM);
  for (let i = 0; i < 15; i++) {
    chironErad = chironErad - (chironErad - chironE * Math.sin(chironErad) - degToRad(chironM)) / (1 - chironE * Math.cos(chironErad));
  }
  const chironSinNu = Math.sqrt(1 - chironE * chironE) * Math.sin(chironErad) / (1 - chironE * Math.cos(chironErad));
  const chironCosNu = (Math.cos(chironErad) - chironE) / (1 - chironE * Math.cos(chironErad));
  const chironNu = radToDeg(Math.atan2(chironSinNu, chironCosNu));
  const chironTrueLong = normalizeDeg(chironPerihelionLong + chironNu - ayanamsa);
  positions.Chiron = getSignFromLongitude(chironTrueLong);

  // Black Moon Lilith (Mean Lunar Apogee - Suppressed Shakti / Shadow)
  const lilithLong = normalizeDeg(83.3532465 + 0.111403524 * d - ayanamsa);
  positions.Lilith = getSignFromLongitude(lilithLong);

  // Lunar Nodes (Rahu / North Node ☊ & Ketu / South Node ☋) in Sidereal Lahiri
  const northNodeLong = normalizeDeg(125.0445479 - 0.0529537648 * d - ayanamsa);
  const southNodeLong = normalizeDeg(northNodeLong + 180.0);
  positions.NorthNode = getSignFromLongitude(northNodeLong);
  positions.SouthNode = getSignFromLongitude(southNodeLong);

  return positions;
}

/**
 * Calculates Sidereal Time, Sidereal Ascendant (Lagna), and Midheaven (MC) using Lahiri Ayanamsa
 */
export function calculateHousesAndAngles(dateObj, latitude = 19.0760, longitude = 72.8777) {
  const jd = getJulianDate(dateObj);
  const d = jd - 2451545.0;
  const T = d / 36525.0;
  const ayanamsa = getLahiriAyanamsa(dateObj);

  // Greenwich Mean Sidereal Time (GMST) with IAU high-precision formula
  let GMST = normalizeDeg(280.46061837 + 360.98564736629 * d + 0.000387933 * (T ** 2) - (T ** 3) / 38710000);
  
  // Local Sidereal Time (LST / RAMC)
  let LST = normalizeDeg(GMST + longitude);
  let ramc = degToRad(LST);

  // True Obliquity of the ecliptic
  const epsDeg = 23.4392911 - (46.8150 / 3600) * T - (0.00059 / 3600) * (T ** 2) + (0.001813 / 3600) * (T ** 3);
  const eps = degToRad(epsDeg);
  const latRad = degToRad(latitude);

  // Midheaven (MC) in Sidereal Lahiri
  let mcRad = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps));
  let mcDeg = normalizeDeg(radToDeg(mcRad) - ayanamsa);

  // Ascendant (Lagna) in Sidereal Lahiri
  let ascRad = Math.atan2(
    Math.cos(ramc),
    -Math.sin(ramc) * Math.cos(eps) - Math.tan(latRad) * Math.sin(eps)
  );
  let ascDeg = normalizeDeg(radToDeg(ascRad) - ayanamsa);

  // House Cusps (Bhava Cusps)
  const houses = {};
  for (let h = 1; h <= 12; h++) {
    let cuspDeg = normalizeDeg(ascDeg + (h - 1) * 30);
    houses[`House_${h}`] = {
      cusp: cuspDeg,
      ...getSignFromLongitude(cuspDeg)
    };
  }

  return {
    ascendant: { ...getSignFromLongitude(ascDeg), degreeExact: ascDeg },
    midheaven: { ...getSignFromLongitude(mcDeg), degreeExact: mcDeg },
    ayanamsa: Math.round(ayanamsa * 100) / 100,
    zodiacSystem: "Sidereal (Lahiri Ayanamsa)",
    houses
  };
}

export function calculateAspects(planets) {
  const ASPECT_TYPES = [
    { name: "Conjunction", angle: 0,   orb: 8, nature: "fusion" },
    { name: "Sextile",     angle: 60,  orb: 5, nature: "opportunity" },
    { name: "Square",      angle: 90,  orb: 7, nature: "friction" },
    { name: "Trine",       angle: 120, orb: 7, nature: "flow" },
    { name: "Opposition",  angle: 180, orb: 8, nature: "polarization" }
  ];

  const aspectList = [];
  const planetNames = Object.keys(planets);

  for (let i = 0; i < planetNames.length; i++) {
    for (let j = i + 1; j < planetNames.length; j++) {
      const p1 = planetNames[i];
      const p2 = planetNames[j];
      const diff = Math.abs(planets[p1].totalLongitude - planets[p2].totalLongitude);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const asp of ASPECT_TYPES) {
        if (Math.abs(angle - asp.angle) <= asp.orb) {
          aspectList.push({
            planet1: p1,
            planet2: p2,
            aspect: asp.name,
            nature: asp.nature,
            orb: Math.round(Math.abs(angle - asp.angle) * 10) / 10,
            angleExact: Math.round(angle * 10) / 10
          });
        }
      }
    }
  }

  return aspectList;
}

/**
 * Core Psychological Dynamics for Celestial Transits over Natal Placements
 */
const TRANSIT_PERSONALITY_DYNAMICS = {
  // PLUTO TRANSITS (Transformation, Deep Psychological Renovation, Personal Power)
  "Pluto-Sun": "Transformação profunda da identidade central, superação de limitações do ego e despertar do poder pessoal autêntico.",
  "Pluto-Moon": "Purificação emocional intensa, libertação de apegos e reestruturação da sua base de segurança psicológica.",
  "Pluto-Mercury": "Raciocínio investigativo aguçado, capacidade de desvendar verdades ocultas e desconstrução de crenças limitantes.",
  "Pluto-Venus": "Metamorfose nos relacionamentos afetivos, magnetismo pessoal intenso e redefinição dos valores mais profundos.",
  "Pluto-Mars": "Força de vontade inabalável, determinação inquebrável e foco incisivo na materialização de metas vitais.",
  "Pluto-Jupiter": "Reavaliação profunda de convicções filosóficas e ambição ética para expandir a sua esfera de influência.",
  "Pluto-Saturn": "Reestruturação sólida de alicerces de vida, desmoronamento do supérfluo e construção de resiliência duradoura.",

  // NEPTUNE TRANSITS (Intuition, Spiritual Sensitivity, Empathy, Creative Imagination)
  "Neptune-Sun": "Despertar da sensibilidade espiritual, transcendência de rigidezes e expressão criativa inspirada e compassiva.",
  "Neptune-Moon": "Intuição anímica profunda, empatia psíquica refinada e necessidade de acolhimento e tranquilidade interior.",
  "Neptune-Mercury": "Imaginação poética vívida, mente intuitiva e capacidade de apreender conceitos holísticos e simbólicos.",
  "Neptune-Venus": "Amor compassivo e idealista, sensibilidade estética elevada e conexão afetiva empática e desinteressada.",
  "Neptune-Mars": "Ação inspirada por propósitos nobres e ideais elevados; convite a evitar dispersão e focar na intuição.",
  "Neptune-Jupiter": "Renovação da fé no caminho da vida, compaixão altruísta e busca de significado espiritual enriquecedor.",
  "Neptune-Saturn": "Harmonização entre ideais espirituais e deveres práticos, dissolvendo medos rígidos com serenidade.",

  // URANUS TRANSITS (Authenticity, Breakthroughs, Awakening, Innovation)
  "Uranus-Sun": "Desejo vibrante de autenticidade, libertação de convenções externas e renovação criativa da autoimagem.",
  "Uranus-Moon": "Quebra de rotinas emocionais estagnadas, busca de independência interior e respostas afetivas espontâneas.",
  "Uranus-Mercury": "Lampejos intuitivos brilhantes, agilidade mental invulgar e abertura a perspetivas inovadoras e originais.",
  "Uranus-Venus": "Estímulo a novos padrões relacionais, valorização da liberdade mútua e atração por experiências singulares.",
  "Uranus-Mars": "Impulso pioneiro súbito, ousadia para romper bloqueios e energia dinâmica para iniciar novos projetos.",
  "Uranus-Jupiter": "Oportunidades inesperadas de expansão, saltos quânticos de visão e libertação de dogmas restritivos.",
  "Uranus-Saturn": "Flexibilização de estruturas antigas, reconciliando tradição e inovação para abrir espaço ao novo.",

  // SATURN TRANSITS (Maturity, Discipline, Pragmatism, Consolidation)
  "Saturn-Sun": "Amadurecimento pessoal, foco em objetivos de longo prazo e consolidação da autoridade e mestria interior.",
  "Saturn-Moon": "Sobriedade e autodisciplina emocional, busca de estabilidade autêntica e maturação do cuidado pessoal.",
  "Saturn-Mercury": "Concentração mental rigorosa, comunicação estruturada e capacidade analítica pragmática e realista.",
  "Saturn-Venus": "Compromisso maduro nas relações, clarificação de valores fundamentais e estabilização de laços afetivos.",
  "Saturn-Mars": "Esforço paciente e estratégico, canalização disciplinada da energia física em trabalho sólido e duradouro.",
  "Saturn-Jupiter": "Equilíbrio realista entre visão e prudência, permitindo o crescimento de projetos com método e consistência.",
  "Saturn-Saturn": "Ciclo de maturação estrutural, alinhamento rigoroso com o propósito de vida e consolidação de destino.",

  // JUPITER TRANSITS (Growth, Optimism, Confidence, Horizon Expansion)
  "Jupiter-Sun": "Expansão da autoconfiança, vitalidade renovada, otimismo contagiante e abertura a realizações expressivas.",
  "Jupiter-Moon": "Conforto afetivo, generosidade interior, sentimento de proteção e bem-estar emocional sustentado.",
  "Jupiter-Mercury": "Ampliação da perspetiva intelectual, mente aberta para novas aprendizagens e comunicação inspiradora.",
  "Jupiter-Venus": "Celebração e harmonia nos relacionamentos, facilidade social e atração de circunstâncias prazerosas e benéficas.",
  "Jupiter-Mars": "Entusiasmo empreendedor, assertividade construtiva e coragem para expandir iniciativas com sucesso.",
  "Jupiter-Jupiter": "Renovação de sorte e fé no percurso de vida, expansão de horizontes culturais, éticos e existenciais.",
  "Jupiter-Saturn": "Oportunidade ideal para expandir projetos com base sólida, unindo ambição visionária e estrutura.",

  // MARS TRANSITS (Drive, Initiative, Assertiveness, Courage)
  "Mars-Sun": "Pico de vitalidade física, determinação firme e coragem para assumir a liderança dos seus projetos de vida.",
  "Mars-Moon": "Expressão emocional assertiva e passional; estímulo para canalizar a energia em ações construtivas e focadas.",
  "Mars-Mercury": "Pensamento incisivo, agilidade verbal e determinação para expressar ideias e defender pontos de vista com clareza.",
  "Mars-Venus": "Intensidade passional, magnetismo relacional e impulso afirmativo para vivenciar o afeto e os desejos.",
  "Mars-Mars": "Revitalização da força de vontade, garra competitiva saudável e espírito pioneiro para novos começos.",
  "Mars-Jupiter": "Ações audaciosas, otimismo impetuoso e motivação vigorosa para assumir riscos calculados.",
  "Mars-Saturn": "Vontade firme aliada à perseverança; excelência para trabalho focado, superando obstáculos com tenacidade.",

  // INNER PLANET TRANSITS (Sun, Venus, Mercury)
  "Sun-Sun": "Renovação da luz interior, clareza sobre o propósito pessoal e revigoramento da vitalidade.",
  "Venus-Sun": "Irradiação de charme, facilidade de expressão pessoal e momentos de harmonia social e afetiva.",
  "Mercury-Sun": "Clareza mental cristalina, facilidade de autoexpressão e foco nas prioridades essenciais."
};

/**
 * Calculates real-time Planetary Transits against a Natal Chart with Psychological Personality Descriptions
 */
export function calculateTransitsAgainstNatal(natalChart, transitDate = new Date()) {
  if (!natalChart || !natalChart.planets) return [];
  const currentPositions = calculatePlanetaryPositions(transitDate);

  const TRANSIT_ASPECTS = [
    { name: "Conjunction", angle: 0,   orb: 4, category: "Fusão & Foco Direto", harmonicType: "conjunction" },
    { name: "Square",      angle: 90,  orb: 3.5, category: "Catalisador de Crescimento & Ajuste", harmonicType: "dynamic" },
    { name: "Opposition",  angle: 180, orb: 4, category: "Polaridade & Clarificação Consciente", harmonicType: "dynamic" },
    { name: "Trine",       angle: 120, orb: 3.5, category: "Fluidez Harmónica & Integração", harmonicType: "flow" },
    { name: "Sextile",     angle: 60,  orb: 2.5, category: "Oportunidade & Cooperação Construtiva", harmonicType: "flow" }
  ];

  const activeTransits = [];
  const transitPlanets = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "NorthNode", "SouthNode"];

  for (const tName of transitPlanets) {
    const tPos = currentPositions[tName];
    if (!tPos) continue;

    for (const [nName, nPos] of Object.entries(natalChart.planets)) {
      // Focus transit calculations on authentic Vedic Navagrahas
      if (["Uranus", "Neptune", "Pluto", "Chiron", "Lilith"].includes(nName)) continue;

      const diff = Math.abs(tPos.totalLongitude - nPos.totalLongitude);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const asp of TRANSIT_ASPECTS) {
        if (Math.abs(angle - asp.angle) <= asp.orb) {
          const pairKey = `${tName}-${nName}`;
          let description = TRANSIT_PERSONALITY_DYNAMICS[pairKey];

          if (!description) {
            // Vedic contextual transit dynamic
            if (tName === "Saturn") description = `Maturação kármica (Shani Gochara), disciplina e consolidação duradoura de ${nName} natal.`;
            else if (tName === "Jupiter") description = `Bênção e expansão dhármica (Guru Gochara), discernimento e abertura para ${nName} natal.`;
            else if (tName === "Mars") description = `Ativação dinâmica, coragem (Mangal / Parakrama) e assertividade sobre ${nName} natal.`;
            else if (tName === "NorthNode") description = `Intensificação cármica (Rahu Gochara), revelação de apegos e inovação sobre ${nName} natal.`;
            else if (tName === "SouthNode") description = `Desapego e libertação espiritual (Ketu Gochara), purificação e desprendimento em torno de ${nName} natal.`;
            else description = `Realce temporário de consciência, clareza e integração com ${nName} natal.`;
          }

          // Nuance based on aspect nature
          if (asp.harmonicType === "flow") {
            description = `✨ Integração fluida: ${description}`;
          } else if (asp.harmonicType === "dynamic") {
            description = `⚡ Catalisador de maturidade: ${description}`;
          } else {
            description = `💥 Foco e intensidade direta: ${description}`;
          }

          activeTransits.push({
            transitingPlanet: tName,
            transitingSign: tPos.sign,
            transitingDegree: `${tPos.degree}° ${tPos.sign}`,
            aspect: asp.name,
            aspectCategory: asp.category,
            harmonicType: asp.harmonicType,
            natalTarget: `${nName} em ${nPos.sign}`,
            natalPlanet: nName,
            natalSign: nPos.sign,
            orb: Math.round(Math.abs(angle - asp.angle) * 10) / 10,
            dynamic: description
          });
        }
      }
    }
  }

  // Sort by tightness of orb (most exact first)
  activeTransits.sort((a, b) => a.orb - b.orb);

  return activeTransits;
}

export function getHouseForDegree(degree, houses) {
  if (!houses) return 1;
  const d = normalizeDeg(degree);
  for (let h = 1; h <= 12; h++) {
    const nextH = h === 12 ? 1 : h + 1;
    const cCurrent = normalizeDeg(houses[`House_${h}`]?.cusp ?? (h - 1) * 30);
    const cNext = normalizeDeg(houses[`House_${nextH}`]?.cusp ?? h * 30);
    
    if (cCurrent < cNext) {
      if (d >= cCurrent && d < cNext) return h;
    } else {
      if (d >= cCurrent || d < cNext) return h;
    }
  }
  return 1;
}

const ROMAN_HOUSES = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export const ZODIAC_PT = {
  Aries: { name: "Mesha (Carneiro)", glyph: "♈", element: "Fogo", modality: "Cardinal", ruler: "Marte (Mangal)" },
  Taurus: { name: "Vrishabha (Touro)", glyph: "♉", element: "Terra", modality: "Fixo", ruler: "Vénus (Shukra)" },
  Gemini: { name: "Mithuna (Gémeos)", glyph: "♊", element: "Ar", modality: "Mutável", ruler: "Mercúrio (Budha)" },
  Cancer: { name: "Karka (Caranguejo)", glyph: "♋", element: "Água", modality: "Cardinal", ruler: "Lua (Chandra)" },
  Leo: { name: "Simha (Leão)", glyph: "♌", element: "Fogo", modality: "Fixo", ruler: "Sol (Surya)" },
  Virgo: { name: "Kanya (Virgem)", glyph: "♍", element: "Terra", modality: "Mutável", ruler: "Mercúrio (Budha)" },
  Libra: { name: "Tula (Balança)", glyph: "♎", element: "Ar", modality: "Cardinal", ruler: "Vénus (Shukra)" },
  Scorpio: { name: "Vrischika (Escorpião)", glyph: "♏", element: "Água", modality: "Fixo", ruler: "Marte (Mangal)" },
  Sagittarius: { name: "Dhanu (Sagitário)", glyph: "♐", element: "Fogo", modality: "Mutável", ruler: "Júpiter (Guru)" },
  Capricorn: { name: "Makara (Capricórnio)", glyph: "♑", element: "Terra", modality: "Cardinal", ruler: "Saturno (Shani)" },
  Aquarius: { name: "Kumbha (Aquário)", glyph: "♒", element: "Ar", modality: "Fixo", ruler: "Saturno (Shani)" },
  Pisces: { name: "Meena (Peixes)", glyph: "♓", element: "Água", modality: "Mutável", ruler: "Júpiter (Guru)" }
};

export const HOUSE_THEMES = {
  1: { title: "1º Bhava (Tanu): Lagna, Identidade & Vitalidade", desc: "A essência do Eu, constituição física, vitalidade corporal e a lente védica da alma." },
  2: { title: "2º Bhava (Dhana): Família, Recursos & Palavra", desc: "Segurança material, linhagem familiar (Kutumba), palavra e valores intrínsecos." },
  3: { title: "3º Bhava (Sahaja): Coragem, Irmãos & Ação", desc: "Força de vontade (Parakrama), iniciativa pioneira, determinação e expressão." },
  4: { title: "4º Bhava (Sukha): Mãe, Paz Interior & Refúgio", desc: "Paz emocional profunda (Sukha), vínculo materno (Matru), coração e ancoragem íntima." },
  5: { title: "5º Bhava (Putra): Mérito Cármico, Intelecto & Criação", desc: "Mérito de vidas passadas (Purva Punya), discernimento intuitivo e centelha criativa." },
  6: { title: "6º Bhava (Ari/Ripu): Desafios, Imunidade & Discernimento", desc: "Resolução de atritos, maestria na disciplina, purificação e hábitos somáticos." },
  7: { title: "7º Bhava (Kalatra): Casamento, Alianças & Parcerias", desc: "Vínculos sagrados (Kalatra), cooperação relacional e espelhos da alma." },
  8: { title: "8º Bhava (Randhra): Transformação, Longevidade & Segredos", desc: "Longevidade (Ayur), mistérios profundos, regeneração psicológica e poder oculto." },
  9: { title: "9º Bhava (Dharma/Bhagya): Sabedoria, Pai & Graça", desc: "Verdade cósmica (Dharma), sabedoria superior, bênçãos ancestrais e expansão espiritual." },
  10: { title: "10º Bhava (Karma): Ação Soberana, Vocação & Legado", desc: "Ação no mundo (Karma), autoridade pública, liderança íntegra e propósito secular." },
  11: { title: "11º Bhava (Labha): Frutos do Karma, Ganhos & Alianças", desc: "Ganhos merecidos (Labha), aspirações elevadas, redes de afinidade e realizações." },
  12: { title: "12º Bhava (Vyaya): Desapego, Vida Interior & Libertação", desc: "Recolhimento sagrado, dissolução do ego, libertação espiritual (Moksha) e transcendência." }
};

export const PLANET_DESCRIPTIONS = {
  Sun: {
    pt: "Sol", glyph: "☉", domain: "Identidade, Vitalidade & Propósito",
    signs: {
      Aries: {
        strengths: "Expressa a sua essência vital com coragem pioneira, iniciativa direta, liderança autêntica e determinação para abrir novos caminhos.",
        challenges: "Tendência à impaciência abrupta, impulsividade reativa, atrito com figuras de autoridade e risco de esgotamento por querer resolver tudo sozinho."
      },
      Taurus: {
        strengths: "Manifesta a vitalidade através da perseverança calma, estabilidade construtiva, apreço sensorial e lealdade sólida.",
        challenges: "Resistência rígida a mudanças imprevistas, teimosia perante novas ideias, apego ao conforto e tendência à inércia perante decisões urgentes."
      },
      Gemini: {
        strengths: "Vitalidade impulsionada pela curiosidade viva, dinamismo intelectual, agilidade comunicativa e facilidade de adaptação.",
        challenges: "Dispersão de energia em múltiplos projetos inacabados, sobrecarga de estímulos mentais, inquietação nervosa e evasão da profundidade emocional."
      },
      Cancer: {
        strengths: "Propósito enraizado na sensibilidade protetora, profunda inteligência intuitiva, acolhimento afetivo e lealdade aos vínculos.",
        challenges: "Hipersensibilidade a recusas ou críticas, tendência a fechar-se numa carapaça defensiva, apego ao passado e absorção das dores alheias."
      },
      Leo: {
        strengths: "Irradia criatividade generosa, autoridade calorosa, nobreza de espírito e capacidade natural de inspirar e elevar quem o rodeia.",
        challenges: "Vulnerabilidade à carência de validação externa, orgulho ferido perante a indiferença e sobrecarga por assumir a responsabilidade total pelo ambiente."
      },
      Virgo: {
        strengths: "Expressa a sua luz através do aperfeiçoamento minucioso, discernimento lúcido, rigor analítico e dedicação ao serviço útil.",
        challenges: "Autocrítica severa e paralisante, exigência perfeccionista desmedida, tensão psicossomática e dificuldade em relaxar o controlo mental."
      },
      Libra: {
        strengths: "Busca a realização na harmonia estética, diplomacia relacional, justiça ponderada e capacidade de construir consensos.",
        challenges: "Indecisão crónica perante encruzilhadas, medo do confronto direto, concessão excessiva das próprias vontades para agradar e dependência da aprovação externa."
      },
      Scorpio: {
        strengths: "Vitalidade magnética e profunda, orientada para a verdade psicológica, soberania interior e formidável capacidade de regeneração pós-crise.",
        challenges: "Desconfiança instintiva, necessidade de controlo defensivo, retenção silenciosa de mágoas e tendência a vivenciar os processos em extremos de tudo ou nada."
      },
      Sagittarius: {
        strengths: "Impulso vital guiado pela expansão da sabedoria, otimismo generoso, visão de horizontes alargados e entusiasmo inspirador.",
        challenges: "Sobredimensionamento de planos, promessas difíceis de cumprir, fuga da rotina detalhada e tendência a dogmatismo ou impaciência com limitações práticas."
      },
      Capricorn: {
        strengths: "Propósito estruturado na mestria pelo tempo, disciplina paciente, integridade inabalável e visão executiva de longo prazo.",
        challenges: "Sobrecarga pelo peso excessivo do dever, rigidez emocional, dificuldade em acolher a própria vulnerabilidade e medo do fracasso material."
      },
      Aquarius: {
        strengths: "Essência visionária e independente, movida por ideais humanitários, pensamento vanguardista e liberdade autêntica de ser.",
        challenges: "Distanciamento frio perante emoções íntimas, rebeldia por princípio, isolamento intelectual e desconexão das necessidades emocionais do quotidiano."
      },
      Pisces: {
        strengths: "Vitalidade tecida em compaixão universal, imaginação poética, sensibilidade mística e profunda empatia curativa.",
        challenges: "Dificuldade extrema em estabelecer limites energéticos, tendência ao escapismo perante realidades duras, absorção de negatividade coletiva e sensação de desamparo."
      }
    },
    remedy: "Oak (Resiliência Equilibrada) / Hornbeam (Vitalidade Renovada)"
  },
  Moon: {
    pt: "Lua", glyph: "☽", domain: "Mundo Emocional & Necessidades Íntimas",
    signs: {
      Aries: {
        strengths: "Reações emocionais imediatas, espontâneas e corajosas; rápida recuperação anímica e clareza instintiva.",
        challenges: "Reatividade emocional intempestiva, impaciência com processos lentos e tendência a criar atrito defensivo ao sentir-se vulnerável."
      },
      Taurus: {
        strengths: "Serenidade afetiva, estabilidade nos laços íntimos e grande capacidade de oferecer segurança e aconchego tangível.",
        challenges: "Apego tenaz a situações caducas por medo da instabilidade e resistência a expressar mágoas até atingir o limite."
      },
      Gemini: {
        strengths: "Leveza emocional, capacidade de dialogar abertamente e transformar sentimentos densos em reflexão clara e partilha.",
        challenges: "Racionalização excessiva de emoções viscerais, inquietação anímica e evasão da intimidade mais profunda através da conversa superficial."
      },
      Cancer: {
        strengths: "Acolhimento afetivo profundo, intuição psíquica aguçada, empatia protetora e devoção incondicional aos entes queridos.",
        challenges: "Mudanças de humor cíclicas, apego a mágoas antigas, medo constante de rejeição ou perda e tendência a manipular pelo silêncio."
      },
      Leo: {
        strengths: "Coração generoso, lealdade apaixonada, entusiasmo caloroso e capacidade de celebrar as pessoas amadas com brilho.",
        challenges: "Necessidade constante de reconhecimento afetivo, dramatização de feridas de ego e bloqueio em admitir carências íntimas."
      },
      Virgo: {
        strengths: "Cuidado prático exemplar, apoio atento às necessidades do dia a dia e dedicação atenciosa à saúde e bem-estar do outro.",
        challenges: "Ansiedade somatizada no corpo, tendência a analisar em excesso os sentimentos em vez de os viver e crítica ansiosa perante a desordem emocional."
      },
      Libra: {
        strengths: "Graça relacional, sensibilidade para com o ponto de vista alheio e talento para apaziguar conflitos e criar paz doméstica.",
        challenges: "Ansiedade perante o desacordo, repressão da própria raiva para manter uma fachada pacífica e perda da identidade em dinâmicas de dependência."
      },
      Scorpio: {
        strengths: "Lealdade incondicional, perceção do que está oculto e formidável poder de cura e regeneração emocional nas tempestades da vida.",
        challenges: "Hipersensibilidade defensiva, tempestades emocionais internas não verbalizadas, medo de traição e tendência ao ciúme ou controlo."
      },
      Sagittarius: {
        strengths: "Instinto emocional livre e esperançoso, generosidade de espírito e procura de significado positivo em qualquer adversidade.",
        challenges: "Fuga ou negação de sentimentos de tristeza/conflito, inquietação perante compromissos asfixiantes e evasão do luto emocional."
      },
      Capricorn: {
        strengths: "Solidez inabalável nas crises, proteção responsável e maturidade que transmite segurança e estabilidade aos outros.",
        challenges: "Repressão severa da própria vulnerabilidade, sentimento de isolamento interior ('tenho de aguentar tudo sozinho') e dificuldade em pedir ajuda."
      },
      Aquarius: {
        strengths: "Perspetiva ampla sobre os sentimentos, respeito pela liberdade mútua e apoio leal à singularidade do parceiro.",
        challenges: "Dificuldade de conexão íntima visceral, desligamento emocional súbito quando a intensidade aumenta e medo de perder a independência."
      },
      Pisces: {
        strengths: "Sensibilidade oceânica e empática, compaixão curativa, capacidade de perdoar e ligação intuitiva com a alma das pessoas.",
        challenges: "Vulnerabilidade à sobrecarga energética, papel de salvador ou vítima nas relações, confusão de limites e tendência a dissolver-se nos problemas alheios."
      }
    },
    remedy: "Clematis (Presença Conectada) / Chicory (Amor Incondicional)"
  },
  Mercury: {
    pt: "Mercúrio", glyph: "☿", domain: "Intelecto, Comunicação & Aprendizagem",
    signs: {
      Aries: {
        strengths: "Raciocínio veloz, comunicação assertiva, franca e sem rodeios; foco em soluções práticas instantâneas.",
        challenges: "Comunicação por vezes brusca ou cortante, pouca paciência para explicações detalhadas e conclusões precipitadas."
      },
      Taurus: {
        strengths: "Pensamento deliberado, metódico e prático; assimilação duradoura de conceitos orientados para resultados tangíveis.",
        challenges: "Lentidão para mudar de opinião perante novas evidências, resistência a abordagens teóricas abstratas e rigidez mental."
      },
      Gemini: {
        strengths: "Agilidade mental suprema, versatilidade linguística e facilidade excecional para cruzar informações de diversas áreas.",
        challenges: "Hiperatividade mental, sobrecarga de pensamentos paralelos, dificuldade de concentração sustentada e tagarelice ansiosa."
      },
      Cancer: {
        strengths: "Mente intuitiva e percetiva; comunicação colorida pela empatia, memória prodigiosa e inteligência contextual.",
        challenges: "Tomar divergências intelectuais como ataques pessoais, raciocínio condicionado por estados emocionais e dificuldade de distanciamento objetivo."
      },
      Leo: {
        strengths: "Comunicação carismática, calorosa e expressiva; pensamento com visão grandiosa e poder de persuasão inspirador.",
        challenges: "Dificuldade em aceitar pontos de vista contrários sem ferir o ego, tendência a monopolizar o diálogo e dramatização das narrativas."
      },
      Virgo: {
        strengths: "Supremo rigor analítico, precisão terminológica e capacidade excecional de sistematizar e depurar processos complexos.",
        challenges: "Obsessão por detalhes irrelevantes, paralisia por análise, preocupação obsessiva e crítica desgastante sobre imperfeições."
      },
      Libra: {
        strengths: "Pensamento ponderado e dialético; comunicação refinada, diplomática e orientada para a procura de consensos justos.",
        challenges: "Hesitação interminável ao pesar prós e contras, ambivalência na argumentação e relutância em assumir posições firmes."
      },
      Scorpio: {
        strengths: "Mente investigativa de raio-X; capacidade de desvendar segredos, motivações ocultas e psicologias subterrâneas.",
        challenges: "Pensamentos obsessivos, suspeita constante de segundas intenções, sarcasmo defensivo e fixação em mágoas passadas."
      },
      Sagittarius: {
        strengths: "Visão conceptual holística; interesse em grandes filosofias, sínteses interdisciplinares e expansão de perspetivas.",
        challenges: "Generalizações excessivas, desatenção a cláusulas e detalhes práticos e tendência a impor a sua verdade como absoluta."
      },
      Capricorn: {
        strengths: "Raciocínio estratégico e pragmático; foco na viabilidade factual, organização lógica e pensamento a longo prazo.",
        challenges: "Pessimismo reflexivo, ceticismo excessivo que trava ideias inovadoras e comunicação excessivamente austera ou fria."
      },
      Aquarius: {
        strengths: "Pensamento inovador e não-linear; comunicação original, conceitos futuristas e apreço pelo pensamento independente.",
        challenges: "Teimosia intelectual disfarçada de racionalidade, desdém por convenções práticas e relutância em explicar o seu raciocínio passo a passo."
      },
      Pisces: {
        strengths: "Comunicação poética, intuitiva e metafórica; raciocínio não-verbal sensível à música, imagens e atmosferas subtis.",
        challenges: "Confusão factual, dificuldade em estruturar ideias de forma linear e tendência a perder-se em devaneios ou esquecimentos."
      }
    },
    remedy: "Cerato (Confiança no Discernimento) / White Chestnut (Quietude Mental)"
  },
  Venus: {
    pt: "Vénus", glyph: "♀", domain: "Valores, Afeto & Harmonia",
    signs: {
      Aries: {
        strengths: "Expressão afetiva direta, apaixonada e audaz; atração pelo dinamismo, espontaneidade e conquista mútua.",
        challenges: "Perda rápida de interesse após a fase inicial de conquista, competitividade no relacionamento e intolerância à rotina afetiva."
      },
      Taurus: {
        strengths: "Amor sensual, leal e enraizado; profunda apreciação da beleza natural, do conforto e da estabilidade partilhada.",
        challenges: "Possessividade material ou afetiva, relutância em renegociar dinâmicas relacionais e apego por comodismo."
      },
      Gemini: {
        strengths: "Afeto nutrido pela cumplicidade mental, conversas estimulantes, leveza social e partilha de curiosidades.",
        challenges: "Dificuldade em aprofundar compromissos afetivos que exigem confronto emocional e tendência à ambivalência amorosa."
      },
      Cancer: {
        strengths: "Amor protetor, carinhoso e devotado; valoriza a intimidade acolhedora, a lealdade familiar e o aconchego seguro.",
        challenges: "Apego dependente, chantagem emocional subtil quando se sente inseguro e medo paralisante de abandono."
      },
      Leo: {
        strengths: "Afeto exuberante, romântico e radiante; generosidade exuberante e valorização do respeito e nobreza no vínculo.",
        challenges: "Exigência de adoração constante do parceiro, orgulho dramático quando contrariado e tendência a competir pelo protagonismo."
      },
      Virgo: {
        strengths: "Expressa o carinho através do cuidado prático, atenção aos detalhes e dedicação leal ao bem-estar do outro.",
        challenges: "Manifestação de afeto através de críticas corretivas, inibição da espontaneidade corporal e ansiedade sobre a perfeição do vínculo."
      },
      Libra: {
        strengths: "Apreciação sublime da harmonia, elegância relacional, justiça e parcerias baseadas na reciprocidade consciente.",
        challenges: "Terror da solidão, tolerância a relações desequilibradas apenas para evitar a rutura e dependência da validação estética."
      },
      Scorpio: {
        strengths: "Vínculos magnéticos de entrega total e intimidade visceral; valoriza a lealdade inegociável e a verdade emocional.",
        challenges: "Ciúme corrosivo, dinâmicas de teste e desconfiança constante, medo de traição e tendência à manipulação emocional."
      },
      Sagittarius: {
        strengths: "Amor aventureiro, alegre e expansivo; atração por parceiros que inspiram crescimento e partilha de ideais.",
        challenges: "Fobia ao compromisso rotineiro, idealização irrealista do parceiro e tendência a fugir quando surgem responsabilidades pesadas."
      },
      Capricorn: {
        strengths: "Afeto maduro, sólido e duradouro; valoriza a integridade, o respeito mútuo e a construção de projetos partilhados.",
        challenges: "Frieza ou reserva excessiva no início dos laços, abordagem contratual ao amor e medo de demonstrar vulnerabilidade."
      },
      Aquarius: {
        strengths: "Relacionamentos baseados na amizade genuína, liberdade mútua, respeito pelas singularidades e ideais humanitários.",
        challenges: "Desconforto com exigências de intimidade tradicional, tendência a racionalizar o amor e distanciamento perante dramas emocionais."
      },
      Pisces: {
        strengths: "Devoção compassiva e romântica sem limites; capacidade de amar com empatia transcendente e sensibilidade lírica.",
        challenges: "Idealização cega do outro, atração por pessoas problemáticas para salvar, auto-sacrifício tóxico e falta de limites claros."
      }
    },
    remedy: "Water Violet (Abertura Íntima) / Centaury (Limites Harmoniosos)"
  },
  Mars: {
    pt: "Marte", glyph: "♂", domain: "Ação, Coragem & Impulso Executivo",
    signs: {
      Aries: {
        strengths: "Força motriz pura, iniciativa pioneira e capacidade formidável de abrir caminhos com assertividade destemida.",
        challenges: "Explosões de raiva súbitas, atrito desnecessário, dificuldade em sustentar projetos a longo prazo e intolerância a atrasos."
      },
      Taurus: {
        strengths: "Determinação incansável, força de tração persistente e capacidade inabalável de sustentar o esforço até à meta final.",
        challenges: "Grande lentidão para iniciar novas ações, fúria acumulada que explode destrutivamente e teimosia cega perante erros táticos."
      },
      Gemini: {
        strengths: "Ação ágil e multifacetada; canaliza a energia para o debate inteligente, dinamismo intelectual e destreza.",
        challenges: "Dispersão de energia em confrontos verbais estéreis, ansiedade motora e dificuldade em focar a ação num único objetivo."
      },
      Cancer: {
        strengths: "Ação motivada pela proteção dos seus; força tenaz quando se trata de defender os seus valores e entes queridos.",
        challenges: "Agressividade passiva, evasão do confronto direto através de amuos e ação condicionada por oscilações emocionais."
      },
      Leo: {
        strengths: "Coragem dramática e nobreza de ação; dinamismo criativo movido pelo coração e pela autoconfiança solar.",
        challenges: "Autoritarismo quando contestado, atitudes teatrais desmedidas e gasto excessivo de energia apenas para impressionar."
      },
      Virgo: {
        strengths: "Energia aplicada com método e precisão cirúrgica; foco na eficácia prática e resolução inteligente de problemas.",
        challenges: "Perfeccionismo paralisante, irritabilidade com a incompetência alheia e tensão nervosa por sobrecarga de trabalho minucioso."
      },
      Libra: {
        strengths: "Ação ponderada e estratégica; luta com diplomacia e inteligência tática pela justiça e pelo equilíbrio.",
        challenges: "Hesitação na tomada de ação firme, medo de desagradar que trava a assertividade e conflito interno sobre usar a força."
      },
      Scorpio: {
        strengths: "Determinação inabalável, intensidade estratégica e capacidade formidável de superação e resiliência em crises profundas.",
        challenges: "Rancor e vingatividade secreta, controlo obsessivo da situação e tendência a usar o poder de forma implacável."
      },
      Sagittarius: {
        strengths: "Energia expansiva, aventureira e entusiasta; ação inspirada por ideais éticos e exploração de novos horizontes.",
        challenges: "Dispersão de forças em demasiadas frentes, imprudência física ou financeira e agressividade na defesa de crenças pessoais."
      },
      Capricorn: {
        strengths: "Ambição controlada, disciplina férrea e execução estratégica orientada para resultados monumentais e duradouros.",
        challenges: "Frieza calculista na busca de objetivos, repressão do descanso e tendência a atropelar necessidades humanas em prol do dever."
      },
      Aquarius: {
        strengths: "Ação orientada para reformas sociais e soluções vanguardistas; impulso inovador que desafia convenções estéreis.",
        challenges: "Rebeldia errática, impaciência com regras tradicionais e dificuldade em colaborar em equipas hierarquizadas."
      },
      Pisces: {
        strengths: "Ação subtil, compassiva e fluida; canaliza a energia para causas altruístas, artes inspiradas e cura compassiva.",
        challenges: "Falta de assertividade no mundo prático, tendência a fugir do confronto, autossabotagem e sensação de desmotivação."
      }
    },
    remedy: "Impatiens (Paciência Criativa) / Holly (Assertividade Compassiva)"
  },
  Jupiter: {
    pt: "Júpiter", glyph: "♃", domain: "Expansão, Sabedoria & Oportunidades",
    signs: {
      Aries: {
        strengths: "Crescimento através da iniciativa audaz, coragem de começar do zero e fé no poder da liderança pessoal.",
        challenges: "Excesso de autoconfiança que descumpre limites, arrogância pioneira e tomada de riscos imprudentes."
      },
      Taurus: {
        strengths: "Expansão pela via da fertilidade material, apreciação da natureza e consolidação de recursos abundantes.",
        challenges: "Tendência a excessos materiais, complacência e relutância em arriscar fora da zona de conforto."
      },
      Gemini: {
        strengths: "Prosperidade através da partilha de conhecimento, pensamento polímata e redes de aprendizagem ativa.",
        challenges: "Superficialidade por acumulação excessiva de dados sem síntese prática e tagarelice dispersiva."
      },
      Cancer: {
        strengths: "Abundância e sabedoria nutridas pela empatia, proteção da comunidade e inteligência emocional generosa.",
        challenges: "Protecionismo sufocante, excesso de apego e dificuldade em libertar os outros para as suas próprias jornadas."
      },
      Leo: {
        strengths: "Expansão pela via da expressão criativa, generosidade régia, entusiasmo radiante e autovalorização nobre.",
        challenges: "Megalomania, vaidade excessiva e esbanjamento de recursos para sustentar uma imagem grandiosa."
      },
      Virgo: {
        strengths: "Crescimento sustentável pelo trabalho consciente, mestria no detalhe e aperfeiçoamento de sistemas úteis.",
        challenges: "Perda da visão de conjunto por foco obsessivo no erro e ceticismo que trava a verdadeira fé expansiva."
      },
      Libra: {
        strengths: "Sabedoria floresce através da diplomacia, equilíbrio estético, mediação de conflitos e alianças estratégicas.",
        challenges: "Indecisão moral por querer agradar a todos os lados e dependência excessiva da aprovação dos parceiros."
      },
      Scorpio: {
        strengths: "Expansão profunda através da regeneração pessoal, compreensão das leis psíquicas e coragem perante a sombra.",
        challenges: "Obsessão por poder psicológico, desconfiança paranoica e atração por jogos de manipulação nas crises."
      },
      Sagittarius: {
        strengths: "Fé radiante no potencial humano, busca inesgotável da verdade filosófica e visão de horizontes infinitos.",
        challenges: "Dogmatismo cego, excesso de otimismo que descura a realidade e fuga das responsabilidades mundanas."
      },
      Capricorn: {
        strengths: "Realização sólida através da integridade institucional, ambição responsável e legado de maturidade temporal.",
        challenges: "Ambição austera e implacável, materialismo rígido e incapacidade de celebrar as vitórias com leveza."
      },
      Aquarius: {
        strengths: "Crescimento através de causas progressistas, inovação tecnológica com propósito humano e fraternidade universal.",
        challenges: "Utopismo impraticável, dogmatismo ideológico e falta de consideração pelas emoções individuais concretas."
      },
      Pisces: {
        strengths: "Sabedoria mística transcendente, graça compassiva, fé espiritual inabalável e abertura ao mistério cósmico.",
        challenges: "Ilusão, credulidade excessiva perante promessas falsas e tendência a perder o discernimento na realidade material."
      }
    },
    remedy: "Vervain (Entusiasmo Harmonioso) / Gentian (Fé Inabalável)"
  },
  Saturn: {
    pt: "Saturno", glyph: "♄", domain: "Estrutura, Mestria & Responsabilidade",
    signs: {
      Aries: {
        strengths: "Aprendizagem da paciência e da autodisciplina; canaliza o impulso ardente em coragem estruturada e foco maduro.",
        challenges: "Medo profundo de fracassar na liderança, repressão da própria assertividade ou explosões quando a pressão acumula."
      },
      Taurus: {
        strengths: "Construção de alicerces materiais inabaláveis; relação consciente e sustentável com os recursos e valores de vida.",
        challenges: "Medo crónico de escassez financeira, apego extremo aos bens e avareza emocional por medo da perda."
      },
      Gemini: {
        strengths: "Rigor intelectual e comunicação responsável; disciplina na pesquisa e estruturação de ideias complexas.",
        challenges: "Inibição da comunicação espontânea, medo de ser considerado superficial e cinismo intelectual."
      },
      Cancer: {
        strengths: "Maturidade emocional e responsabilidade nos laços familiares; criação de uma âncora interna de autossegurança.",
        challenges: "Dificuldade severa em expressar afeto caloroso, couraça defensiva e sentimento inconsciente de abandono na infância."
      },
      Leo: {
        strengths: "Aprende a fundar a sua autovalidação no mérito real e na mestria criativa interior, sem depender de aplausos externos.",
        challenges: "Medo do ridículo ou da rejeição criativa, bloqueio na autoexpressão e austeridade que sufoca a espontaneidade."
      },
      Virgo: {
        strengths: "Mestria da precisão e do serviço; disciplina exemplar na saúde, no método de trabalho e no discernimento diário.",
        challenges: "Hipocondria, perfeccionismo angustiante, rigidez nas rotinas e sensação crónica de que nada está suficientemente bom."
      },
      Libra: {
        strengths: "Compromisso maduro nas relações; consciência ética nos contratos humanos e procura de justiça equitativa.",
        challenges: "Fobia ao compromisso íntimo ou, inversamente, permanência em relações frias apenas por obrigação formal."
      },
      Scorpio: {
        strengths: "Domínio e soberania sobre as crises emocionais; poder de contenção, integridade psicológica e cura profunda.",
        challenges: "Medo paralisante da vulnerabilidade e da traição, controlo obsessivo e repressão de desejos viscerais."
      },
      Sagittarius: {
        strengths: "Estruturação de um sistema ético e filosófico robusto; dedicação ao conhecimento autêntico e sabedoria vivida.",
        challenges: "Ceticismo rígido, medo do desconhecido e apego a dogmas morais estritos como defesa contra a dúvida."
      },
      Capricorn: {
        strengths: "Capacidade de realização máxima; liderança natural forjada no tempo, responsabilidade exemplar e autoridade moral.",
        challenges: "Rigidez severa consigo mesmo e com os outros, vício no trabalho (workaholismo) e sacrifício da vida pessoal pelo dever."
      },
      Aquarius: {
        strengths: "Responsabilidade para com a comunidade e o futuro; estruturação prática de reformas e inovações sistémicas.",
        challenges: "Sentimento de rejeição social, isolamento frio e defesa dogmática de teorias sem contacto com o coração humano."
      },
      Pisces: {
        strengths: "Integração prática da espiritualidade e da compaixão; ancoragem lúcida dos ideais transcendentais na realidade terrena.",
        challenges: "Culpa existencial inconsciente, medo de desilusão e tendência a erguer barreiras rígidas para não ser magoado."
      }
    },
    remedy: "Larch (Autoconfiança Sólida) / Pine (Aceitação & Libertação da Culpa)"
  },
  Uranus: {
    pt: "Úrano", glyph: "♅", domain: "Originalidade, Intuição & Rutura",
    signs: {
      Aries: {
        strengths: "Inovação explosiva e espírito vanguardista; pioneirismo revolucionário que quebra barreiras com arrojo.",
        challenges: "Rebeldia caótica, impulsividade destrutiva e incapacidade de cooperar com processos estabelecidos."
      },
      Taurus: {
        strengths: "Revolução na relação com a matéria e o valor; novas abordagens ecológicas, tecnológicas e sustentáveis.",
        challenges: "Ansiedade perante a instabilidade material e ruturas súbitas nas rotinas de conforto."
      },
      Gemini: {
        strengths: "Centelhas de intuição mental relâmpago; criação de novas linguagens e canais de transmissão de conhecimento.",
        challenges: "Tensão nervosa aguda, insónia por excesso de ideias elétricas e comunicação errática."
      },
      Cancer: {
        strengths: "Renovação dos conceitos de lar, família e pertença; liberdade emocional e laços baseados em afinidade de alma.",
        challenges: "Cortes emocionais abruptos com a família e instabilidade no refúgio íntimo."
      },
      Leo: {
        strengths: "Originalidade criativa sem filtros; expressão artística autêntica que desmantela convenções estéticas rígidas.",
        challenges: "Excentricidade forçada apenas para chocar e dificuldade em partilhar o palco criativo."
      },
      Virgo: {
        strengths: "Inovação tecnológica aplicada à saúde, medicina holística, análise de dados e sistemas de bem-estar integral.",
        challenges: "Ansiedade extrema com métodos fora do padrão e tensão nervosa ligada a processos somáticos."
      },
      Libra: {
        strengths: "Novos paradigmas relacionais; equidade absoluta nas parcerias e diplomacia inovadora sem hierarquias caducas.",
        challenges: "Instabilidade súbita nas parcerias, aversão ao compromisso tradicional e ruturas imprevistas nos vínculos."
      },
      Scorpio: {
        strengths: "Regeneração psíquica profunda; desvelamento de tabus e rutura libertadora com apegos emocionais limitantes.",
        challenges: "Crises psíquicas abruptas, compulsão por cortes drásticos e atrito com dinâmicas de poder."
      },
      Sagittarius: {
        strengths: "Intuição filosófica expansiva; quebra de dogmas e abertura a sínteses cosmológicas universais.",
        challenges: "Inquietação constante que impede a fixação num caminho e extremismo ideológico."
      },
      Capricorn: {
        strengths: "Reestruturação de sistemas e instituições arcaicas; engenharia de modelos sustentáveis para o futuro.",
        challenges: "Tensão entre o dever tradicional e o impulso de rutura, gerando conflitos profissionais súbitos."
      },
      Aquarius: {
        strengths: "Visão futurista no seu auge; fraternidade planetária, redes descentralizadas e emancipação da consciência.",
        challenges: "Desapego frio da realidade presente e sensação de alienação em relação ao meio circundante."
      },
      Pisces: {
        strengths: "Despertar místico e sensibilidade quântica; intuição artística transcendental que conecta mundos.",
        challenges: "Desorientação psíquica perante estímulos caóticos e tendência à dispersão espiritual."
      }
    },
    remedy: "Scleranthus (Equilíbrio Dinâmico) / Rock Water (Flexibilidade Interior)"
  },
  Neptune: {
    pt: "Neptuno", glyph: "♆", domain: "Espiritualidade, Imaginação & Empatia",
    signs: {
      Aries: {
        strengths: "Idealismo heroico e sensibilidade combativa orientada para causas compassivas e inspiração pioneira.",
        challenges: "Luta por causas ilusórias, quixotismo e desilusão quando os ideais embatem na realidade prática."
      },
      Taurus: {
        strengths: "Sensibilidade sensorial poética; conexão mística com a Terra e espiritualização da matéria e da arte.",
        challenges: "Letargia por indulgência sensorial e desilusão com perdas de segurança material."
      },
      Gemini: {
        strengths: "Imaginação mental fluida; intuição verbal, poesia inspirada e capacidade de comunicar verdades subtis.",
        challenges: "Dispersão ilusória, autoengano intelectual e dificuldade em discernir facto de ficção."
      },
      Cancer: {
        strengths: "Intuição oceânica e telepatia afetiva; conexão profunda com as memórias da alma e a linhagem compassiva.",
        challenges: "Vulnerabilidade extrema ao contágio de atmosferas psíquicas pesadas e melancolia sem causa aparente."
      },
      Leo: {
        strengths: "Imaginação artística sublime; capacidade de projetar sonhos e inspirar a alma coletiva através do amor e da arte.",
        challenges: "Idealização inflacionada de si mesmo e desilusões amargas perante o fracasso dos sonhos grandiosos."
      },
      Virgo: {
        strengths: "Espiritualização do quotidiano; dedicação ao trabalho de cura, serviço compassivo e medicina holística.",
        challenges: "Somatização de ansiedades coletivas e sentimento de culpa por não conseguir curar tudo."
      },
      Libra: {
        strengths: "Ideal de harmonia e beleza transcendental nos relacionamentos; sensibilidade estética sublime e refinamento ético.",
        challenges: "Projeção de perfeição irreal no parceiro, levando inevitavelmente a desilusões amorosas."
      },
      Scorpio: {
        strengths: "Percepção mística dos mistérios da vida e da morte; poder de transmutação psíquica através do amor incondicional.",
        challenges: "Atração por ilusões emocionais destrutivas e tendência a perder-se em labirintos psicológicos obscuros."
      },
      Sagittarius: {
        strengths: "Visão espiritual universalista; aspiração por uma verdade que transcende fronteiras religiosas ou culturais.",
        challenges: "Fanatismo espiritual ingénuo, crença em falsos gurus e desfasamento do quotidiano terreno."
      },
      Capricorn: {
        strengths: "Capacidade de dar forma material e arquitetura prática a sonhos e visões espirituais coletivas.",
        challenges: "Desilusão com instituições corrompidas e cinismo defensivo perante o idealismo."
      },
      Aquarius: {
        strengths: "Idealismo humanitário planetário; sensibilidade para a consciência de rede e fraternidade global.",
        challenges: "Desconexão das necessidades humanas reais em prol de causas abstratas distantes."
      },
      Pisces: {
        strengths: "Oceano de compaixão mística na sua plenitude; dissolução de limites ilusórios e união com a totalidade cósmica.",
        challenges: "Falta absoluta de defesas psíquicas, vitimização, tendência a fugas aditivas ou evasão da vida terrena."
      }
    },
    remedy: "Aspen (Proteção Sutil) / Honeysuckle (Presença no Agora)"
  },
  Pluto: {
    pt: "Plutão", glyph: "♇", domain: "Poder de Regeneração & Renascimento",
    signs: {
      Aries: {
        strengths: "Poder de renascimento pela coragem visceral; capacidade de emergir das cinzas com força e iniciativa redobradas.",
        challenges: "Tendência a crises de autoafirmação destrutiva e confronto brutal de poder."
      },
      Taurus: {
        strengths: "Transformação radical das bases materiais e dos apegos; poder inabalável de regeneração e estabilidade interior.",
        challenges: "Apego obsessivo ao controlo financeiro e terror visceral perante perdas materiais."
      },
      Gemini: {
        strengths: "Poder investigativo da palavra e da mente; capacidade de transformar a consciência coletiva pela verdade factual.",
        challenges: "Uso da comunicação como arma de manipulação psicológica e obsessão por desmascarar os outros."
      },
      Cancer: {
        strengths: "Cura profunda de feridas ancestrais e laços emocionais inconscientes; soberania e proteção incondicional.",
        challenges: "Padrões de controlo emocional sufocante no lar e medo visceral de perda dos entes queridos."
      },
      Leo: {
        strengths: "Transmutação do ego em nobreza de coração; poder magnético de liderança transformadora e irradiação criativa.",
        challenges: "Lutas de ego destrutivas e compulsão por dominar o palco social a qualquer custo."
      },
      Virgo: {
        strengths: "Poder de cura cirúrgica e regeneração através da purificação consciente do corpo, da mente e dos processos diários.",
        challenges: "Obsessão por limpeza, controlo biológico do corpo e ansiedade compulsiva por contaminação."
      },
      Libra: {
        strengths: "Transformação dos padrões relacionais e códigos de justiça; criação de vínculos baseados na verdade autêntica.",
        challenges: "Dinâmicas tóxicas de poder e submissão nos relacionamentos íntimos."
      },
      Scorpio: {
        strengths: "Soberania máxima sobre as forças de metamorfose; poder psíquico de cura profunda e transcendência de crises.",
        challenges: "Obsessão por controlo absoluto, paranoia defensiva e tendência a destruir o que ama por medo de ser destruído."
      },
      Sagittarius: {
        strengths: "Transformação de crenças limitantes; expansão do poder da consciência através da busca destemida pela verdade.",
        challenges: "Fanatismo dogmático e imposição impiedosa de convicções filosóficas ou morais."
      },
      Capricorn: {
        strengths: "Poder de reconstrução estrutural; dissolução de estruturas caducas e ereção de novos pilares de integridade.",
        challenges: "Autoritarismo implacável, obsessão por status e medo paralisante da perda de autoridade."
      },
      Aquarius: {
        strengths: "Transformação dos modelos sociais e da consciência coletiva; poder de emancipação comunitária e inovação.",
        challenges: "Extremismo ideológico e frieza implacável perante quem não partilha a sua visão de futuro."
      },
      Pisces: {
        strengths: "Cura cármica e transmutação espiritual de dores coletivas através da compaixão cósmica e da redenção da alma.",
        challenges: "Sentimento de impotência existencial e tendência a atrair experiências cármicas de sacrifício."
      }
    },
    remedy: "Sweet Chestnut (Luz nas Transições) / Walnut (Proteção e Mudança Soberana)"
  },
  Ascendant: {
    pt: "Ascendente", glyph: "ASC", domain: "Presença, Lente de Vida & Vitalidade",
    signs: {
      Aries: {
        strengths: "Projeta uma presença direta, corajosa e dinâmica; aborda a vida com iniciativa destemida e prontidão para a ação.",
        challenges: "Aparência de agressividade ou precipitação perante os outros e tendência a reagir defensivamente antes de ouvir."
      },
      Taurus: {
        strengths: "Presença serena, magnética e estável; transmite calma e solidez, avançando na vida com ritmo orgânico e firmeza.",
        challenges: "Lentidão visível para reagir a urgências e impressão de inflexibilidade ou teimosia na postura inicial."
      },
      Gemini: {
        strengths: "Presença ágil, expressiva e sociável; facilidade inata para criar pontes de diálogo e descontrair qualquer ambiente.",
        challenges: "Inquietação física/nervosa evidente e impressão de inconstância ou superficialidade nas primeiras impressões."
      },
      Cancer: {
        strengths: "Presença acolhedora, sensível e atenta; abordagem protetora à vida com uma aura de gentileza e intuição afetiva.",
        challenges: "Postura inicial hiper-defensiva, timidez retraída e suscetibilidade imediata a qualquer olhar ou tom de voz."
      },
      Leo: {
        strengths: "Presença magnânima, carismática e radiante; entra nos ambientes com calor natural, dignidade e espontaneidade generosa.",
        challenges: "Tendência a monopolizar a atenção e vulnerabilidade excessiva quando o seu brilho não é expressamente reconhecido."
      },
      Virgo: {
        strengths: "Presença atenta, discreta e inteligente; postura de discernimento lúcido, elegância prática e prontidão para colaborar.",
        challenges: "Aparência de reserva crítica excessiva, timidez ansiosa e tendência a focar no que está desalinhado no ambiente."
      },
      Libra: {
        strengths: "Presença harmoniosa, diplomática e refinada; abordagem à vida pautada pela procura de beleza, equilíbrio e gentileza.",
        challenges: "Sorriso defensivo que mascara tensões internas e hesitação visível em assumir decisões perante o público."
      },
      Scorpio: {
        strengths: "Presença magnética, penetrante e reservada; olhar que capta o invisível com uma força interna que impõe respeito natural.",
        challenges: "Aura de desconfiança inicial, postura intimidante ou fechada e dificuldade em relaxar a guarda defensiva."
      },
      Sagittarius: {
        strengths: "Presença alegre, aberta e expansiva; aura de otimismo contagiante que encara cada dia como uma aventura inspiradora.",
        challenges: "Exagero nas reações, franqueza que magoa sem intenção e agitação constante que rejeita limites normais."
      },
      Capricorn: {
        strengths: "Presença madura, estruturada e confiável; postura de autoridade tranquila, integridade evidente e foco firme.",
        challenges: "Aspeto austero ou inacessível à primeira vista, sobriedade que inibe os outros e dificuldade em sorrir espontaneamente."
      },
      Aquarius: {
        strengths: "Presença original, vanguardista e autêntica; abordagem inovadora à vida que valoriza a singularidade e a liberdade.",
        challenges: "Distanciamento frio inicial, impressão de excentricidade desinteressada e resistência a protocolos sociais convencionais."
      },
      Pisces: {
        strengths: "Presença etérea, gentil e compassiva; olhar lírico sobre a existência que transmite empatia, serenidade e imaginação.",
        challenges: "Aparência de distração ou ausência da realidade presente, vulnerabilidade à absorção de tensões alheias e fragilidade somática."
      }
    },
    remedy: "Mimulus (Coragem Serena) / Agrimony (Autenticidade Pura)"
  },
  Midheaven: {
    pt: "Meio do Céu", glyph: "MC", domain: "Vocação, Legado & Realização Pública",
    signs: {
      Aries: {
        strengths: "Vocação para a liderança pioneira, iniciativas audazes e projetos autónomos que exigem determinação e coragem.",
        challenges: "Conflitos com superiores por intolerância a ordens, impulsividade na carreira e abandono precoce de projetos consolidados."
      },
      Taurus: {
        strengths: "Vocação orientada para a edificação de valor duradouro, gestão de recursos, estética sensorial e sustentabilidade sólida.",
        challenges: "Permanência em cargos estagnados por apego à segurança e relutância em arriscar saltos profissionais necessários."
      },
      Gemini: {
        strengths: "Vocação na comunicação, jornalismo, ensino, intermediação de redes de conhecimento e projetos multifacetados.",
        challenges: "Falta de foco vocacional, dispersão em demasiadas ocupações paralelas e dificuldade em construir autoridade duradoura numa área."
      },
      Cancer: {
        strengths: "Vocação no cuidado humano, psicologia, educação, nutrição ou áreas que exigem acolhimento e inteligência emocional.",
        challenges: "Dificuldade em separar os sentimentos pessoais do ambiente profissional e hipersensibilidade a tensões laborais."
      },
      Leo: {
        strengths: "Vocação para o centro criativo, liderança inspiradora, artes cénicas, empreendedorismo de prestígio e orientação de equipas.",
        challenges: "Dependência de aplauso profissional, orgulho que recusa cargos secundários e esgotamento por querer brilhar sempre."
      },
      Virgo: {
        strengths: "Vocação em áreas de rigor analítico, consultoria, saúde integral, engenharia de processos e aperfeiçoamento de sistemas.",
        challenges: "Perfeccionismo obsessivo no trabalho, medo de assumir responsabilidades de topo e esgotamento por assumir detalhes dos outros."
      },
      Libra: {
        strengths: "Vocação na diplomacia, direito, mediação, curadoria artística, relações públicas e consultoria de harmonia e parcerias.",
        challenges: "Dificuldade em tomar decisões executivas difíceis e concessão de princípios profissionais para evitar conflitos."
      },
      Scorpio: {
        strengths: "Vocação em pesquisa profunda, psicologia clínica, gestão de crises complexas, cirurgia, investigação ou finanças estratégicas.",
        challenges: "Envolvimento em guerras de poder secretas no trabalho e desconfiança que dificulta a delegação transparente."
      },
      Sagittarius: {
        strengths: "Vocação no ensino superior, filosofia, relações internacionais, publicação, expansão cultural e consultoria de visão.",
        challenges: "Promessas profissionais acima da capacidade de entrega e impaciência com a burocracia institucional."
      },
      Capricorn: {
        strengths: "Vocação para a alta gestão, responsabilidade pública, liderança executiva, arquitetura de longo prazo e governação íntegra.",
        challenges: "Ambição desmedida que sacrifica a saúde e os afetos, frieza executiva e medo paralisante do fracasso público."
      },
      Aquarius: {
        strengths: "Vocação em inovação tecnológica, reformas humanitárias, causas sociais, ciências de ponta e projetos em rede.",
        challenges: "Rebeldia contra estruturas corporativas tradicionais e desinteresse por tarefas burocráticas essenciais."
      },
      Pisces: {
        strengths: "Vocação nas artes poéticas, espiritualidade, terapias holísticas, trabalho humanitário compassivo e imaginação visual.",
        challenges: "Desorientação vocacional, dificuldade em monetizar talentos artísticos/terapêuticos e exploração por terceiros."
      }
    },
    remedy: "Wild Oat (Direção Vocacional Clara & Alinhamento com a Missão)"
  },
  Chiron: {
    pt: "Quíron", glyph: "⚷", domain: "Ferida Primordial, Cura & Mestria Espiritual (O Curador Ferido)",
    signs: {
      Aries: {
        strengths: "Capacidade de inspirar coragem pioneira nos outros; sabedoria curativa forjada ao superar a sensação primordial de inadequação ou direito de existir.",
        challenges: "Dúvida profunda sobre a própria força ou legitimidade para agir e afirmar a sua identidade, alternando entre timidez defensiva e agressividade compensatória."
      },
      Taurus: {
        strengths: "Talento extraordinário para ancorar estabilidade, segurança e cura tangível no corpo e no mundo material para quem o rodeia.",
        challenges: "Ferida de escassez ou de não merecimento físico/material; medo paralisante de perder a estabilidade ou sensação de que o seu corpo é imperfeito."
      },
      Gemini: {
        strengths: "Dom transformador para dar voz aos silenciados, ensinar com profunda empatia e articular verdades curativas através da palavra consciente.",
        challenges: "Sentimento precoce de não ser compreendido, ouvido ou considerado inteligente; ansiedade mental e medo de se expressar com clareza."
      },
      Cancer: {
        strengths: "Capacidade infinita de acolhimento emocional, nutrição e criação de espaços de refúgio seguro onde outros encontram conforto para as suas dores.",
        challenges: "Sensação profunda de abandono infantil, carência afetiva não saciada e tendência a cuidar de todos enquanto negligencia a própria vulnerabilidade."
      },
      Leo: {
        strengths: "Mestria em elevar a autoestima alheia, despertar o brilho e criatividade dos outros e transformar o sofrimento em nobreza de espírito.",
        challenges: "Ferida de invisibilidade ou rejeição da sua espontaneidade autêntica; vergonha de brilhar ou necessidade dolorosa de aplauso para se sentir digno."
      },
      Virgo: {
        strengths: "Dom exemplar para a cura holística, diagnóstico intuitivo, medicina natural e dedicação compassiva ao alívio do sofrimento concreto.",
        challenges: "Sensação crónica de imperfeição ou defeito intrínseco; autocrítica implacável e obsessão pela pureza ou controlo somático."
      },
      Libra: {
        strengths: "Sensibilidade sagrada para harmonizar vínculos, mediar dores relacionais e ensinar a arte do amor incondicional e da justiça compassiva.",
        challenges: "Ferida nos relacionamentos e espelhos; medo da rejeição que leva à perda da identidade ou à crença de que só é amado se abdicar de si mesmo."
      },
      Scorpio: {
        strengths: "Poder de regeneração psicológica, capacidade de navegar na escuridão emocional e guiar outros para lá dos traumas mais profundos.",
        challenges: "Ferida de traição, perda ou invasão de limites; medo do desamparo que gera mecanismos defensivos de controlo ou retenção de mágoas."
      },
      Sagittarius: {
        strengths: "Sabedoria espiritual libertadora, capacidade de encontrar sentido sagrado mesmo nas provações mais duras e inspirar fé autêntica.",
        challenges: "Crise de fé ou desilusão profunda com dogmas, mestres ou verdades absolutas; sensação de perda de propósito ou cinismo defensivo."
      },
      Capricorn: {
        strengths: "Autoridade moral conquistada pelo trabalho interior, mestria em construir estruturas de apoio duradouras e resiliência exemplar.",
        challenges: "Ferida de inadequação social ou fracasso perante expectativas rígidas; sensação de carregar um peso esmagador de responsabilidade sem merecer descanso."
      },
      Aquarius: {
        strengths: "Visão humanitária compassiva, capacidade de acolher os marginalizados e liderar movimentos de cura coletiva e liberdade autêntica.",
        challenges: "Ferida de rejeição social ou de sentir-se um 'estranho no ninho'; isolamento emocional e medo de pertencer a grupos."
      },
      Pisces: {
        strengths: "Conexão mística de compaixão universal, sensibilidade mediúnica curativa e capacidade de dissolver o sofrimento através do amor transcendente.",
        challenges: "Sensação de carregar a dor do mundo inteiro; tendência a vitimização, desilusão espiritual e dificuldade extrema em estabelecer limites energéticos saudáveis."
      }
    },
    remedy: "Star of Bethlehem (Consolação & Cura de Traumas) / Pine (Libertação de Culpa) / Centaury (Limites Saudáveis)"
  },
  Lilith: {
    pt: "Lilith (Lua Negra)", glyph: "⚸", domain: "Soberania Instintiva, Sombra Reprimida & Poder Visceral",
    signs: {
      Aries: {
        strengths: "Independência feroz, coragem visceral insubmissa e recusa absoluta em diminuir a própria presença ou iniciativa.",
        challenges: "Revolta impulsiva contra qualquer limite, fúria reprimida perante tentativas de controlo e dificuldade em cooperar sem sentir perda de autonomia."
      },
      Taurus: {
        strengths: "Poder magnético sensorial, conexão profunda com o prazer terreno, autossuficiência material e soberania sobre o próprio corpo.",
        challenges: "Oscilação entre apego possessivo intenso e rejeição radical do conforto material; teimosia visceral quando se sente pressionado."
      },
      Gemini: {
        strengths: "Mente acutilante e livre de tabus, coragem para verbalizar o que ninguém ousa dizer e perspicácia psicológica penetrante.",
        challenges: "Uso da palavra como lâmina defensiva, inquietação nervosa perante discursos superficiais e receio oculto de ter a sua voz silenciada."
      },
      Cancer: {
        strengths: "Autonomia emocional profunda, capacidade de romper dependências familiares arcaicas e nutrir a partir da liberdade autêntica.",
        challenges: "Sentimento visceral de não pertença ao clã de origem, medo de sufocamento afetivo e recusa defensiva em mostrar carência."
      },
      Leo: {
        strengths: "Magnetismo régio e indomável, autenticidade criativa radical e brilho próprio que não depende de validação convencional.",
        challenges: "Orgulho ferido perante qualquer desatenção, dramatização intensa ou recusa defensiva em ocupar o palco por medo de julgamento."
      },
      Virgo: {
        strengths: "Mestria autónoma do ofício, discernimento cirúrgico sobre o que é autêntico e recusa de servilismo ou rotinas desprovidas de alma.",
        challenges: "Autocrítica implacável oculta, rebeldia contra regras arbitrárias e tensão entre o controlo meticuloso e o desejo de entrega instintiva."
      },
      Libra: {
        strengths: "Procura de parcerias entre iguais absolutos, recusando hipocrisias sociais ou concessões que anulem a verdade individual.",
        challenges: "Medo de perder a soberania no relacionamento, atração por dinâmicas intensas de espelhamento e alergia a aparências artificiais."
      },
      Scorpio: {
        strengths: "Poder psíquico abissal, intuição infalível sobre motivações ocultas, magnetismo intenso e capacidade de renascer de qualquer crise.",
        challenges: "Fascínio pelo proibido ou extremo, desconfiança visceral, testes de lealdade silenciosos e intensidade emocional avassaladora."
      },
      Sagittarius: {
        strengths: "Liberdade espiritual inegociável, busca da verdade por experiência direta e rejeição de qualquer dogma ou moralismo imposto.",
        challenges: "Inquietação radical perante compromissos fechados, ceticismo feroz contra autoridades intelectuais e impulso de evasão."
      },
      Capricorn: {
        strengths: "Autoridade soberana autogerada, integridade insubornável e capacidade de alcançar o topo pelas próprias leis e mérito real.",
        challenges: "Rejeição visceral de hierarquias arbitrárias, rigidez extrema para não demonstrar fraqueza e ambição solitária."
      },
      Aquarius: {
        strengths: "Singularidade absoluta, génio vanguardista livre de convenções e defesa intransigente da liberdade individual e coletiva.",
        challenges: "Postura de exílio voluntário, dificuldade em integrar-se em grupos sem temer a perda de identidade e distanciamento radical."
      },
      Pisces: {
        strengths: "Misticismo profundo e selvagem, acesso direto ao inconsciente profundo e imaginação visionária que transcende o mundo visível.",
        challenges: "Fuga para mundos interiores secretos, receio de dissolução da individualidade e dificuldade em lidar com a dureza banal do quotidiano."
      }
    },
    remedy: "Holly (Transmutação de Fúria & Sombra) / Cherry Plum (Domínio Serena do Instinto) / Willow (Soberania sem Ressentimento)"
  },
  NorthNode: {
    pt: "Nodo Norte", glyph: "☊", domain: "Missão Evolutiva, Destino da Alma & Futuro Kármico",
    signs: {
      Aries: {
        strengths: "O seu caminho evolutivo convida a desenvolver coragem própria, liderança pioneira, autonomia de decisão e afirmação autêntica da identidade.",
        challenges: "Vencer a hesitação de esperar pela aprovação alheia e o receio de desagradar quando precisa de avançar pelo seu próprio caminho."
      },
      Taurus: {
        strengths: "A missão da alma passa por construir paz interior, estabilidade prática, apreço sereno pela natureza, valores próprios e constância.",
        challenges: "Libertar-se do vício em crises emocionais, dramas desnecessários ou dependência dos recursos e turbulências emocionais dos outros."
      },
      Gemini: {
        strengths: "Crescimento através da escuta aberta, curiosidade genuína, diálogo acessível, troca de ideias no quotidiano e flexibilidade mental.",
        challenges: "Abandonar a postura de dono da verdade absoluta, o isolamento intelectual e a tendência a falar sem ouvir o ponto de vista alheio."
      },
      Cancer: {
        strengths: "Evolução através da abertura do coração, acolhimento da vulnerabilidade, construção de intimidade familiar e nutrição afetiva.",
        challenges: "Desapegar da armadura de hiper-controlo profissional, da frieza executiva e da necessidade de carregar o mundo nas costas sem pedir apoio."
      },
      Leo: {
        strengths: "Caminho de despertar do brilho criativo pessoal, generosidade calorosa do coração, liderança inspiradora e coragem de ser o centro da própria vida.",
        challenges: "Sair do esconderijo da neutralidade impessoal ou da diluição excessiva no coletivo para assumir a sua assinatura única com alegria."
      },
      Virgo: {
        strengths: "Missão de ancorar a espiritualidade na prática diária, organização lúcida, serviço útil, discernimento saudável e cuidado com o corpo.",
        challenges: "Superar a dispersão nebulosa, a procrastinação evasiva e o papel de vítima perante o caos prático do dia a dia."
      },
      Libra: {
        strengths: "Evolução através da arte da cooperação, diplomacia, escuta empática do outro, partilha justa e construção de alianças harmoniosas.",
        challenges: "Temperar o impulso de fazer tudo sozinho, a impaciência competitiva e a reação defensiva de colocar sempre o 'eu' antes do 'nós'."
      },
      Scorpio: {
        strengths: "Chamado para a transformação profunda, entrega sem medo à intimidade real, psicologia da alma e coragem de desapegar do que já cumpriu o seu ciclo.",
        challenges: "Vencer a estagnação por apego excessivo à zona de conforto material e o medo de mudanças que regeneram a vida."
      },
      Sagittarius: {
        strengths: "Missão de expandir a visão de mundo, confiar na intuição superior, buscar sabedoria filosófica, síntese de sentido e fé no caminho.",
        challenges: "Libertar-se da dispersão em mil detalhes superficiais, da dúvida lógica incessante e da ansiedade de querer controlar todas as variáveis."
      },
      Capricorn: {
        strengths: "Evolução através da maturidade responsável, construção de legado sólido, integridade profissional e autonomia adulta no mundo.",
        challenges: "Superar a dependência emocional infantil, o refúgio no passado familiar e o medo de assumir a própria autoridade perante a sociedade."
      },
      Aquarius: {
        strengths: "Missão de contribuir para o bem coletivo, visão humanitária, inovação livre, fraternidade e colaboração em redes de consciência.",
        challenges: "Desapegar da necessidade excessiva de aplauso pessoal, orgulho centralizador e dramatização de feridas de ego."
      },
      Pisces: {
        strengths: "Caminho de entrega confiante ao fluxo da vida, compaixão universal, sensibilidade espiritual, imaginação poética e paz interior.",
        challenges: "Relaxar o perfeccionismo ansioso, a hipercrítica mental e a obsessão de querer controlar cada pormenor racionalmente."
      }
    },
    remedy: "Wild Oat (Alinhamento com a Missão de Vida) / Walnut (Coragem para Avançar no Novo Ciclo)"
  },
  SouthNode: {
    pt: "Nodo Sul", glyph: "☋", domain: "Memória Kármica, Talentos Inatos & Zona de Conforto Ancestral",
    signs: {
      Aries: {
        strengths: "Traz na bagagem da alma uma coragem instintiva pronta, capacidade de decisão rápida e força de iniciativa natural.",
        challenges: "Zona de conforto onde o excesso de independência ou impaciência pode impedir a cooperação e a escuta profunda nos relacionamentos."
      },
      Taurus: {
        strengths: "Dom inato de persistência, realização material, senso estético apurado e capacidade de construir recursos sólidos.",
        challenges: "Tendência ancestral a apegar-se em demasia ao que é conhecido e seguro, resistindo a transformações psicológicas necessárias."
      },
      Gemini: {
        strengths: "Facilidade inata de comunicação, versatilidade intelectual, destreza social e rapidez de raciocínio.",
        challenges: "Risco de permanecer na superficialidade informativa ou dispersão mental, evitando comprometer-se com uma visão superior e diretriz de vida."
      },
      Cancer: {
        strengths: "Sensibilidade empática natural, memória emocional rica e talento inato para acolher, proteger e criar laços familiares.",
        challenges: "Tendência kármica a refugiar-se na dependência afetiva ou no passado, adiando a assunção da maturidade e autoridade no mundo exterior."
      },
      Leo: {
        strengths: "Carisma natural, expressão criativa espontânea, nobreza de presença e talento inato para liderar e brilhar.",
        challenges: "Hábito antigo de centrar tudo no drama pessoal ou na validação do ego, precisando de abrir espaço para a fraternidade e visão coletiva."
      },
      Virgo: {
        strengths: "Capacidade analítica refinada, rigor técnico, atenção ao detalhe e sentido prático de organização e serviço.",
        challenges: "Padrão de preocupação excessiva, autocrítica e controlo mental que precisa de ser suavizado pela fé, compaixão e entrega espiritual."
      },
      Libra: {
        strengths: "Diplomacia natural, charme relacional, senso de estética e facilidade inata para harmonizar ambientes e pessoas.",
        challenges: "Tendência antiga a anular a própria vontade para agradar aos outros ou depender de aprovação externa, pedindo hoje mais coragem e autonomia."
      },
      Scorpio: {
        strengths: "Perceção psicológica profunda, resiliência em crises extremas e familiaridade inata com os mistérios da alma.",
        challenges: "Padrão ancestral de desconfiança, intensidade dramática ou desgaste em lutas de poder, convidando agora à paz, simplicidade e estabilidade."
      },
      Sagittarius: {
        strengths: "Visão ampla inata, intuição filosófica, espírito livre e facilidade para compreender grandes sínteses e horizontes.",
        challenges: "Tendência a ignorar os detalhes práticos e a escuta próxima no diálogo diário, precisando de cultivar a simplicidade comunicativa."
      },
      Capricorn: {
        strengths: "Dom inato de organização, disciplina, resistência ao esforço e sentido de dever e responsabilidade estrutural.",
        challenges: "Hábito antigo de rigidez emocional e excesso de peso do dever, pedindo nesta vida que permita ao coração sentir, acolher e ser nutrido."
      },
      Aquarius: {
        strengths: "Mente livre e original, visão de futuro, facilidade de convivência em grupos e desapego de convenções antiquadas.",
        challenges: "Tendência a refugiar-se no distanciamento racional ou no coletivo para evitar o risco de expor o próprio coração e brilho criativo pessoal."
      },
      Pisces: {
        strengths: "Sensibilidade mística inata, empatia profunda, imaginação fértil e conexão intuitiva com o sagrado.",
        challenges: "Padrão antigo de evasão da realidade prática ou confusão de limites, pedindo hoje discernimento concreto, rotina saudável e foco no presente."
      }
    },
    remedy: "Honeysuckle (Sabedoria do Passado sem Apego) / Chestnut Bud (Integração Consciente da Experiência)"
  }
};

export function getEnrichedPlacements(natalChart) {
  if (!natalChart || !natalChart.planets || !natalChart.angles) return [];

  const houses = natalChart.angles.houses;
  const list = [];

  // Authentic Vedic Navagrahas (9 Sacred Grahas)
  const planetKeys = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "NorthNode", "SouthNode"];

  for (const pKey of planetKeys) {
    const pData = natalChart.planets[pKey];
    if (!pData) continue;

    const houseNum = getHouseForDegree(pData.totalLongitude, houses);
    const houseInfo = HOUSE_THEMES[houseNum] || { title: `Casa ${houseNum}`, desc: "" };
    const pInfo = PLANET_DESCRIPTIONS[pKey] || { pt: pKey, glyph: "•", domain: "", signs: {}, remedy: "" };
    const zInfo = ZODIAC_PT[pData.sign] || { name: pData.sign, glyph: "♈", element: "Fogo", modality: "Cardinal", ruler: "" };

    const signData = pInfo.signs[pData.sign] || {};
    const strengths = typeof signData === "object" ? signData.strengths : (signData || `Posicionado em ${zInfo.name} a ${pData.degree}° ${pData.minute}'.`);
    const challenges = typeof signData === "object" ? signData.challenges : "Tendência a atrito quando sob tensão ou desalinhamento com o ritmo natural.";
    const houseDesc = `Na ${ROMAN_HOUSES[houseNum]}ª Casa (${houseInfo.title}), esta energia ilumina os temas de ${houseInfo.desc.toLowerCase()}`;

    list.push({
      key: pKey,
      name: pInfo.pt,
      glyph: pInfo.glyph,
      domain: pInfo.domain,
      sign: zInfo.name,
      signKey: pData.sign,
      signGlyph: zInfo.glyph,
      element: zInfo.element,
      modality: zInfo.modality,
      degree: pData.degree,
      minute: pData.minute,
      totalLongitude: pData.totalLongitude,
      house: houseNum,
      houseRoman: ROMAN_HOUSES[houseNum],
      houseTitle: houseInfo.title,
      strengths,
      challenges,
      description: `${strengths} ${houseDesc}`,
      remedy: pInfo.remedy
    });
  }

  // Ascendant
  if (natalChart.angles.ascendant) {
    const asc = natalChart.angles.ascendant;
    const zInfo = ZODIAC_PT[asc.sign] || { name: asc.sign, glyph: "♈", element: "Fogo", modality: "Cardinal", ruler: "" };
    const pInfo = PLANET_DESCRIPTIONS.Ascendant;
    const signData = pInfo.signs[asc.sign] || {};
    const strengths = typeof signData === "object" ? signData.strengths : (signData || `Ascendente a ${asc.degree}° de ${zInfo.name}.`);
    const challenges = typeof signData === "object" ? signData.challenges : "Postura inicial defensiva perante o desconhecido.";

    list.push({
      key: "Ascendant",
      name: "Ascendente",
      glyph: "ASC",
      domain: "Presença, Lente de Vida & Vitalidade",
      sign: zInfo.name,
      signKey: asc.sign,
      signGlyph: zInfo.glyph,
      element: zInfo.element,
      modality: zInfo.modality,
      degree: asc.degree,
      minute: asc.minute,
      totalLongitude: asc.totalLongitude,
      house: 1,
      houseRoman: "I",
      houseTitle: "Casa I (Identidade & Início)",
      strengths,
      challenges,
      description: `${strengths} Como cúspide da Casa I, define a sua presença imediata e a forma como inicia novos ciclos no mundo.`,
      remedy: pInfo.remedy
    });
  }

  // Midheaven (MC)
  if (natalChart.angles.midheaven) {
    const mc = natalChart.angles.midheaven;
    const zInfo = ZODIAC_PT[mc.sign] || { name: mc.sign, glyph: "♑", element: "Terra", modality: "Cardinal", ruler: "" };
    const pInfo = PLANET_DESCRIPTIONS.Midheaven;
    const signData = pInfo.signs[mc.sign] || {};
    const strengths = typeof signData === "object" ? signData.strengths : (signData || `Meio do Céu a ${mc.degree}° de ${zInfo.name}.`);
    const challenges = typeof signData === "object" ? signData.challenges : "Tensão entre exigências profissionais e vida pessoal.";

    list.push({
      key: "Midheaven",
      name: "Meio do Céu",
      glyph: "MC",
      domain: "Vocação, Legado & Realização Pública",
      sign: zInfo.name,
      signKey: mc.sign,
      signGlyph: zInfo.glyph,
      element: zInfo.element,
      modality: zInfo.modality,
      degree: mc.degree,
      minute: mc.minute,
      totalLongitude: mc.totalLongitude,
      house: 10,
      houseRoman: "X",
      houseTitle: "Casa X (Carreira & Propósito)",
      strengths,
      challenges,
      description: `${strengths} Como ponto mais alto do mapa (Casa X), representa a sua ambição maior, aspiração pública e o contributo duradouro que deixa ao mundo.`,
      remedy: pInfo.remedy
    });
  }

  return list;
}

/**
 * Generates an eloquent holistic synthesis paragraph of the complete natal chart
 */
export function generateChartSynthesisParagraph(natalChart) {
  if (!natalChart || !natalChart.planets || !natalChart.angles) return "";

  const sun = natalChart.planets.Sun;
  const moon = natalChart.planets.Moon;
  const asc = natalChart.angles.ascendant;
  const mc = natalChart.angles.midheaven;

  const sunZ = ZODIAC_PT[sun.sign]?.name || sun.sign;
  const moonZ = ZODIAC_PT[moon.sign]?.name || moon.sign;
  const ascZ = asc ? (ZODIAC_PT[asc.sign]?.name || asc.sign) : "";
  const mcZ = mc ? (ZODIAC_PT[mc.sign]?.name || mc.sign) : "";

  const sunData = PLANET_DESCRIPTIONS.Sun?.signs?.[sun.sign] || {};
  const moonData = PLANET_DESCRIPTIONS.Moon?.signs?.[moon.sign] || {};

  const elements = { Fogo: 0, Terra: 0, Ar: 0, Água: 0 };
  for (const p of Object.values(natalChart.planets)) {
    const elem = ZODIAC_PT[p.sign]?.element;
    if (elem) elements[elem]++;
  }
  const domElement = Object.entries(elements).reduce((a, b) => b[1] > a[1] ? b : a)[0];

  const elemQualities = {
    Fogo: "iniciativa dinâmica, coragem criativa e paixão pioneira",
    Terra: "solidez construtiva, discernimento pragmático e realização sustentável",
    Ar: "lucidez intelectual, agilidade comunicativa e visão de vanguarda",
    Água: "profundidade emocional, intuição empática e sensibilidade curativa"
  };

  const elemShadows = {
    Fogo: "impaciência com processos demorados, risco de queima rápida de energia e atrito quando sob restrição",
    Terra: "resistência ao desapego, rigidez de rotina e receio inconsciente de instabilidade ou escassez",
    Ar: "racionalização excessiva de emoções viscerais, dispersão em múltiplos pensamentos e tensão nervosa",
    Água: "sobrecarga por absorção de ambientes e dificuldade em estabelecer fronteiras protetoras entre o Eu e o Outro"
  };

  return `O seu Mapa Astral revela uma arquitetura psíquica multifacetada, sustentada pela tríade fundamental entre o **Sol em ${sunZ}** (${sun.degree}°), a **Lua em ${moonZ}** (${moon.degree}°) e o **Ascendente em ${ascZ}** (${asc ? asc.degree : 0}°).

**✨ Forças Inatas & Potencial Luminoso:**
A sua essência vital opera através do arquétipo de ${sunZ}, alimentada por ${sunData.strengths || 'uma poderosa centelha criativa'}, enquanto a sua sensibilidade instintiva encontra solo fértil em ${moonZ} (${moonData.strengths || 'intuição emocional profunda'}). Com uma assinatura elemental predominante em **${domElement}**, a sua caminhada é impulsionada por ${elemQualities[domElement] || 'harmonia cósmica'}.

**⚡ Tendências de Desafio & Pontos de Sombra:**
A mesma configuração traz atritos e padrões de tensão a integrar com consciência: sob pressão ou cansaço, a matriz em ${sunZ} e ${moonZ} pode suscitar ${sunData.challenges ? sunData.challenges.toLowerCase() : 'alguma tensão interna'}, manifestando também a sombra do elemento ${domElement}, designadamente ${elemShadows[domElement] || 'desgaste por desequilíbrio de ritmo'}.

**🌸 Chave de Harmonização:**
A integração consciente desta polaridade ocorre quando o propósito solar (${sunZ}) e as necessidades lunares (${moonZ}) colaboram em harmonia, orientando a sua vocação máxima (${mcZ ? `Meio do Céu em ${mcZ}` : 'realização consciente'}) para a construção de um legado sólido de integridade, maturidade emocional e autocuidado holístico.`;
}

/**
 * Generates Core Archetype & Traits Analysis from Natal Chart
 */
export function generateCoreTraitsAnalysis(natalChart) {
  if (!natalChart || !natalChart.planets) return null;

  const sun = natalChart.planets.Sun;
  const moon = natalChart.planets.Moon;
  const asc = natalChart.angles?.ascendant;

  const ELEMENTS = {
    Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
    Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
    Gemini: "Air", Libra: "Air", Aquarius: "Air",
    Cancer: "Water", Scorpio: "Water", Pisces: "Water"
  };

  const elementCounts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  for (const pos of Object.values(natalChart.planets)) {
    if (pos.sign && ELEMENTS[pos.sign]) {
      elementCounts[ELEMENTS[pos.sign]]++;
    }
  }

  const dominantElement = Object.entries(elementCounts).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  const SIGN_ARCHETYPES = {
    Aries: { archetype: "O Pioneiro & Iniciador", drive: "Coragem, ação direta, impulso pioneiro", shadow: "Impaciência, atrito abrupto" },
    Taurus: { archetype: "O Construtor & Âncora", drive: "Estabilidade segura, apreciação sensorial, perseverança", shadow: "Inércia, resistência a mudanças súbitas" },
    Gemini: { archetype: "O Sintetizador & Mensageiro", drive: "Curiosidade, agilidade mental, percepção dinâmica", shadow: "Inquietação, dispersão energética" },
    Cancer: { archetype: "O Protetor & Intuitivo", drive: "Ressonância emocional profunda, lealdade, nutrição", shadow: "Autocontenção, defesa da vulnerabilidade" },
    Leo: { archetype: "O Soberano & Centro Criativo", drive: "Irradiação, generosidade calorosa, liderança régia", shadow: "Fadiga de validação, sobrecarga pessoal" },
    Virgo: { archetype: "O Alquimista & Artesão", drive: "Precisão, discernimento lúcido, dedicação ao aperfeiçoamento", shadow: "Autocrítica excessiva, tensão nervosa" },
    Libra: { archetype: "O Harmonizador & Estrategista", drive: "Equilíbrio, refinamento estético, diplomacia relacional", shadow: "Paralisia de decisão, fuga do conflito" },
    Scorpio: { archetype: "O Transformador & Guardião da Verdade", drive: "Profundidade psicológica, verdade emocional, resiliência", shadow: "Intensidade controladora, retenção defensiva" },
    Sagittarius: { archetype: "O Explorador & Filósofo", drive: "Visão expansiva, busca de significado, otimismo", shadow: "Sobredimensão, dispersão de metas" },
    Capricorn: { archetype: "O Arquiteto & Mestre Construtor", drive: "Visão a longo prazo, disciplina, mestria duradoura", shadow: "Dever excessivo, contenção emocional" },
    Aquarius: { archetype: "O Visionário & Mente Independente", drive: "Originalidade, reforma sistémica, liberdade intelectual", shadow: "Distanciamento, isolamento intelectual" },
    Pisces: { archetype: "O Místico & Empata", drive: "Compaixão universal, imaginação poética, recetividade cósmica", shadow: "Falta de limites, sobrecarga energética" }
  };

  const enrichedPlacements = getEnrichedPlacements(natalChart);
  const synthesisParagraph = generateChartSynthesisParagraph(natalChart);

  return {
    sunSign: sun.sign,
    sunArchetype: SIGN_ARCHETYPES[sun.sign]?.archetype || sun.sign,
    sunDrive: SIGN_ARCHETYPES[sun.sign]?.drive || "Vitalidade consciente",
    moonSign: moon.sign,
    moonComfort: SIGN_ARCHETYPES[moon.sign]?.drive || "Instinto emocional",
    ascendantSign: asc ? asc.sign : "Não especificado",
    dominantElement,
    elementalBalance: elementCounts,
    coreSynthesis: synthesisParagraph,
    synthesisParagraph,
    enrichedPlacements
  };
}

/**
 * Casts a complete Horary or Natal chart with full Placidus houses and planetary positions
 */
export function castChart({ date = new Date(), latitude = 51.5074, longitude = -0.1278, chartType = "horary" }) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const planets = calculatePlanetaryPositions(dateObj);
  const angles = calculateHousesAndAngles(dateObj, latitude, longitude);
  const aspects = calculateAspects(planets);

  return {
    chartType,
    utcTimestamp: dateObj.toISOString(),
    coordinates: { latitude, longitude },
    planets,
    angles,
    aspects
  };
}

// ==========================================
// --- SYNASTRY (RELATIONSHIP ASTROLOGY) ENGINE ---
// ==========================================

const SYNASTRY_ASPECT_TYPES = [
  { name: "Conjunction", pt: "Conjunção", glyph: "☌", angle: 0,   orb: 8.0, nature: "fusão / união direta", score: 8 },
  { name: "Trine",       pt: "Trígono",   glyph: "△", angle: 120, orb: 7.0, nature: "harmonia fluida",      score: 10 },
  { name: "Sextile",     pt: "Sêxtil",    glyph: "⚹", angle: 60,  orb: 5.0, nature: "oportunidade & diálogo", score: 7 },
  { name: "Square",      pt: "Quadratura",glyph: "□", angle: 90,  orb: 7.0, nature: "tensão catalisadora",  score: -4 },
  { name: "Opposition",  pt: "Oposição",  glyph: "☍", angle: 180, orb: 7.5, nature: "polaridade & atração", score: 2 }
];

const SYNASTRY_TAGS = {
  passion: { pt: "🔥 Paixão & Magnetismo", en: "🔥 Passion & Magnetism", color: "#f97316" },
  harmony: { pt: "✨ Harmonia & Fluidez", en: "✨ Harmony & Flow", color: "#10b981" },
  mental:  { pt: "🧠 Sintonia Mental", en: "🧠 Mental Sync", color: "#3b82f6" },
  friction:{ pt: "⚡ Desafio & Crescimento", en: "⚡ Catalyst & Friction", color: "#ef4444" },
  karmic:  { pt: "🪐 Laço Kármico", en: "🪐 Karmic Bond", color: "#8b5cf6" },
  emotion: { pt: "🌊 Ressonância Emocional", en: "🌊 Emotional Resonance", color: "#06b6d4" },
  healing: { pt: "⚷ Cura & Vulnerabilidade (Quíron)", en: "⚷ Healing & Vulnerability (Chiron)", color: "#14b8a6" }
};


// ==========================================
// --- DEEP MOON-TO-MOON CONNECTION ENGINE ---
// ==========================================

const MOON_ATTACHMENT_STYLES = {
  Fire: {
    title: "Estilo Afetivo Ardente & Espontâneo",
    needs: "Autonomia, entusiasmo, incentivo mútuo e validação ativa do seu movimento.",
    soothe: "Atividade física, momentos de aventura e liberdade para expressar emoções sem julgamento.",
    shadow: "Reatividade impulsiva ou impaciência perante ritmos emocionais mais lentos."
  },
  Earth: {
    title: "Estilo Afetivo Enraizado & Tangível",
    needs: "Segurança previsível, estabilidade quotidiana, presença palpável e demonstrações práticas de afeto.",
    soothe: "Ambientes confortáveis, rotinas tranquilas, contacto físico seguro e tempo de assimilação.",
    shadow: "Retenção silenciosa de preocupações ou resistência a turbulências emocionais imprevistas."
  },
  Air: {
    title: "Estilo Afetivo Dialético & Reflexivo",
    needs: "Comunicação aberta, clareza verbal, cumplicidade intelectual e espaço para processar sentimentos pela fala.",
    soothe: "Conversas desanuviadas, ausência de cobranças asfixiantes e troca de perspetivas conscientes.",
    shadow: "Tendência a racionalizar emoções viscerais ou distanciar-se quando o clima fica excessivamente dramático."
  },
  Water: {
    title: "Estilo Afetivo Oceânico & Intuitivo",
    needs: "Intimidade profunda, acolhimento sem defesas, empatia visceral e segurança para chorar e partilhar vulnerabilidades.",
    soothe: "Escuta atenta, abraço protetor, silêncios cúmplices e refúgio restaurador longe do ruído exterior.",
    shadow: "Hipersensibilidade a atmosferas ocultas, medo de rejeição ou acumulação de mágoas subterrâneas."
  }
};

export function generateDeepMoonConnectionAnalysis(chartA, chartB, moonAspect, nameA = "Pessoa A", nameB = "Pessoa B") {
  const moonA = chartA.planets?.Moon;
  const moonB = chartB.planets?.Moon;
  if (!moonA || !moonB) return null;

  const elemA = ELEMENTS[moonA.sign] || "Water";
  const elemB = ELEMENTS[moonB.sign] || "Water";

  const styleA = MOON_ATTACHMENT_STYLES[elemA];
  const styleB = MOON_ATTACHMENT_STYLES[elemB];

  const signA_Pt = ZODIAC_PT[moonA.sign]?.name || moonA.sign;
  const signB_Pt = ZODIAC_PT[moonB.sign]?.name || moonB.sign;

  let synergyType = "Complementaridade Consciente";
  let synergySummary = "";
  let domesticRhythm = "";
  let emotionalRemedy = {
    flower: "Chicory & Water Violet",
    reason: "Promove entrega afetiva sem dependência, equilibrando o espaço individual com a nutrição partilhada."
  };

  if (elemA === elemB) {
    synergyType = "Ressonância Elemental Direta (Mesmo Elemento)";
    synergySummary = `As Luas de ${nameA} (${signA_Pt}) e ${nameB} (${signB_Pt}) partilham a matriz elemental de ${ELEMENT_NAMES_PT[elemA]}. Existe uma sintonia instintiva imediata na forma como ambos sentem o mundo, reagem a pressões externas e procuram refúgio emocional. Não é necessária explicação exaustiva para que um compreenda o estado anímico do outro.`;
    domesticRhythm = "O quotidiano flui com naturalidade no que respeita aos hábitos domésticos e ao nível de intensidade afetiva desejado no lar.";
    emotionalRemedy = {
      flower: elemA === "Water" ? "Red Chestnut" : (elemA === "Fire" ? "Impatiens" : (elemA === "Air" ? "White Chestnut" : "Rock Water")),
      reason: "Evita a sobre-identificação ou o contágio excessivo de ansiedades dentro do mesmo padrão emocional."
    };
  } else if ((elemA === "Fire" && elemB === "Air") || (elemA === "Air" && elemB === "Fire")) {
    synergyType = "Aliança Ar-Fogo (Estímulo & Inspiração)";
    synergySummary = `O Ar da Lua de ${elemA === 'Air' ? nameA : nameB} oxigena e expande o Fogo da Lua de ${elemA === 'Fire' ? nameA : nameB}. ${nameA} e ${nameB} encontram juntos leveza, incentivo mútuo e capacidade de transformar sentimentos em ação criativa e diálogos entusiasmantes.`;
    domesticRhythm = "Ambiente doméstico dinâmico, aberto a convívios, novidades e projetos partilhados, com pouca tolerância à rotina monótona.";
  } else if ((elemA === "Earth" && elemB === "Water") || (elemA === "Water" && elemB === "Earth")) {
    synergyType = "Aliança Terra-Água (Fertilidade & Nutrição Segura)";
    synergySummary = `A Terra da Lua de ${elemA === 'Earth' ? nameA : nameB} oferece o recipiente sólido e seguro que a Água da Lua de ${elemA === 'Water' ? nameA : nameB} necessita para desaguar as suas marés sensíveis. Cria-se um porto de acolhimento mútuo extraordinariamente acolhedor e seguro.`;
    domesticRhythm = "Grande dedicação ao conforto do lar, à tranquilidade familiar, à alimentação consciente e à estabilidade afetiva a longo prazo.";
  } else {
    synergyType = "Polaridade de Elementos Desafiantes (Catalisador de Maturidade)";
    synergySummary = `A Lua em ${signA_Pt} (${ELEMENT_NAMES_PT[elemA]}) e a Lua em ${signB_Pt} (${ELEMENT_NAMES_PT[elemB]}) operam em frequências emocionais distintas. Enquanto um processa sentimentos com ${styleA.needs.toLowerCase()}, o outro responde prioritariamente com ${styleB.needs.toLowerCase()}. O segredo desta união reside no respeito mútuo pelas diferenças de linguagem afetiva sem tentar moldar o parceiro.`;
    domesticRhythm = "Necessidade de acordos conscientes sobre tempo a sós versus tempo partilhado para evitar que um se sinta sobrecarregado ou incompreendido.";
    emotionalRemedy = {
      flower: "Beech & Walnut",
      reason: "Facilita a adaptação compassiva à linguagem emocional do parceiro, eliminando julgamentos reflexivos."
    };
  }

  let aspectDetails = "";
  if (moonAspect) {
    aspectDetails = `Aspeto Lunar Ativo: ${moonAspect.pA_name} em ${moonAspect.aspectPt} com ${moonAspect.pB_name} (orbe de ${moonAspect.orb}°). ${moonAspect.nature}.`;
  }

  return {
    personA: {
      name: nameA,
      sign: signA_Pt,
      element: ELEMENT_NAMES_PT[elemA],
      degree: moonA.degree,
      style: styleA
    },
    personB: {
      name: nameB,
      sign: signB_Pt,
      element: ELEMENT_NAMES_PT[elemB],
      degree: moonB.degree,
      style: styleB
    },
    synergyType,
    synergySummary,
    domesticRhythm,
    aspectDetails,
    emotionalRemedy
  };
}

// ==========================================
// --- INTER-PLANETARY ASPECT INTERPRETATION ENGINE ---
// ==========================================

const INTER_ASPECT_ARCHETYPES = {
  "Sun-Sun": {
    Conjunction: {
      dynamic: "Identidades Gémmeas & Mesma Visão de Vida",
      strength: "Vocês vibram no mesmo comprimento de onda essencial. Existe um reconhecimento imediato de propósitos, valores e ambições, fazendo com que se sintam rapidamente 'em casa' um com o outro.",
      growth: "Respeitar o espaço criativo e as conquistas individuais de cada um, evitando competições involuntárias de protagonismo."
    },
    Trine: {
      dynamic: "Harmonia Radiante & Apoio Espontâneo",
      strength: "A convivência é naturalmente leve e inspiradora. A presença do outro valida e fortalece a auto-confiança, fluindo com grande cumplicidade.",
      growth: "Aproveitar esta facilidade para construir planos conjuntos, evitando cair na acomodação ou no comodismo."
    },
    Sextile: {
      dynamic: "Cooperação Entusiasmada & Estímulo Mútuo",
      strength: "Excelente sintonia de projetos. Vocês funcionam muito bem em equipa, incentivando as metas e talentos um do outro com entusiasmo sincero.",
      growth: "Transformar a boa vontade recíproca em passos práticos e consistentes no quotidiano."
    },
    Square: {
      dynamic: "Faísca Dinâmica & Desafio de Vontades",
      strength: "Uma atração estimulante e cheia de energia que desafia ambos a saírem da zona de conforto e a crescerem como indivíduos.",
      growth: "Aprender a negociar prioridades sem transformar divergências de opinião em batalhas de ego."
    },
    Opposition: {
      dynamic: "Espelho Magnético & Opostos que se Completam",
      strength: "Forte fascínio mútuo. Cada um personifica qualidades e perspetivas que o outro admira e precisa desenvolver na sua própria vida.",
      growth: "Focar na complementaridade em vez de tentar mudar o parceiro para agir à sua maneira."
    }
  },
  "Sun-Moon": {
    Conjunction: {
      dynamic: "Encontro Sublime entre Vontade e Sentimento",
      strength: "Um dos vínculos mais profundos e harmoniosos da astrologia: a personalidade de um encaixa perfeitamente nas necessidades emocionais do outro.",
      growth: "Cultivar a reciprocidade para que ambos se sintam ouvidos, acolhidos e igualmente cuidados."
    },
    Trine: {
      dynamic: "Fluidez Afetiva Natural & Nutrição Mútua",
      strength: "Compreensão instintiva: um sabe o que o outro precisa antes mesmo de ser dito. O relacionamento transmite serenidade e paz interior.",
      growth: "Celebrar a facilidade com que o carinho é partilhado e manter o romance sempre vivo."
    },
    Sextile: {
      dynamic: "Amizade Íntima & Conexão Afetuosa",
      strength: "Amizade sincera e facilidade para ajustar os planos do dia a dia ao bem-estar emocional do parceiro.",
      growth: "Manter abertos os canais de conversa íntima nas decisões práticas da rotina."
    },
    Square: {
      dynamic: "Ajuste entre Objetivos Práticos e Sensibilidade",
      strength: "Grande magnetismo relacional que ensina a equilibrar o ritmo das ações exteriores com a necessidade de recolhimento e carinho.",
      growth: "Evitar que a pressa ou foco nos afazeres de um magoe inadvertidamente a sensibilidade do outro."
    },
    Opposition: {
      dynamic: "Atração Magnética Yin-Yang",
      strength: "Poderosa atração entre opostos complementares: a luz e a sombra de ambos encontram-se para um aprendizado rico e apaixonante.",
      growth: "Equilibrar momentos de ação exterior com momentos de repouso e intimidade no lar."
    }
  },
  "Moon-Moon": {
    Conjunction: {
      dynamic: "Telepatia Emocional & Porto Seguro",
      strength: "Sentem o mundo na mesma frequência. Entendem os silêncios, humores e hábitos de descanso um do outro com empatia imediata.",
      growth: "Manter limites saudáveis para que as preocupações ou oscilações de um não sobrecarreguem o outro."
    },
    Trine: {
      dynamic: "Paz Afetiva & Conforto no Lar",
      strength: "Sensação genuína de acolhimento e segurança. Estar junto traz calma e alívio das pressões do dia a dia.",
      growth: "Reservar tempo de qualidade para momentos a dois de puro descanso e regeneração."
    },
    Sextile: {
      dynamic: "Compreensão & Rotina Reconfortante",
      strength: "Facilidade para coabitar, partilhar vulnerabilidades e construir um lar acolhedor e harmonioso.",
      growth: "Expressar verbalmente o carinho e celebrar as pequenas vitórias do quotidiano."
    },
    Square: {
      dynamic: "Ritmos Emocionais Distintos (Escola de Empatia)",
      strength: "Uma oportunidade preciosa de aprender a amar uma forma diferente de sentir e processar as emoções com maturidade.",
      growth: "Dar espaço para o parceiro processar sentimentos ao seu próprio ritmo sem pressionar por respostas imediatas."
    },
    Opposition: {
      dynamic: "Polaridade Afetiva & Espelho de Sentimentos",
      strength: "Intensa atração emocional: um ajuda o outro a aceder a sentimentos e dimensões íntimas que mantinha guardadas.",
      growth: "Evitar alternar entre apego excessivo e distanciamento defensivo."
    }
  },
  "Venus-Mars": {
    Conjunction: {
      dynamic: "Química Intensa & Paixão Magnética",
      strength: "Química física e atração magnética excecional: o afeto, o charme e o desejo encontram-se numa sintonia eletrizante.",
      growth: "Construir cumplicidade de longo prazo além do magnetismo inicial para alicerçar o relacionamento com estabilidade."
    },
    Trine: {
      dynamic: "Romance Fluido & Atração Natural",
      strength: "Atração física e romantismo que fluem sem esforço; facilidade para demonstrar carinho, sedução e alegria a dois.",
      growth: "Manter o hábito de surpreender o parceiro com gestos de carinho e momentos especiais."
    },
    Sextile: {
      dynamic: "Sedução Alegre & Cumplicidade Lúdica",
      strength: "Interação romântica divertida e leve, elogios espontâneos e entusiasmo partilhado em viagens e convívios.",
      growth: "Alimentar a chama da relação com pequenas surpresas e aventuras a dois."
    },
    Square: {
      dynamic: "Faísca Elétrica & Tensão Apaixonada",
      strength: "Forte magnetismo com faísca constante; a tensão atrai fortemente e mantém a chama da relação sempre acesa.",
      growth: "Evitar que reações precipitadas ou ciúmes momentâneos abalem a ternura do vínculo."
    },
    Opposition: {
      dynamic: "Fascínio pelo Mistério do Parceiro",
      strength: "Grande magnetismo de polaridades: a diferença de atitudes gera uma atração constante e apaixonante.",
      growth: "Equilibrar assertividade e delicadeza no dia a dia, cultivando a confiança mútua."
    }
  },
  "Mercury-Mercury": {
    Conjunction: {
      dynamic: "Mentes que se Entendem de Imediato",
      strength: "Pensam na mesma velocidade, entendem as piadas e captam os raciocínios do outro quase antes de serem terminados.",
      growth: "Praticar a escuta atenta para não interromper ou antecipar as frases do parceiro."
    },
    Trine: {
      dynamic: "Diálogo Fácil & Cumplicidade Mental",
      strength: "Conversas prazerosas, facilidade para resolver qualquer problema prático e ricas trocas de ideias e planos futuros.",
      growth: "Utilizar esta harmonia comunicativa para planear objetivos e projetos conjuntos."
    },
    Sextile: {
      dynamic: "Curiosidade Partilhada & Conversas Vivas",
      strength: "Interesse mútuo pelos pontos de vista do outro e facilidade em aprender e explorar novidades em conjunto.",
      growth: "Recorrer sempre à conversa aberta para esclarecer qualquer dúvida com rapidez."
    },
    Square: {
      dynamic: "Debate Estimulante com Ângulos Diferentes",
      strength: "Desafiam a mente um do outro a pensar fora da caixa e a analisar situações sob diferentes perspetivas.",
      growth: "Evitar debates por pequenas minudências lógicas ou a necessidade de 'ter sempre razão'."
    },
    Opposition: {
      dynamic: "Visão Panorâmica Complementar",
      strength: "Juntos têm uma visão de 360° sobre qualquer assunto: o que um não repara, o outro identifica de imediato.",
      growth: "Somar as duas visões como uma vantagem estratégica, sem invalidar o ponto de vista oposto."
    }
  }
};

export function getAspectDetailedInterpretation(asp, nameA = "Pessoa A", nameB = "Pessoa B") {
  const pA = asp.pA_key;
  const pB = asp.pB_key;
  const aspectType = asp.aspect;

  const key1 = `${pA}-${pB}`;
  const key2 = `${pB}-${pA}`;

  const dict = INTER_ASPECT_ARCHETYPES[key1] || INTER_ASPECT_ARCHETYPES[key2];
  if (dict && dict[aspectType]) {
    const d = dict[aspectType];
    return {
      dynamic: d.dynamic,
      strength: d.strength.replace(/Pessoa A/g, nameA).replace(/Pessoa B/g, nameB),
      growth: d.growth.replace(/Pessoa A/g, nameA).replace(/Pessoa B/g, nameB)
    };
  }

  // Fallback intelligent archetypal generator for other pairs (Saturn, Jupiter, Uranus, Neptune, Pluto, Angles)
  const isHarmonious = (aspectType === "Trine" || aspectType === "Sextile");
  const isChallenging = (aspectType === "Square" || aspectType === "Opposition");
  const isConjunction = (aspectType === "Conjunction");

  let dynamic = `Interação ${asp.pA_name} e ${asp.pB_name}`;
  let strength = `O contacto entre ${asp.pA_name} de ${nameA} e ${asp.pB_name} de ${nameB} cria uma ponte energética que mobiliza a dinâmica de ${asp.nature}.`;
  let growth = "Consciência mútua e diálogo sincero para integrar as energias com sabedoria relacional.";

  if (pA === "Saturn" || pB === "Saturn") {
    dynamic = isHarmonious ? "Estrutura, Lealdade & Compromisso Sólido" : (isChallenging ? "Teste de Paciência, Maturidade & Limites" : "Ancoragem Kármica & Responsabilidade");
    strength = isHarmonious 
      ? `Saturno confere gravidade, seriedade e desejo de construir uma relação sólida e duradoura ao longo do tempo.`
      : `Este contacto atua como uma escola de maturidade relacional, exigindo responsabilidade, paciência e eliminação de ilusões superficiais.`;
    growth = "Evitar cobranças excessivas ou frieza defensiva; aliar o compromisso prático à ternura constante.";
  } else if (pA === "Jupiter" || pB === "Jupiter") {
    dynamic = isHarmonious ? "Expansão, Otimismo & Generosidade Partilhada" : "Entusiasmo Intenso & Procura de Sentido";
    strength = `Júpiter traz fé, alegria de viver, generosidade e capacidade de abrir portas e horizontes na vida do parceiro.`;
    growth = "Alinhar o otimismo a passos concretos e metas realistas no quotidiano.";
  } else if (pA === "Neptune" || pB === "Neptune") {
    dynamic = isHarmonious ? "Romantismo Espiritual, Empatia & Poesia" : "Idealização Afetiva & Busca de Transparência";
    strength = `Sensibilidade lírica e conexão subtil de alma, onde existe compaixão profunda e capacidade de perdoar e sonhar juntos.`;
    growth = "Manter os pés assentes na realidade prática e comunicar com transparência para dissipar expetativas irrealistas.";
  } else if (pA === "Pluto" || pB === "Pluto") {
    dynamic = isHarmonious ? "Transformação Psicológica & Regeneração Mútua" : "Intensidade Transformadora & Confronto de Sombras";
    strength = `Vínculo magnético e profundo que não deixa nada na superfície; impulsiona uma profunda cura interior e renascimento conjunto.`;
    growth = "Renunciar a jogos de controlo ou desconfiança; alicerçar a relação na verdade nua e crua e no respeito pela liberdade do outro.";
  } else if (pA === "Uranus" || pB === "Uranus") {
    dynamic = isHarmonious ? "Originalidade, Estímulo Elétrico & Liberdade" : "Impulso de Renovação & Espaço Individual";
    strength = `Quebra de monotonia e vivacidade mental; traz surpresas agradáveis, inovação e estímulo para novas descobertas.`;
    growth = "Respeitar os momentos de independência e liberdade de cada um dentro da parceria.";
  } else if (pA === "Chiron" || pB === "Chiron") {
    dynamic = isHarmonious ? "Cura Mútua, Empatia & Mestria Emocional" : (isChallenging ? "Sensibilidade à Flor da Pele & Cura de Feridas Antigas" : "Ativação de Cura Profunda & Sensibilidade Sagrada");
    strength = isHarmonious
      ? `A presença de Quíron abre um portal de empatia e aceitação mútua, permitindo que ambos acolham as suas vulnerabilidades sem receio e se curem mutuamente.`
      : (isChallenging
        ? `Este contacto toca em zonas de grande vulnerabilidade pessoal e feridas antigas. Quando acolhido com gentileza, paciência e escuta compassiva, torna-se um dos mais poderosos motores de amadurecimento e cura interior da relação.`
        : `União profunda em torno de sensibilidades partilhadas e capacidade de transformar dores passadas em sabedoria e compaixão viva.`);
    growth = "Acolher a vulnerabilidade com ternura absoluta; evitar projetar mágoas do passado no parceiro e praticar o acolhimento consciente.";
  } else if (pA === "Lilith" || pB === "Lilith") {
    dynamic = isHarmonious ? "Magnetismo Instintivo, Autenticidade & Soberania" : (isChallenging ? "Fascínio Visceral & Confronto de Sombras" : "Alquimia Instintiva & Poder Bruto");
    strength = `A Lua Negra (Lilith) desperta uma atração visceral e crua, convidando ambos a abandonarem máscaras sociais e a viverem a sua verdade instintiva mais autêntica.`;
    growth = "Respeitar a soberania e liberdade feroz de cada um, evitando jogos de submissão ou reações defensivas intempestivas.";
  } else if (pA === "NorthNode" || pB === "NorthNode" || pA === "SouthNode" || pB === "SouthNode") {
    dynamic = (pA === "SouthNode" || pB === "SouthNode") ? "Reconhecimento Kármico & Memória de Alma" : "Alinhamento de Destino & Impulso Evolutivo";
    strength = (pA === "SouthNode" || pB === "SouthNode")
      ? `Sensação imediata de familiaridade profunda, como se já se conhecessem de outros tempos, trazendo talentos e memórias partilhadas.`
      : `Este contacto com o Nodo Norte impulsiona o crescimento futuro da alma: um atua como catalisador direto da missão de vida e evolução do outro.`;
    growth = "Honrar a bagagem do passado sem ficar preso a antigos padrões repetitivos, apoiando mutuamente o salto evolutivo do presente.";
  }

  return {
    dynamic,
    strength,
    growth
  };
}

export function calculateSynastryAspects(chartA, chartB) {
  if (!chartA?.planets || !chartB?.planets) return [];

  const pointsA = [];
  const pointsB = [];

  const planetKeys = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "Lilith", "NorthNode", "SouthNode"];
  for (const k of planetKeys) {
    if (chartA.planets[k]) pointsA.push({ key: k, name: PLANET_DESCRIPTIONS[k]?.pt || k, ...chartA.planets[k] });
    if (chartB.planets[k]) pointsB.push({ key: k, name: PLANET_DESCRIPTIONS[k]?.pt || k, ...chartB.planets[k] });
  }

  if (chartA.angles?.ascendant) {
    pointsA.push({ key: "Ascendant", name: "Ascendente", totalLongitude: chartA.angles.ascendant.degreeExact || chartA.angles.ascendant.totalLongitude || 0, sign: chartA.angles.ascendant.sign });
  }
  if (chartA.angles?.midheaven) {
    pointsA.push({ key: "Midheaven", name: "Meio do Céu", totalLongitude: chartA.angles.midheaven.degreeExact || chartA.angles.midheaven.totalLongitude || 0, sign: chartA.angles.midheaven.sign });
  }

  if (chartB.angles?.ascendant) {
    pointsB.push({ key: "Ascendant", name: "Ascendente", totalLongitude: chartB.angles.ascendant.degreeExact || chartB.angles.ascendant.totalLongitude || 0, sign: chartB.angles.ascendant.sign });
  }
  if (chartB.angles?.midheaven) {
    pointsB.push({ key: "Midheaven", name: "Meio do Céu", totalLongitude: chartB.angles.midheaven.degreeExact || chartB.angles.midheaven.totalLongitude || 0, sign: chartB.angles.midheaven.sign });
  }

  const aspects = [];

  for (const pA of pointsA) {
    for (const pB of pointsB) {
      // Skip automatic NorthNode-SouthNode opposition between same axis if trivial, or keep inter-chart nodal contacts
      const diff = Math.abs(pA.totalLongitude - pB.totalLongitude);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const asp of SYNASTRY_ASPECT_TYPES) {
        const orbDist = Math.abs(angle - asp.angle);
        if (orbDist <= asp.orb) {
          // Categorize dynamic tag
          let tag = SYNASTRY_TAGS.harmony;
          const pairKey = [pA.key, pB.key].sort().join("-");

          if (pA.key === "Chiron" || pB.key === "Chiron") {
            tag = SYNASTRY_TAGS.healing;
          } else if (pA.key === "NorthNode" || pB.key === "NorthNode" || pA.key === "SouthNode" || pB.key === "SouthNode") {
            tag = SYNASTRY_TAGS.karmic;
          } else if (pA.key === "Lilith" || pB.key === "Lilith") {
            tag = SYNASTRY_TAGS.passion;
          } else if ((pA.key === "Venus" && pB.key === "Mars") || (pA.key === "Mars" && pB.key === "Venus") ||
              (pA.key === "Mars" && pB.key === "Pluto") || (pA.key === "Sun" && pB.key === "Venus") ||
              (pA.key === "Venus" && pB.key === "Pluto")) {
            tag = SYNASTRY_TAGS.passion;
          } else if (pA.key === "Mercury" || pB.key === "Mercury") {
            tag = SYNASTRY_TAGS.mental;
          } else if (pA.key === "Saturn" || pB.key === "Saturn" || pA.key === "Pluto" || pB.key === "Pluto") {
            if (asp.name === "Square" || asp.name === "Opposition") tag = SYNASTRY_TAGS.friction;
            else tag = SYNASTRY_TAGS.karmic;
          } else if (pA.key === "Moon" || pB.key === "Moon" || pA.key === "Neptune" || pB.key === "Neptune") {
            tag = SYNASTRY_TAGS.emotion;
          } else if (asp.name === "Square") {
            tag = SYNASTRY_TAGS.friction;
          }

          const rawAspect = {
            pA_key: pA.key,
            pA_name: pA.name,
            pA_sign: pA.sign,
            pA_degree: pA.degree || 0,
            pB_key: pB.key,
            pB_name: pB.name,
            pB_sign: pB.sign,
            pB_degree: pB.degree || 0,
            aspect: asp.name,
            aspectPt: asp.pt,
            glyph: asp.glyph,
            angleExact: Math.round(angle * 10) / 10,
            orb: Math.round(orbDist * 10) / 10,
            nature: asp.nature,
            score: asp.score,
            tag: tag.pt,
            tagEn: tag.en,
            tagColor: tag.color
          };

          const interp = getAspectDetailedInterpretation(rawAspect);
          rawAspect.interpretation = interp;
          aspects.push(rawAspect);
        }
      }
    }
  }

  // Sort by tightness of orb
  aspects.sort((a, b) => a.orb - b.orb);
  return aspects;
}

export function calculateSynastryHouseOverlays(chartA, chartB) {
  if (!chartA?.angles?.houses || !chartB?.planets) return [];

  const overlays = [];
  const planetKeys = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "Lilith", "NorthNode", "SouthNode"];

  for (const k of planetKeys) {
    const pB = chartB.planets[k];
    if (!pB) continue;

    const houseInA = getHouseForDegree(pB.totalLongitude, chartA.angles.houses);
    const houseInfo = HOUSE_THEMES[houseInA] || { title: `Casa ${houseInA}`, desc: "" };

    overlays.push({
      planetKey: k,
      planetName: PLANET_DESCRIPTIONS[k]?.pt || k,
      planetSign: pB.sign,
      houseNumber: houseInA,
      houseRoman: ROMAN_HOUSES[houseInA],
      houseTitle: houseInfo.title,
      houseTheme: houseInfo.desc
    });
  }

  return overlays;
}

export function calculateElementalSynastryAlchemy(chartA, chartB) {
  const ELEMENTS = {
    Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
    Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
    Gemini: "Air", Libra: "Air", Aquarius: "Air",
    Cancer: "Water", Scorpio: "Water", Pisces: "Water"
  };

  const elemA = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const elemB = { Fire: 0, Earth: 0, Air: 0, Water: 0 };

  for (const p of Object.values(chartA.planets || {})) {
    if (p.sign && ELEMENTS[p.sign]) elemA[ELEMENTS[p.sign]]++;
  }
  for (const p of Object.values(chartB.planets || {})) {
    if (p.sign && ELEMENTS[p.sign]) elemB[ELEMENTS[p.sign]]++;
  }

  const aspects = calculateSynastryAspects(chartA, chartB);

  // 1. Dynamic Chemistry (Passion, Attraction & Energy)
  let rawChem = 52;
  const chemAspects = aspects.filter(a => a.tag.includes("Paixão") || a.tag.includes("Magnetismo"));
  for (const a of chemAspects) {
    const orbWeight = Math.max(0.5, (10 - a.orb) / 10);
    if (a.aspect === "Conjunction" || a.aspect === "Trine") rawChem += 12 * orbWeight;
    else if (a.aspect === "Sextile") rawChem += 8 * orbWeight;
    else if (a.aspect === "Square" || a.aspect === "Opposition") rawChem += 7 * orbWeight;
  }
  // Elemental fire/air boost
  if ((elemA.Fire > 2 && elemB.Air > 2) || (elemA.Air > 2 && elemB.Fire > 2) || (elemA.Fire > 2 && elemB.Fire > 2)) {
    rawChem += 6;
  }
  const chemistryScore = Math.min(98, Math.max(45, Math.round(rawChem)));

  // 2. Dynamic Emotional Resonance (Safety, Empathy & Closeness)
  let rawEmo = 50;
  const emoAspects = aspects.filter(a => a.tag.includes("Emocional"));
  for (const a of emoAspects) {
    const orbWeight = Math.max(0.5, (10 - a.orb) / 10);
    if (a.aspect === "Conjunction" || a.aspect === "Trine") rawEmo += 13 * orbWeight;
    else if (a.aspect === "Sextile") rawEmo += 9 * orbWeight;
    else if (a.aspect === "Square" || a.aspect === "Opposition") rawEmo -= 3 * orbWeight;
  }
  // Water/Earth mutual support boost
  const waterEarthA = elemA.Water + elemA.Earth;
  const waterEarthB = elemB.Water + elemB.Earth;
  if (waterEarthA >= 4 && waterEarthB >= 4) rawEmo += 7;
  const emotionalScore = Math.min(98, Math.max(42, Math.round(rawEmo)));

  // 3. Dynamic Mental Alignment (Communication & Clarity)
  let rawMent = 54;
  const mentAspects = aspects.filter(a => a.tag.includes("Mental"));
  for (const a of mentAspects) {
    const orbWeight = Math.max(0.5, (10 - a.orb) / 10);
    if (a.aspect === "Conjunction" || a.aspect === "Trine") rawMent += 12 * orbWeight;
    else if (a.aspect === "Sextile") rawMent += 8 * orbWeight;
    else if (a.aspect === "Square" || a.aspect === "Opposition") rawMent -= 2 * orbWeight;
  }
  if (elemA.Air >= 2 && elemB.Air >= 2) rawMent += 6;
  const mentalScore = Math.min(98, Math.max(45, Math.round(rawMent)));

  // 4. Dynamic Stability & Commitment (Saturn, Earth, Angles)
  let rawStab = 50;
  const stabAspects = aspects.filter(a => a.tag.includes("Kármico") || a.pA_key === "Saturn" || a.pB_key === "Saturn");
  for (const a of stabAspects) {
    const orbWeight = Math.max(0.5, (10 - a.orb) / 10);
    if (a.aspect === "Trine" || a.aspect === "Sextile" || a.aspect === "Conjunction") rawStab += 10 * orbWeight;
    else if (a.aspect === "Square" || a.aspect === "Opposition") rawStab += 4 * orbWeight; // Tests of maturity
  }
  if (elemA.Earth >= 3 && elemB.Earth >= 3) rawStab += 8;
  const stabilityScore = Math.min(98, Math.max(48, Math.round(rawStab)));

  // 5. Global Relational Harmony Composite
  const weightedOverall = (emotionalScore * 0.30) + (mentalScore * 0.25) + (chemistryScore * 0.25) + (stabilityScore * 0.20);
  const overallHarmony = Math.min(98, Math.max(45, Math.round(weightedOverall)));

  return {
    overallHarmony,
    chemistryScore,
    mentalScore,
    emotionalScore,
    stabilityScore,
    elementA: elemA,
    elementB: elemB,
    totalAspectsCount: aspects.length,
    tightAspectsCount: aspects.filter(a => a.orb <= 3).length
  };
}

export function generateSynastryPsychologicalReport(chartA, chartB, synastryAspects, overlays, alchemy, nameA = "Você", nameB = "Contacto") {
  const moonAspect = (synastryAspects || []).find(a => (a.pA_key === "Moon" && a.pB_key === "Moon"));
  const moonConnection = generateDeepMoonConnectionAnalysis(chartA, chartB, moonAspect, nameA, nameB);
  const sunA = chartA.planets?.Sun;
  const sunB = chartB.planets?.Sun;
  const moonA = chartA.planets?.Moon;
  const moonB = chartB.planets?.Moon;

  const sunZ_A = ZODIAC_PT[sunA?.sign]?.name || sunA?.sign || "";
  const sunZ_B = ZODIAC_PT[sunB?.sign]?.name || sunB?.sign || "";
  const moonZ_A = ZODIAC_PT[moonA?.sign]?.name || moonA?.sign || "";
  const moonZ_B = ZODIAC_PT[moonB?.sign]?.name || moonB?.sign || "";

  // 1. Core Relational Chemistry & Balance
  const section1_Core = `Com uma Harmonia Global calculada em ${alchemy.overallHarmony}%, o encontro entre ${nameA} (Sol em ${sunZ_A}) e ${nameB} (Sol em ${sunZ_B}) cria uma dinâmica de cooperação genuína. As qualidades centrais de ambos apoiam-se mutuamente, permitindo que a convivência proporcione estímulo criativo, segurança pessoal e reconhecimento autêntico sem necessidade de jogos de poder.`;

  // 2. Emotional Resonance & Safety
  const section2_Emotion = `No plano da intimidade e segurança afetiva (${alchemy.emotionalScore}%), a ligação entre a Lua em ${moonZ_A} (${nameA}) e a Lua em ${moonZ_B} (${nameB}) ${alchemy.emotionalScore >= 75 ? "revela uma telepatia e capacidade de acolhimento espontânea. Ambos encontram um espaço seguro para partilhar vulnerabilidades e descansar das exigências exteriores." : "mostra formas distintas de digestão emocional que, quando respeitadas com gentileza e escuta paciente, enriquecem a maturidade do vínculo."}`;

  // 3. Mental Alignment & Dialogue
  const section3_Mental = `Na comunicação e troca de ideias (${alchemy.mentalScore}%), o entendimento flui com clareza prática. A interação mental permite debater assuntos do dia a dia, resolver imprevistos e alinhar decisões futuras com agilidade e respeito pelos pontos de vista mútuos.`;

  // 4. Magnetism, Chemistry & Energy
  const section4_Passion = `No vetor de atração, energia e dinamismo (${alchemy.chemistryScore}%), a relação conta com uma presença magnética viva. Existe entusiasmo para partilhar experiências, projetos e momentos lúdicos que renovam a alegria e a cumplicidade do par.`;

  // 5. Growth Points & Long-Term Stability
  const tightFriction = (synastryAspects || []).filter(a => a.tag.includes("Desafio") || a.tag.includes("Ajuste") || a.tag.includes("Crescimento"));
  const section5_Friction = `Com um índice de estabilidade e compromisso de ${alchemy.stabilityScore}%, ${tightFriction.length > 0 ? "os principais pontos de evolução concentram-se em " + tightFriction.slice(0, 2).map(a => `${a.pA_name} e ${a.pB_name}`).join(" e ") + ", convidando o par a transformar eventuais diferenças de ritmo em sabedoria e flexibilidade mútua." : "a ausência de tensões graves confere uma atmosfera serena e estável à convivência, alicerçando a união com lealdade e maturidade ao longo do tempo."}`;

  // 6. Harmonizing Remedies
  const remedies = [
    { name: "Beech", desc: "Promove tolerância compassiva e aceitação amorosa das particularidades do outro." },
    { name: "Holly", desc: "Abre o coração para o acolhimento sincero, dissolvendo desconfianças defensivas." },
    { name: "Vervain", desc: "Acalma excessos de entusiasmo e harmoniza conversas com serenidade partilhada." }
  ];

  return {
    section1_Core,
    section2_Emotion,
    section3_Mental,
    section4_Passion,
    section5_Friction,
    moonConnection,
    remedies
  };
}
