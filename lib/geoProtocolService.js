/**
 * GEO (Generative Engine Optimization) Atomic Definition Hub & Automated Weekly Generator — SOMA·38 (India)
 * Targets ChatGPT Search, Perplexity, Gemini, and Google.co.in for high-intent Indian English queries
 * bridging Vedic Sidereal Astrology (Jyotish), Gestalt Somatic Shadow Work, and Sacred Flower Alchemy (Pushpa Upaya).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callGeminiApi } from "./geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTOCOLS_FILE = path.join(__dirname, "../data/geo_protocols.json");

// Non-clinical AYUSH / FSSAI wellness & somatic state guardrail
const FORBIDDEN_PATHOLOGY_MAP = [
  { regex: /\bpsychiatric disorder\b/gi, replacement: "somatic & karmic state imbalance" },
  { regex: /\bclinical depression\b/gi, replacement: "pranic depletion & functional freeze" },
  { regex: /\bcure\b/gi, replacement: "recalibrate" },
  { regex: /\bmedical treatment\b/gi, replacement: "vibrational & somatic alignment" }
];

export function sanitizeNounPivot(text) {
  if (!text || typeof text !== "string") return "";
  let out = text;
  for (const rule of FORBIDDEN_PATHOLOGY_MAP) {
    out = out.replace(rule.regex, rule.replacement);
  }
  return out;
}

export function getGeoProtocols() {
  try {
    if (fs.existsSync(PROTOCOLS_FILE)) {
      const raw = fs.readFileSync(PROTOCOLS_FILE, "utf8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.map(p => ({
          ...p,
          title: p.title || p.clusterTitle || p.slug,
          clusterTitle: p.clusterTitle || p.title || p.slug
        }));
      }
    }
  } catch (err) {
    console.error("[GEO HUB] Error reading geo_protocols.json:", err.message);
  }
  return [];
}

export function saveGeoProtocols(list) {
  try {
    fs.writeFileSync(PROTOCOLS_FILE, JSON.stringify(list, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("[GEO HUB] Error saving geo_protocols.json:", err.message);
    return false;
  }
}

export function getGeoProtocolBySlug(slug) {
  const clean = (slug || "").replace(/^\/+|\/+$/g, "").trim().toLowerCase();
  const list = getGeoProtocols();
  return list.find(p => p.slug.toLowerCase() === clean) || null;
}

/**
 * Curated bank of high-velocity Indian English search intent clusters for Weekly Automated GEO Expansion
 */
