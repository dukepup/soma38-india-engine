# Astrological & Bach Flower Holistic Remediation Engine

A modular AI agent and astrological computation engine designed to provide warm, personalized Boron Letters style consultations with strict Gestalt Contact Cycle diagnostics, dual-layer paywall defense, and Bach Flower remedy protocols.

---

## 🚀 Architecture Overview

This project is partitioned into 3 coordinated layers:
1. **WeWeb (Frontend)**: User intake, browser geolocation capture, Boron Letter rendering, and Stripe paywall triggers.
2. **Make.com (Middleware)**: Webhook ingestion, data routing, Stripe event handling, and notification delivery.
3. **Antigravity Backend (Local Server)**:
   * **Ephemeris Engine (`lib/ephemeris.js`)**: Calculates Natal & Horary charts (Planets, signs, Placidus houses, aspects).
   * **Gestalt & SDT Engine (`lib/gestaltEngine.js`)**: Maps friction points silently to the 7 Gestalt cycle stages and selects 4–5 targeted Bach remedies.
   * **Gemini LLM Pipeline (`lib/geminiService.js`)**: Generates letters following strict tone & stylistic constraints.
   * **Dual-Layer Zero-Leakage Firewall**: Guarantees zero Bach Flower remedy leakage before payment confirmation.

---

## 📁 File Structure

```
bach_astro_engine/
├── data/
│   └── bach_essences.json     # All 38 Bach Flower Remedies with symptoms & Gestalt stages
├── lib/
│   ├── ephemeris.js           # Tropical zodiac, Placidus cusps, and aspect calculations
│   ├── gestaltEngine.js       # Silent Gestalt cycle analysis and remedy selector
│   ├── placesService.js       # Google Places API & curated practitioner directory
│   ├── promptBuilder.js       # Relevance.ai system prompt & paywall instructions
│   └── geminiService.js       # Gemini 2.5 Flash caller & server-side zero-leakage firewall
├── server.js                  # HTTP REST API server
├── test_simulation.js         # End-to-end verification test suite
├── MAKE_BLUEPRINT_GUIDE.md    # Step-by-step Make.com scenario setup blueprints
├── WEWEB_SETUP_GUIDE.md       # Step-by-step WeWeb UI and geolocation workflow setup
└── package.json
```

---

## 🛠️ Quick Start & Running

### 1. Run Verification Tests
```bash
node test_simulation.js
```

### 2. Start the API Server
```bash
node server.js
```
The server will start on `http://localhost:3000`.

### 3. Environment Variables (Optional)
Create a `.env` file or export:
* `GEMINI_API_KEY`: Your Google AI Studio Gemini API key.
* `GOOGLE_PLACES_API_KEY`: (Optional) For live Google Places lookup of local pharmacies.
* `PORT`: Server port (default `3000`).

---

## 📡 API Endpoints

### `POST /api/generate-reading`
Generates a reading letter based on user input, horary timestamp, and location.
* **Unpaid (`payment_status: false`)**: Returns Free Section 1 (Diagnosis) + Paywall CTA ($3.49 / $7.99) + Free Section 3 (Local & Online Resources).
* **Paid (`payment_status: true`)**: Returns the full letter including Section 2 with the 4–5 selected Bach Flower remedies and behavioral explanations.

### `POST /api/unlock-reading`
Dedicated endpoint for Stripe payment webhooks to immediately generate the unlocked protocol.

### `POST /api/calculate-chart`
Raw astronomical endpoint returning planetary positions, signs, houses, and aspects.

### `GET /health`
Service status check.
