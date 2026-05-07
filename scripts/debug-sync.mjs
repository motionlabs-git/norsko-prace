/**
 * Debug script — fetches first 10 active items, translates them, upserts to DB
 * Run: node scripts/debug-sync.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envVars = readFileSync(envPath, "utf-8")
  .split("\n")
  .filter((l) => l.includes("=") && !l.startsWith("#"))
  .reduce((acc, line) => {
    const [k, ...rest] = line.split("=");
    acc[k.trim()] = rest.join("=").trim();
    return acc;
  }, {});
Object.assign(process.env, envVars);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FEED_BASE = "https://pam-stilling-feed.nav.no";
const AZURE_KEY = process.env.AZURE_TRANSLATOR_KEY;
const AZURE_REGION = process.env.AZURE_TRANSLATOR_REGION;
const AZURE_ENDPOINT = process.env.AZURE_TRANSLATOR_ENDPOINT ?? "https://api.cognitive.microsofttranslator.com/translate";

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function fetchJson(url, options, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const data = res.ok ? await res.json() : null;
    return { status: res.status, ok: res.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

function slugify(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const SEASONAL_CATEGORIES = new Set([
  "Jordbruk, skogbruk og fiske", "Reiseliv og mat", "Bygg og anlegg",
  "Transport og logistikk", "Renhold og eiendomsdrift",
]);
const SEASONAL_TYPES = new Set([
  "Sesong", "Vikariat", "Midlertidig", "Feriejobb",
  "sesong", "vikariat", "midlertidig", "feriejobb",
]);

function isSeasonal(v) {
  const ad = v.ad_content;
  if (!ad) return false;
  const locs = ad.workLocations ?? [];
  const inNorway = locs.length === 0 || locs.some(
    (l) => !l.country || ["NORGE", "NORWAY"].includes(l.country.toUpperCase())
  );
  if (!inNorway) return false;
  return SEASONAL_TYPES.has(ad.engagementtype ?? "") ||
    (ad.occupationCategories ?? []).some((c) => SEASONAL_CATEGORIES.has(c.level1));
}

function toRow(v, tr) {
  const j = v.ad_content;
  const loc = j.workLocations?.[0];
  const cat = j.occupationCategories?.[0];
  return {
    nav_id: v.uuid,
    slug: slugify(j.title).slice(0, 60) + "-" + v.uuid.replace(/-/g, "").slice(-8),
    title_no: j.title ?? null,
    title_cs: tr?.title_cs ?? j.title ?? null,
    title_sk: tr?.title_sk ?? j.title ?? null,
    description_no: j.description ?? null,
    description_cs: tr?.description_cs ?? j.description ?? null,
    description_sk: tr?.description_sk ?? j.description ?? null,
    company: j.employer?.name ?? null,
    location_city: loc?.city ?? null,
    location_county: loc?.county ?? null,
    category_level1: cat?.level1 ?? null,
    category_level2: cat?.level2 ?? null,
    engagement_type: j.engagementtype ?? null,
    extent: j.extent ?? null,
    sector: j.sector ?? null,
    salary: null,
    position_count: j.positioncount ? parseInt(j.positioncount, 10) || null : null,
    application_due: j.applicationDue ?? null,
    published_at: j.published ?? null,
    expires_at: j.expires ?? null,
    source_url: j.sourceurl ?? null,
    application_url: j.applicationUrl ?? null,
    is_featured: false,
    is_active: true,
  };
}

const args = process.argv.slice(2);
const sinceArg = args.find(a => a.startsWith("--since="))?.split("=")[1];
const sinceDate = sinceArg ? new Date(sinceArg).toUTCString() : null;

// ── Token ─────────────────────────────────────────────────────────────────────
console.log("1. Getting NAV token...");
const tokenRes = await fetch(`${FEED_BASE}/api/publicToken`, { headers: { Accept: "text/plain" } });
const raw = await tokenRes.text();
const token = raw.trim().split(/\s+/).at(-1);
console.log("   ✓ Token:", token.slice(0, 20) + "...");

// ── Fetch first page ──────────────────────────────────────────────────────────
const feedHeaders = { Authorization: `Bearer ${token}`, Accept: "application/json" };
if (sinceDate) { feedHeaders["If-Modified-Since"] = sinceDate; console.log(`\n   If-Modified-Since: ${sinceDate}`); }
console.log("\n2. Fetching feed page 1...");
const t0 = Date.now();
const { ok: feedOk, status: feedStatus, data: feedPage } = await fetchJson(
  `${FEED_BASE}/api/v1/feed`,
  { headers: feedHeaders },
  20000
);
console.log(`   status ${feedStatus}, ${feedPage?.items?.length ?? 0} items in ${Date.now() - t0}ms`);
if (!feedOk) { console.log("   Feed error — exiting"); process.exit(1); }

const inactiveItems = feedPage.items.filter(i => i._feed_entry?.status === "INACTIVE");
const activeItems = feedPage.items.filter(i => i._feed_entry?.status !== "INACTIVE");
console.log(`   Active: ${activeItems.length}, Inactive: ${inactiveItems.length}`);

// ── Deactivate inactive ───────────────────────────────────────────────────────
if (inactiveItems.length > 0) {
  const inactiveIds = inactiveItems.map(i => i._feed_entry.uuid);
  console.log(`\n2b. Deactivating ${inactiveIds.length} items in DB (chunked by 100)...`);
  for (let i = 0; i < inactiveIds.length; i += 100) {
    const chunk = inactiveIds.slice(i, i + 100);
    const tDb = Date.now();
    const { error } = await db.from("jobs").update({ is_active: false }).in("nav_id", chunk);
    console.log(`    chunk ${Math.floor(i/100)+1}: ${chunk.length} ids → ${Date.now() - tDb}ms ${error ? "ERROR: " + error.message : "✓"}`);
  }
}

// ── Fetch details for first 20 active items ───────────────────────────────────
console.log("\n3. Fetching details for first 20 active items (one by one, with timing)...");
let seasonal = [];
for (let i = 0; i < Math.min(20, activeItems.length); i++) {
  const item = activeItems[i];
  const detailUrl = item.url.startsWith("http") ? item.url : `${FEED_BASE}${item.url}`;
  const t1 = Date.now();
  try {
    const { ok, data } = await fetchJson(detailUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    }, 5000);
    const elapsed = Date.now() - t1;
    const isSeas = ok && data ? isSeasonal(data) : false;
    console.log(`   [${i + 1}/20] ${elapsed}ms ${ok ? "✓" : "✗"} ${isSeas ? "SEASONAL" : "skip"} — ${data?.ad_content?.title?.slice(0, 50) ?? "(no title)"}`);
    if (isSeas) seasonal.push(data);
  } catch (e) {
    console.log(`   [${i + 1}/20] ${Date.now() - t1}ms ERROR: ${e.message}`);
  }
}

console.log(`\n   Found ${seasonal.length} seasonal in first 20`);
if (seasonal.length === 0) {
  console.log("   No seasonal items to translate — done.");
  process.exit(0);
}

// ── Translate ─────────────────────────────────────────────────────────────────
console.log("\n4. Testing Azure translation...");
console.log(`   AZURE_KEY: ${AZURE_KEY ? AZURE_KEY.slice(0, 8) + "..." : "(not set)"}`);
console.log(`   AZURE_REGION: ${AZURE_REGION}`);
console.log(`   AZURE_ENDPOINT: ${AZURE_ENDPOINT}`);

const testTexts = [{ Text: seasonal[0].ad_content.title }];
const azUrl = `${AZURE_ENDPOINT}?api-version=3.0&from=no&to=cs&to=sk`;
console.log(`\n   Calling Azure: ${azUrl}`);
const tAz = Date.now();
try {
  const { ok, status, data } = await fetchJson(azUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_KEY,
      "Ocp-Apim-Subscription-Region": AZURE_REGION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(testTexts),
  }, 10000);
  console.log(`   ${Date.now() - tAz}ms — status ${status}`);
  if (ok) {
    const cs = data[0]?.translations?.find(t => t.to === "cs")?.text;
    const sk = data[0]?.translations?.find(t => t.to === "sk")?.text;
    console.log(`   Original: "${seasonal[0].ad_content.title}"`);
    console.log(`   CS: "${cs}"`);
    console.log(`   SK: "${sk}"`);
  } else {
    console.log("   Azure error body:", JSON.stringify(data));
  }
} catch (e) {
  console.log(`   Azure FAILED: ${e.message}`);
}

// ── Upsert one row ────────────────────────────────────────────────────────────
console.log("\n5. Upserting first seasonal item to DB (no translation)...");
const row = toRow(seasonal[0], null);
console.log(`   nav_id: ${row.nav_id}`);
console.log(`   slug: ${row.slug}`);
const { error, data: dbData } = await db
  .from("jobs")
  .upsert([row], { onConflict: "nav_id" })
  .select("id");
if (error) console.log("   DB error:", error.message);
else console.log(`   ✓ Upserted, DB id: ${dbData?.[0]?.id}`);

console.log("\n✅ Debug complete");