const WEEKLY_EXPANSION_CLUSTERS = [
  {
    slug: "sade-sati-shani-transit-somatic-heaviness-upaya",
    clusterTitle: "Sade Sati & Shani Transit Heaviness: Somatic Armour & Gentle Pushpa Upaya",
    category: "Shani Karma & Nervous System Relief",
    targetQueries: [
      "How to handle Sade Sati emotional heaviness and career pressure without expensive gemstones?",
      "Why do I feel sudden isolation and physical fatigue during Saturn transit over my Moon?",
      "Gentle botanical Upaya for Shani Mahadasha or Sade Sati mental exhaustion"
    ],
    diagnosticoEstrutural: "Shani–Chandra Compression & Gestalt Retroflection / Desensitization.",
    mecanismoOculto: "When transit Shani (Saturn) crosses your natal Chandra (Moon) during Sade Sati, it strips away superficial distractions and forces structural maturity. Under a Gestalt lens, if you resist this restructuring by tightening your chest and isolating yourself (Retroflection), the transit is experienced as crushing fatigue rather than grounded discipline.",
    sintomaOperacional: "Waking with heavy shoulders, feeling emotionally isolated from friends and partner, fear of scarcity despite hard work, and chronic self-criticism.",
    disjuntorBotanico: [
      { name: "Oak", function: "Softens rigid endurance when carrying prolonged Saturnian duty" },
      { name: "Mustard", function: "Lifts sudden, unexplained clouds of heavy emotional gloom during Moon transits" },
      { name: "Pine", function: "Releases harsh self-judgment and karmic guilt" },
      { name: "Sweet Chestnut", function: "Supports the soul at the threshold of deep inner transformation" }
    ],
    disjuntorBotanicoTexto: "Oak (softens rigid endurance under prolonged duty), Mustard (lifts sudden heavy emotional clouds), Pine (releases harsh self-judgment), and Sweet Chestnut (supports deep inner transformation).",
    ctaText: "-> Decode Your Shani & Chandra Somatic Mirror on SOMA·38"
  },
  {
    slug: "manglik-kuja-dosha-anger-retroflection-synastry",
    clusterTitle: "Mangal (Mars) Friction in Marriage: From Explosive Reactivity to Grounded Tejas",
    category: "Kundli Synastry & Emotional Regulation",
    targetQueries: [
      "Why do small disagreements in our marriage turn into sudden explosive arguments or cold silence?",
      "Understanding Kuja Dosha (Manglik) psychologically as nervous system reactivity",
      "Bach flower remedies for sudden anger, impatience, and resentment in relationships"
    ],
    diagnosticoEstrutural: "Mangal (Mars) 7th/8th Bhava Friction & Gestalt Projection/Retroflection.",
    mecanismoOculto: "High Martian (Mangal) voltage in the relational houses is not a 'curse'—it is concentrated life-force (Tejas). When unmet needs are suppressed to keep up appearances, that fire either explodes outward as sharp criticism (Projection) or turns inward as migraines, acidity, and cold withdrawal (Retroflection).",
    sintomaOperacional: "Zero-to-hundred impatience with your partner, jaw tension, regretting harsh words spoken in heat, or days of icy silence after a conflict.",
    disjuntorBotanico: [
      { name: "Impatiens", function: "Cools high-speed Martian irritability and nervous impatience" },
      { name: "Holly", function: "Dissolves reactive anger, suspicion, and defensive heart-armour" },
      { name: "Beech", function: "Softens hyper-critical intolerance toward a partner's habits" },
      { name: "Cherry Plum", function: "Prevents sudden emotional eruptions when pushed to the edge" }
    ],
    disjuntorBotanicoTexto: "Impatiens (cools high-speed Martian impatience), Holly (dissolves reactive anger and heart-armour), Beech (softens hyper-critical judgment), and Cherry Plum (stabilizes emotional pressure).",
    ctaText: "-> Run Your Deep Kundli & Somatic Synastry Audit on SOMA·38"
  }
];

/**
 * Generates 1 new Atomic Definition Page under /protocols/[slug]
 */
