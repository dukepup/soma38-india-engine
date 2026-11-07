import { castChart } from "./lib/ephemeris.js";
import { diagnoseGestaltBlockage } from "./lib/gestaltEngine.js";
import { generateTurnResponse } from "./lib/geminiService.js";

const horaryChart = castChart({ date: new Date(), latitude: 38.7, longitude: -9.1, chartType: 'horary' });
console.log('Horary Aspects:', horaryChart.aspects.length);

const diag = diagnoseGestaltBlockage(horaryChart, null, "Estou com muita hesitação e cansaço.");
console.log('Detected Stage:', diag.detectedStage);

const turn = await generateTurnResponse({
  turnIndex: 1,
  conversationHistory: [{ role: 'user', content: 'Estou com muita hesitação e cansaço.' }],
  userName: 'Bernardo',
  language: 'pt',
  horaryChart,
  natalChart: null,
  gestaltDiagnosis: diag
});

console.log('Turn 1 Generated:\n', turn);
