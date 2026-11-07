import { buildSystemPrompt } from "./promptBuilder.js";
import { sanitizeNounPivot } from "./geoProtocolService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rawData = fs.readFileSync(path.join(__dirname, "../data/bach_essences.json"), "utf8");
const allBachEssences = JSON.parse(rawData).essences.map(e => e.name);

const CANDIDATE_GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview"
];

/**
 * Server-Side Zero-Leakage Firewall & Wellness Sanitizer
 * Programmatically guarantees no Bach essence names leak when unpaid.
 */
export function enforceZeroLeakageAudit(letterText, isPaid) {
  let sanitized = sanitizeNounPivot(letterText || "");
  if (isPaid) return sanitized;

  for (const essenceName of allBachEssences) {
    const regex = new RegExp(`\\b${essenceName}\\b`, "gi");
    if (regex.test(sanitized)) {
      console.warn(`[SECURITY ALERT] Blocked accidental essence leakage: ${essenceName}`);
      sanitized = sanitized.replace(regex, "[Locked in Full SOMA·38 Dossier]");
    }
  }
  return sanitized;
}

/**
 * Sanitizes multi-turn message history for Gemini API
 */
export function sanitizeGeminiContents(conversationHistory) {
  const contents = [];
  let lastRole = null;

  for (const msg of conversationHistory) {
    if (!msg || !msg.content || typeof msg.content !== "string") continue;
    const text = msg.content.trim();
    if (!text) continue;

    const rawRole = (msg.role || "").toLowerCase();
    const role = (rawRole === "assistant" || rawRole === "model") ? "model" : "user";

    if (role === lastRole && contents.length > 0) {
      contents[contents.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      contents.push({ role, parts: [{ text }] });
      lastRole = role;
    }
  }

  while (contents.length > 0 && contents[0].role === "model") {
    contents.shift();
  }

  return contents;
}

/**
 * Calls Gemini API with automated multi-model failover
 */
export async function callGeminiApi({ systemInstruction, contents, apiKey, maxOutputTokens = 1800, temperature = 0.65 }) {
  if (!apiKey || !contents || contents.length === 0) return null;

  for (const model of CANDIDATE_GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 10) {
          return text.trim();
        }
      } else {
        const errText = await response.text();
        console.warn(`[GEMINI MODEL ${model} FAIL ${response.status}]:`, errText.substring(0, 150));
      }
    } catch (err) {
      console.warn(`[GEMINI MODEL ${model} NETWORK ERROR]:`, err.message);
    }
  }
  return null;
}

/**
 * Generates either the 3-4 sentence Karmic & Somatic Mirror Teaser (unpaid)
 * or the Full 3-Part SOMA·38 Karmic, Gestalt & Pushpa Upaya Dossier (paid).
 */
export async function generateReadingLetter({
  horaryChart,
  natalChart,
  gestaltDiagnosis,
  placesData,
  selfReport,
  paymentStatus,
  userName = "Seeker",
  language = "en",
  activeTransits = [],
  conversationHistory = [],
  apiKey = process.env.GEMINI_API_KEY,
  userMemorySummary = "",
  contextType = "consultation",
  synastryDetails = null
}) {
  const isPaid = paymentStatus === true || paymentStatus === "paid";
  const systemInstruction = buildSystemPrompt({
    horaryChart,
    natalChart,
    gestaltDiagnosis,
    placesData,
    paymentStatus: isPaid,
    userName,
    language,
    activeTransits,
    userMemorySummary,
    contextType,
    synastryDetails
  });

  const sanitizedContents = sanitizeGeminiContents(conversationHistory);
  if (sanitizedContents.length === 0) {
    sanitizedContents.push({
      role: "user",
      parts: [{ text: `User's Karmic & Somatic Self-Report:\n"${selfReport}"` }]
    });
  }

  if (apiKey) {
    const generatedLetter = await callGeminiApi({
      systemInstruction,
      contents: sanitizedContents,
      apiKey,
      maxOutputTokens: isPaid ? 2600 : 450,
      temperature: 0.65
    });

    if (generatedLetter) {
      return enforceZeroLeakageAudit(generatedLetter, isPaid);
    }
  }

  return generateDeterministicDossier({
    userName,
    selfReport,
    gestaltDiagnosis,
    placesData,
    isPaid,
    hasNatal: !!natalChart,
    natalChart,
    horaryChart,
    language
  });
}

/**
 * Deterministic SOMA·38 Karmic & Somatic Dossier Engine (Fallback when offline or no API key)
 */