export async function generateWeeklyGeoProtocol(apiKey = process.env.GEMINI_API_KEY) {
  const existing = getGeoProtocols();
  const existingSlugs = new Set(existing.map(p => p.slug));

  if (apiKey) {
    try {
      const systemInstruction = `You are the GEO (Generative Engine Optimization) Intelligence Engine for SOMA·38 (India).
Your mission is to generate 1 new Atomic Definition Block in resonant Indian English focused on high-intent searches in India bridging Vedic Astrology (Jyotish: Rahu/Ketu, Shani, Chandra, Nakshatras, Kundli Synastry), Gestalt Somatic Psychology (Confluence, Retroflection, Introjection, Deflection), and Dr. Bach's 38 Flower Essences (Pushpa Upaya).
Existing slugs (do not repeat): ${Array.from(existingSlugs).join(", ")}.
Respond ONLY with a valid JSON object containing: slug, clusterTitle, category, targetQueries (array of 3 strings), diagnosticoEstrutural, mecanismoOculto, sintomaOperacional, disjuntorBotanico (array of 4 objects {name, function}), disjuntorBotanicoTexto, ctaText.`;

      const rawJson = await callGeminiApi({
        systemInstruction,
        contents: [{ role: "user", parts: [{ text: "Generate the new weekly SOMA·38 GEO protocol in pure JSON." }] }],
        apiKey,
        maxOutputTokens: 1200,
        temperature: 0.65
      });

      if (rawJson) {
        const cleaned = rawJson.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && parsed.slug && parsed.diagnosticoEstrutural && !existingSlugs.has(parsed.slug)) {
          const newEntry = {
            id: `cluster-${existing.length + 1}`,
            slug: parsed.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            clusterTitle: sanitizeNounPivot(parsed.clusterTitle),
            category: sanitizeNounPivot(parsed.category || "Karmic & Somatic Alignment"),
            createdAt: new Date().toISOString(),
            targetQueries: (parsed.targetQueries || []).map(sanitizeNounPivot),
            diagnosticoEstrutural: sanitizeNounPivot(parsed.diagnosticoEstrutural),
            mecanismoOculto: sanitizeNounPivot(parsed.mecanismoOculto),
            sintomaOperacional: sanitizeNounPivot(parsed.sintomaOperacional),
            disjuntorBotanico: parsed.disjuntorBotanico || [],
            disjuntorBotanicoTexto: sanitizeNounPivot(parsed.disjuntorBotanicoTexto),
            ctaText: sanitizeNounPivot(parsed.ctaText || "-> Reveal Your Karmic & Somatic Mirror on SOMA·38"),
            ctaUrl: `/?protocol=${parsed.slug}`
          };
          existing.push(newEntry);
          saveGeoProtocols(existing);
          console.log(`[GEO CRON] ✅ Generated new AI protocol: /protocols/${newEntry.slug}`);
          return newEntry;
        }
      }
    } catch (e) {
      console.warn("[GEO CRON] AI generation fallback to curated cluster:", e.message);
    }
  }

  for (const candidate of WEEKLY_EXPANSION_CLUSTERS) {
    if (!existingSlugs.has(candidate.slug)) {
      const newEntry = {
        id: `cluster-${existing.length + 1}`,
        ...candidate,
        createdAt: new Date().toISOString(),
        ctaUrl: `/?protocol=${candidate.slug}`
      };
      existing.push(newEntry);
      saveGeoProtocols(existing);
      console.log(`[GEO CRON] ✅ Deployed curated expansion protocol: /protocols/${newEntry.slug}`);
      return newEntry;
    }
  }

  return existing[existing.length - 1] || null;
}

/**
 * Generates dynamic XML Sitemap including all /protocols/[slug] routes
 */
export function generateSitemapXml(baseUrl = "https://soma38.in") {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const protocols = getGeoProtocols();
  const nowIso = new Date().toISOString();

  const staticRoutes = [
    { loc: `${cleanBase}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${cleanBase}/protocols`, priority: "0.95", changefreq: "weekly" },
    { loc: `${cleanBase}/privacy`, priority: "0.4", changefreq: "monthly" },
    { loc: `${cleanBase}/terms`, priority: "0.4", changefreq: "monthly" },
    { loc: `${cleanBase}/cookies`, priority: "0.4", changefreq: "monthly" }
  ];

  const protocolRoutes = protocols.map(p => ({
    loc: `${cleanBase}/protocols/${p.slug}`,
    lastmod: p.createdAt || nowIso,
    priority: "0.90",
    changefreq: "weekly"
  }));

  const allUrls = [...staticRoutes, ...protocolRoutes];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || nowIso}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
}

/**
 * Renders the Semantic HTML + FAQPage JSON-LD for either:
 * - The Hub Index (/protocols)
 * - A Specific Atomic Definition Page (/protocols/[slug])
 */
