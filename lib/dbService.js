import { castChart, generateCoreTraitsAnalysis, resolveBirthUtcDate } from "./ephemeris.js";

export const MAX_SESSIONS_PER_USER = 15;

/**
 * Add a new session token to user.tokens array without kicking out other active devices
 */
export function issueUserSessionToken(user) {
  if (!user) return null;
  const newToken = `tok_${crypto.randomBytes(32).toString("hex")}`;
  if (!Array.isArray(user.tokens)) {
    user.tokens = user.token ? [user.token] : [];
  }
  // Add new token to beginning
  user.tokens.unshift(newToken);
  // Keep up to MAX_SESSIONS_PER_USER active device sessions
  if (user.tokens.length > MAX_SESSIONS_PER_USER) {
    user.tokens = user.tokens.slice(0, MAX_SESSIONS_PER_USER);
  }
  // Backward compatibility
  user.token = newToken;
  return newToken;
}

/**
 * Invalidate a single device session token upon explicit logout
 */
export function revokeUserSessionToken(userId, token) {
  if (!userId || !token) return false;
  const cleanToken = token.replace("Bearer ", "").trim();
  const user = usersMap.get(userId);
  if (!user) return false;

  if (Array.isArray(user.tokens)) {
    user.tokens = user.tokens.filter(t => t !== cleanToken);
  }
  if (user.token === cleanToken) {
    user.token = user.tokens?.[0] || "";
  }
  saveUsersToDisk();
  syncUserToCloud(user);
  return true;
}

/**
 * User Authentication & Consultation Storage Engine
 * Handles user profiles, password hashing, session tokens,
 * Google OAuth, WhatsApp, Email/Password, and permanent consultation archives.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const READINGS_FILE = path.join(DATA_DIR, "user_readings.json");

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "";
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "";

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (e) {
    console.error(`Error loading ${filePath}:`, e.message);
  }
  return fallback;
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error(`Error saving ${filePath}:`, e.message);
  }
}

// In-memory canonical maps
// usersMap: Map<userId, UserObject>
const usersMap = new Map();
let readings = loadJson(READINGS_FILE, {});

/**
 * Clean & normalize phone numbers to E.164 without spaces/dashes
 */
function cleanPhoneNumber(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^0-9+]/g, "").trim();
  return cleaned;
}

/**
 * Check if a name is a meaningful real name (not generic placeholder)
 */
function isRealName(name) {
  if (!name || typeof name !== "string") return false;
  const t = name.trim();
  if (t.length < 2) return false;
  const lower = t.toLowerCase();
  if (lower === "friend" || lower === "amigo" || lower === "amigo(a)" || lower === "user" || lower === "membro reset" || lower === "apple member" || lower === "google member") {
    return false;
  }
  if (lower.startsWith("user ") || lower.startsWith("utilizador ") || lower.startsWith("member ")) {
    return false;
  }
  return true;
}

/**
 * Check if an email is a real email (not a synthetic fallback like @whatsapp.reset)
 */
function isRealEmail(email) {
  if (!email || typeof email !== "string") return false;
  const t = email.trim().toLowerCase();
  if (!t.includes("@") || !t.includes(".")) return false;
  if (t.endsWith("@whatsapp.reset") || t.endsWith("@mobile.reset")) {
    return false;
  }
  return true;
}

/**
 * Migrate legacy flat/nested users.json into canonical usersMap
 */
function initializeAndMigrateUsers() {
  const raw = loadJson(USERS_FILE, {});
  usersMap.clear();

  for (const [key, u] of Object.entries(raw)) {
    if (!u || typeof u !== "object") continue;
    const userId = u.id || (key.startsWith("usr_") ? key : `usr_${crypto.randomUUID()}`);
    
    if (!usersMap.has(userId)) {
      const initialTokens = Array.isArray(u.tokens) && u.tokens.length > 0
        ? u.tokens
        : (u.token ? [u.token] : [`tok_${crypto.randomBytes(32).toString("hex")}`]);
      usersMap.set(userId, {
        id: userId,
        name: isRealName(u.name) ? u.name.trim() : (u.name || "Friend"),
        email: isRealEmail(u.email) ? u.email.trim().toLowerCase() : (u.email || ""),
        phone: cleanPhoneNumber(u.phone),
        provider: u.provider || "password",
        providerId: u.providerId || "",
        google_linked: !!(u.google_linked || u.provider === "google" || (u.providerId && u.providerId.startsWith("goog_"))),
        whatsapp_linked: !!(u.whatsapp_linked || u.provider === "whatsapp" || (u.providerId && u.providerId.startsWith("wa_")) || (u.phone && u.phone.length >= 7)),
        password_hash: u.password_hash || null,
        token: initialTokens[0],
        tokens: initialTokens,
        created_at: u.created_at || new Date().toISOString(),
        profile: u.profile || { birthDate: "", birthTime: "", birthCity: "" },
        unlocks_balance: typeof u.unlocks_balance === "number" ? u.unlocks_balance : 0
      });
    } else {
      const existing = usersMap.get(userId);
      if (isRealName(u.name) && !isRealName(existing.name)) {
        existing.name = u.name.trim();
      }
      if (isRealEmail(u.email) && !isRealEmail(existing.email)) {
        existing.email = u.email.trim().toLowerCase();
      }
      if (u.phone && u.phone.length >= 6 && (!existing.phone || existing.phone.length < 6)) {
        existing.phone = cleanPhoneNumber(u.phone);
      }
      if (u.google_linked || u.provider === "google") existing.google_linked = true;
      if (u.whatsapp_linked || u.provider === "whatsapp") existing.whatsapp_linked = true;
      if (u.password_hash && !existing.password_hash) existing.password_hash = u.password_hash;
      if (u.profile?.birthDate && !existing.profile?.birthDate) existing.profile = { ...u.profile };
      if (typeof u.unlocks_balance === "number") existing.unlocks_balance = u.unlocks_balance;
    }
  }

  saveUsersToDisk();
}

