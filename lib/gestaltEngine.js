/**
 * Gestalt Contact Cycle Diagnostic & Bach Flower Selection Engine
 * Evaluates chart tensions and user self-report to map the friction point silently
 * and recommend an optimal 4-5 essence blend (max 6).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load 38 Bach Flower Remedies
const rawData = fs.readFileSync(path.join(__dirname, "../data/bach_essences.json"), "utf8");
const bachDatabase = JSON.parse(rawData).essences;

export const GESTALT_STAGES = [
  {
    stage: "Sensation",
    description: "Consciência de sensações corporais, instintos e correntes emocionais subterrâneas",
    astrologicalIndicators: ["Moon", "Neptune", "12th House", "Pisces", "Cancer", "Scorpio"],
    defaultEssences: ["Aspen", "Clematis", "Rock Rose", "Sweet Chestnut", "Mustard"]
  },
  {
    stage: "Awareness",
    description: "Clareza cognitiva, nomear a emoção, identificar a necessidade real sem nevoeiro mental",
    astrologicalIndicators: ["Mercury", "3rd House", "Gemini", "Virgo", "Aquarius", "Libra"],
    defaultEssences: ["Cerato", "White Chestnut", "Agrimony", "Mimulus", "Wild Oat", "Crab Apple"]
  },
  {
    stage: "Mobilization",
    description: "Reunir energia vital, superar a inércia e a auto-dúvida para dar o primeiro passo",
    astrologicalIndicators: ["Mars", "1st House", "Aries", "Saturn restriction", "Leo"],
    defaultEssences: ["Hornbeam", "Larch", "Scleranthus", "Cherry Plum", "Wild Rose", "Vervain"]
  },
  {
    stage: "Action",
    description: "Passar ao movimento concreto, afirmar limites saudáveis e dissolver o derrotismo",
    astrologicalIndicators: ["Mars-Saturn", "10th House", "Capricorn", "Aries", "Cardinal Signs"],
    defaultEssences: ["Gentian", "Gorse", "Centaury", "Elm", "Impatiens", "Oak", "Vine"]
  },
  {
    stage: "Final Contact",
    description: "Entrega autêntica, intimidade, relação vulnerável e confiança sem controlo defensivo",
    astrologicalIndicators: ["Venus", "7th House", "Libra", "Taurus", "Holly themes"],
    defaultEssences: ["Water Violet", "Heather", "Holly", "Chicory", "Beech", "Red Chestnut"]
  },
  {
    stage: "Satisfaction",
    description: "Integração plena, alegria pelo caminho percorrido e auto-perdão sem culpa ou amargura",
    astrologicalIndicators: ["Jupiter", "9th House", "Sagittarius", "Pisces", "Solar harmony"],
    defaultEssences: ["Pine", "Willow", "Walnut", "Rock Water", "Chestnut Bud"]
  },
  {
    stage: "Withdrawal",
    description: "Repouso regenerador, encerramento saudável de ciclos e assimilação da experiência",
    astrologicalIndicators: ["Saturn", "4th House", "Cancer", "Scorpio", "South Node"],
    defaultEssences: ["Olive", "Star of Bethlehem", "Honeysuckle"]
  }
];

export const GESTALT_BOUNDARIES = {
  Retroflection: {
    name: "Retroflecção (Retroflection)",
    pt: "Retroflecção — Conter a energia e voltar a tensão para dentro de si próprio(a), convertendo o impulso de ação em exaustão física, auto-cobrança ou tensão somática.",
    en: "Retroflection — Holding energy back and turning tension inward onto oneself, converting active impulses into physical fatigue, somatic tightness, or internal self-criticism.",
    symptomMatch: ["cansa", "exaust", "fadiga", "dormir", "sem for", "corpo", "tensão", "tired", "exhaust", "burnout", "somat"],
    primaryEssences: ["Oak", "Hornbeam", "Olive", "Rock Water"]
  },
  Introjection: {
    name: "Introjecção (Introjection)",
    pt: "Introjecção — Engolir padrões e exigências externas como leis inquestionáveis ('eu deveria', 'tenho de dar conta de tudo'), sem verificar se servem a sua verdade interior.",
    en: "Introjection — Swallowing outside expectations and perfectionist demands whole as internal imperatives ('I should', 'I must carry it all'), without digesting if they serve your authentic balance.",
    symptomMatch: ["exig", "perfei", "dever", "deveria", "obrigad", "falh", "should", "must", "perfect", "guilt", "flaw"],
    primaryEssences: ["Pine", "Rock Water", "Elm", "Larch"]
  },
  Deflection: {
    name: "Deflexão (Deflection)",
    pt: "Deflexão — Evitar o contacto direto com a vulnerabilidade através de circuitos mentais incessantes, sobre-análise ou ruminação contínua que dispersa a presença.",
    en: "Deflection — Avoiding direct contact with vulnerability through continuous overthinking, intellectualizing, or analytical thought loops that scatter vital energy.",
    symptomMatch: ["pensar", "mente", "rumin", "loop", "overthink", "dúvida", "analis", "doubt", "confusion"],
    primaryEssences: ["White Chestnut", "Cerato", "Agrimony", "Scleranthus"]
  },
  Confluence: {
    name: "Confluência (Confluence)",
    pt: "Confluência — Fronteiras porosas e dificuldade em dizer 'não', fundindo as suas necessidades com as dos outros por receio do confronto, desapontamento ou rejeição.",
    en: "Confluence — Porous boundaries and struggle to say 'no', merging personal needs with others' demands out of fear of disharmony, guilt, or disappointing others.",
    symptomMatch: ["não", "agradar", "limite", "outros", "conflito", "dizer não", "people pleas", "boundary", "say no", "rejection"],
    primaryEssences: ["Centaury", "Walnut", "Red Chestnut", "Chicory"]
  },
  Desensitization: {
    name: "Dessensibilização (Desensitization)",
    pt: "Dessensibilização — Anestesiar ou ignorar os sinais corporais de cansaço e saturação, empurrando para a frente até ao esgotamento das reservas vitais.",
    en: "Desensitization — Numbing physical and emotional warning signals of fatigue, pushing through on autopilot until vital reserves collapse.",
    symptomMatch: ["anestesi", "não sinto", "automático", "piloto", "desconect", "numb", "disconnect", "autopilot", "fog"],
    primaryEssences: ["Clematis", "Mustard", "Olive", "Sweet Chestnut"]
  }
};

/**
 * Diagnostic analysis mapping chart aspects + self report to Gestalt stage and boundary blockage
 */
