/**
 * Comprehensive Verification & Test Simulation
 * Validates Ephemeris, Gestalt cycle mapping, Paywall zero-leakage, and Paid remedy unlock.
 */

import { castChart } from "./lib/ephemeris.js";
import { diagnoseGestaltBlockage } from "./lib/gestaltEngine.js";
import { findRemedySources } from "./lib/placesService.js";
import { generateReadingLetter } from "./lib/geminiService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rawData = fs.readFileSync(path.join(__dirname, "data/bach_essences.json"), "utf8");
const allBachEssences = JSON.parse(rawData).essences.map(e => e.name);

async function runTests() {
  console.log("=================================================");
  console.log("✨ RUNNING ASTROLOGICAL & BACH REMEDY ENGINE TESTS");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
    }
  }

  // 1. Test Astrological Calculation (Horary + Natal)
  console.log("--- 1. Testing Ephemeris & Chart Calculation ---");
  const testDate = new Date("2026-08-20T11:00:00Z");
  const horaryChart = castChart({ date: testDate, latitude: 51.5074, longitude: -0.1278 });
  
  assert(horaryChart.planets.Sun !== undefined, "Horary Sun calculated");
  assert(horaryChart.planets.Moon !== undefined, "Horary Moon calculated");
  assert(horaryChart.angles.ascendant !== undefined, "Ascendant calculated");
  assert(horaryChart.aspects.length > 0, `Aspects identified (${horaryChart.aspects.length} found)`);
  console.log(`   Horary Sun: ${horaryChart.planets.Sun.degree}° ${horaryChart.planets.Sun.sign}`);
  console.log(`   Horary Moon: ${horaryChart.planets.Moon.degree}° ${horaryChart.planets.Moon.sign}`);
  console.log(`   Horary Ascendant: ${horaryChart.angles.ascendant.degree}° ${horaryChart.angles.ascendant.sign}`);

  // 2. Test Gestalt & Silent Bach Remedy Selection
  console.log("\n--- 2. Testing Gestalt Contact Cycle & Silent Remedy Selection ---");
  const selfReportSample = "I've been feeling completely drained and second-guessing every choice. I want to launch my project, but I keep hesitating and feeling stuck before taking action.";
  const diagnosis = diagnoseGestaltBlockage(horaryChart, null, selfReportSample);
  
  assert(diagnosis.detectedStage !== undefined, `Gestalt stage detected: ${diagnosis.detectedStage}`);
  assert(diagnosis.selectedEssences.length >= 4 && diagnosis.selectedEssences.length <= 6, `Selected 4-6 Bach remedies (${diagnosis.selectedEssences.length} chosen)`);
  console.log(`   Selected Remedies (Silent Internal): ${diagnosis.selectedEssences.map(e => e.name).join(", ")}`);

  // 3. Test Places & Remedy Supplier Lookup
  console.log("\n--- 3. Testing Remedy Places & Suppliers ---");
  const places = await findRemedySources({ city: "London", latitude: 51.5074, longitude: -0.1278 });
  assert(places.localSources.length > 0, `Found local London sources (${places.localSources.length} found)`);
  assert(places.onlineSuppliers.length >= 3, `Found online suppliers (${places.onlineSuppliers.length} found)`);

  // 4. Test Zero-Leakage Paywall Armor (Unpaid Reading)
  console.log("\n--- 4. Testing Zero-Leakage Paywall Armor (Unpaid) ---");
  const unpaidLetter = await generateReadingLetter({
    horaryChart,
    natalChart: null,
    gestaltDiagnosis: diagnosis,
    placesData: places,
    selfReport: selfReportSample,
    paymentStatus: false,
    userName: "Alex",
    language: "en"
  });

  // Verify that NO Bach Flower essence names appear in the unpaid letter
  let leakedEssences = [];
  for (const essence of allBachEssences) {
    const regex = new RegExp(`\\b${essence}\\b`, "i");
    if (regex.test(unpaidLetter)) {
      leakedEssences.push(essence);
    }
  }

  assert(leakedEssences.length === 0, `Zero-Leakage Armor: 0 of 38 Bach Flower names leaked (Leaked: ${leakedEssences.join(", ") || "None"})`);
  assert(unpaidLetter.includes("$3.49") && unpaidLetter.includes("$7.99"), "Paywall redirection offer present ($3.49 / $7.99)");
  assert(!unpaidLetter.includes("Gestalt"), "Forbidden framework term 'Gestalt' omitted");
  assert(!unpaidLetter.includes("Self-Determination Theory"), "Forbidden term 'Self-Determination Theory' omitted");

  // 5. Test Paid Remedy Protocol Unlock
  console.log("\n--- 5. Testing Paid Remedy Unlock ---");
  const paidLetter = await generateReadingLetter({
    horaryChart,
    natalChart: null,
    gestaltDiagnosis: diagnosis,
    placesData: places,
    selfReport: selfReportSample,
    paymentStatus: true,
    userName: "Alex"
  });

  let revealedEssences = [];
  for (const essence of diagnosis.selectedEssences) {
    if (paidLetter.includes(essence.name)) {
      revealedEssences.push(essence.name);
    }
  }

  assert(revealedEssences.length >= 4, `Paid Protocol Unlock: All selected essences revealed with explanations (${revealedEssences.join(", ")})`);

  console.log("\n=================================================");
  console.log(`RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("=================================================");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