function generateDeterministicDossier({
  userName,
  selfReport = "",
  gestaltDiagnosis,
  placesData,
  isPaid,
  hasNatal,
  natalChart,
  horaryChart,
  language = "en"
}) {
  const lower = (selfReport || "").toLowerCase();
  const rawInterruption = gestaltDiagnosis?.boundaryInterruption || "Retroflection";

  const chart = natalChart || horaryChart;
  const moonVedic = chart?.planets?.Moon?.vedicSign || "Karka (Cancer)";
  const moonNakshatra = chart?.planets?.Moon?.nakshatra || "Rohini";
  const lagnaVedic = chart?.angles?.ascendant?.vedicSign || "Simha (Leo)";
  const rahuVedic = chart?.planets?.NorthNode?.vedicSign || "Meena (Pisces)";
  const ketuVedic = chart?.planets?.SouthNode?.vedicSign || "Kanya (Virgo)";
  const shaniVedic = chart?.planets?.Saturn?.vedicSign || "Kumbha (Aquarius)";

  // Detect the user's conscious rationalization from their narrative
  let consciousDefense = "trying to hold everything together and maintain harmony without creating friction";
  let blockType = rawInterruption;

  if (lower.match(/peace|family|parents|in-laws|guilt|say no|please|partner|marriage|eggshells|conflict|paz|discuss|ceder/)) {
    consciousDefense = "keeping the peace and avoiding family or relational conflict";
    blockType = "Karmic Confluence (Boundary Dissolution)";
  } else if (lower.match(/night|sleep|2am|3am|3 am|overthink|head|ruminat|mind|replaying|noite|dormir/)) {
    consciousDefense = "analyzing every conversation to anticipate outcomes and stay in control";
    blockType = "Somatic Retroflection (Rahu–Chandra Overdrive)";
  } else if (lower.match(/stuck|stagnant|career|guilt|rest|30|25|behind|job|expectations|estagn|paralis/)) {
    consciousDefense = "waiting for the 'right moment' while punishing yourself whenever you try to rest";
    blockType = "Karmic Introjection (Swallowed Duty vs. Swadharma)";
  } else if (lower.match(/alone|carry|shoulders|team|nobody helps|control|responsibil|sozinh|costas/)) {
    consciousDefense = "carrying everyone's responsibilities on your own shoulders so nothing falls apart";
    blockType = "Hyper-Functioning Retroflection (The Atlas Armour)";
  } else if (lower.match(/decid|decision|commit|doubt|sure|choice|stay or leave|decis|mudar/)) {
    consciousDefense = "searching for 100% mental certainty before making an irreversible life or marriage commitment";
    blockType = "Deflection & Karmic Pendulum Paralysis";
  }

  // STATE A: UNPAID -> 3-to-4 sentence "Karmic & Somatic Mirror" Teaser
  if (!isPaid) {
    const teaser = `Your narrative frames this as "${consciousDefense}", yet your Sidereal Vedic blueprint—with Chandra in ${moonVedic} (${moonNakshatra} Nakshatra) and the Rahu–Ketu axis across ${rahuVedic}/${ketuVedic}—exposes an active Gestalt block of ${blockType}. Rather than expressing friction at the boundary where it belongs, your nervous system is absorbing unspoken expectations and turning that kinetic pressure inward against your own body and Prana. What your mind rationalizes as duty or prudence is actually an invisible karmic contract of self-erasure that keeps you oscillating between daytime hyper-functioning and 3 AM mental restlessness. Until you sever this unconscious somatic loop and recalibrate your Lunar boundary, every attempt to rest or compromise will only deepen the hidden resentment.`;
    return enforceZeroLeakageAudit(teaser, false);
  }

  // STATE C: PAID -> Full 3-Part SOMA·38 Karmic, Somatic & Pushpa Upaya Dossier
  const selectedEssences = (gestaltDiagnosis?.selectedEssences || []).slice(0, 6);

  const essencesMarkdown = selectedEssences.map((e, idx) =>
    `${idx + 1}. **${e.name}** (*Sacred Pushpa Upaya Function*): ${e.support} Acts directly on the somatic imprint of *${(e.symptom || "karmic boundary strain").toLowerCase()}*, gently quieting nervous-system hyper-vigilance and restoring inner sovereignty.`
  ).join("\n\n");

  const fullDossier = `### Section 1: The Karmic & Somatic Mirror (Vedic Chart + Gestalt Shadow Synthesis)

Your conscious mind rationalizes your current state as "${consciousDefense}", but cross-referencing your **Sidereal Vedic Kundli (Lahiri Ayanamsa)** with your **Gestalt Contact Cycle** reveals a deep structural pattern of **${blockType}**.

* **Sidereal Lunar & Karmic Architecture:** With your **Lagna in ${lagnaVedic}**, **Chandra (Moon/Manas) in ${moonVedic}** within the **${moonNakshatra} Nakshatra**, **Rahu in ${rahuVedic} ↔ Ketu in ${ketuVedic}**, and **Shani (Saturn) in ${shaniVedic}**, your nervous system is wired for high sensitivity to unspoken relational and ancestral expectations.
* **The Gestalt Somatic Loop:** Instead of allowing friction to happen openly at the contact boundary, your body swallows the tension whole—converting unvoiced "No's" into chest tightness, solar-plexus contraction, 3 AM mental replay, and emotional fatigue. What looks like "loyalty" or "endurance" on the outside is operating internally as a continuous leak of your vital *Prana*.

---

### Section 2: 14-Day Dharma & Boundary Alignment Protocol (Somatic Action Directives)

1. **The 90-Second Somatic Pause & 24-Hour Buffer (Breaking Karmic Confluence):**
   * *The Trigger:* Any immediate request, family expectation, or relational guilt-trip where your chest tightens and you feel pressured to agree on the spot.
   * *The Somatic Rule:* Never say "Yes" while your nervous system is in sympathetic contraction.
   * *The Action:* Use the sovereign buffer sentence: *"Let me check my bandwidth and get back to you tomorrow."* Zero over-explaining, zero apologizing.

2. **The 10 PM Rahu–Manas Discharge (Ending 3 AM Retroflection Loops):**
   * *The Trigger:* Replaying conversations, worrying about career/marriage outcomes, or scrolling late at night to numb cognitive overload.
   * *The Somatic Rule:* Separate what belongs to your *Swadharma* (your direct action) from other people's emotional reactions.
   * *The Action:* Write down on paper the single concrete action you will take tomorrow. Explicitly mark everyone else's emotional reaction as *"Outside My Karmic Jurisdiction"* before sleep.

3. **Daily Micro-Sovereignty Practice (Releasing the Atlas Armour):**
   * *The Trigger:* Feeling resentful that you are carrying the entire household, relationship, or team while others remain passive.
   * *The Somatic Rule:* Stop rescuing others from the natural consequences of their own inaction.
   * *The Action:* For the next 14 days, consciously hand back one responsibility per day without micro-managing how the other person performs it.

---

### Section 3: Sacred Pushpa Upaya — Your 6-Flower Vibrational Formula

In the Vedic tradition, the highest remedy (*Upaya*) is one that purifies the *Manas* (Lunar mind) without creating new karmic side effects. Unlike heavy gemstones (*Ratna*)—which cost ₹25,000+ and can dangerously amplify malefic planetary voltage if misprescribed—**Dr. Edward Bach's 38 Sacred Flower Essences (*Pushpa Upaya*)** work as gentle, solar-infused liquid geometry that dissolves the somatic root of planetary tension:

${essencesMarkdown}

#### How to Order & Prepare Your 30ml Sacred Formula in India
* **30ml Custom Blend Preparation:** Combine **2 drops of each selected stock essence** above into a 30ml amber glass dropper bottle filled with pure spring/mineral water (plus 1 teaspoon of vegetable glycerin or brandy as a natural preservative), or place 2 drops of each directly into a glass of water.
* **1-Click Indian Fulfillment Sources:**
  * **[Order Authentic Bach Remedies on Tata 1mg (1mg.com)](https://www.1mg.com/search/all?name=bach%20flower)**
  * **[Order Authentic Bach Remedies on Homeomart India (homeomart.com)](https://homeomart.com/collections/bach-flower-remedies)**
  * **[Order on Healthmug (healthmug.com)](https://www.healthmug.com/search?keywords=bach%20flower)** or request this custom 30ml blend at any leading holistic/homeopathic pharmacy in your city.
* **Daily Sacred Dosage:** Take **4 drops directly on the tongue, 4 times daily**—especially **4 drops immediately upon waking** and **4 drops before sleep** for 21 to 30 days.`;

  return enforceZeroLeakageAudit(fullDossier, true);
}

/**
 * Generates an incisive turn response for interactive triage
 */
export async function generateTurnResponse({
  turnIndex = 1,
  conversationHistory = [],
  userName = "Seeker",
  language = "en",
  horaryChart,
  natalChart,
  gestaltDiagnosis,
  apiKey = process.env.GEMINI_API_KEY,
  userMemorySummary = "",
  contextType = "consultation",
  synastryDetails = null
}) {
  const userMessages = conversationHistory.filter(m => m.role === "user");
  const primarySelfReport = userMessages[userMessages.length - 1]?.content || "";

  return generateReadingLetter({
    horaryChart,
    natalChart,
    gestaltDiagnosis,
    placesData: { localSources: [], onlineSuppliers: [] },
    selfReport: primarySelfReport,
    paymentStatus: false,
    userName,
    language,
    conversationHistory,
    apiKey,
    userMemorySummary,
    contextType,
    synastryDetails
  });
}