export function diagnoseGestaltBlockage(horaryChart, natalChart, selfReportText = "") {
  const text = (selfReportText || "").toLowerCase();
  const scores = {
    "Sensation": 0,
    "Awareness": 0,
    "Mobilization": 0,
    "Action": 0,
    "Final Contact": 0,
    "Satisfaction": 0,
    "Withdrawal": 0
  };

  // 1. Text keyword heuristics
  if (text.match(/fog|numb|vague|disconnected|anxious|dread|panic|can't feel|nevoeiro|anestes/)) scores["Sensation"] += 3;
  if (text.match(/confused|overthinking|looping|masking|doubt|indecision|unsure|pensar|mente|dúvida/)) scores["Awareness"] += 3;
  if (text.match(/stuck|procrastinat|no energy|hesitat|afraid|unmotivated|holding back|bloqueio|inércia|cansa/)) scores["Mobilization"] += 3;
  if (text.match(/can't say no|people pleas|giving up|overwhelm|failure|too fast|burnout|limite|agradar/)) scores["Action"] += 3;
  if (text.match(/lonely|relationship|trust|jealous|envy|distant|isolated|sozinho|relação|confiança/)) scores["Final Contact"] += 3;
  if (text.match(/guilt|resentment|bitter|perfection|never satisfied|culpa|ressentimento|perfeição/)) scores["Satisfaction"] += 3;
  if (text.match(/exhausted|tired|trauma|grief|past|letting go|need rest|esgotado|passado|luto/)) scores["Withdrawal"] += 3;

  // 2. Astrological aspect heuristics
  const allAspects = [...(horaryChart?.aspects || []), ...(natalChart?.aspects || [])];
  
  for (const asp of allAspects) {
    const pair = [asp.planet1, asp.planet2].sort().join("-");
    const isTension = asp.aspect === "Square" || asp.aspect === "Opposition" || (asp.nature && asp.nature.includes("friction"));
    if (isTension) {
      if (pair.includes("Moon") && (pair.includes("Neptune") || pair.includes("Pluto") || pair.includes("Saturn"))) scores["Sensation"] += 2;
      if (pair.includes("Mercury") && (pair.includes("Saturn") || pair.includes("Neptune") || pair.includes("Uranus"))) scores["Awareness"] += 2;
      if (pair.includes("Mars") && (pair.includes("Saturn") || pair.includes("Pluto") || pair.includes("Uranus"))) scores["Mobilization"] += 2;
      if (pair.includes("Mars") && pair.includes("Jupiter")) scores["Action"] += 2;
      if (pair.includes("Venus") && (pair.includes("Saturn") || pair.includes("Pluto") || pair.includes("Mars"))) scores["Final Contact"] += 2;
      if (pair.includes("Jupiter") && pair.includes("Saturn")) scores["Satisfaction"] += 2;
      if (pair.includes("Sun") && pair.includes("Saturn")) scores["Withdrawal"] += 2;
    }
  }

  // Find primary Gestalt stage
  let primaryStage = "Mobilization";
  let maxScore = -1;
  for (const [stg, sc] of Object.entries(scores)) {
    if (sc > maxScore) {
      maxScore = sc;
      primaryStage = stg;
    }
  }

  // Determine specific boundary interruption
  let detectedBoundary = "Retroflection";
  if (text.match(/não|agradar|limite|outro|say no|boundary|please|people/)) {
    detectedBoundary = "Confluence";
  } else if (text.match(/exig|perfei|dever|should|must|perfect|flaw|exigên/)) {
    detectedBoundary = "Introjection";
  } else if (text.match(/pensar|mente|rumin|loop|overthink|dúvida|doubt|analis/)) {
    detectedBoundary = "Deflection";
  } else if (text.match(/anestesi|desconect|numb|fog|nevoeiro/)) {
    detectedBoundary = "Desensitization";
  } else {
    detectedBoundary = "Retroflection";
  }

  const boundaryInfo = GESTALT_BOUNDARIES[detectedBoundary] || GESTALT_BOUNDARIES.Retroflection;
  const stageDef = GESTALT_STAGES.find(s => s.stage === primaryStage) || GESTALT_STAGES[2];
  
  // Select candidate essences based on stage + boundary
  const candidatePool = [
    ...boundaryInfo.primaryEssences,
    ...stageDef.defaultEssences
  ];

  const candidates = bachDatabase.filter(e => candidatePool.includes(e.name) || e.gestalt === primaryStage);

  const scoredEssences = candidates.map(e => {
    let weight = 1;
    if (boundaryInfo.primaryEssences.includes(e.name)) weight += 3;
    if (stageDef.defaultEssences.includes(e.name)) weight += 2;
    const kw = (e.symptom + " " + e.support).toLowerCase().split(/[s,]+/);
    for (const w of kw) {
      if (w.length > 3 && text.includes(w)) weight += 1.5;
    }
    return { ...e, score: weight };
  });

  scoredEssences.sort((a, b) => b.score - a.score);

  // Take top unique 4-5 remedies
  const uniqueSelected = [];
  for (const item of scoredEssences) {
    if (!uniqueSelected.find(u => u.name === item.name)) {
      uniqueSelected.push(item);
    }
    if (uniqueSelected.length >= 4) break;
  }

  // Key Horary Highlights
  const horaryMoon = horaryChart?.planets?.Moon ? `${horaryChart.planets.Moon.degree}° em ${horaryChart.planets.Moon.sign}` : "Posição em cálculo";
  const horaryAsc = horaryChart?.angles?.ascendant ? `${horaryChart.angles.ascendant.degree}° em ${horaryChart.angles.ascendant.sign}` : "Ascendente em cálculo";
  const horaryTensionAspect = (horaryChart?.aspects || []).find(a => a.aspect === "Square" || a.aspect === "Opposition") || horaryChart?.aspects?.[0] || null;

  return {
    detectedStage: primaryStage,
    stageDescription: stageDef.description,
    boundaryInterruption: detectedBoundary,
    boundaryDescription: boundaryInfo.pt,
    boundaryDescriptionEn: boundaryInfo.en,
    selectedEssences: uniqueSelected,
    horaryDynamics: {
      moonPlacement: horaryMoon,
      ascendantPlacement: horaryAsc,
      primaryAspect: horaryTensionAspect ? `${horaryTensionAspect.planet1} (${horaryTensionAspect.aspect}) ${horaryTensionAspect.planet2}` : null
    },
    silentPsychologicalAssessment: {
      agencyFriction: `Fricção na fase de ${primaryStage} mediada por ${detectedBoundary}.`,
      competenceFriction: `Inibição do movimento espontâneo face ao padrão de exigência.`,
      connectionFriction: `Proteção das fronteiras energéticas e gestão do impacto relacional.`
    }
  };
}


/**
 * Evaluates whether the user's self report provides sufficient clarity
 * to calibrate the Horary Chart and lock in the Gestalt stage without guessing.
 */
export function evaluateSelfReportClarity(combinedSelfReport = "", conversationMessages = []) {
  const text = (combinedSelfReport || "").trim().toLowerCase();
  const userMessages = conversationMessages.filter(m => m.role === "user");
  const totalUserWords = text.split(/\s+/).filter(Boolean).length;

  // Generic vague phrases that lack actionable friction context
  const genericVaguePhrases = [
    "estou mal", "sinto-me mal", "ajuda", "ajude-me", "tenho ansiedade", "estou ansioso",
    "estou ansiosa", "estou triste", "não sei", "não sei o que se passa", "quero ajuda",
    "preciso de ajuda", "help", "i feel bad", "i am anxious", "i am sad", "dont know",
    "estou cansado", "estou cansada", "estou em baixo", "estou confuso", "socorro"
  ];

  const isExplicitlyVague = genericVaguePhrases.some(p => text === p || text === `${p}.` || text === `${p}!`);
  
  // Specificity Checks:
  // 1. Somatic / Physical markers
  const hasSomatic = /(corpo|dormir|sono|insóni|estômago|peito|garganta|cabeça|tensão|aperto|cansaço|exaust|respira|físic|nervos|acord|breath|stomach|chest|throat|sleep|insomnia|headache|tight|fatigue)/i.test(text);

  // 2. Situational / Environmental / Relational trigger
  const hasTrigger = /(trabalho|chefe|colega|empresa|família|mãe|pai|marido|esposa|namorad|filh|amig|relação|casa|noite|manhã|decis|dinheiro|projeto|prazo|reunião|work|boss|colleague|job|family|mother|father|partner|husband|wife|child|friend|relationship|home|night|morning|money|decision)/i.test(text);

  // 3. Behavioral / Emotional friction dynamic
  const hasFriction = /(dizer não|culpa|perfeic|medo|pânico|vergonha|raiva|engolir|paralis|bloque|evitar|agradar|cobrança|desistir|duvid|rumin|say no|guilt|fear|panic|shame|anger|paraly|avoid|please|demand|doubt|overthink)/i.test(text);

  // If text is very short (< 15 words) and missing 2 or more core variables
  const variableCount = (hasSomatic ? 1 : 0) + (hasTrigger ? 1 : 0) + (hasFriction ? 1 : 0);
  
  const isVague = isExplicitlyVague || (totalUserWords < 12 && variableCount <= 1) || (variableCount === 0 && totalUserWords < 25);

  const missingVariables = [];
  if (!hasSomatic) missingVariables.push("somatic_manifestation");
  if (!hasTrigger) missingVariables.push("situational_trigger");
  if (!hasFriction) missingVariables.push("emotional_dynamic");

  return {
    isVague,
    variableCount,
    hasSomatic,
    hasTrigger,
    hasFriction,
    missingVariables,
    wordCount: totalUserWords
  };
}
