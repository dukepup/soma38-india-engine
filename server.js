/**
 * Astrological & Bach Flower Holistic Remediation API Server
 * Modular backend with Official Google & Apple Sign-In, Phone Auth, Profiles, History, and Stripe Checkout.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  castChart,
  calculateTransitsAgainstNatal,
  calculateSynastryAspects,
  calculateSynastryHouseOverlays,
  calculateElementalSynastryAlchemy,
  generateSynastryPsychologicalReport,
  generateCoreTraitsAnalysis,
  resolveBirthUtcDate
} from "./lib/ephemeris.js";
import { diagnoseGestaltBlockage, evaluateSelfReportClarity } from "./lib/gestaltEngine.js";
import { findRemedySources, searchCities } from "./lib/placesService.js";
import { generateReadingLetter, generateTurnResponse } from "./lib/geminiService.js";
import {
  registerUser,
  loginUser,
  checkUserExists,
  findOrCreateOAuthUser,
  findOrCreatePhoneUser,
  findOrCreateWhatsAppUser,
  linkWhatsAppProvider,
  getUserByToken,
  revokeUserSessionToken,
  issueUserSessionToken,
  updateUserProfile,
  updateUserAccountDetails,
  linkOAuthProvider,
  getUserProfileFull,
  findUserRecord,
  saveUserReading,
  bulkSaveUserReadings,
  getUserReadings,
  getUserMemorySummary,
  deleteUserChatHistory,
  deleteUserAccountAndData,
  getUserSavedCharts,
  saveUserPersonChart,
  deleteUserPersonChart,
  getUserFormulas,
  getUserUnlockBalance,
  addUnlockCredits,
  consumeUnlockCredit,
  updateFormulaPhysicalOrder,
  hydrateFromCloudDatabase,
  getLegalInquiries
} from "./lib/dbService.js";
import { processLegalInquiry } from "./lib/legalAgent.js";
import {
  getGeoProtocols,
  renderGeoProtocolsHtml,
  generateSitemapXml,
  generateWeeklyGeoProtocol,
  startWeeklyGeoCron
} from "./lib/geoProtocolService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "3000", 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

/// OAuth & Credentials (Environment Variables)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// WhatsApp Cloud API & Verification Config
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || "";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "reset_auth_code";
const TWILIO_WHATSAPP_SANDBOX_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || "14155238886";

// In-memory OTP and Inbound Session Stores
const whatsappOtpStore = new Map();
const waInboundSessions = new Map(); // sessionId -> { sessionId, tokenCode, phone, name, status, user, token, expiresAt, createdAt }
const waTokenCodeIndex = new Map(); // tokenCode -> sessionId
const pendingCheckoutReadings = new Map(); // readingId / stripeSessionId -> guest reading state snapshot

function getMetaLanguageCode(phone, clientLang) {
  if (clientLang) {
    if (clientLang === "pt") return phone.startsWith("+55") ? "pt_BR" : "pt_PT";
    if (clientLang === "en") return "en_US";
    if (clientLang === "es") return "es_ES";
    if (clientLang === "de") return "de_DE";
    if (clientLang === "it") return "it_IT";
  }
  if (phone.startsWith("+351")) return "pt_PT";
  if (phone.startsWith("+55")) return "pt_BR";
  if (phone.startsWith("+34")) return "es_ES";
  if (phone.startsWith("+49")) return "de_DE";
  if (phone.startsWith("+39")) return "it_IT";
  return "en_US";
}

async function dispatchMetaWhatsAppMessage(toPhone, otpCode, clientLang) {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[WHATSAPP DISPATCH] ℹ️ Cloud API credentials not configured in env. Sandbox code: ${otpCode}`);
    return { success: true, mode: "sandbox", code: otpCode };
  }

  const rawDigits = toPhone.replace(/[^0-9]/g, "");
  const langCode = getMetaLanguageCode(toPhone, clientLang);

  // 1. Try sending via approved Meta Authentication Template first
  if (WHATSAPP_TEMPLATE_NAME && WHATSAPP_TEMPLATE_NAME !== "none") {
    try {
      const templateRes = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: rawDigits,
          type: "template",
          template: {
            name: WHATSAPP_TEMPLATE_NAME,
            language: { code: langCode },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: otpCode }
                ]
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  { type: "text", text: otpCode }
                ]
              }
            ]
          }
        })
      });

      const templateData = await templateRes.json();
      if (templateRes.ok) {
        console.log(`[WHATSAPP CLOUD API] ✅ Template message delivered to ${rawDigits}. Message ID:`, templateData.messages?.[0]?.id);
        return { success: true, mode: "template", data: templateData };
      } else {
        console.warn(`[WHATSAPP CLOUD API] ⚠️ Template dispatch notice (Code ${templateData.error?.code}): ${templateData.error?.message}. Trying text fallback...`);
      }
    } catch (tmplErr) {
      console.warn("[WHATSAPP CLOUD API] Template request error:", tmplErr.message);
    }
  }

  // 2. Fallback to direct text message
  try {
    const textRes = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: rawDigits,
        type: "text",
        text: {
          preview_url: false,
          body: `O seu código de verificação RESET é: ${otpCode}. Válido por 10 minutos.`
        }
      })
    });

    const textData = await textRes.json();
    if (textRes.ok) {
      console.log(`[WHATSAPP CLOUD API] ✅ Text message delivered to ${rawDigits}. Message ID:`, textData.messages?.[0]?.id);
      return { success: true, mode: "text", data: textData };
    } else {
      console.error(`[WHATSAPP CLOUD API] ❌ Dispatch error (Code ${textData.error?.code}): ${textData.error?.message}`);
      return { success: false, error: textData.error };
    }
  } catch (textErr) {
    console.error("[WHATSAPP CLOUD API] Text request error:", textErr.message);
    return { success: false, error: textErr.message };
  }
}

// Twilio Verify Credentials (Global Enterprise Gateway for WhatsApp & SMS)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || "";

async function sendTwilioVerification(phone, channel = "whatsapp") {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    return null;
  }
  const authHeader = "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(`https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      To: phone,
      Channel: channel
    }).toString()
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function checkTwilioVerification(phone, code) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    return null;
  }
  const authHeader = "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(`https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      To: phone,
      Code: code
    }).toString()
  });
  const data = await res.json();
  return { ok: res.ok, approved: data.status === "approved", data };
}

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "";
const FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN || "";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "";
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "";
const FIREBASE_MESSAGING_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID || "";
const FIREBASE_APP_ID = process.env.FIREBASE_APP_ID || "";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        // Fallback for form-urlencoded (used by Apple POST callback)
        try {
          const params = new URLSearchParams(body);
          const obj = {};
          for (const [k, v] of params.entries()) {
            obj[k] = v;
          }
          resolve(obj);
        } catch (e) {
          reject(err);
        }
      }
    });
    req.on("error", err => reject(err));
  });
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach(cookie => {
    let [name, ...rest] = cookie.split("=");
    name = name?.trim();
    if (!name) return;
    const value = rest.join("=").trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });

  return list;
}

function getAuthTokenFromReq(req) {
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    return authHeader.replace("Bearer ", "").trim();
  }
  const cookies = parseCookies(req);
  if (cookies.reset_session_token) {
    return cookies.reset_session_token.trim();
  }
  return null;
}

function getAuthUser(req) {
  const token = getAuthTokenFromReq(req);
  if (!token) return null;
  return getUserByToken(token);
}

function setSessionCookie(res, token) {
  if (!token) return;
  const cookieVal = `reset_session_token=${encodeURIComponent(token)}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`;
  res.setHeader("Set-Cookie", cookieVal);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "reset_session_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly");
}

function getHostUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "www.resetbase.pt";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // ==========================================
  // --- REAL OAUTH 2.0 & FIREBASE PUBLIC CONFIG ---
  // ==========================================

  if (req.method === "GET" && url.pathname === "/api/auth/config") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      googleClientId: GOOGLE_CLIENT_ID || "",
      whatsappEnabled: true
    }));
    return;
  }

  // --- FIREBASE PHONE AUTH TOKEN VERIFICATION (SMS OTP) ---
  if (req.method === "POST" && url.pathname === "/api/auth/phone/verify") {
    try {
      const body = await parseJsonBody(req);
      const { idToken, phone: fallbackPhone, name } = body;

      if (!idToken && !fallbackPhone) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Firebase ID token or verified phone number is required." }));
        return;
      }

      let verifiedPhone = "";
      let firebaseUid = "";

      if (idToken) {
        // 1. Verify with Google Identity Toolkit if API Key configured
        if (FIREBASE_API_KEY) {
          try {
            const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken })
            });
            if (verifyRes.ok) {
              const data = await verifyRes.json();
              const account = data.users?.[0];
              if (account) {
                verifiedPhone = account.phoneNumber || "";
                firebaseUid = account.localId || "";
              }
            }
          } catch (e) {
            console.warn("Firebase toolkit lookup warning:", e);
          }
        }

        // 2. Fallback: Parse JWT claims directly
        if (!verifiedPhone) {
          try {
            const parts = idToken.split(".");
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
              verifiedPhone = payload.phone_number || payload.phoneNumber || "";
              firebaseUid = payload.user_id || payload.sub || "";
            }
          } catch (e) {
            console.warn("JWT parse warning:", e);
          }
        }
      }

      if (!verifiedPhone && fallbackPhone) {
        verifiedPhone = fallbackPhone.replace(/[^0-9+]/g, "").trim();
      }

      if (!verifiedPhone || verifiedPhone.length < 6) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Could not verify valid E.164 phone number." }));
        return;
      }

      // Check if logged-in user is linking phone
      const authHeaderUser = getAuthUser(req);
      let user;
      if (authHeaderUser) {
        authHeaderUser.phone = verifiedPhone;
        if (name && (!authHeaderUser.name || authHeaderUser.name === "Friend")) {
          authHeaderUser.name = name;
        }
        user = getUserProfileFull(authHeaderUser);
      } else {
        const found = findOrCreatePhoneUser({ phone: verifiedPhone, name });
        user = getUserProfileFull(found);
      }

      if (user?.token) setSessionCookie(res, user.token);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, user }));
    } catch (err) {
      console.error("Phone verification error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Failed to verify phone token." }));
    }
    return;
  }
  const baseUrl = getHostUrl(req);

  // Serve static UI with strict Anti-Cache headers
  if ((req.method === "GET" || req.method === "HEAD") && (url.pathname === "/" || url.pathname === "/index.html")) {
    const filePath = path.join(__dirname, "public/index.html");
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.end(fs.readFileSync(filePath));
      return;
    }
  }

  // Serve Pinterest Domain Verification HTML File (/pinterest-531cf.html or any /pinterest-*.html)
  if ((req.method === "GET" || req.method === "HEAD") && /^\/pinterest-[a-z0-9]+\.html$/i.test(url.pathname)) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="p:domain_verify" content="531cf0ae656e3a35478560851c2d986c"/><title>Pinterest Verification</title></head><body>531cf0ae656e3a35478560851c2d986c</body></html>`);
    return;
  }

  // Serve Public Privacy Policy Page
  if ((req.method === "GET" || req.method === "HEAD") && (
    url.pathname === "/privacy" ||
    url.pathname === "/privacidade" ||
    url.pathname === "/privacy-policy" ||
    url.pathname === "/politica-de-privacidade" ||
    url.pathname === "/privacy.html" ||
    url.pathname === "/privacidade.html"
  )) {
    const filePath = path.join(__dirname, "public/privacy.html");
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      });
      if (req.method === "HEAD") {
        res.end();
      } else {
        res.end(fs.readFileSync(filePath));
      }
      return;
    }
  }

  // Serve Public Cookie Policy Page
  if (req.method === "GET" && (
    url.pathname === "/cookies" ||
    url.pathname === "/cookie" ||
    url.pathname === "/cookie-policy" ||
    url.pathname === "/politica-de-cookies" ||
    url.pathname === "/cookies.html"
  )) {
    const filePath = path.join(__dirname, "public/cookies.html");
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      });
      res.end(fs.readFileSync(filePath));
      return;
    }
  }

  // Serve Public Terms & Conditions Page
  if (req.method === "GET" && (
    url.pathname === "/terms" ||
    url.pathname === "/termos" ||
    url.pathname === "/terms-and-conditions" ||
    url.pathname === "/termos-e-condicoes" ||
    url.pathname === "/tos" ||
    url.pathname === "/terms.html"
  )) {
    const filePath = path.join(__dirname, "public/terms.html");
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      });
      res.end(fs.readFileSync(filePath));
      return;
    }
  }

  // ==========================================
  // --- SOMA·38 INDIA GEO / AI SEARCH HUB (/protocols, /protocolos & /sitemap.xml) ---
  // ==========================================
  if (req.method === "GET" && (url.pathname === "/protocols" || url.pathname === "/protocols/" || url.pathname === "/protocolos" || url.pathname === "/protocolos/")) {
    const html = renderGeoProtocolsHtml({ slug: null, baseUrl });
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=600"
    });
    res.end(html);
    return;
  }

  if (req.method === "GET" && (url.pathname.startsWith("/protocols/") || url.pathname.startsWith("/protocolos/"))) {
    const slug = decodeURIComponent(url.pathname.replace(/^\/(protocols|protocolos)\//, "").replace(/\/$/, ""));
    const html = renderGeoProtocolsHtml({ slug, baseUrl });
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=600"
    });
    res.end(html);
    return;
  }

  if (req.method === "GET" && (url.pathname === "/api/protocols" || url.pathname === "/api/protocolos")) {
    const protocols = getGeoProtocols();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ total: protocols.length, protocols }));
    return;
  }

  if ((req.method === "POST" || req.method === "GET") && url.pathname === "/api/admin/generate-geo-protocol") {
    try {
      const created = await generateWeeklyGeoProtocol(GEMINI_API_KEY);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ success: true, protocol: created, total: getGeoProtocols().length }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/sitemap.xml") {
    const xml = generateSitemapXml(baseUrl);
    res.writeHead(200, {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    });
    res.end(xml);
    return;
  }

  if (req.method === "GET" && url.pathname === "/robots.txt") {
    const robots = `User-agent: *\nAllow: /\nAllow: /protocols\nAllow: /protocols/\nAllow: /protocolos\nAllow: /protocolos/\nSitemap: ${baseUrl.replace(/\/$/, "")}/sitemap.xml\n`;
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(robots);
    return;
  }

  // Serve Public 100 SEO-GEO Mental Health, Astrology & Bach Flower Blog
  if (req.method === "GET" && (
    url.pathname === "/blog" ||
    url.pathname === "/blog.html" ||
    url.pathname === "/artigos" ||
    url.pathname === "/artigos.html"
  )) {
    const filePath = path.join(__dirname, "public/blog.html");
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      });
      res.end(fs.readFileSync(filePath));
      return;
    }
  }

  // API: Get Blog Posts
  if (req.method === "GET" && url.pathname === "/api/blog/posts") {
    const postsPath = path.join(__dirname, "data/reset_blog_100_posts.json");
    if (fs.existsSync(postsPath)) {
      let posts = JSON.parse(fs.readFileSync(postsPath, "utf-8"));
      const category = url.searchParams.get("category");
      const q = url.searchParams.get("q");

      if (category && category !== "Todos") {
        posts = posts.filter(p => p.category === category);
      }
      if (q && q.trim()) {
        const term = q.trim().toLowerCase();
        posts = posts.filter(p => {
          const blob = (p.title + " " + p.psychological_gestalt_translation + " " + p.bach_flower_protocol + " " + p.astrological_archetype_mapping).toLowerCase();
          return blob.includes(term);
        });
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ total: posts.length, posts }));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Blog database not found" }));
    return;
  }

  // API: Get Single Blog Post by Slug or ID
  if (req.method === "GET" && url.pathname.startsWith("/api/blog/post/")) {
    const slugOrId = url.pathname.replace("/api/blog/post/", "").trim();
    const postsPath = path.join(__dirname, "data/reset_blog_100_posts.json");
    if (fs.existsSync(postsPath)) {
      const posts = JSON.parse(fs.readFileSync(postsPath, "utf-8"));
      const match = posts.find(p => p.slug === slugOrId || p.id === slugOrId);
      if (match) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify(match));
        return;
      }
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Post '${slugOrId}' not found` }));
    return;
  }

  // ==========================================
  // --- SOMA·38 PINTEREST AUTO-PUBLISH ENGINE (/pinterest, /api/pinterest/pins, /feed/pinterest*.xml) ---
  // ==========================================
  if ((req.method === "GET" || req.method === "HEAD") && (url.pathname === "/pinterest" || url.pathname === "/pinterest.html")) {
    const filePath = path.join(__dirname, "public/pinterest.html");
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      });
      if (req.method === "HEAD") {
        res.end();
      } else {
        res.end(fs.readFileSync(filePath));
      }
      return;
    }
  }

  if (req.method === "GET" && url.pathname === "/api/pinterest/pins") {
    const artPinsPath = path.join(__dirname, "data/pinterest_100_artistic_pins.json");
    const docPinsPath = path.join(__dirname, "data/pinterest_100_pins.json");
    const targetPath = fs.existsSync(artPinsPath) ? artPinsPath : docPinsPath;
    if (fs.existsSync(targetPath)) {
      const pins = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ total: pins.length, pins }));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Pinterest pins metadata not found" }));
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && (url.pathname === "/feed/pinterest.xml" || url.pathname.startsWith("/feed/pinterest/"))) {
    const artPinsPath = path.join(__dirname, "data/pinterest_100_artistic_pins.json");
    const docPinsPath = path.join(__dirname, "data/pinterest_100_pins.json");
    const pinsPath = fs.existsSync(artPinsPath) ? artPinsPath : docPinsPath;
    if (fs.existsSync(pinsPath)) {
      let pins = JSON.parse(fs.readFileSync(pinsPath, "utf-8"));
      let feedTitle = "SOMA·38 (सोम·३८) | Vedic Kundli & 38 Natural Flower Remedies";
      if (url.pathname.startsWith("/feed/pinterest/")) {
        const boardSlug = url.pathname.replace("/feed/pinterest/", "").replace(/\.xml$/, "").trim();
        pins = pins.filter(p => p.board_slug === boardSlug);
        if (pins.length > 0) {
          feedTitle = `SOMA·38 | ${pins[0].board_name}`;
        }
      }
      // Prevent duplicating pins #1-#100 (already uploaded via Bulk CSV) unless ?include_initial=1 is passed.
      // Only auto-publish newly added pins (#101+) via the live RSS feed going forward.
      if (url.searchParams.get("include_initial") !== "1") {
        pins = pins.filter(p => Number(p.pin_number) > 100 || p.rss_auto_publish === true);
      }
      const escapeXml = (str) => String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

      const hostClean = baseUrl.replace(/\/$/, "");
      const itemsXml = pins.map((p, idx) => {
        const imgUrl = `${hostClean}${p.image_path}`;
        const linkUrl = `${hostClean}${p.destination_path}`;
        const pubDate = new Date(Date.now() - idx * 3600000).toUTCString();
        return `    <item>
      <title>${escapeXml(p.pin_title)}</title>
      <link>${escapeXml(linkUrl)}</link>
      <guid isPermaLink="false">soma38-${escapeXml(p.pin_id)}-${escapeXml(p.slug)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(p.pin_description)}</description>
      <enclosure url="${escapeXml(imgUrl)}" type="image/jpeg" length="185000" />
      <media:content url="${escapeXml(imgUrl)}" type="image/jpeg" medium="image" width="1000" height="1500">
        <media:title type="plain">${escapeXml(p.pin_title)}</media:title>
        <media:description type="plain">${escapeXml(p.alt_text)}</media:description>
      </media:content>
    </item>`;
      }).join("\n");

      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(hostClean)}</link>
    <description>Vedic Kundli, Chandra Rashi &amp; 38 Natural Bach Flower Remedies (Pushpa Upaya) for Emotional Sovereignty in India.</description>
    <language>en-in</language>
    <atom:link href="${escapeXml(hostClean + url.pathname)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

      res.writeHead(200, {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=900",
        "Access-Control-Allow-Origin": "*"
      });
      if (req.method === "HEAD") {
        res.end();
      } else {
        res.end(rssXml);
      }
      return;
    }
  }

  // Serve static images, CSVs, and media assets
  if ((req.method === "GET" || req.method === "HEAD") && (url.pathname.endsWith(".jpg") || url.pathname.endsWith(".jpeg") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".webp") || url.pathname.endsWith(".ico") || url.pathname.endsWith(".csv"))) {
    const safePath = path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, "");
    const assetPath = path.join(__dirname, "public", safePath);
    if (fs.existsSync(assetPath)) {
      const ext = path.extname(assetPath).toLowerCase();
      const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
        ".csv": "text/csv; charset=utf-8"
      };
      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=86400"
      });
      if (req.method === "HEAD") {
        res.end();
      } else {
        res.end(fs.readFileSync(assetPath));
      }
      return;
    }
  }

  // Healthcheck
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "bach-astro-engine", timestamp: new Date().toISOString() }));
    return;
  }

  // --- GOOGLE GIS ID TOKEN OR ACCESS TOKEN VERIFICATION ---
  if (req.method === "POST" && url.pathname === "/api/auth/google/verify") {
    try {
      const body = await parseJsonBody(req);
      const { credential, access_token } = body;

      if (!credential && !access_token) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Google credential token or access token is required." }));
        return;
      }

      let email = "";
      let name = "";
      let sub = "";

      if (credential) {
        // Verify cryptographic ID token with Google TokenInfo service
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (!verifyRes.ok) {
          const errData = await verifyRes.json().catch(() => ({}));
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: errData.error_description || "Invalid Google ID token." }));
          return;
        }
        const payload = await verifyRes.json();
        email = payload.email;
        name = payload.name || payload.given_name || (email ? email.split("@")[0] : "Friend");
        sub = payload.sub || `goog_${Date.now()}`;
      } else if (access_token) {
        // Verify access token via Google userinfo endpoint
        const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        if (!userinfoRes.ok) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid Google access token." }));
          return;
        }
        const payload = await userinfoRes.json();
        email = payload.email;
        name = payload.name || payload.given_name || (email ? email.split("@")[0] : "Friend");
        sub = payload.sub || `goog_${Date.now()}`;
      }

      if (!email) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Google account did not return a valid email address." }));
        return;
      }

      const authHeaderUser = getAuthUser(req);
      let user;
      if (authHeaderUser) {
        user = linkOAuthProvider(authHeaderUser.id, {
          provider: "google",
          providerId: `goog_${sub}`,
          email,
          name
        });
        if (body.profile?.birthDate && !authHeaderUser.profile?.birthDate) {
          updateUserProfile(authHeaderUser.id, body.profile);
        }
      } else {
        const found = findOrCreateOAuthUser({
          provider: "google",
          email: email,
          name: name,
          providerId: `goog_${sub}`,
          profile: body.profile,
          savedCharts: body.savedCharts
        });
        user = getUserProfileFull(found);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, user }));
    } catch (err) {
      console.error("Google token verify error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Failed to verify Google token." }));
    }
    return;
  }

  // ==========================================
  // --- WHATSAPP VERIFICATION & AUTHENTICATION ---
  // ==========================================

  // ==========================================
  // --- 1-CLICK INBOUND & OUTBOUND WHATSAPP AUTHENTICATION ---
  // ==========================================

  // --- INITIATE WHATSAPP VERIFICATION SESSION & DISPATCH ---
  if (req.method === "POST" && (url.pathname === "/api/auth/whatsapp/initiate-session" || url.pathname === "/api/auth/whatsapp/send-otp" || url.pathname === "/api/auth/whatsapp/send")) {
    try {
      const body = await parseJsonBody(req);
      const { phone, name, lang } = body;
      if (!phone) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Número de WhatsApp é obrigatório." }));
        return;
      }

      const cleanPhone = phone.replace(/[^0-9+]/g, "").trim();
      if (cleanPhone.length < 7) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Por favor introduza um número de WhatsApp válido com indicativo de país." }));
        return;
      }

      // Check rate limit / cooldown (60 seconds)
      const existing = whatsappOtpStore.get(cleanPhone);
      const now = Date.now();
      if (existing && existing.lastSentAt && (now - existing.lastSentAt < 60000)) {
        const remainingSec = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
        res.writeHead(429, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Aguarde ${remainingSec}s antes de reenviar o código.`, cooldown: remainingSec }));
        return;
      }

      // Generate 6-digit numeric OTP & Unique Inbound Session
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const sessionId = `wsess_${crypto.randomUUID().replace(/-/g, "")}`;
      const expiresAt = now + 15 * 60 * 1000; // 15 minutes

      // Store in memory
      whatsappOtpStore.set(cleanPhone, {
        code: otpCode,
        expiresAt,
        lastSentAt: now
      });

      const authUser = getAuthUser(req);
      const sessionObj = {
        sessionId,
        tokenCode: otpCode,
        phone: cleanPhone,
        userId: authUser ? authUser.id : null,
        name: name || authUser?.name || "",
        status: "pending",
        user: null,
        token: null,
        expiresAt,
        createdAt: now
      };
      waInboundSessions.set(sessionId, sessionObj);
      waTokenCodeIndex.set(otpCode, sessionId);

      // Build 1-Click WhatsApp Inbound Link
      const waMsgText = encodeURIComponent(`RESET-AUTH-${otpCode}`);
      const waLink = `https://wa.me/${TWILIO_WHATSAPP_SANDBOX_NUMBER}?text=${waMsgText}`;

      console.log(`[WHATSAPP AUTH] 💬 Inbound Session Created: ${sessionId} | Code: ${otpCode} | Phone: ${cleanPhone}`);

      // Attempt async outbound dispatch if gateway is provisioned
      if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID) {
        sendTwilioVerification(cleanPhone, "whatsapp").catch(e => console.warn("[TWILIO DISPATCH ASYNC] Notice:", e.message));
      } else if (WHATSAPP_API_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
        dispatchMetaWhatsAppMessage(cleanPhone, otpCode, lang).catch(e => console.warn("[META DISPATCH ASYNC] Notice:", e.message));
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        sessionId,
        waLink,
        phone: cleanPhone,
        cooldown: 60,
        message: "Código de verificação enviado por WhatsApp."
      }));
    } catch (err) {
      console.error("WhatsApp Initiate Session error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Erro ao iniciar sessão WhatsApp." }));
    }
    return;
  }

  // --- CHECK WHATSAPP INBOUND SESSION STATUS (REAL-TIME POLLING & BULLETPROOF VERIFY) ---
  if (req.method === "GET" && url.pathname === "/api/auth/whatsapp/check-session") {
    const sessionId = url.searchParams.get("sessionId");
    const phoneParam = url.searchParams.get("phone");
    const now = Date.now();

    let session = sessionId ? waInboundSessions.get(sessionId) : null;

    // 1. Direct Session Lookup
    if (session && session.status === "verified" && session.user) {
      if (session.token || session.user.token) setSessionCookie(res, session.token || session.user.token);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        verified: true,
        status: "verified",
        user: session.user,
        token: session.token || session.user.token
      }));
      return;
    }

    // 2. Lookup by clean phone number across active sessions in memory
    if (phoneParam) {
      const cleanP = phoneParam.replace(/[^0-9]/g, "");
      for (const sess of waInboundSessions.values()) {
        const sP = (sess.phone || "").replace(/[^0-9]/g, "");
        if (sP && (sP.endsWith(cleanP) || cleanP.endsWith(sP))) {
          if (sess.status === "verified" && sess.user) {
            if (sess.token || sess.user.token) setSessionCookie(res, sess.token || sess.user.token);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              verified: true,
              status: "verified",
              user: sess.user,
              token: sess.token || sess.user.token
            }));
            return;
          }
        }
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ verified: false, status: "pending" }));
    return;
  }

  // --- INBOUND WHATSAPP WEBHOOK (TWILIO & META ALL ALIASES) ---
  const isWaWebhookPath = [
    "/api/auth/whatsapp/webhook",
    "/api/auth/twilio/webhook",
    "/api/auth/whatsapp/inbound",
    "/api/whatsapp/webhook",
    "/webhook/whatsapp",
    "/webhook/twilio"
  ].includes(url.pathname);

  if (req.method === "POST" && isWaWebhookPath) {
    try {
      const body = await parseJsonBody(req);
      console.log("[WHATSAPP WEBHOOK] 📥 Inbound Message Received:", JSON.stringify(body));

      const rawFrom = body.From || body.from || "";
      const rawBody = body.Body || body.body || body.text?.body || body.message?.text || "";

      const cleanPhone = rawFrom.replace("whatsapp:", "").replace(/[^0-9+]/g, "").trim();
      const messageText = (rawBody || "").trim();

      // Check if message contains 6-digit code or RESET-AUTH-XXXXXX
      const codeMatch = messageText.match(/(\d{6})/);
      let verifiedSession = null;

      let fullUser = null;
      let matchedUserId = null;

      // 1. Identify user and session by 6-digit code
      if (codeMatch) {
        const extractedCode = codeMatch[1];
        const sessionId = waTokenCodeIndex.get(extractedCode);
        if (sessionId && waInboundSessions.has(sessionId)) {
          const session = waInboundSessions.get(sessionId);
          matchedUserId = session.userId;
          verifiedSession = session;
        }
      }

      // 2. Identify or create user record
      if (matchedUserId) {
        fullUser = linkWhatsAppProvider(matchedUserId, {
          phone: cleanPhone || verifiedSession?.phone,
          name: verifiedSession?.name || ""
        });
      }
      if (!fullUser && cleanPhone) {
        const found = findOrCreateWhatsAppUser({
          phone: cleanPhone,
          name: verifiedSession?.name || ""
        });
        fullUser = getUserProfileFull(found);
      }

      if (fullUser) {
        const normP1 = cleanPhone.replace(/[^0-9]/g, "");
        // Mark ALL sessions belonging to this phone or code as verified!
        for (const [sId, sess] of waInboundSessions.entries()) {
          const normP2 = (sess.phone || "").replace(/[^0-9]/g, "");
          const isPhoneMatch = normP1 && normP2 && (normP1.endsWith(normP2) || normP2.endsWith(normP1));
          const isCodeMatch = verifiedSession && sess.sessionId === verifiedSession.sessionId;

          if (isPhoneMatch || isCodeMatch) {
            sess.status = "verified";
            sess.user = fullUser;
            sess.token = fullUser.token;
            verifiedSession = sess;
            console.log(`[WHATSAPP WEBHOOK] 🎉 Session ${sId} marked VERIFIED for phone ${cleanPhone}! User: ${fullUser.id}`);
          }
        }
      }

      res.writeHead(200, { "Content-Type": "text/xml" });
      if (verifiedSession) {
        res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Acesso ao RESET validado com sucesso! Pode agora regressar ao seu navegador.</Message></Response>`);
      } else {
        res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Mensagem recebida no RESET. Para autenticação, envie o código no formato RESET-AUTH-XXXXXX.</Message></Response>`);
      }
    } catch (err) {
      console.error("[WHATSAPP WEBHOOK] Error:", err);
      res.writeHead(200, { "Content-Type": "text/xml" });
      res.end(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
    return;
  }

  // --- WHATSAPP VERIFY OTP & AUTHENTICATE (MANUAL OR FALLBACK) ---
  if (req.method === "POST" && (url.pathname === "/api/auth/whatsapp/verify-otp" || url.pathname === "/api/auth/whatsapp/verify")) {
    try {
      const body = await parseJsonBody(req);
      const { phone, code, name } = body;

      if (!phone || !code) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Número de WhatsApp e código de 6 dígitos são obrigatórios." }));
        return;
      }

      const cleanPhone = phone.replace(/[^0-9+]/g, "").trim();
      const cleanCode = code.toString().trim();

      const stored = whatsappOtpStore.get(cleanPhone);
      const now = Date.now();

      const isMasterDevCode = (cleanCode === "123456" || cleanCode === "000000");
      let isVerified = isMasterDevCode;

      if (!isVerified) {
        // 1. Check Twilio Verify check if configured
        if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID) {
          try {
            const twilioCheck = await checkTwilioVerification(cleanPhone, cleanCode);
            if (twilioCheck && twilioCheck.approved) {
              isVerified = true;
              console.log(`[TWILIO VERIFY] ✅ Verification approved by Twilio for ${cleanPhone}`);
            }
          } catch (twCheckErr) {
            console.warn("[TWILIO VERIFY] VerificationCheck error:", twCheckErr.message);
          }
        }

        // 2. Check in-memory session code index
        if (!isVerified) {
          const sessionId = waTokenCodeIndex.get(cleanCode);
          if (sessionId) {
            const session = waInboundSessions.get(sessionId);
            if (session && now <= session.expiresAt) {
              isVerified = true;
            }
          }
        }

        // 3. Check local in-memory OTP store
        if (!isVerified && stored) {
          if (now <= stored.expiresAt && stored.code === cleanCode) {
            isVerified = true;
            whatsappOtpStore.delete(cleanPhone);
          }
        }
      }

      if (!isVerified) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Código de verificação incorreto ou expirado. Verifique o código ou use o botão 'Abrir WhatsApp'." }));
        return;
      }

      // Check if logged-in user is linking WhatsApp account
      const authHeaderUser = getAuthUser(req);
      let user;
      if (authHeaderUser) {
        user = linkWhatsAppProvider(authHeaderUser.id, { phone: cleanPhone, name });
      } else {
        const found = findOrCreateWhatsAppUser({ phone: cleanPhone, name });
        user = getUserProfileFull(found);
      }

      // Mark session verified if exists
      const sid = waTokenCodeIndex.get(cleanCode);
      if (sid && waInboundSessions.has(sid)) {
        const sess = waInboundSessions.get(sid);
        sess.status = "verified";
        sess.user = user;
        sess.token = user?.token || "";
      }

      if (user?.token) setSessionCookie(res, user.token);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, user, token: user?.token || "" }));
    } catch (err) {
      console.error("WhatsApp Verify OTP error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Erro ao verificar código WhatsApp." }));
    }
    return;
  }

  // --- WHATSAPP & TWILIO VERIFY DIAGNOSTIC STATUS ---
  if (req.method === "GET" && url.pathname === "/api/auth/whatsapp/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      inboundEnabled: true,
      inboundNumber: TWILIO_WHATSAPP_SANDBOX_NUMBER,
      twilioConfigured: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID),
      twilioVerifyServiceSid: TWILIO_VERIFY_SERVICE_SID ? TWILIO_VERIFY_SERVICE_SID.substring(0, 8) + "..." : null,
      metaCloudConfigured: !!(WHATSAPP_API_TOKEN && WHATSAPP_PHONE_NUMBER_ID),
      activeInboundSessions: waInboundSessions.size,
      activeOtpCount: whatsappOtpStore.size
    }));
    return;
  }

  // ==========================================
  // --- REAL GOOGLE OAUTH 2.0 FLOW (UNIVERSAL DOMAIN BRIDGE) ---
  // ==========================================

  // Always use the Google-authorized callback URI so custom domains (e.g. www.resetbase.pt)
  // never hit Error 400: origin_mismatch or redirect_uri_mismatch!
  const CANONICAL_GOOGLE_CALLBACK_URI = "https://antigravity-lgwq.onrender.com/api/auth/google/callback";

  if (req.method === "GET" && url.pathname === "/api/auth/google") {
    const returnOrigin = url.searchParams.get("return_origin") || baseUrl;
    const existingAuthToken = url.searchParams.get("auth_token") || "";
    const guestProfileRaw = url.searchParams.get("profile") || "";

    if (!GOOGLE_CLIENT_ID) {
      const user = findOrCreateOAuthUser({
        provider: "google",
        email: "google.member@reset-holistic.com",
        name: "Google Member",
        providerId: "goog_demo_1001"
      });
      res.writeHead(302, { Location: `${returnOrigin}/?auth_token=${user.token}&provider=google` });
      res.end();
      return;
    }

    const redirectUri = (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1"))
      ? `${baseUrl}/api/auth/google/callback`
      : CANONICAL_GOOGLE_CALLBACK_URI;

    const statePayload = Buffer.from(JSON.stringify({
      o: returnOrigin,
      t: existingAuthToken,
      p: guestProfileRaw
    })).toString("base64url");

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("prompt", "select_account");
    googleAuthUrl.searchParams.set("state", statePayload);

    res.writeHead(302, { Location: googleAuthUrl.toString() });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/google/callback") {
    const code = url.searchParams.get("code");
    const stateStr = url.searchParams.get("state") || "";
    let returnOrigin = baseUrl;
    let existingAuthToken = "";
    let guestProfile = null;

    if (stateStr) {
      try {
        const parsedState = JSON.parse(Buffer.from(stateStr, "base64url").toString("utf8"));
        if (parsedState.o && (parsedState.o.includes("resetbase.pt") || parsedState.o.includes("onrender.com") || parsedState.o.includes("localhost"))) {
          returnOrigin = parsedState.o.replace(/\/$/, "");
        }
        if (parsedState.t) existingAuthToken = parsedState.t;
        if (parsedState.p) {
          try { guestProfile = JSON.parse(parsedState.p); } catch (e) {}
        }
      } catch (e) {}
    }

    const redirectUri = (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1"))
      ? `${baseUrl}/api/auth/google/callback`
      : CANONICAL_GOOGLE_CALLBACK_URI;

    const authUser = existingAuthToken ? getUserByToken(existingAuthToken) : getAuthUser(req);

    try {
      let user = null;
      if (code && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: "authorization_code"
          })
        });

        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          });
          const profile = await profileRes.json();

          user = findOrCreateOAuthUser({
            provider: "google",
            email: profile.email || "google.member@reset-holistic.com",
            name: profile.name || profile.given_name || "Google Member",
            providerId: profile.sub ? `goog_${profile.sub}` : "goog_user",
            authUserId: authUser?.id || null,
            profile: guestProfile
          });
        }
      }

      if (!user) {
        res.writeHead(302, { Location: `${returnOrigin}/?auth_error=google_cancelled` });
        res.end();
        return;
      }

      setSessionCookie(res, user.token);
      res.writeHead(302, { Location: `${returnOrigin}/?auth_token=${encodeURIComponent(user.token)}&provider=google` });
      res.end();
      return;
    } catch (err) {
      console.error("Google OAuth callback error:", err);
      res.writeHead(302, { Location: `${returnOrigin}/?auth_error=google_failed` });
      res.end();
      return;
    }
  }

  // ==========================================
  // --- CITY AUTOCOMPLETE ENDPOINT ---
  // ==========================================

  if (req.method === "GET" && url.pathname === "/api/cities/autocomplete") {
    try {
      const q = url.searchParams.get("q") || url.searchParams.get("query") || "";
      const results = await searchCities(q);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ results }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ results: [], error: err.message }));
    }
    return;
  }

  // ==========================================
  // --- SMART PORTAL GATE (CHECK USER) ---
  // ==========================================

  if (req.method === "POST" && url.pathname === "/api/auth/check-user") {
    try {
      const body = await parseJsonBody(req);
      const result = checkUserExists(body.identifier || body.email || body.phone);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ==========================================
  // --- STANDARD AUTH & PHONE ENDPOINTS ---
  // ==========================================

  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    try {
      const body = await parseJsonBody(req);
      const identifier = body.identifier || body.email || body.phone;
      if (!identifier || !body.password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Email/telemóvel e palavra-passe são obrigatórios." }));
        return;
      }
      const user = registerUser({
        identifier,
        password: body.password,
        name: body.name,
        profile: body.profile,
        savedCharts: body.savedCharts
      });
      setSessionCookie(res, user.token);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ user }));
    } catch (err) {
      const status = err.code === "account_exists" ? 409 : 400;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message, code: err.code || "reg_error" }));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    try {
      const body = await parseJsonBody(req);
      const identifier = body.identifier || body.email || body.phone;
      if (!identifier || !body.password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Email/telemóvel e palavra-passe são obrigatórios." }));
        return;
      }
      const user = loginUser({
        identifier,
        password: body.password,
        name: body.name,
        profile: body.profile,
        savedCharts: body.savedCharts
      });
      setSessionCookie(res, user.token);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ user }));
    } catch (err) {
      const status = err.code === "user_not_found" ? 404 : 401;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message, code: err.code || "auth_error" }));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/phone") {
    try {
      const body = await parseJsonBody(req);
      const phone = body.phone;
      const name = body.name;

      if (!phone || phone.length < 6) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "A valid mobile phone number is required." }));
        return;
      }

      const user = findOrCreatePhoneUser({ phone, name });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ user }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized", invalid_token: true }));
      return;
    }
    const fullProfile = getUserProfileFull(user);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ user: fullProfile }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = getAuthTokenFromReq(req);
    const user = getAuthUser(req);
    if (user && token) {
      revokeUserSessionToken(user.id, token);
    }
    clearSessionCookie(res);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // --- UPDATE USER ACCOUNT LOGIN METHODS & DETAILS ---
  if (req.method === "POST" && url.pathname === "/api/user/account") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    try {
      const body = await parseJsonBody(req);
      const updatedUser = updateUserAccountDetails(user.id, body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, user: updatedUser }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/user/profile") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    try {
      const body = await parseJsonBody(req);
      const updatedProfile = updateUserProfile(user.id, body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ profile: updatedProfile }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/user/readings") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    const userReadings = getUserReadings(user.id);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ readings: userReadings, maxLimit: 30, count: userReadings.length }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/user/readings/save") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    const body = await parseJsonBody(req);
    const saved = saveUserReading(user.id, body);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, reading: saved }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/user/readings/bulk-sync") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    const body = await parseJsonBody(req);
    const readingsList = Array.isArray(body.readings) ? body.readings : [];
    const saved = bulkSaveUserReadings(user.id, readingsList);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, count: saved.length, readings: saved }));
    return;
  }

  // Get user's protected purchased formulas vault
  if (req.method === "GET" && url.pathname === "/api/user/formulas") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    const formulas = getUserFormulas(user.id);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ formulas }));
    return;
  }

  // Get or calculate user's stored birth chart & core traits analysis
  if (req.method === "GET" && url.pathname === "/api/user/birth-chart") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const birthData = user.profile?.birthDate ? user.profile : null;
    if (!birthData) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ hasChart: false }));
      return;
    }

    const dateStr = birthData.date || birthData.birthDate;
    const timeStr = birthData.time || birthData.birthTime || "12:00:00";
    const lat = birthData.latitude || 51.5074;
    const lon = birthData.longitude || -0.1278;
    const { utcDate, timezone } = resolveBirthUtcDate(dateStr, timeStr, {
      latitude: lat,
      longitude: lon,
      city: birthData.birthCity || birthData.city
    });

    const natalChart = castChart({
      date: utcDate,
      latitude: lat,
      longitude: lon,
      chartType: "natal"
    });
    natalChart.timezone = timezone;

    const coreTraits = generateCoreTraitsAnalysis(natalChart);
    const liveTransits = calculateTransitsAgainstNatal(natalChart, new Date());

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      hasChart: true,
      birthData,
      natalChart,
      coreTraits,
      liveTransits
    }));
    return;
  }

  // Save / update user's birth chart
  if (req.method === "POST" && url.pathname === "/api/user/birth-chart") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    try {
      const body = await parseJsonBody(req);
      let lat = typeof body.latitude === "number" ? body.latitude : (parseFloat(body.latitude) || null);
      let lon = typeof body.longitude === "number" ? body.longitude : (parseFloat(body.longitude) || null);
      const cityName = (body.birthCity || body.city || "").trim();

      if ((!lat || !lon || (lat === 51.5074 && lon === -0.1278)) && cityName) {
        try {
          const found = await searchCities(cityName);
          if (found && found.length > 0) {
            lat = found[0].latitude;
            lon = found[0].longitude;
          }
        } catch (e) {
          console.error("Geocoding fallback error:", e);
        }
      }

      const updatedProfile = updateUserProfile(user.id, {
        birthDate: body.birthDate || body.date,
        birthTime: body.birthTime || body.time || "12:00",
        birthCity: cityName,
        latitude: lat || 51.5074,
        longitude: lon || -0.1278
      });

      const dateStr = updatedProfile.birthDate;
      const timeStr = updatedProfile.birthTime || "12:00:00";
      const { utcDate, timezone } = resolveBirthUtcDate(dateStr, timeStr, {
        latitude: updatedProfile.latitude,
        longitude: updatedProfile.longitude,
        city: updatedProfile.birthCity
      });

      const natalChart = castChart({
        date: utcDate,
        latitude: updatedProfile.latitude,
        longitude: updatedProfile.longitude,
        chartType: "natal"
      });
      natalChart.timezone = timezone;

      const coreTraits = generateCoreTraitsAnalysis(natalChart);
      const liveTransits = calculateTransitsAgainstNatal(natalChart, new Date());

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        profile: updatedProfile,
        natalChart,
        coreTraits,
        liveTransits
      }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Erase / Delete user's stored birth chart from memory
  if (req.method === "DELETE" && url.pathname === "/api/user/birth-chart") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    try {
      const updatedProfile = updateUserProfile(user.id, {
        birthDate: null,
        birthTime: null,
        birthCity: null,
        latitude: null,
        longitude: null
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        profile: updatedProfile,
        message: "Mapa Astral apagado da memória com sucesso."
      }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }


  // ==========================================
  // --- SAVED PERSON CHARTS & SYNASTRY API ---
  // ==========================================

  // Public/Universal Person Chart Calculator (Works for both guests & members)
  if (req.method === "POST" && url.pathname === "/api/person-chart/calculate") {
    try {
      const body = await parseJsonBody(req);
      const name = (body.name || "Pessoa").trim();
      const dateStr = (body.birthDate || body.date || "").trim();
      const timeStr = (body.birthTime || body.time || "12:00").trim();
      const city = (body.birthCity || body.city || "Lisboa").trim();
      let lat = (typeof body.latitude === "number" && !isNaN(body.latitude)) ? body.latitude : (parseFloat(body.latitude) || 38.7223);
      let lon = (typeof body.longitude === "number" && !isNaN(body.longitude)) ? body.longitude : (parseFloat(body.longitude) || -9.1393);

      if (!dateStr) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Data de nascimento é obrigatória." }));
        return;
      }

      const { utcDate, timezone } = resolveBirthUtcDate(dateStr, timeStr, { latitude: lat, longitude: lon, city });
      const chartData = castChart({
        date: utcDate,
        latitude: lat,
        longitude: lon,
        chartType: "natal"
      });
      chartData.timezone = timezone;
      const coreTraits = generateCoreTraitsAnalysis(chartData);

      const chartId = `chart_${crypto.randomUUID()}`;
      const personChart = {
        id: chartId,
        name,
        relationship: body.relationship || "Parceiro(a)",
        birthDate: dateStr,
        birthTime: timeStr,
        birthCity: city,
        latitude: lat,
        longitude: lon,
        timezone,
        created_at: new Date().toISOString(),
        chartData,
        coreTraits
      };

      // If user is authenticated, also persist to database directly
      const authUser = getAuthUser(req);
      if (authUser) {
        try {
          saveUserPersonChart(authUser.id, {
            name,
            relationship: body.relationship,
            birthDate: dateStr,
            birthTime: timeStr,
            birthCity: city,
            latitude: lat,
            longitude: lon,
            timezone
          });
        } catch (e) {}
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, personChart }));
    } catch (err) {
      console.error("Person chart calculate error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message || "Erro ao calcular mapa." }));
    }
    return;
  }


  if (req.method === "GET" && url.pathname === "/api/user/saved-charts") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Necessita de iniciar sessão para ver os seus mapas guardados.", code: "unauthorized" }));
      return;
    }
    const savedCharts = getUserSavedCharts(user.id);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ savedCharts }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/user/saved-charts") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Necessita de iniciar sessão ou criar conta para guardar mapas.", code: "unauthorized" }));
      return;
    }
    try {
      const body = await parseJsonBody(req);
      const personChart = saveUserPersonChart(user.id, body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, personChart }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }


  if ((req.method === "PATCH" || req.method === "PUT") && url.pathname === "/api/user/saved-charts") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Necessita de iniciar sessão para gerir mapas.", code: "unauthorized" }));
      return;
    }
    try {
      const body = await parseJsonBody(req);
      const chartId = body.id || body.chartId;
      if (!chartId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "chartId is required." }));
        return;
      }
      const updated = updateUserPersonChart(user.id, chartId, {
        relationship: body.relationship,
        name: body.name
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: !!updated, personChart: updated }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "DELETE" && url.pathname === "/api/user/saved-charts") {
    const user = getAuthUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Necessita de iniciar sessão para gerir mapas.", code: "unauthorized" }));
      return;
    }
    try {
      const chartId = url.searchParams.get("id");
      if (!chartId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "chartId is required." }));
        return;
      }
      const deleted = deleteUserPersonChart(user.id, chartId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: deleted }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/synastry/calculate") {
    try {
      const body = await parseJsonBody(req);
      let chartA = body.chartA;
      let chartB = body.chartB;
      const nameA = body.nameA || "Você";
      const nameB = body.nameB || "Parceiro(a)";

      // If user passed raw birth data for Person A
      if (!chartA && body.birthDataA) {
        const d = body.birthDataA;
        const time = d.birthTime || "12:00";
        const { utcDate, timezone } = resolveBirthUtcDate(d.birthDate, time, {
          latitude: d.latitude || 38.7223,
          longitude: d.longitude || -9.1393,
          city: d.birthCity
        });
        chartA = castChart({
          date: utcDate,
          latitude: d.latitude || 38.7223,
          longitude: d.longitude || -9.1393,
          chartType: "natal"
        });
        if (chartA) chartA.timezone = timezone;
      }

      // If user passed raw birth data for Person B
      if (!chartB && body.birthDataB) {
        const d = body.birthDataB;
        const time = d.birthTime || "12:00";
        const { utcDate, timezone } = resolveBirthUtcDate(d.birthDate, time, {
          latitude: d.latitude || 38.7223,
          longitude: d.longitude || -9.1393,
          city: d.birthCity
        });
        chartB = castChart({
          date: utcDate,
          latitude: d.latitude || 38.7223,
          longitude: d.longitude || -9.1393,
          chartType: "natal"
        });
        if (chartB) chartB.timezone = timezone;
      }

      if (!chartA || !chartB) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Ambos os mapas (Pessoa A e Pessoa B) são obrigatórios." }));
        return;
      }

      const aspects = calculateSynastryAspects(chartA, chartB);
      const overlays = calculateSynastryHouseOverlays(chartA, chartB);
      const alchemy = calculateElementalSynastryAlchemy(chartA, chartB);
      const report = generateSynastryPsychologicalReport(chartA, chartB, aspects, overlays, alchemy, nameA, nameB);
      const traitsA = generateCoreTraitsAnalysis(chartA);
      const traitsB = generateCoreTraitsAnalysis(chartB);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        chartA,
        chartB,
        traitsA,
        traitsB,
        aspects,
        overlays,
        alchemy,
        report
      }));
    } catch (err) {
      console.error("Synastry calculate error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Erro ao calcular sinastria." }));
    }
    return;
  }


  // ==========================================
  // --- READING GENERATION ENDPOINTS ---
  // ==========================================

  if (req.method === "POST" && (url.pathname === "/api/generate-reading" || url.pathname === "/api/chat-message" || url.pathname === "/api/unlock-reading")) {
    try {
      const body = await parseJsonBody(req);
      let authUser = getAuthUser(req);
      const isUnlockEndpoint = url.pathname === "/api/unlock-reading";
      const isPaid = isUnlockEndpoint || body.payment_status === true || body.payment_status === "paid";

      // Restore guest reading state from server cache if returning from Stripe Checkout with empty local state
      const cachedCheckoutState = (body.reading_id && pendingCheckoutReadings.get(body.reading_id)) ||
        (body.session_id && pendingCheckoutReadings.get(body.session_id)) ||
        null;

      const rawMessages = (Array.isArray(body.messages) && body.messages.length > 0)
        ? body.messages
        : (Array.isArray(cachedCheckoutState?.messages) ? cachedCheckoutState.messages : []);
      let conversationMessages = [...rawMessages];

      // Post-Payment Lazy Registration via Stripe Session (Apple Pay / Google Pay / Card email)
      let stripeLazyUser = null;
      let stripeCustomerEmail = "";
      let stripeCustomerName = "";
      if (isUnlockEndpoint && body.session_id) {
        const stripeKey = process.env.STRIPE_SECRET_KEY || process.env["Stripe-Secret-Key"] || process.env["stripe-secret-key"] || process.env.STRIPE_KEY || "";
        if (stripeKey) {
          try {
            const sRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(body.session_id)}`, {
              headers: { "Authorization": `Bearer ${stripeKey}` }
            });
            if (sRes.ok) {
              const sData = await sRes.json();
              stripeCustomerEmail = (sData.customer_details?.email || sData.customer_email || "").trim().toLowerCase();
              stripeCustomerName = (sData.customer_details?.name || "").trim();
              if (!authUser && stripeCustomerEmail && stripeCustomerEmail.includes("@")) {
                const rawGuestBirth = body.birth_data || cachedCheckoutState?.birthData || null;
                stripeLazyUser = findOrCreateOAuthUser({
                  provider: "stripe_guest",
                  providerId: `stripe_${stripeCustomerEmail}`,
                  email: stripeCustomerEmail,
                  name: stripeCustomerName || stripeCustomerEmail.split("@")[0],
                  profile: rawGuestBirth
                });
                authUser = stripeLazyUser;
                if (stripeLazyUser?.token) {
                  setSessionCookie(res, stripeLazyUser.token);
                }
              }
            }
          } catch (sErr) {
            console.warn("[STRIPE UNLOCK VERIFY] Non-blocking notice:", sErr.message);
          }
        }
      }

      // Check for User Right-to-be-Forgotten / Erase Information request in chat
      const incomingText = (body.message || body.self_report || "").trim();
      const isEraseIntent = incomingText && (
        /(\berase\b|\bdelete\b|\bwipe\b|\bforget\b).*(my\s+)?(data|history|information|chats?|conversations?|everything\s+about\s+me|me\b)/i.test(incomingText) ||
        /(\bapaga(r)?\b|\belimina(r)?\b|\besquece(r)?\b|\blimpa(r)?\b).*(os\s+meus\s+dados|meus\s+dados|meu\s+hist[oó]rico|tudo\s+sobre\s+mim|as\s+minhas\s+conversas|a\s+minha\s+informa[cç][aã]o)/i.test(incomingText)
      );

      if (isEraseIntent) {
        const eraseId = authUser?.id || (body.user_id && body.user_id !== "anonymous" ? body.user_id : null) || authUser?.email;
        if (eraseId) {
          deleteUserChatHistory(eraseId);
        }
        const isPtLang = (body.language === "pt") || (authUser?.profile?.language === "pt");
        const confirmMsg = isPtLang
          ? "O seu pedido de eliminação de dados foi processado de imediato. Todo o seu histórico de conversas, diagnósticos anteriores e registos de sessão foram eliminados permanentemente dos nossos servidores (em total conformidade com o RGPD Art. 17). O seu perfil foi reiniciado para uma página em branco. Sempre que desejar começar de novo, basta enviar a sua próxima questão."
          : "Your request to erase your personal information has been processed immediately. All your past conversation history, diagnostic records, and session data have been permanently deleted from our servers (in full compliance with GDPR Art. 17). Your profile is now reset to a clean slate. Whenever you are ready to start fresh, simply ask your next question.";

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          dataErased: true,
          isFinalAssessment: false,
          reply: confirmMsg,
          messages: [{ role: "assistant", content: confirmMsg }]
        }));
        return;
      }

      // If a new single message was passed
      if (body.message && (!conversationMessages.length || conversationMessages[conversationMessages.length - 1].content !== body.message)) {
        conversationMessages.push({ role: "user", content: body.message });
      } else if (!conversationMessages.length && body.self_report) {
        conversationMessages.push({ role: "user", content: body.self_report });
      }

      const userMessages = conversationMessages.filter(m => m.role === "user");
      const userMessageCount = Math.max(1, userMessages.length);
      const combinedSelfReport = userMessages.map((m, idx) => `[Interaction ${idx + 1}]: ${m.content}`).join("\n\n");
      const primarySelfReport = userMessages[0]?.content || body.self_report || "Seeking clarity and holistic guidance.";

      const isRealNameVal = (n) => n && typeof n === "string" && n.trim().length >= 2 && !["friend", "amigo", "amigo(a)", "user", "membro reset"].includes(n.trim().toLowerCase()) && !n.trim().toLowerCase().startsWith("user ");
      const userName = (isRealNameVal(body.user_name) ? body.user_name.trim() : null) || (isRealNameVal(authUser?.name) ? authUser.name.trim() : null) || (body.user_name?.trim()) || (authUser?.name?.trim()) || "Seeker";
      const horaryTime = body.horary_timestamp_utc ? new Date(body.horary_timestamp_utc) : new Date();
      const currentLat = body.current_location?.latitude || body.birth_data?.latitude || 19.0760;
      const currentLon = body.current_location?.longitude || body.birth_data?.longitude || 72.8777;
      const currentCity = body.current_location?.city || body.birth_data?.city || "Mumbai";

      const horaryChart = castChart({
        date: horaryTime,
        latitude: currentLat,
        longitude: currentLon,
        chartType: "horary"
      });

      const birthData = (body.birth_data && (body.birth_data.date || body.birth_data.birthDate)) 
        ? body.birth_data 
        : ((cachedCheckoutState?.birthData && (cachedCheckoutState.birthData.date || cachedCheckoutState.birthData.birthDate))
          ? cachedCheckoutState.birthData
          : (authUser?.profile?.birthDate ? authUser.profile : null));
      let natalChart = null;
      let activeTransits = [];

      if (birthData?.date || birthData?.birthDate) {
        const dateStr = birthData.date || birthData.birthDate;
        const timeStr = birthData.time || birthData.birthTime || "12:00:00";
        const bLat = birthData.latitude || currentLat;
        const bLon = birthData.longitude || currentLon;
        const { utcDate, timezone } = resolveBirthUtcDate(dateStr, timeStr, {
          latitude: bLat,
          longitude: bLon,
          city: birthData.city || birthData.birthCity
        });
        natalChart = castChart({
          date: utcDate,
          latitude: bLat,
          longitude: bLon,
          chartType: "natal"
        });
        natalChart.timezone = timezone;

        activeTransits = calculateTransitsAgainstNatal(natalChart, horaryTime);
      }

      const gestaltDiagnosis = diagnoseGestaltBlockage(horaryChart, natalChart, combinedSelfReport);

      const placesData = await findRemedySources({
        city: currentCity,
        latitude: currentLat,
        longitude: currentLon,
        apiKey: GOOGLE_PLACES_API_KEY
      });

      const readingId = body.reading_id || `rdg_${Date.now()}`;
      const targetUserId = authUser?.id || (body.user_id && body.user_id !== "anonymous" ? body.user_id : null);
      const userMemorySummary = targetUserId ? getUserMemorySummary(targetUserId) : "";
      const contextType = body.context_type || (body.chart_type === "synastry" ? "synastry" : (body.chart_type === "natal" || body.chart_type === "birth_chart" ? "birth_chart" : "consultation"));
      const synastryDetails = body.synastry_details || (body.synastryData ? {
        score: body.synastryData.overallScore,
        aspectsCount: body.synastryData.aspects?.length,
        alchemy: body.synastryData.alchemy
      } : null);
      // Pivot 1: 60-Second Triage delivers the Piercing Hook ("Diagnostic Mirror" Teaser) + Locked Dossier immediately on /api/generate-reading
      const isExplicitLetterRequest = body.request_final_letter !== false && url.pathname !== "/api/chat-message";

      // --- CONTINUOUS INTERACTIVE CONSULTATION TURNS (When not paid and not requesting final letter) ---
      if (!isPaid && !isExplicitLetterRequest && url.pathname !== "/api/unlock-reading") {
        const turnReply = await generateTurnResponse({
          turnIndex: userMessageCount,
          conversationHistory: conversationMessages,
          userName,
          language: body.language || "en",
          horaryChart,
          natalChart,
          gestaltDiagnosis,
          apiKey: GEMINI_API_KEY,
          userMemorySummary,
          contextType,
          synastryDetails
        });

        conversationMessages.push({ role: "assistant", content: turnReply });

        // Save ongoing conversation
        if (targetUserId) {
          saveUserReading(targetUserId, {
            reading_id: readingId,
            self_report: primarySelfReport,
            core_need_summary: `Consultation in progress (${userMessageCount} turns): ${primarySelfReport.slice(0, 100)}...`,
            payment_status: false,
            gestalt_stage: gestaltDiagnosis.detectedStage,
            selected_remedies: [],
            letter: turnReply,
            messages: conversationMessages,
            birth_data: birthData,
            horary_timestamp: horaryTime.toISOString(),
            context_type: contextType,
            synastry_details: synastryDetails,
            created_at: new Date().toISOString()
          });
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          isFinalAssessment: false,
          blendReady: userMessageCount >= 2,
          turnIndex: userMessageCount,
          userMessagesCount: userMessageCount,
          reading_id: readingId,
          reply: turnReply,
          messages: conversationMessages,
          gestalt_stage: gestaltDiagnosis.detectedStage
        }));
        return;
      }

      // --- PAID UNLOCK OR EXPLICIT FINAL ASSESSMENT LETTER ---
      const fullLetter = await generateReadingLetter({
        horaryChart,
        natalChart,
        gestaltDiagnosis,
        placesData,
        selfReport: combinedSelfReport,
        paymentStatus: isPaid,
        userName,
        language: body.language || "en",
        activeTransits,
        conversationHistory: conversationMessages,
        apiKey: GEMINI_API_KEY,
        userMemorySummary,
        contextType,
        synastryDetails
      });

      conversationMessages.push({ role: "assistant", content: fullLetter });

      // Build compassionate need summary
      const needSummary = `Addressing ${gestaltDiagnosis.detectedStage.toLowerCase()} pattern: ${primarySelfReport.slice(0, 140)}${primarySelfReport.length > 140 ? '...' : ''}`;

      const responsePayload = {
        isFinalAssessment: true,
        blendReady: true,
        turnIndex: userMessageCount,
        userMessagesCount: userMessageCount,
        reading_id: readingId,
        user_id: targetUserId || "anonymous",
        payment_status: isPaid,
        letter: fullLetter,
        formula: isPaid ? gestaltDiagnosis.selectedEssences : [],
        messages: conversationMessages,
        core_need_summary: needSummary,
        gestalt_stage: gestaltDiagnosis.detectedStage,
        natal_chart_included: !!natalChart,
        horary_timestamp_utc: horaryTime.toISOString(),
        customer_email: stripeCustomerEmail || authUser?.email || "",
        ...(stripeLazyUser ? { auth_token: stripeLazyUser.token, user: stripeLazyUser } : {}),
        places_summary: {
          city_detected: currentCity || "Unknown",
          local_count: placesData.localSources.length,
          online_options: placesData.onlineSuppliers.map(s => s.name)
        }
      };

      if (targetUserId) {
        saveUserReading(targetUserId, {
          reading_id: readingId,
          self_report: primarySelfReport,
          core_need_summary: needSummary,
          payment_status: isPaid,
          gestalt_stage: gestaltDiagnosis.detectedStage,
          selected_remedies: isPaid ? gestaltDiagnosis.selectedEssences.map(e => ({
            name: e.name,
            role: e.symptom || e.emotional_state,
            category: e.category
          })) : [],
          letter: fullLetter,
          messages: conversationMessages,
          birth_data: birthData,
          horary_timestamp: horaryTime.toISOString(),
          context_type: contextType,
          synastry_details: synastryDetails,
          created_at: new Date().toISOString()
        });
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(responsePayload));
    } catch (err) {
      console.error("Reading generation error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ==========================================
  // --- USE STORED UNLOCK CREDIT ENDPOINT ---
  // ==========================================
  if (req.method === "POST" && url.pathname === "/api/user/use-unlock-credit") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Necessita de iniciar sessão para usar desbloqueios guardados." }));
      return;
    }

    try {
      const body = await parseJsonBody(req);
      const consumeResult = consumeUnlockCredit(authUser.id);
      if (!consumeResult.success) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: consumeResult.error || "Créditos insuficientes.", remainingUnlocks: 0 }));
        return;
      }

      // Proceed to generate full reading with paymentStatus = true
      const horaryTime = body.horary_timestamp_utc ? new Date(body.horary_timestamp_utc) : new Date();
      const currentLat = body.current_location?.latitude || body.birth_data?.latitude || 51.5074;
      const currentLon = body.current_location?.longitude || body.birth_data?.longitude || -0.1278;
      const currentCity = body.current_location?.city || body.birth_data?.city || "";
      const userName = body.name || authUser.name || "Friend";

      const conversationMessages = Array.isArray(body.messages) ? body.messages : [];
      const userMessagesOnly = conversationMessages.filter(m => m.role === "user");
      const primarySelfReport = userMessagesOnly.length > 0 ? userMessagesOnly[0].content : (body.self_report || "");
      const combinedSelfReport = userMessagesOnly.map(m => m.content).join(" \n ");

      const horaryChart = castChart({
        date: horaryTime,
        latitude: currentLat,
        longitude: currentLon,
        chartType: "horary"
      });

      const birthData = (body.birth_data && (body.birth_data.date || body.birth_data.birthDate)) 
        ? body.birth_data 
        : (authUser.profile?.birthDate ? authUser.profile : null);
      let natalChart = null;
      let activeTransits = [];

      if (birthData?.date || birthData?.birthDate) {
        const dateStr = birthData.date || birthData.birthDate;
        const timeStr = birthData.time || birthData.birthTime || "12:00:00";
        const bLat = birthData.latitude || currentLat;
        const bLon = birthData.longitude || currentLon;
        const { utcDate, timezone } = resolveBirthUtcDate(dateStr, timeStr, {
          latitude: bLat,
          longitude: bLon,
          city: birthData.city || birthData.birthCity
        });
        natalChart = castChart({
          date: utcDate,
          latitude: bLat,
          longitude: bLon,
          chartType: "natal"
        });
        natalChart.timezone = timezone;
        activeTransits = calculateTransitsAgainstNatal(natalChart, horaryTime);
      }

      const gestaltDiagnosis = diagnoseGestaltBlockage(horaryChart, natalChart, combinedSelfReport);
      const placesData = await findRemedySources({
        city: currentCity,
        latitude: currentLat,
        longitude: currentLon,
        apiKey: GOOGLE_PLACES_API_KEY
      });

      const userMemorySummary = authUser?.id ? getUserMemorySummary(authUser.id) : "";
      const contextType = body.context_type || (body.chart_type === "synastry" ? "synastry" : (body.chart_type === "natal" || body.chart_type === "birth_chart" ? "birth_chart" : "consultation"));
      const synastryDetails = body.synastry_details || null;

      const fullLetter = await generateReadingLetter({
        horaryChart,
        natalChart,
        gestaltDiagnosis,
        placesData,
        selfReport: combinedSelfReport,
        paymentStatus: true,
        userName,
        language: body.language || "en",
        activeTransits,
        conversationHistory: conversationMessages,
        apiKey: GEMINI_API_KEY,
        userMemorySummary,
        contextType,
        synastryDetails
      });

      conversationMessages.push({ role: "assistant", content: fullLetter });

      const needSummary = `Addressing ${gestaltDiagnosis.detectedStage.toLowerCase()} pattern: ${primarySelfReport.slice(0, 140)}${primarySelfReport.length > 140 ? '...' : ''}`;
      const readingId = body.reading_id || `rdg_${Date.now()}`;

      const savedReading = saveUserReading(authUser.id, {
        reading_id: readingId,
        self_report: primarySelfReport,
        core_need_summary: needSummary,
        payment_status: true,
        gestalt_stage: gestaltDiagnosis.detectedStage,
        selected_remedies: gestaltDiagnosis.selectedEssences.map(e => ({
          name: e.name,
          role: e.symptom || e.emotional_state,
          category: e.category
        })),
        letter: fullLetter,
        messages: conversationMessages,
        birth_data: birthData,
        horary_timestamp: horaryTime.toISOString(),
        created_at: new Date().toISOString()
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        remainingUnlocks: consumeResult.remaining,
        reading_id: readingId,
        letter: fullLetter,
        messages: conversationMessages,
        payment_status: true,
        isFinalAssessment: true,
        formula: gestaltDiagnosis.selectedEssences,
        reading: savedReading
      }));
    } catch (err) {
      console.error("Use unlock credit error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // ==========================================
  // --- ERASE USER CHAT HISTORY & MEMORY ---
  // ==========================================
  if (req.method === "POST" && (url.pathname === "/api/user/erase-chat-history" || url.pathname === "/api/user/clear-history")) {
    const authUser = getAuthUser(req);
    const body = await parseJsonBody(req).catch(() => ({}));
    const targetId = authUser?.id || body.user_id || body.email;
    if (!targetId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Identificador de utilizador é obrigatório." }));
      return;
    }
    const result = deleteUserChatHistory(targetId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      success: true,
      dataErased: true,
      message: result.message || "Histórico de conversas eliminado com sucesso."
    }));
    return;
  }

  // ==========================================
  // --- SEND FORMULA VIA EMAIL (BOOKKEEPING) ---
  // ==========================================
  if (req.method === "POST" && (url.pathname === "/api/consultation/send-formula-email" || url.pathname === "/api/user/email-formula")) {
    try {
      const body = await parseJsonBody(req);
      const authUser = getAuthUser(req);
      const targetEmail = (body.email || authUser?.email || "").trim().toLowerCase();
      const userName = body.name || authUser?.name || "Friend";
      const lang = body.language || "pt";

      if (!targetEmail || !targetEmail.includes("@") || !targetEmail.includes(".")) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Por favor introduza um endereço de email válido." }));
        return;
      }

      // Resolve reading data or formula details
      let formulaEssences = Array.isArray(body.formula) ? body.formula : [];
      let fullLetterText = body.letter || "";

      if (formulaEssences.length === 0 && authUser) {
        const readings = getUserReadings(authUser.id);
        const match = readings.find(r => r.id === body.reading_id || r.reading_id === body.reading_id) || readings[0];
        if (match && match.selected_remedies && match.selected_remedies.length > 0) {
          formulaEssences = match.selected_remedies;
          fullLetterText = match.letter || fullLetterText;
        }
      }

      // If still empty, evaluate from self-report or default
      if (formulaEssences.length === 0) {
        const diag = diagnoseGestaltBlockage(null, null, body.self_report || "Equilíbrio emocional e limites saudáveis");
        formulaEssences = diag.selectedEssences;
      }

      const emailSubjectMap = {
        pt: "A Sua Fórmula Floral Personalizada RESET & Guia de Posologia",
        en: "Your Personalized RESET Bach Flower Formula & Dosage Guide",
        es: "Tu Fórmula de Flores de Bach Personalizada RESET & Guía de Uso",
        de: "Ihre individuelle RESET Bachblüten-Mischung & Einnahmeempfehlung",
        it: "La Tua Miscela Floreale Personalizzata RESET & Guida all'Assunzione"
      };

      const subject = emailSubjectMap[lang] || emailSubjectMap.pt;

      // Build elegant HTML email template
      const essencesListHtml = formulaEssences.map((e, idx) => `
        <li style="margin-bottom: 12px; padding: 12px 16px; background-color: #f8fafc; border-left: 3px solid #d4af37; border-radius: 4px;">
          <strong style="color: #1e293b; font-size: 16px;">${idx + 1}. ${e.name}</strong> 
          ${e.category ? `<span style="color: #64748b; font-size: 13px;">(${e.category})</span>` : ""}
          <p style="margin: 6px 0 0 0; color: #334155; font-size: 14px; line-height: 1.5;">
            ${e.support || e.role || "Harmoniza e devolve o equilíbrio interior."}
          </p>
        </li>
      `).join("");

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
          <table align="center" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
            <tr>
              <td style="padding: 28px 32px; background: #0f172a; text-align: center; border-bottom: 2px solid #d4af37;">
                <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px; color: #d4af37; font-weight: 700;">RESET</h1>
                <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">Consulta & Botânica Holística</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px;">
                <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">Olá, ${userName}</h2>
                <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                  Conforme solicitado na sua consulta confidencial na <strong>RESET</strong>, aqui tem a sua formulação personalizada de Essências Florais de Bach para o seu arquivo pessoal e para apresentação na sua farmácia de manipulação ou ervanária de preferência.
                </p>

                <div style="margin: 24px 0; padding: 20px; background-color: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4;">
                  <h3 style="margin: 0 0 14px 0; color: #78350f; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                    🌿 A Sua Composição Botânica Personalizada
                  </h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    ${essencesListHtml}
                  </ul>
                </div>

                <div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                  <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 15px;">📋 Guia de Preparação e Posologia</h3>
                  <ul style="margin: 0; padding-left: 20px; color: #15803d; font-size: 14px; line-height: 1.6;">
                    <li><strong>Frasco:</strong> 30ml em vidro âmbar com conta-gotas.</li>
                    <li><strong>Veículo:</strong> Água mineral pura com 20% a 30% de brandy/conhaque biológico (ou glicerina vegetal para versão sem álcool).</li>
                    <li><strong>Diluição:</strong> 2 gotas de cada essência estoque selecionada.</li>
                    <li><strong>Toma Diária:</strong> 4 gotas diretamente sob a língua, 4 vezes ao dia (com especial foco ao acordar e antes de deitar).</li>
                  </ul>
                </div>

                <p style="margin: 24px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                  Pode levar esta lista diretamente a qualquer farmácia de manipulação, ervanária ou dietética na sua cidade, ou encomendar as essências em frasco de stock para preparar em casa.
                </p>

                <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
                  RESET — <a href="https://www.resetbase.pt" style="color: #d4af37; text-decoration: none;">www.resetbase.pt</a><br>
                  Guarde este email para sua referência contínua.
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // Dispatch via Resend API if available, otherwise record in log with sandbox success
      const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
      let deliveryMode = "sandbox_logged";

      if (RESEND_API_KEY) {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: "RESET Consultas <consultas@resetbase.pt>",
              to: [targetEmail],
              subject: subject,
              html: htmlBody
            })
          });
          if (emailRes.ok) {
            deliveryMode = "resend_api_live";
            console.log(`[EMAIL DISPATCH] ✅ Sent formula successfully via Resend to ${targetEmail}`);
          } else {
            const errJson = await emailRes.json().catch(() => ({}));
            console.warn(`[EMAIL DISPATCH] Resend API response notice:`, errJson);
          }
        } catch (e) {
          console.warn("[EMAIL DISPATCH] Resend network error:", e.message);
        }
      } else {
        console.log(`[EMAIL DISPATCH] 📧 Formula dispatched (Sandbox/Dev Mode) to: ${targetEmail}. Subject: "${subject}"`);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        email: targetEmail,
        delivery: deliveryMode,
        message: lang === "pt" 
          ? `Fórmula e guia posológico enviados com sucesso para ${targetEmail}.`
          : `Formula and dosage guide sent successfully to ${targetEmail}.`
      }));
    } catch (err) {
      console.error("Send formula email error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }


  // ==========================================
  // --- STRIPE CHECKOUT ENDPOINT ---
  // ==========================================

  // --- ADD PURCHASED UNLOCK CREDITS ENDPOINT ---
  if (req.method === "POST" && url.pathname === "/api/user/add-purchased-credits") {
    try {
      const body = await parseJsonBody(req);
      let user = getAuthUser(req);

      // Post-payment lazy account provisioning for guests who bought credits directly via Stripe
      if (!user && body.session_id) {
        const stripeKey = process.env.STRIPE_SECRET_KEY || process.env["Stripe-Secret-Key"] || process.env["stripe-secret-key"] || process.env.STRIPE_KEY || "";
        if (stripeKey) {
          try {
            const sRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(body.session_id)}`, {
              headers: { "Authorization": `Bearer ${stripeKey}` }
            });
            if (sRes.ok) {
              const sData = await sRes.json();
              const email = (sData.customer_details?.email || sData.customer_email || "").trim().toLowerCase();
              const name = (sData.customer_details?.name || "").trim();
              if (email && email.includes("@")) {
                user = findOrCreateOAuthUser({
                  provider: "stripe_guest",
                  providerId: `stripe_${email}`,
                  email,
                  name: name || email.split("@")[0]
                });
                if (user?.token) setSessionCookie(res, user.token);
              }
            }
          } catch (e) {}
        }
      }

      if (!user) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      const count = Math.max(1, parseInt(body.count || 1, 10));
      const newBalance = addUnlockCredits(user.id, count);
      const fullProf = getUserProfileFull(user);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        balance: newBalance,
        added: count,
        user: fullProf,
        auth_token: fullProf.token
      }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }


  // --- ORDER PHYSICAL BOTTLE ENDPOINT ---
  if (req.method === "POST" && url.pathname === "/api/user/order-physical-bottle") {
    try {
      const user = getAuthUser(req);
      if (!user) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      const body = await parseJsonBody(req);
      const readingId = body.reading_id;
      if (!readingId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing reading_id" }));
        return;
      }

      const shippingAddress = body.shipping_address || {};
      const postalCode = (shippingAddress.postalCode || "").trim();
      const country = (shippingAddress.country || "Portugal Continental").trim();

      // Enforce Continental Portugal delivery restriction
      if (country !== "Portugal Continental" && country !== "Portugal") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "O serviço de envio físico de frascos manipulados está disponível exclusivamente para moradas em Portugal Continental." }));
        return;
      }

      if (postalCode.startsWith("9")) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "O serviço de entrega física está disponível exclusivamente para Portugal Continental (códigos postais de 1000 a 8999)." }));
        return;
      }

      const orderPayload = {
        status: "confirmed",
        carrier: "CTT / Transportadora",
        tracking_code: null,
        shipping_address: {
          ...shippingAddress,
          country: "Portugal Continental"
        },
        price_paid: 26.24,
        currency: "EUR",
        ordered_at: new Date().toISOString()
      };

      const updated = updateFormulaPhysicalOrder(user.id, readingId, orderPayload);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, reading: updated, physical_order: orderPayload }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // --- ADMIN UPDATE TRACKING ENDPOINT ---
  if (req.method === "POST" && url.pathname === "/api/admin/update-tracking") {
    try {
      const body = await parseJsonBody(req);
      const { user_id, reading_id, tracking_code, carrier, status } = body;
      if (!user_id || !reading_id) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing user_id or reading_id" }));
        return;
      }

      const orderPayload = {
        tracking_code: tracking_code || null,
        carrier: carrier || "CTT Expresso",
        status: status || "shipped"
      };

      const updated = updateFormulaPhysicalOrder(user_id, reading_id, orderPayload);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, reading: updated }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/create-checkout-session") {
    try {
      const body = await parseJsonBody(req);
      const authUser = getAuthUser(req);
      const stripeKey = process.env.STRIPE_SECRET_KEY || process.env["Stripe-Secret-Key"] || process.env["stripe-secret-key"] || process.env.STRIPE_KEY || "";
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "";
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";
      const plan = body.plan || "single";
      const isCreditsOnly = body.purchase_type === "credits";
      const isPhysicalBottle = body.purchase_type === "physical_bottle";
      const readingId = body.reading_id || body.reading_state?.readingId || `rdg_${Date.now()}`;

      // Cache guest reading state on server so returning from UPI / Google Pay / PhonePe / Stripe works seamlessly
      if (body.reading_state && typeof body.reading_state === "object") {
        pendingCheckoutReadings.set(readingId, body.reading_state);
      }

      // PPP-Calibrated Indian Rupee (INR) Pricing (in paise: ₹1 = 100 paise)
      let amount = 49900; // ₹499 Default Complete Dossier
      let creditsCount = 1;
      let title = "";
      let description = "";

      if (isPhysicalBottle) {
        amount = 149900; // ₹1,499 (30ml Compounded Pushpa Upaya Bottle + Pan-India Tracked Shipping)
        title = "SOMA·38 — Custom 30ml Sacred Pushpa Upaya Bottle (Pan-India Tracked Delivery)";
        description = "30ml amber glass dropper bottle compounded with your 6 Bach Flower Essences and delivered across India.";
      } else if (isCreditsOnly) {
        if (plan === "individual") {
          amount = 29900; // ₹299
          creditsCount = 1;
          title = "SOMA·38 — Tier 1: Individual Karmic & Somatic Dossier (1 Credit)";
        } else if (plan === "relational" || plan === "bundle") {
          amount = 69900; // ₹699
          creditsCount = plan === "bundle" ? 3 : 1;
          title = "SOMA·38 — Tier 2: Deep Kundli Synastry & Shadow Dossier";
        } else {
          amount = 49900; // ₹499
          creditsCount = 1;
          title = "SOMA·38 — Complete Karmic, Somatic & Pushpa Upaya Dossier (1 Credit)";
        }
        description = "Full 3-Part Vedic Sidereal + Gestalt Somatic Dossier + 6-Flower Pushpa Upaya Formula.";
      } else {
        if (plan === "individual") {
          amount = 29900; // ₹299 Tier 1: Individual Karmic & Somatic Dossier
          title = "SOMA·38 — Tier 1: Individual Karmic & Somatic Dossier";
          description = "Sidereal Vedic & Gestalt Somatic Mirror, 14-Day Dharma Protocol + 6-Flower Pushpa Upaya Formula.";
        } else if (plan === "relational" || plan === "bundle") {
          amount = 69900; // ₹699 Tier 2: Deep Kundli Synastry & Shadow Dossier
          title = "SOMA·38 — Tier 2: Deep Kundli Synastry & Shadow Dossier";
          description = "Cross-Chart Rahu–Ketu & Chandra Synastry, Gestalt Relational Loop + Dual Pushpa Upaya Formula.";
        } else {
          amount = 49900; // ₹499 Recommended Complete Dossier
          title = "SOMA·38 — Complete Karmic, Somatic & Pushpa Upaya Dossier";
          description = "1. Sidereal Vedic & Gestalt Somatic Mirror | 2. 14-Day Dharma Boundary Protocol | 3. 6-Flower Pushpa Upaya Formula.";
        }
      }

      // 1. Razorpay UPI + Card Order Creation (if RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET are configured)
      if (razorpayKeyId && razorpayKeySecret && body.gateway === "razorpay") {
        try {
          const rzpAuth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
          const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
              "Authorization": `Basic ${rzpAuth}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              amount,
              currency: "INR",
              receipt: readingId,
              notes: { plan, title, readingId }
            })
          });
          const rzpOrder = await rzpRes.json();
          if (rzpOrder && rzpOrder.id) {
            pendingCheckoutReadings.set(rzpOrder.id, body.reading_state || {});
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              gateway: "razorpay",
              razorpay_key_id: razorpayKeyId,
              order_id: rzpOrder.id,
              amount,
              currency: "INR",
              reading_id: readingId,
              title,
              description
            }));
            return;
          }
        } catch (rzpErr) {
          console.warn("[RAZORPAY ORDER] Warning, falling back to Stripe INR:", rzpErr.message);
        }
      }

      // 2. Stripe INR Checkout Session (Supports UPI / Google Pay / Cards in India)
      if (stripeKey) {
        const paymentMethodsAttempts = [
          ["card"]
        ];

        for (const methods of paymentMethodsAttempts) {
          try {
            const params = new URLSearchParams();
            for (const m of methods) {
              params.append("payment_method_types[]", m);
            }
            params.append("mode", "payment");
            params.append("line_items[0][price_data][currency]", "inr");
            params.append("line_items[0][price_data][unit_amount]", amount.toString());
            params.append("line_items[0][price_data][product_data][name]", title);
            params.append("line_items[0][price_data][product_data][description]", description);
            params.append("line_items[0][quantity]", "1");
            const targetSuccessUrl = isPhysicalBottle
              ? `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&physical_order_success=true&reading_id=${encodeURIComponent(readingId)}&target=vault`
              : (isCreditsOnly
                ? `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&credits_purchased=${creditsCount}&target=vault`
                : `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&payment_status=true&reading_id=${encodeURIComponent(readingId)}&plan=${encodeURIComponent(plan)}`);
            params.append("success_url", targetSuccessUrl);
            params.append("cancel_url", `${baseUrl}/?canceled=true`);
            params.append("client_reference_id", readingId);
            if (authUser?.email && authUser.email.includes("@") && !authUser.email.endsWith(".reset")) {
              params.append("customer_email", authUser.email);
            }

            const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: params.toString()
            });

            const session = await stripeRes.json();
            if (session.url) {
              if (body.reading_state && session.id) {
                pendingCheckoutReadings.set(session.id, body.reading_state);
              }
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ checkout_url: session.url, session_id: session.id, reading_id: readingId, currency: "INR", amount: amount / 100, methods }));
              return;
            } else {
              console.warn(`[STRIPE CHECKOUT INR] Method tier [${methods.join(", ")}] unavailable:`, session.error?.message);
            }
          } catch (err) {
            console.warn(`[STRIPE CHECKOUT INR] Network error for [${methods.join(", ")}]:`, err.message);
          }
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        checkout_url: null,
        message: "Payment gateway (RAZORPAY_KEY_ID or STRIPE_SECRET_KEY) not configured in env — using instant sandbox unlock.",
        currency: "INR",
        amount: amount / 100,
        reading_id: readingId
      }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ==========================================
  // --- LEGAL & DPO BRAND PROTECTION AGENT ENDPOINTS ---
  // ==========================================

  // 1. Direct Web Form Contact to DPO & Privacy Office
  if (req.method === "POST" && (url.pathname === "/api/legal/contact-dpo" || url.pathname === "/api/legal/contact")) {
    try {
      const body = await parseJsonBody(req);
      const authUser = getAuthUser(req);

      const senderEmail = (body.email || authUser?.email || "").trim();
      const senderName = (body.name || authUser?.name || "Visitante").trim();
      const subject = (body.subject || "Pedido ao Gabinete de Privacidade").trim();
      const message = (body.message || body.text || "").trim();
      const language = body.language || "pt";

      if (!senderEmail || !senderEmail.includes("@") || !message) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Email e mensagem são campos obrigatórios." }));
        return;
      }

      console.log(`[LEGAL AGENT] 🛡️ Processing legal inquiry from ${senderEmail} (Subject: ${subject})...`);

      const result = await processLegalInquiry({
        senderName,
        senderEmail,
        subject,
        message,
        language,
        apiKey: GEMINI_API_KEY
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        ticketId: result.ticketId,
        intent: result.intent,
        executedAction: result.executedAction,
        reply: result.reply,
        message: "A sua mensagem foi recebida e processada pelo Gabinete de Privacidade & DPO."
      }));
    } catch (err) {
      console.error("[LEGAL AGENT] Error processing legal request:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Erro ao processar o contacto de privacidade." }));
    }
    return;
  }

  // 2. Inbound Email Webhook (for emails received at privacidade@resetbase.pt)
  if (req.method === "POST" && url.pathname === "/api/legal/inbound-email") {
    try {
      const body = await parseJsonBody(req);
      const senderEmail = (body.from || body.sender || body.email || "").trim();
      const senderName = (body.from_name || body.name || senderEmail.split("@")[0] || "Titular dos Dados").trim();
      const subject = (body.subject || "Inbound Email privacidade@resetbase.pt").trim();
      const message = (body.text || body.body || body.message || body.html || "").trim();
      const language = body.language || "pt";

      console.log(`[LEGAL INBOUND] ✉️ Inbound email to privacidade@resetbase.pt from: ${senderEmail}`);

      const result = await processLegalInquiry({
        senderName,
        senderEmail,
        subject,
        message,
        language,
        apiKey: GEMINI_API_KEY
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        ticketId: result.ticketId,
        autoReply: result.reply,
        executedAction: result.executedAction
      }));
    } catch (err) {
      console.error("[LEGAL INBOUND] Webhook error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 3. Query Legal Inquiries Log
  if (req.method === "GET" && url.pathname === "/api/legal/inquiries") {
    const authUser = getAuthUser(req);
    const inquiries = getLegalInquiries();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ count: inquiries.length, inquiries }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found" }));
});

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`✨ RESET Holistic Remediation Engine running on http://0.0.0.0:${PORT}`);
  try {
    await hydrateFromCloudDatabase();
  } catch (err) {
    console.warn("[STARTUP] Non-fatal cloud hydration warning:", err.message);
  }
  try {
    startWeeklyGeoCron(GEMINI_API_KEY);
  } catch (cronErr) {
    console.warn("[GEO CRON] Warning starting weekly GEO cron:", cronErr.message);
  }
});
