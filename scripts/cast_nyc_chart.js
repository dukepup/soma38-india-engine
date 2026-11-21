/**
 * SOMA·38 — Dynamic New York City (NYC) Ephemeris Chart Caster
 * ==========================================================
 * Casts a fresh Sidereal (Lahiri) and Tropical astrological chart for New York City, NY
 * (Latitude: 40.7128° N, Longitude: -74.0060° W) at the exact moment of execution.
 *
 * Extracts:
 *   1. 5th House Cusp, Ruler, Nakshatra, and Creative-Disruptive Archetype
 *   2. The most attention-grabbing, subversive, and disruptive planetary aspects
 *      (ranked by tightest orb: oppositions, squares, combustions, Rahu/Ketu/Lilith tensions)
 *   3. Personality profile for the SOMA·38 5th-House Subversive Agent
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { castChart, getLahiriAyanamsa } from "../lib/ephemeris.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");

export const NYC_COORDS = {
  latitude: 40.7128,
  longitude: -74.0060,
  city: "New York City, NY, USA",
  timezone: "America/New_York"
};

export function castNYCChart(date = new Date()) {
  const chart = castChart({
    date,
    latitude: NYC_COORDS.latitude,
    longitude: NYC_COORDS.longitude,
    chartType: "horary"
  });

  const h5 = chart.angles.houses.House_5;
  const h1 = chart.angles.houses.House_1;
  const h8 = chart.angles.houses.House_8;
  const h12 = chart.angles.houses.House_12;

  // Filter and sort aspects by attention-grabbing intensity and tightest orb
  const highVoltagePlanets = new Set(["Mars", "Moon", "Sun", "Mercury", "Uranus", "Pluto", "Lilith", "NorthNode", "SouthNode", "Saturn"]);

  const rankedAspects = chart.aspects
    .map(a => {
      let voltageScore = (10 - (a.orb || 5)); // tighter = higher
      if (a.aspect === "Opposition") voltageScore += 5; // confrontation / polarity
      if (a.aspect === "Square") voltageScore += 4; // friction / catalyst
      if (a.aspect === "Conjunction") voltageScore += 3; // fusion / combustion
      if (highVoltagePlanets.has(a.planet1) && highVoltagePlanets.has(a.planet2)) voltageScore += 4;
      if (a.planet1 === "Lilith" || a.planet2 === "Lilith") voltageScore += 5; // raw taboo
      if (a.planet1 === "Mars" || a.planet2 === "Mars") voltageScore += 4; // aggression / drive
      if (a.planet1 === "Moon" || a.planet2 === "Moon") voltageScore += 3; // visceral emotion
      return { ...a, voltageScore: Math.round(voltageScore * 10) / 10 };
    })
    .sort((a, b) => b.voltageScore - a.voltageScore);

  const topAspect = rankedAspects[0] || null;

  // 5th House Creative & Subversive Personality Calibration
  const fifthHouseProfile = {
    sign: h5.sign,
    rashi: h5.rashi,
    nakshatra: h5.nakshatra,
    pada: h5.pada,
    ruler: h5.ruler,
    cuspDegree: Math.round(h5.degree * 100) / 100,
    creativeDirective: `Audacious 5th-House ${h5.sign} (${h5.nakshatra}) ruled by ${h5.ruler}. Subversive, theatrical, unapologetic, magnetic.`
  };

  const output = {
    generated_at: date.toISOString(),
    location: NYC_COORDS,
    chart_summary: {
      ascendant: `${chart.angles.ascendant.sign} ${chart.angles.ascendant.degree}° (${chart.angles.ascendant.nakshatra})`,
      midheaven: `${chart.angles.midheaven.sign} ${chart.angles.midheaven.degree}° (${chart.angles.midheaven.nakshatra})`,
      ayanamsa: chart.angles.ayanamsa,
      zodiac: chart.angles.zodiacSystem
    },
    fifth_house_personality: fifthHouseProfile,
    top_attention_grabbing_aspects: rankedAspects.slice(0, 6),
    primary_disruptive_aspect: topAspect,
    active_planets: chart.planets
  };

  return output;
}

if (process.argv[1] && process.argv[1].endsWith("cast_nyc_chart.js")) {
  const result = castNYCChart();
  const outPath = path.join(DATA_DIR, "current_nyc_chart.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
}