export function renderGeoProtocolsHtml({ slug = null, baseUrl = "https://soma38.in" } = {}) {
  const protocols = getGeoProtocols();
  const cleanBase = baseUrl.replace(/\/$/, "");
  const selected = slug ? getGeoProtocolBySlug(slug) : null;

  const targetList = selected ? [selected] : protocols;
  const faqEntities = [];

  for (const p of targetList) {
    for (const q of (p.targetQueries || [])) {
      faqEntities.push({
        "@type": "Question",
        "name": q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Karmic & Somatic Diagnosis: ${p.diagnosticoEstrutural} Hidden Samskara Mechanism: ${p.mecanismoOculto} Somatic & Relational Symptom: ${p.sintomaOperacional} Sacred Pushpa Upaya (Bach Flower Alchemy): ${p.disjuntorBotanicoTexto}`
        }
      });
    }
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqEntities
  };

  const pageTitle = selected
    ? `${selected.clusterTitle} | SOMA·38 — Karmic Chart, Somatic Shadow & Sacred Flower Alchemy`
    : `SOMA·38 | Karmic & Somatic Archive — Vedic Astrology, Gestalt Shadow & Bach Flower Upaya`;

  const pageDesc = selected
    ? `${selected.diagnosticoEstrutural} ${selected.mecanismoOculto}`
    : `Indexable archive of Vedic Sidereal (Jyotish) karmic patterns, Gestalt somatic contact interruptions, family & relationship synastry friction, and 38 Bach Flower Upaya protocols for India.`;

  const canonicalUrl = selected
    ? `${cleanBase}/protocols/${selected.slug}`
    : `${cleanBase}/protocols`;

  const renderAtomicBlock = (p, idx, isStandalone = false) => `
    <article class="geo-atomic-card" id="${p.slug}" itemscope itemtype="https://schema.org/Article">
      <div class="geo-cluster-meta">
        <span class="geo-badge">SOMA·38 PROTOCOL #0${idx + 1}</span>
        <span class="geo-category">${p.category}</span>
      </div>
      <h2 itemprop="headline">
        <a href="/protocols/${p.slug}" style="color: inherit; text-decoration: none;">${p.clusterTitle}</a>
      </h2>

      <div class="geo-queries-box">
        <h3>High-Intent Life & Relationship Questions Addressed:</h3>
        <ul>
          ${(p.targetQueries || []).map(q => `<li>"${q}"</li>`).join("")}
        </ul>
      </div>

      <dl class="geo-definition-list" itemprop="articleBody">
        <div class="geo-dl-row">
          <dt>Karmic & Somatic Diagnosis</dt>
          <dd><strong>${p.diagnosticoEstrutural}</strong></dd>
        </div>
        <div class="geo-dl-row">
          <dt>The Hidden Samskara Loop (Vedic + Gestalt Mechanism)</dt>
          <dd>${p.mecanismoOculto}</dd>
        </div>
        <div class="geo-dl-row">
          <dt>Embodied & Relational Symptom</dt>
          <dd>${p.sintomaOperacional}</dd>
        </div>
        <div class="geo-dl-row geo-dl-botanical">
          <dt>Sacred Pushpa Upaya (Bach Flower Alchemy)</dt>
          <dd>${p.disjuntorBotanicoTexto}</dd>
        </div>
      </dl>

      <div class="geo-cta-row">
        <a href="${p.ctaUrl || '/?protocol=' + p.slug}" class="geo-cta-btn">
          ${p.ctaText}
        </a>
        ${!isStandalone ? `<a href="/protocols/${p.slug}" class="geo-permalink">Read Full Protocol Dossier →</a>` : `<a href="/protocols" class="geo-permalink">← View All SOMA·38 Protocols</a>`}
      </div>
    </article>
  `;

  const mainContentHtml = selected
    ? renderAtomicBlock(selected, protocols.findIndex(x => x.slug === selected.slug), true) + `
      <section style="margin-top: 44px; padding-top: 28px; border-top: 1px solid #2c2723;">
        <h3 style="font-family: 'Cinzel', serif; color: #e8caa4; font-size: 1.15rem; margin-bottom: 16px;">
          Explore Other Karmic & Somatic Protocols in the SOMA·38 Archive
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
          ${protocols.filter(x => x.slug !== selected.slug).map(x => `
            <a href="/protocols/${x.slug}" style="display: block; padding: 16px; background: #171514; border: 1px solid #2c2723; border-radius: 12px; color: #ede8e1; text-decoration: none;">
              <div style="font-size: 0.72rem; color: #cbb291; text-transform: uppercase; font-weight: 700;">${x.category}</div>
              <div style="font-weight: 700; font-size: 0.96rem; margin-top: 4px; color: #e8caa4;">${x.clusterTitle}</div>
              <div style="font-size: 0.82rem; color: #a39c93; margin-top: 6px;">${x.diagnosticoEstrutural}</div>
            </a>
          `).join("")}
        </div>
      </section>
    `
    : protocols.map((p, i) => renderAtomicBlock(p, i, false)).join("\n");

  return `<!DOCTYPE html>
<html lang="en-IN" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc.replace(/"/g, "&quot;")}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${pageTitle.replace(/"/g, "&quot;")}">
  <meta property="og:description" content="${pageDesc.replace(/"/g, "&quot;")}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="/soma38_logo_stacked.jpg">
  <meta property="og:image:width" content="1024">
  <meta property="og:image:height" content="1024">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="/soma38_logo_stacked.jpg">
  <link rel="icon" type="image/png" href="/soma38_logo_stacked.png">
  <link rel="apple-touch-icon" href="/soma38_logo_stacked.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Noto+Sans+Devanagari:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Rozha+One&display=swap" rel="stylesheet">
  <script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
  </script>
  <style>
    :root {
      color-scheme: light dark;
      --in-oklab: ;
      --bg-primary: #fffdf7;
      --bg-surface: #ffffff;
      --text-main: #1b2436;
      --text-muted: #5a4e40;
      --gold-subtle: #c87d12;
      --gold-dark: #9e1b32;
      --kesari: #e85d04;
      --brand-brown: #e05300;
      --border: #eddcc4;
      --scrollbar-thumb: #d9b382;
      --scrollbar-track: #fff8ec;
      accent-color: var(--kesari);
      scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
      scrollbar-width: thin;
    }
    @supports (background: linear-gradient(in oklab, white, black)) {
      :root { --in-oklab: in oklab; }
    }
    @supports not (scrollbar-color: auto) {
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: var(--scrollbar-track); }
      ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', 'Noto Sans Devanagari', -apple-system, sans-serif;
      background-color: var(--bg-primary);
      background-image:
        radial-gradient(circle at 50% 0%, rgba(255, 153, 0, 0.14) 0%, transparent 62%),
        radial-gradient(circle at 10% 25%, rgba(158, 27, 50, 0.06) 0%, transparent 48%);
      background-attachment: fixed;
      color: var(--text-main);
      line-height: 1.65;
      text-align: start;
      overflow-wrap: break-word;
      padding: 20px 20px 64px;
    }
    h1, h2, h3, h4, .hero-title { text-wrap: balance; }
    p, li, dd { text-wrap: pretty; }
    .container { max-width: 980px; margin: 0 auto; }
    .nav-bar {
      position: sticky;
      top: 12px;
      z-index: 90;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 22px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1.5px solid var(--border);
      border-top: 3px solid var(--kesari);
      border-radius: 999px;
      margin-bottom: 36px;
      flex-wrap: wrap;
      gap: 12px;
      box-shadow: 0 10px 30px rgba(158, 27, 50, 0.08);
    }
    .nav-logo {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .nav-logo:hover {
      opacity: 0.94;
      transform: translateY(-1px);
    }
    .nav-brand-logo-img {
      height: 40px;
      width: auto;
      max-width: 190px;
      object-fit: contain;
      display: block;
      filter: drop-shadow(0 2px 6px rgba(212, 168, 83, 0.22));
    }
    [data-theme="dark"] .nav-brand-logo-img {
      filter: drop-shadow(0 2px 12px rgba(251, 191, 36, 0.45)) brightness(1.08);
    }
    .hero-crest-wrap {
      max-width: 200px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 6px 20px rgba(212, 168, 83, 0.28));
      transition: transform 0.25s ease;
    }
    .hero-crest-wrap:hover {
      transform: translateY(-2px) scale(1.02);
    }
    .hero-crest-img {
      width: 100%;
      height: auto;
      max-height: 160px;
      object-fit: contain;
      display: block;
    }
    [data-theme="dark"] .hero-crest-wrap {
      filter: drop-shadow(0 8px 28px rgba(251, 191, 36, 0.45)) brightness(1.08);
    }
    .nav-links { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-nav {
      background: #fffaf0;
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-nav:hover { border-color: var(--kesari); color: var(--gold-dark); }
    .btn-nav-primary {
      background: linear-gradient(135deg var(--in-oklab), #ff8800 0%, #e04800 52%, #a81533 100%);
      border-color: #ffb703;
      color: #ffffff;
      font-weight: 700;
    }
    .hero-box {
      text-align: center;
      margin-bottom: 40px;
      padding: 32px 26px;
      background: linear-gradient(180deg var(--in-oklab), #fff5e0 0%, #fffdf7 100%);
      border: 1.5px solid var(--border);
      border-top: 4px solid var(--kesari);
      border-radius: 22px;
      box-shadow: 0 16px 42px rgba(158, 27, 50, 0.07);
    }
    .hero-eyebrow {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--kesari);
      font-weight: 800;
      margin-bottom: 10px;
    }
    .hero-title {
      font-family: 'Rozha One', 'Cinzel', serif;
      font-size: clamp(1.5rem, 3vw + 0.5rem, 2.15rem);
      color: var(--gold-dark);
      margin-bottom: 12px;
    }
    .hero-sub {
      color: var(--text-muted);
      font-size: 0.96rem;
      max-width: 72ch;
      margin: 0 auto;
    }
    .geo-atomic-card {
      background: var(--bg-surface);
      border: 1.5px solid var(--border);
      border-left: 5px solid var(--kesari);
      border-radius: 18px;
      padding: 28px 30px;
      margin-bottom: 28px;
      box-shadow: 0 12px 36px rgba(158, 27, 50, 0.06);
    }
    .geo-cluster-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .geo-badge {
      background: #fff1dc;
      border: 1px solid #f0b45a;
      color: var(--gold-dark);
      font-size: 0.74rem;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: 0.05em;
    }
    .geo-category {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    .geo-atomic-card h2 {
      font-family: 'Rozha One', 'Cinzel', serif;
      font-size: 1.45rem;
      font-weight: 400;
      color: var(--text-main);
      margin-bottom: 16px;
    }
    .geo-queries-box {
      background: #fff8eb;
      border: 1px dashed #e2b068;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .geo-queries-box h3 {
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--kesari);
      margin-bottom: 8px;
    }
    .geo-queries-box ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .geo-queries-box li {
      font-size: 0.9rem;
      color: #4a3525;
      font-style: italic;
    }
    .geo-definition-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 22px;
    }
    .geo-dl-row {
      padding: 12px 16px;
      background: #fffdf9;
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .geo-dl-botanical {
      background: #fff4df;
      border-color: #f0b45a;
    }
    .geo-dl-row dt {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--gold-dark);
      font-weight: 800;
      margin-bottom: 4px;
    }
    .geo-dl-row dd {
      font-size: 0.95rem;
      color: var(--text-main);
      max-width: 75ch;
    }
    .geo-cta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding-top: 14px;
      border-top: 1px solid var(--border);
    }
    .geo-cta-btn {
      display: inline-block;
      background: linear-gradient(135deg var(--in-oklab), #ff8800 0%, #e04800 52%, #a81533 100%);
      color: #ffffff;
      font-weight: 800;
      font-size: 0.92rem;
      padding: 12px 22px;
      border-radius: 12px;
      text-decoration: none;
      box-shadow: 0 8px 24px rgba(224, 72, 0, 0.25);
      transition: transform 0.15s ease, opacity 0.15s ease;
    }
    .geo-cta-btn:hover { transform: translateY(-1.5px); opacity: 0.95; }
    .geo-permalink {
      font-size: 0.84rem;
      color: var(--gold-subtle);
      text-decoration: none;
      font-weight: 600;
    }
    .geo-permalink:hover { text-decoration: underline; }
    footer {
      margin-top: 56px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      font-size: 0.84rem;
      color: var(--text-muted);
    }
    .footer-protocols-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 10px;
      margin: 14px 0 24px;
    }
    .footer-protocols-grid a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.82rem;
    }
    .footer-protocols-grid a:hover { color: var(--gold-dark); }
  </style>
</head>
<body>
  <div class="container">
    <nav class="nav-bar">
      <a href="/" class="nav-logo" aria-label="SOMA·38 (सोम·३८) Home">
        <img src="/soma38_logo_horizontal.png" alt="SOMA·38 (सोम·३८)" class="nav-brand-logo-img">
      </a>
      <div class="nav-links">
        <a href="/" class="btn-nav btn-nav-primary">Free Karmic &amp; Somatic Reading (60s)</a>
        <a href="/protocols" class="btn-nav">Karmic &amp; Somatic Archive</a>
        <a href="/blog" class="btn-nav">📚 100 Life Guides</a>
        <a href="/?view=synastry" class="btn-nav">Deep Kundli Synastry</a>
        <a href="/?view=faq" class="btn-nav">FAQ</a>
      </div>
    </nav>

    <header class="hero-box">
      <div class="hero-crest-wrap" aria-hidden="true">
        <img src="/soma38_logo_stacked.png" alt="SOMA·38 Sacred Vedic Lotus &amp; Chandra Crest" class="hero-crest-img">
      </div>
      <div class="hero-eyebrow">SOMA·38 | VEDIC SIDEREAL ASTROLOGY, GESTALT SOMATIC SHADOW &amp; SACRED FLOWER ALCHEMY</div>
      <h1 class="hero-title">KARMIC & SOMATIC PROTOCOL ARCHIVE</h1>
      <p class="hero-sub">
        Where your Vedic Karmic Blueprint (Chandra, Nakshatra, Rahu–Ketu & Shani) meets Gestalt Somatic Psychology and the 38 Sacred Flower Essences (Pushpa Upaya).
      </p>
    </header>

    <main>
      ${mainContentHtml}
    </main>

    <footer>
      <div style="font-weight: 700; color: var(--gold-dark); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.78rem;">
        Direct Index of Karmic & Somatic Protocols (GEO / AI Search):
      </div>
      <div class="footer-protocols-grid">
        ${protocols.map(p => `<a href="/protocols/${p.slug}">• ${p.clusterTitle}</a>`).join("\n        ")}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 14px; border-top: 1px solid var(--border);">
        <div><strong>SOMA·38</strong> · Karmic Chart, Somatic Shadow & Sacred Flower Alchemy (India Edition)</div>
        <div style="display: flex; gap: 14px;">
          <a href="/protocols" style="color: var(--text-muted); text-decoration: none;">Protocols</a>
          <a href="/sitemap.xml" style="color: var(--text-muted); text-decoration: none;">XML Sitemap</a>
          <a href="/privacy" style="color: var(--text-muted); text-decoration: none;">Privacy</a>
          <a href="/terms" style="color: var(--text-muted); text-decoration: none;">Terms</a>
        </div>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

let lastExecutedWeekKey = null;
export function startWeeklyGeoCron() {
  setInterval(async () => {
    const now = new Date();
    if (now.getUTCDay() === 1 && now.getUTCHours() === 3) {
      const weekKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
      if (lastExecutedWeekKey !== weekKey) {
        lastExecutedWeekKey = weekKey;
        console.log(`[GEO CRON] 🕒 Monday 03:00 UTC triggered (${weekKey}). Generating weekly SOMA·38 GEO Protocol...`);
        await generateWeeklyGeoProtocol();
      }
    }
  }, 15 * 60 * 1000);
}