function saveUsersToDisk() {
  const exportObj = {};
  for (const [id, user] of usersMap.entries()) {
    exportObj[id] = user;
  }
  saveJson(USERS_FILE, exportObj);
}

// Run initial migration
initializeAndMigrateUsers();

async function syncUserToCloud(user) {
  if (!FIREBASE_PROJECT_ID || !user || !user.id) return;
  try {
    const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/users/${encodeURIComponent(user.id)}?key=${encodeURIComponent(FIREBASE_API_KEY)}`;
    await fetch(docUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          data: { stringValue: JSON.stringify(user) },
          updated_at: { stringValue: new Date().toISOString() }
        }
      })
    });
  } catch (e) {
    // Non-blocking background sync
  }
}

async function syncReadingsToCloud(userId, userReadings) {
  if (!FIREBASE_PROJECT_ID || !userId) return;
  try {
    const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/user_readings/${encodeURIComponent(userId)}?key=${encodeURIComponent(FIREBASE_API_KEY)}`;
    await fetch(docUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          data: { stringValue: JSON.stringify(userReadings) },
          updated_at: { stringValue: new Date().toISOString() }
        }
      })
    });
  } catch (e) {
    // Non-blocking background sync
  }
}

export async function hydrateFromCloudDatabase() {
  if (!FIREBASE_PROJECT_ID) return;
  try {
    const usersUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/users?key=${encodeURIComponent(FIREBASE_API_KEY)}&pageSize=500`;
    const res = await fetch(usersUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && data.documents.length > 0) {
        let count = 0;
        for (const doc of data.documents) {
          if (doc.fields?.data?.stringValue) {
            try {
              const u = JSON.parse(doc.fields.data.stringValue);
              if (u && u.id) {
                if (usersMap.has(u.id)) {
                  const local = usersMap.get(u.id);
                  if (isRealName(u.name) && !isRealName(local.name)) local.name = u.name;
                  if (isRealEmail(u.email) && !isRealEmail(local.email)) local.email = u.email;
                  if (u.phone && !local.phone) local.phone = u.phone;
                  if (u.google_linked) local.google_linked = true;
                  if (u.whatsapp_linked) local.whatsapp_linked = true;
                  if (u.profile?.birthDate && !local.profile?.birthDate) local.profile = u.profile;
                  if (Array.isArray(u.savedCharts) && u.savedCharts.length > 0) local.savedCharts = u.savedCharts;
                } else {
                  usersMap.set(u.id, u);
                }
                count++;
              }
            } catch (err) {}
          }
        }
        if (count > 0) {
          saveUsersToDisk();
          console.log(`[DB] ☁️ Hydrated ${count} user profiles from Cloud Firestore`);
        }
      }
    }

    // Hydrate User Readings & History
    const readingsUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/user_readings?key=${encodeURIComponent(FIREBASE_API_KEY)}&pageSize=500`;
    const rRes = await fetch(readingsUrl);
    if (rRes.ok) {
      const rData = await rRes.json();
      if (rData.documents && rData.documents.length > 0) {
        let rCount = 0;
        for (const doc of rData.documents) {
          const docId = doc.name.split("/").pop();
          if (doc.fields?.data?.stringValue && docId) {
            try {
              const list = JSON.parse(doc.fields.data.stringValue);
              if (Array.isArray(list)) {
                readings[docId] = list.slice(0, 30);
                rCount++;
              }
            } catch (err) {}
          }
        }
        if (rCount > 0) {
          saveJson(READINGS_FILE, readings);
          console.log(`[DB] ☁️ Hydrated readings for ${rCount} users from Cloud Firestore (limit: 30 each)`);
        }
      }
    }
  } catch (e) {
    // Graceful startup
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

/**
 * Intelligent Unified Lookup: Find user by ID, email, phone, token, or providerId
 */
export function findUserRecord({ id, email, phone, token, providerId } = {}) {
  if (id && usersMap.has(id)) {
    return usersMap.get(id);
  }

  const cleanEmail = email ? email.trim().toLowerCase() : "";
  const cleanPhone = cleanPhoneNumber(phone);
  const cleanToken = token ? token.replace("Bearer ", "").trim() : "";

  for (const user of usersMap.values()) {
    if (id && user.id === id) return user;
    if (cleanToken && ((Array.isArray(user.tokens) && user.tokens.includes(cleanToken)) || user.token === cleanToken)) return user;
    if (cleanEmail && user.email && user.email.toLowerCase() === cleanEmail) return user;
    if (cleanPhone && user.phone && cleanPhoneNumber(user.phone) === cleanPhone) return user;
    if (providerId && user.providerId === providerId) return user;
  }

  return null;
}

/**
 * Merge two distinct user records into one canonical user and migrate readings
 */
function mergeUserRecords(targetUser, sourceUser) {
  if (!targetUser || !sourceUser || targetUser.id === sourceUser.id) return targetUser;

  // Preserve real name
  if (isRealName(sourceUser.name) && !isRealName(targetUser.name)) {
    targetUser.name = sourceUser.name;
  }

  // Preserve real email
  if (isRealEmail(sourceUser.email) && !isRealEmail(targetUser.email)) {
    targetUser.email = sourceUser.email;
  }

  // Preserve phone
  if (sourceUser.phone && (!targetUser.phone || targetUser.phone.length < 6)) {
    targetUser.phone = cleanPhoneNumber(sourceUser.phone);
  }

  // Preserve linked flags
  if (sourceUser.google_linked || sourceUser.provider === "google") {
    targetUser.google_linked = true;
  }
  if (sourceUser.whatsapp_linked || sourceUser.provider === "whatsapp") {
    targetUser.whatsapp_linked = true;
  }
  if (sourceUser.providerId && !targetUser.providerId) {
    targetUser.providerId = sourceUser.providerId;
  }
  if (sourceUser.password_hash && !targetUser.password_hash) {
    targetUser.password_hash = sourceUser.password_hash;
  }

  // Preserve birth chart profile
  if (sourceUser.profile?.birthDate && !targetUser.profile?.birthDate) {
    targetUser.profile = { ...sourceUser.profile };
  }

  // Merge Unlocks balance
  const balSource = typeof sourceUser.unlocks_balance === "number" ? sourceUser.unlocks_balance : 0;
  const balTarget = typeof targetUser.unlocks_balance === "number" ? targetUser.unlocks_balance : 0;
  targetUser.unlocks_balance = balTarget + balSource;

  // Preserve and merge all session tokens so existing device sessions never get 401 Unauthorized!
  if (!Array.isArray(targetUser.tokens)) {
    targetUser.tokens = targetUser.token ? [targetUser.token] : [];
  }
  if (Array.isArray(sourceUser.tokens)) {
    for (const t of sourceUser.tokens) {
      if (t && !targetUser.tokens.includes(t)) targetUser.tokens.push(t);
    }
  }
  if (sourceUser.token && !targetUser.tokens.includes(sourceUser.token)) {
    targetUser.tokens.push(sourceUser.token);
  }

  // Migrate readings & purchased formulas from sourceUser to targetUser
  if (readings[sourceUser.id] && readings[sourceUser.id].length > 0) {
    if (!readings[targetUser.id]) readings[targetUser.id] = [];
    for (const item of readings[sourceUser.id]) {
      const exists = readings[targetUser.id].some(r => r.id === item.id || r.reading_id === item.reading_id);
      if (!exists) {
        readings[targetUser.id].push(item);
      }
    }
    delete readings[sourceUser.id];
    saveJson(READINGS_FILE, readings);
    syncReadingsToCloud(targetUser.id, readings[targetUser.id]);
  }

  // Remove sourceUser from Map
  usersMap.delete(sourceUser.id);
  saveUsersToDisk();
  syncUserToCloud(targetUser);

  return targetUser;
}

export function checkUserExists(identifier) {
  if (!identifier) return { exists: false };
  const user = findUserRecord({ email: identifier, phone: identifier, id: identifier });
  if (user) {
    return {
      exists: true,
      provider: user.provider || "password",
      name: isRealName(user.name) ? user.name : "Friend",
      email: isRealEmail(user.email) ? user.email : "",
      phone: user.phone || "",
      google_linked: !!user.google_linked,
      whatsapp_linked: !!user.whatsapp_linked,
      hasPassword: !!user.password_hash
    };
  }
  return { exists: false };
}

export function registerUser({ identifier, email, phone, password, name, profile, savedCharts }) {
  const rawEmail = email || (identifier && identifier.includes("@") ? identifier : "");
  const rawPhone = phone || (identifier && !identifier.includes("@") ? identifier : "");
  const cleanPhone = cleanPhoneNumber(rawPhone);
  const cleanEmail = rawEmail.trim().toLowerCase();

  let user = findUserRecord({ email: cleanEmail, phone: cleanPhone });

  if (user) {
    if (user.password_hash && password) {
      if (verifyPassword(password, user.password_hash)) {
        if (isRealName(name) && !isRealName(user.name)) user.name = name.trim();
        if (profile?.birthDate && !user.profile?.birthDate) user.profile = { ...user.profile, ...profile };
        if (Array.isArray(savedCharts) && savedCharts.length > 0) {
          if (!Array.isArray(user.savedCharts)) user.savedCharts = [];
          for (const sc of savedCharts) {
            if (!user.savedCharts.some(e => e.id === sc.id || (e.name === sc.name && e.birthDate === sc.birthDate))) user.savedCharts.push(sc);
          }
        }
        issueUserSessionToken(user);
        saveUsersToDisk();
        syncUserToCloud(user);
        return getUserProfileFull(user);
      } else {
        const err = new Error("Já existe uma conta associada a este email/telemóvel. Por favor inicie sessão com a sua palavra-passe.");
        err.code = "account_exists";
        throw err;
      }
    } else if (!user.password_hash && password) {
      user.password_hash = hashPassword(password);
      if (isRealName(name)) user.name = name.trim();
      if (profile?.birthDate && !user.profile?.birthDate) user.profile = { ...user.profile, ...profile };
      if (Array.isArray(savedCharts) && savedCharts.length > 0) {
        if (!Array.isArray(user.savedCharts)) user.savedCharts = [];
        for (const sc of savedCharts) {
          if (!user.savedCharts.some(e => e.id === sc.id || (e.name === sc.name && e.birthDate === sc.birthDate))) user.savedCharts.push(sc);
        }
      }
      issueUserSessionToken(user);
      saveUsersToDisk();
      syncUserToCloud(user);
      return getUserProfileFull(user);
    } else {
      if (isRealName(name) && !isRealName(user.name)) user.name = name.trim();
      if (profile?.birthDate && !user.profile?.birthDate) user.profile = { ...user.profile, ...profile };
      if (Array.isArray(savedCharts) && savedCharts.length > 0) {
        if (!Array.isArray(user.savedCharts)) user.savedCharts = [];
        for (const sc of savedCharts) {
          if (!user.savedCharts.some(e => e.id === sc.id || (e.name === sc.name && e.birthDate === sc.birthDate))) user.savedCharts.push(sc);
        }
      }
      issueUserSessionToken(user);
      saveUsersToDisk();
      syncUserToCloud(user);
      return getUserProfileFull(user);
    }
  }

  const userId = `usr_${crypto.randomUUID()}`;
  const token = `tok_${crypto.randomBytes(32).toString("hex")}`;
  const effectiveName = isRealName(name) ? name.trim() : (cleanEmail ? cleanEmail.split("@")[0] : "Friend");

  const newUser = {
    id: userId,
    email: cleanEmail || (cleanPhone ? `${cleanPhone}@mobile.reset` : ""),
    phone: cleanPhone,
    name: effectiveName,
    password_hash: password ? hashPassword(password) : null,
    provider: cleanEmail ? "password" : "phone",
    providerId: "",
    google_linked: false,
    whatsapp_linked: !!cleanPhone,
    token,
    tokens: [token],
    created_at: new Date().toISOString(),
    profile: (profile && profile.birthDate) ? { ...profile } : { birthDate: "", birthTime: "", birthCity: "" },
    savedCharts: Array.isArray(savedCharts) ? [...savedCharts] : [],
    unlocks_balance: 0
  };

  usersMap.set(userId, newUser);
  saveUsersToDisk();
  syncUserToCloud(newUser);

  return getUserProfileFull(newUser);
}

export function loginUser({ identifier, email, password, name, profile, savedCharts }) {
  const raw = identifier || email;
  if (!raw) {
    const err = new Error("Email ou telemóvel é obrigatório.");
    err.code = "missing_fields";
    throw err;
  }

  const isEmail = raw.includes("@");
  const cleanEmail = isEmail ? raw.trim().toLowerCase() : "";
  const cleanPhone = !isEmail ? cleanPhoneNumber(raw) : "";

  let user = findUserRecord({ email: cleanEmail, phone: cleanPhone });

  // SMART AUTO-ONBOARDING: If no user found, auto-create account & log in seamlessly!
  if (!user) {
    return registerUser({
      identifier: raw,
      email: cleanEmail,
      phone: cleanPhone,
      password: password || "Password123!",
      name: name || (cleanEmail ? cleanEmail.split("@")[0] : "Friend"),
      profile,
      savedCharts
    });
  }

  if (user.password_hash && password) {
    if (!verifyPassword(password, user.password_hash)) {
      const err = new Error("Palavra-passe incorreta. Por favor verifique e tente novamente.");
      err.code = "invalid_password";
      throw err;
    }
  } else if (!user.password_hash && password) {
    user.password_hash = hashPassword(password);
  }

  if (isRealName(name) && !isRealName(user.name)) {
    user.name = name.trim();
  }

  // Merge birth profile if user has none
  if (profile?.birthDate && !user.profile?.birthDate) {
    user.profile = { ...user.profile, ...profile };
  }
  if (Array.isArray(savedCharts) && savedCharts.length > 0) {
    if (!Array.isArray(user.savedCharts)) user.savedCharts = [];
    for (const sc of savedCharts) {
      if (!user.savedCharts.some(e => e.id === sc.id || (e.name === sc.name && e.birthDate === sc.birthDate))) user.savedCharts.push(sc);
    }
  }

  issueUserSessionToken(user);
  saveUsersToDisk();
  syncUserToCloud(user);

  return getUserProfileFull(user);
}

export function findOrCreateOAuthUser({ provider, email, name, providerId, authUserId, profile, savedCharts }) {
  const cleanEmail = email ? email.trim().toLowerCase() : "";
  let user = null;

  // 1. If currently authenticated user is linking Google
  if (authUserId && usersMap.has(authUserId)) {
    user = usersMap.get(authUserId);
  }

  // 2. Look up by email or providerId
  if (!user && (cleanEmail || providerId)) {
    user = findUserRecord({ email: cleanEmail, providerId });
  }

  if (!user) {
    const userId = `usr_${crypto.randomUUID()}`;
    const token = `tok_${crypto.randomBytes(32).toString("hex")}`;

    user = {
      id: userId,
      email: cleanEmail,
      name: isRealName(name) ? name.trim() : (cleanEmail ? cleanEmail.split("@")[0] : "Friend"),
      provider: provider || "google",
      providerId: providerId || "",
      google_linked: true,
      whatsapp_linked: false,
      password_hash: null,
      token,
      tokens: [token],
      created_at: new Date().toISOString(),
      profile: (profile && profile.birthDate) ? { ...profile } : { birthDate: "", birthTime: "", birthCity: "" },
      savedCharts: Array.isArray(savedCharts) ? [...savedCharts] : [],
      unlocks_balance: 0
    };

    usersMap.set(userId, user);
  } else {
    // User exists -> Issue new device session token without kicking out other devices
    issueUserSessionToken(user);
    if (providerId) user.providerId = providerId;
    if (provider === "google") user.google_linked = true;
    if (isRealEmail(cleanEmail)) user.email = cleanEmail;
    if (isRealName(name) && (!isRealName(user.name) || user.name === "Friend")) {
      user.name = name.trim();
    }
    // Merge guest profile if user profile has none
    if (profile?.birthDate && !user.profile?.birthDate) {
      user.profile = { ...user.profile, ...profile };
    }
    if (Array.isArray(savedCharts) && savedCharts.length > 0) {
      if (!Array.isArray(user.savedCharts)) user.savedCharts = [];
      for (const sc of savedCharts) {
        if (!user.savedCharts.some(e => e.id === sc.id || (e.name === sc.name && e.birthDate === sc.birthDate))) user.savedCharts.push(sc);
      }
    }
  }

  saveUsersToDisk();
  syncUserToCloud(user);

  return user;
}

export function findOrCreateWhatsAppUser({ phone, name, authUserId, profile, savedCharts }) {
  const cleanPhone = cleanPhoneNumber(phone);
  let user = null;

  if (authUserId && usersMap.has(authUserId)) {
    user = usersMap.get(authUserId);
  }

  if (!user && cleanPhone) {
    user = findUserRecord({ phone: cleanPhone });
  }

  if (!user) {
    const userId = `usr_${crypto.randomUUID()}`;
    const token = `tok_${crypto.randomBytes(32).toString("hex")}`;
    const fallbackEmail = cleanPhone ? `${cleanPhone}@whatsapp.reset` : "";

    user = {
      id: userId,
      email: fallbackEmail,
      phone: cleanPhone,
      name: isRealName(name) ? name.trim() : (cleanPhone || "Friend"),
      provider: "whatsapp",
      providerId: cleanPhone ? `wa_${cleanPhone}` : "",
      google_linked: false,
      whatsapp_linked: true,
      password_hash: null,
      token,
      tokens: [token],
      created_at: new Date().toISOString(),
      profile: (profile && profile.birthDate) ? { ...profile } : { birthDate: "", birthTime: "", birthCity: "" },
      savedCharts: Array.isArray(savedCharts) ? [...savedCharts] : [],
      unlocks_balance: 0
    };

    usersMap.set(userId, user);
  } else {
    issueUserSessionToken(user);
    user.whatsapp_linked = true;
    if (cleanPhone) user.phone = cleanPhone;
    if (isRealName(name) && (!isRealName(user.name) || user.name === "Friend")) {
      user.name = name.trim();
    }
    if (profile?.birthDate && !user.profile?.birthDate) {
      user.profile = { ...user.profile, ...profile };
    }
    if (Array.isArray(savedCharts) && savedCharts.length > 0) {
      if (!Array.isArray(user.savedCharts)) user.savedCharts = [];
      for (const sc of savedCharts) {
        if (!user.savedCharts.some(e => e.id === sc.id || (e.name === sc.name && e.birthDate === sc.birthDate))) user.savedCharts.push(sc);
      }
    }
  }

  saveUsersToDisk();
  syncUserToCloud(user);
  return user;
}

export function findOrCreatePhoneUser(args) {
  return findOrCreateWhatsAppUser(args);
}

export function linkWhatsAppProvider(userId, { phone, name }) {
  const cleanPhone = cleanPhoneNumber(phone);
  const user = usersMap.get(userId);
  if (!user) return null;

  // Check if another user record already has this phone -> merge them
  const existingPhoneUser = findUserRecord({ phone: cleanPhone });
  if (existingPhoneUser && existingPhoneUser.id !== userId) {
    mergeUserRecords(user, existingPhoneUser);
  }

  user.phone = cleanPhone;
  user.whatsapp_linked = true;
  if (isRealName(name) && (!isRealName(user.name) || user.name === "Friend" || user.name.startsWith("User "))) {
    user.name = name.trim();
  }

  saveUsersToDisk();
  syncUserToCloud(user);
  return getUserProfileFull(user);
}

export function linkOAuthProvider(userId, { provider, email, providerId, name }) {
  const user = usersMap.get(userId);
  if (!user) return null;

  const cleanEmail = email ? email.trim().toLowerCase() : "";

  // Check if another user record already has this email -> merge them
  if (cleanEmail) {
    const existingEmailUser = findUserRecord({ email: cleanEmail });
    if (existingEmailUser && existingEmailUser.id !== userId) {
      mergeUserRecords(user, existingEmailUser);
    }
  }

  if (provider === "google") user.google_linked = true;
  if (providerId) user.providerId = providerId;
  if (isRealEmail(cleanEmail)) user.email = cleanEmail;
  if (isRealName(name) && (!isRealName(user.name) || user.name === "Friend")) {
    user.name = name.trim();
  }

  saveUsersToDisk();
  syncUserToCloud(user);
  return getUserProfileFull(user);
}

export function getUserByToken(token) {
  if (!token) return null;
  const cleanToken = token.replace("Bearer ", "").trim();
  for (const user of usersMap.values()) {
    if ((Array.isArray(user.tokens) && user.tokens.includes(cleanToken)) || user.token === cleanToken) {
      return user;
    }
  }
  return null;
}

export function updateUserProfile(userId, profileData) {
  const user = usersMap.get(userId);
  if (!user) return null;

  user.profile = {
    ...user.profile,
    ...profileData
  };
  saveUsersToDisk();
  syncUserToCloud(user);
  return user.profile;
}

export function updateUserAccountDetails(userId, { name, email, phone, password }) {
  let user = usersMap.get(userId);
  if (!user) return null;

  // 1. Name update: allow user to change to ANY name they want
  if (name !== undefined && typeof name === "string" && name.trim().length > 0) {
    user.name = name.trim();
  }

  // 2. Email update: if email is in use by another account, merge seamlessly!
  if (email !== undefined) {
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    if (cleanEmail && isRealEmail(cleanEmail)) {
      const existing = findUserRecord({ email: cleanEmail });
      if (existing && existing.id !== user.id) {
        user = mergeUserRecords(user, existing);
      }
      user.email = cleanEmail;
    } else if (cleanEmail === "") {
      user.email = "";
    }
  }

  // 3. Phone update: if phone is in use by another account, merge seamlessly!
  if (phone !== undefined) {
    const clean = cleanPhoneNumber(phone);
    if (clean) {
      const existing = findUserRecord({ phone: clean });
      if (existing && existing.id !== user.id) {
        user = mergeUserRecords(user, existing);
      }
      user.phone = clean;
      user.whatsapp_linked = true;
    }
  }

  // 4. Password update
  if (password && password.length >= 4) {
    user.password_hash = hashPassword(password);
  }

  saveUsersToDisk();
  syncUserToCloud(user);
  return getUserProfileFull(user);
}

export function getUserProfileFull(userOrId) {
  if (!userOrId) return null;
  const user = typeof userOrId === "string" ? findUserRecord({ id: userOrId }) : userOrId;
  if (!user) return null;
  const userList = readings[user.id] || [];
  const formulasCount = userList.filter(r => r.payment_status === true || (r.selected_remedies && r.selected_remedies.length > 0 && r.payment_status)).length;
  const readingsCount = userList.length;

  const realEmail = isRealEmail(user.email) ? user.email : "";
  const realPhone = user.phone && user.phone.length >= 5 ? user.phone : "";
  const realName = isRealName(user.name) ? user.name : (user.name || "Friend");

  return {
    id: user.id,
    token: user.token || "",
    name: realName,
    email: realEmail,
    phone: realPhone,
    provider: user.provider || "password",
    providerId: user.providerId || "",
    google_linked: !!(user.google_linked || user.provider === "google" || (user.providerId && user.providerId.startsWith("goog_"))),
    whatsapp_linked: !!(user.whatsapp_linked || user.provider === "whatsapp" || (user.providerId && user.providerId.startsWith("wa_")) || realPhone),
    has_password: !!user.password_hash,
    profile: user.profile || { birthDate: "", birthTime: "", birthCity: "" },
    has_chart: !!(user.profile && (user.profile.birthDate || user.profile.date)),
    saved_charts_count: (user.savedCharts && user.savedCharts.length) || 0,
    savedCharts: user.savedCharts || [],
    formulas_count: formulasCount,
    readings_count: readingsCount,
    unlocks_balance: typeof user.unlocks_balance === "number" ? user.unlocks_balance : 0,
    created_at: user.created_at || new Date().toISOString()
  };
}

export const MAX_STORED_READINGS_PER_USER = 30;

export function saveUserReading(userId, readingData) {
  if (!readings[userId]) {
    readings[userId] = [];
  }

  const targetId = readingData.reading_id || readingData.id || `rdg_${crypto.randomUUID()}`;
  const existingIndex = readings[userId].findIndex(r => r.id === targetId || r.reading_id === targetId);

  const entryData = {
    id: targetId,
    reading_id: targetId,
    created_at: readingData.created_at || (existingIndex >= 0 ? readings[userId][existingIndex].created_at : new Date().toISOString()),
    updated_at: new Date().toISOString(),
    self_report: readingData.self_report || (readingData.messages?.[0]?.content) || (existingIndex >= 0 ? readings[userId][existingIndex].self_report : ""),
    gestalt_stage: readingData.gestalt_stage || (existingIndex >= 0 ? readings[userId][existingIndex].gestalt_stage : ""),
    gestalt_theme: readingData.gestalt_theme || (existingIndex >= 0 ? readings[userId][existingIndex].gestalt_theme : ""),
    core_need_summary: readingData.core_need_summary || (existingIndex >= 0 ? readings[userId][existingIndex].core_need_summary : ""),
    selected_remedies: readingData.selected_remedies || (existingIndex >= 0 ? readings[userId][existingIndex].selected_remedies : []),
    letter: readingData.letter || (existingIndex >= 0 ? readings[userId][existingIndex].letter : ""),
    payment_status: readingData.payment_status !== undefined ? !!readingData.payment_status : (existingIndex >= 0 ? readings[userId][existingIndex].payment_status : false),
    messages: readingData.messages || (existingIndex >= 0 ? readings[userId][existingIndex].messages : []),
    max_turns: readingData.max_turns || (existingIndex >= 0 ? readings[userId][existingIndex].max_turns : 4),
    birth_data: readingData.birth_data || (existingIndex >= 0 ? readings[userId][existingIndex].birth_data : null),
    horary_timestamp: readingData.horary_timestamp || (existingIndex >= 0 ? readings[userId][existingIndex].horary_timestamp : null),
    physical_order: readingData.physical_order || (existingIndex >= 0 ? readings[userId][existingIndex].physical_order : null)
  };

  if (existingIndex >= 0) {
    readings[userId][existingIndex] = { ...readings[userId][existingIndex], ...entryData };
  } else {
    readings[userId].unshift(entryData);
    // Enforce 30-reading capacity limit: FIFO prune oldest
    if (readings[userId].length > MAX_STORED_READINGS_PER_USER) {
      console.log(`[DB] User ${userId} reached ${MAX_STORED_READINGS_PER_USER} memory limit. Pruning oldest conversation.`);
      readings[userId] = readings[userId].slice(0, MAX_STORED_READINGS_PER_USER);
    }
  }

  saveJson(READINGS_FILE, readings);
  syncReadingsToCloud(userId, readings[userId]);
  return entryData;
}

export function getUserReadings(userId) {
  const userList = readings[userId] || [];
  return [...userList];
}

/**
 * Returns a rich chronological memory summary of the user's past consultations
 * so the AI can maintain deep, cohesive continuity across sessions.
 */
export function getUserMemorySummary(userId) {
  if (!userId || !readings[userId]) return "";
  const list = readings[userId];
  if (!Array.isArray(list) || list.length === 0) return "";

  const summaries = [];
  // Take the most recent 6 readings
  const recent = list.slice(0, 6);
  for (const r of recent) {
    const date = r.created_at ? r.created_at.split("T")[0] : "Recent";
    const topic = (r.self_report || (Array.isArray(r.messages) && r.messages[0]?.content) || "")
      .slice(0, 160)
      .replace(/\n/g, " ")
      .trim();
    const remedies = Array.isArray(r.selected_remedies) && r.selected_remedies.length
      ? r.selected_remedies.map(e => (typeof e === "string" ? e : e.name)).filter(Boolean).join(", ")
      : "";
    const stage = r.gestalt_stage || "";
    let item = `• [Date: ${date}] Consultation Focus: "${topic || "Somatic inquiry"}"`;
    if (stage) item += ` | Gestalt Interruption: ${stage}`;
    if (remedies) item += ` | Remedies Formulated: ${remedies}`;
    summaries.push(item);
  }
  return summaries.join("\n");
}

/**
 * Permanently wipes a user's consultation readings, chat transcripts, and ongoing memory
 * (Right to be Forgotten / Clean Slate) while preserving their account login credentials.
 */
export function deleteUserChatHistory(userIdOrEmail) {
  if (!userIdOrEmail) return { success: false, error: "Identificador de utilizador é obrigatório." };
  const searchKey = userIdOrEmail.trim().toLowerCase();
  let targetUserId = searchKey;

  for (const [id, u] of usersMap.entries()) {
    if (id.toLowerCase() === searchKey || (u.email && u.email.toLowerCase() === searchKey) || (u.phone && u.phone === searchKey)) {
      targetUserId = id;
      break;
    }
  }

  let deletedCount = 0;
  if (readings[targetUserId]) {
    deletedCount += readings[targetUserId].length;
    delete readings[targetUserId];
    saveJson(READINGS_FILE, readings);
  }
  if (readings[searchKey] && searchKey !== targetUserId) {
    deletedCount += readings[searchKey].length;
    delete readings[searchKey];
    saveJson(READINGS_FILE, readings);
  }

  syncReadingsToCloud(targetUserId, []);

  return {
    success: true,
    deletedCount,
    message: "Todo o histórico de conversas e diagnósticos foi eliminado permanentemente."
  };
}

export function getUserFormulas(userId) {
  const userList = readings[userId] || [];
  return userList
    .filter(r => r.payment_status === true || (r.selected_remedies && r.selected_remedies.length > 0 && r.payment_status));
}



export function updateFormulaPhysicalOrder(userId, readingId, orderDetails) {
  if (!userId || !readingId) return null;
  if (!readings[userId]) readings[userId] = [];

  let index = readings[userId].findIndex(r => r.id === readingId || r.reading_id === readingId);
  if (index < 0) {
    const newEntry = {
      id: readingId,
      reading_id: readingId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      self_report: "Consulta RESET",
      payment_status: true,
      selected_remedies: [],
      letter: ""
    };
    readings[userId].unshift(newEntry);
    index = 0;
  }

  const existing = readings[userId][index];
  existing.physical_order = {
    ...(existing.physical_order || {}),
    ...orderDetails,
    updated_at: new Date().toISOString()
  };
  saveJson(READINGS_FILE, readings);
  syncReadingsToCloud(userId, readings[userId]);
  return existing;
}

export function bulkSaveUserReadings(userId, readingsList) {
  if (!userId || !Array.isArray(readingsList)) return [];
  if (!readings[userId]) readings[userId] = [];

  for (const item of readingsList) {
    if (!item) continue;
    const targetId = item.reading_id || item.id || `rdg_${crypto.randomUUID()}`;
    const existingIndex = readings[userId].findIndex(r => r.id === targetId || r.reading_id === targetId);

    const entryData = {
      id: targetId,
      reading_id: targetId,
      created_at: item.created_at || (existingIndex >= 0 ? readings[userId][existingIndex].created_at : new Date().toISOString()),
      updated_at: new Date().toISOString(),
      self_report: item.self_report || (item.messages?.[0]?.content) || (existingIndex >= 0 ? readings[userId][existingIndex].self_report : ""),
      gestalt_stage: item.gestalt_stage || (existingIndex >= 0 ? readings[userId][existingIndex].gestalt_stage : ""),
      gestalt_theme: item.gestalt_theme || (existingIndex >= 0 ? readings[userId][existingIndex].gestalt_theme : ""),
      core_need_summary: item.core_need_summary || (existingIndex >= 0 ? readings[userId][existingIndex].core_need_summary : ""),
      selected_remedies: item.selected_remedies || (existingIndex >= 0 ? readings[userId][existingIndex].selected_remedies : []),
      letter: item.letter || (existingIndex >= 0 ? readings[userId][existingIndex].letter : ""),
      payment_status: item.payment_status !== undefined ? !!item.payment_status : (existingIndex >= 0 ? readings[userId][existingIndex].payment_status : false),
      messages: item.messages || (existingIndex >= 0 ? readings[userId][existingIndex].messages : []),
      max_turns: item.max_turns || (existingIndex >= 0 ? readings[userId][existingIndex].max_turns : 4),
      birth_data: item.birth_data || (existingIndex >= 0 ? readings[userId][existingIndex].birth_data : null),
      horary_timestamp: item.horary_timestamp || (existingIndex >= 0 ? readings[userId][existingIndex].horary_timestamp : null),
      physical_order: item.physical_order || (existingIndex >= 0 ? readings[userId][existingIndex].physical_order : null)
    };

    if (existingIndex >= 0) {
      readings[userId][existingIndex] = { ...readings[userId][existingIndex], ...entryData };
    } else {
      readings[userId].unshift(entryData);
    }
  }

  // Sort by created_at / updated_at descending
  readings[userId].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  // Enforce 30-reading capacity limit
  if (readings[userId].length > MAX_STORED_READINGS_PER_USER) {
    readings[userId] = readings[userId].slice(0, MAX_STORED_READINGS_PER_USER);
  }

  saveJson(READINGS_FILE, readings);
  syncReadingsToCloud(userId, readings[userId]);
  return readings[userId];
}

// ==========================================
// --- SAVED PERSON / SYNASTRY CHARTS ---
// ==========================================

export function getUserSavedCharts(userId) {
  if (!userId) return [];
  const user = usersMap.get(userId);
  if (!user || !Array.isArray(user.savedCharts)) return [];

  // Auto-enrich any existing charts missing full psychological archetypes
  let modified = false;
  const enriched = user.savedCharts.map(c => {
    if (!c.coreTraits && c.chartData) {
      try {
        c.coreTraits = generateCoreTraitsAnalysis(c.chartData);
        modified = true;
      } catch (e) {}
    }
    return c;
  });

  if (modified) {
    user.savedCharts = enriched;
    saveUsersToDisk();
  }

  return enriched;
}

export function saveUserPersonChart(userId, { name, relationship, birthDate, birthTime, birthCity, latitude, longitude, timezone }) {
  if (!userId) throw new Error("User ID is required.");
  const user = usersMap.get(userId);
  if (!user) throw new Error("User not found.");

  if (!name || !birthDate || !birthCity) {
    throw new Error("Nome, data e cidade de nascimento são obrigatórios.");
  }

  if (!Array.isArray(user.savedCharts)) {
    user.savedCharts = [];
  }

  const lat = (typeof latitude === "number" && !isNaN(latitude)) ? latitude : (parseFloat(latitude) || 38.7223);
  const lon = (typeof longitude === "number" && !isNaN(longitude)) ? longitude : (parseFloat(longitude) || -9.1393);
  const dateStr = birthDate.trim();
  const timeStr = (birthTime && birthTime.trim().length >= 4) ? birthTime.trim() : "12:00";

  // High-precision UTC conversion based on worldwide city coordinates & timezones
  const { utcDate, timezone: tz } = resolveBirthUtcDate(dateStr, timeStr, {
    latitude: lat,
    longitude: lon,
    city: birthCity
  });

  // Compute full professional Swiss Ephemeris chart & psychological archetypes snapshot
  let computedChart = null;
  let coreTraits = null;
  try {
    computedChart = castChart({
      date: utcDate,
      latitude: lat,
      longitude: lon,
      chartType: "natal"
    });
    computedChart.timezone = tz;
    coreTraits = generateCoreTraitsAnalysis(computedChart);
  } catch (e) {
    console.warn("Could not cast person chart:", e.message);
  }

  const chartId = `chart_${crypto.randomUUID()}`;
  const newPersonChart = {
    id: chartId,
    name: name.trim(),
    relationship: relationship || "Parceiro(a)",
    birthDate: dateStr,
    birthTime: timeStr,
    birthCity: birthCity.trim(),
    latitude: lat,
    longitude: lon,
    timezone: tz || timezone || "Europe/Lisbon",
    created_at: new Date().toISOString(),
    chartData: computedChart,
    coreTraits: coreTraits
  };

  user.savedCharts.push(newPersonChart);
  saveUsersToDisk();
  syncUserToCloud(user);

  return newPersonChart;
}


export function updateUserPersonChart(userId, chartId, { relationship, name }) {
  if (!userId || !chartId) return null;
  const user = usersMap.get(userId);
  if (!user || !Array.isArray(user.savedCharts)) return null;

  const target = user.savedCharts.find(c => c.id === chartId);
  if (!target) return null;

  if (relationship) target.relationship = relationship;
  if (name && typeof name === "string" && name.trim()) target.name = name.trim();

  saveUsersToDisk();
  syncUserToCloud(user);
  return target;
}

export function deleteUserPersonChart(userId, chartId) {
  if (!userId || !chartId) return false;
  const user = usersMap.get(userId);
  if (!user || !Array.isArray(user.savedCharts)) return false;

  const initialCount = user.savedCharts.length;
  user.savedCharts = user.savedCharts.filter(c => c.id !== chartId);

  if (user.savedCharts.length !== initialCount) {
    saveUsersToDisk();
    syncUserToCloud(user);
    return true;
  }
  return false;
}

// ==========================================
// --- UNLOCK CREDITS & MONETIZATION ENGINE ---
// ==========================================

export function getUserUnlockBalance(userId) {
  if (!userId) return 0;
  const user = usersMap.get(userId);
  return user && typeof user.unlocks_balance === "number" ? user.unlocks_balance : 0;
}

export function addUnlockCredits(userId, count = 1) {
  if (!userId) return 0;
  const user = usersMap.get(userId);
  if (!user) return 0;

  const current = typeof user.unlocks_balance === "number" ? user.unlocks_balance : 0;
  user.unlocks_balance = Math.max(0, current + count);
  saveUsersToDisk();
  syncUserToCloud(user);
  return user.unlocks_balance;
}

export function consumeUnlockCredit(userId) {
  if (!userId) return { success: false, error: "User ID is required." };
  const user = usersMap.get(userId);
  if (!user) return { success: false, error: "User not found." };

  const current = typeof user.unlocks_balance === "number" ? user.unlocks_balance : 0;
  if (current < 1) {
    return { success: false, error: "Insufficient unlock credits.", remaining: 0 };
  }

  user.unlocks_balance = current - 1;
  saveUsersToDisk();
  syncUserToCloud(user);
  return { success: true, remaining: user.unlocks_balance };
}

// ==========================================
// --- GDPR & LEGAL AGENT AUDIT METHODS ---
// ==========================================

const LEGAL_LOGS_FILE = path.join(DATA_DIR, "legal_inquiries.json");
let legalInquiriesLog = loadJson(LEGAL_LOGS_FILE, []);

/**
 * Permanently deletes user account, profile, session tokens, and consultation readings (GDPR Art. 17)
 */
export function deleteUserAccountAndData(userIdOrEmail) {
  if (!userIdOrEmail) return { success: false, error: "Identificador de utilizador é obrigatório." };
  
  const searchKey = userIdOrEmail.trim().toLowerCase();
  let targetUser = null;
  let targetUserId = null;

  for (const [id, u] of usersMap.entries()) {
    if (id.toLowerCase() === searchKey || (u.email && u.email.toLowerCase() === searchKey) || (u.phone && u.phone === searchKey)) {
      targetUser = u;
      targetUserId = id;
      break;
    }
  }

  if (!targetUser) {
    // Check if any readings exist for anonymous or unlinked key
    let purgedReadings = 0;
    if (readings[searchKey]) {
      delete readings[searchKey];
      purgedReadings++;
      saveJson(READINGS_FILE, readings);
    }
    return { success: true, userExisted: false, message: "Nenhum registo associado encontrado ou dados já eliminados." };
  }

  // 1. Remove from in-memory map
  usersMap.delete(targetUserId);
  saveUsersToDisk();

  // 2. Remove all associated readings
  if (readings[targetUserId]) {
    delete readings[targetUserId];
    saveJson(READINGS_FILE, readings);
  }
  if (targetUser.email && readings[targetUser.email]) {
    delete readings[targetUser.email];
    saveJson(READINGS_FILE, readings);
  }

  return {
    success: true,
    userExisted: true,
    userId: targetUserId,
    message: "Conta e todos os dados de consulta foram eliminados permanentemente com sucesso (RGPD Art. 17)."
  };
}

/**
 * Exports complete machine-readable snapshot of user data (GDPR Art. 20)
 */
export function exportUserDataFull(userIdOrEmail) {
  if (!userIdOrEmail) return null;
  const searchKey = userIdOrEmail.trim().toLowerCase();
  let targetUser = null;

  for (const [id, u] of usersMap.entries()) {
    if (id.toLowerCase() === searchKey || (u.email && u.email.toLowerCase() === searchKey)) {
      targetUser = u;
      break;
    }
  }

  if (!targetUser) return null;

  const userReadings = readings[targetUser.id] || [];
  return {
    exportDate: new Date().toISOString(),
    account: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone,
      createdAt: targetUser.createdAt,
      profile: targetUser.profile || null,
      savedCharts: targetUser.savedCharts || []
    },
    readingsCount: userReadings.length,
    readings: userReadings
  };
}

/**
 * Saves a legal inquiry ticket / DPO message log
 */
export function saveLegalInquiryLog(ticketData) {
  const ticket = {
    id: `leg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...ticketData
  };
  if (!Array.isArray(legalInquiriesLog)) legalInquiriesLog = [];
  legalInquiriesLog.unshift(ticket);
  saveJson(LEGAL_LOGS_FILE, legalInquiriesLog);
  return ticket;
}

export function getLegalInquiries() {
  if (!Array.isArray(legalInquiriesLog)) {
    legalInquiriesLog = loadJson(LEGAL_LOGS_FILE, []);
  }
  return legalInquiriesLog;
}

