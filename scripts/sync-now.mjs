/**
 * Standalone sync script — spouštěj přímo: node scripts/sync-now.mjs
 * Nevyžaduje běžící Next.js server.
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local ─────────────────────────────────────────────────────────
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

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── fetchJson keeps the AbortController alive through both fetch() AND res.json() ──
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

// ── Claude AI processing ─────────────────────────────────────────────────────
const MAX_DESC_CHARS = 4000;

function extractContactFromList(contactList) {
  if (!contactList?.length) return null;
  const best = contactList.find((c) => c.email || c.phone) ?? contactList[0];
  const name = best.name?.trim() || null;
  const email = best.email?.trim() || null;
  const phone = best.phone?.trim() || null;
  if (!name && !email && !phone) return null;
  return { name, email, phone };
}

async function claudeProcess(vacancy) {
  const ad = vacancy.ad_content;
  const title = ad.title ?? "";
  const company = ad.employer?.name ?? "";
  const description = (ad.description ?? "").slice(0, MAX_DESC_CHARS);
  const knownContact = extractContactFromList(ad.contactList);

  const contactInstruction = knownContact
    ? `- Kontaktní údaje NEEXTRAHUJ — jsou k dispozici ze strukturovaných dat. contact_name, contact_email, contact_phone nastav na null.\n- Z description_cs a description_sk ODSTRAŇ tyto kontakty: ${[knownContact.name, knownContact.email, knownContact.phone].filter(Boolean).join(", ")}`
    : `- Extrahuj kontakt z textu popisu pokud tam je (jméno/email/telefon)`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        tools: [{
          name: "process_job",
          description: "Zpracuj norský inzerát",
          input_schema: {
            type: "object",
            properties: {
              title_cs:           { type: "string" },
              title_sk:           { type: "string" },
              description_cs:     { type: "string" },
              description_sk:     { type: "string" },
              requires_norwegian: { type: "boolean" },
              contact_name:       { type: ["string", "null"] },
              contact_email:      { type: ["string", "null"] },
              contact_phone:      { type: ["string", "null"] },
            },
            required: ["title_cs", "title_sk", "description_cs", "description_sk", "requires_norwegian"],
          },
        }],
        tool_choice: { type: "tool", name: "process_job" },
        messages: [{
          role: "user",
          content: `Jsi zkušený copywriter pracovního portálu. Zpracuj tento norský inzerát — přelož ho přirozeně do češtiny a slovenštiny TAK, aby zněl jako inzerát napsaný rodilým mluvčím, ne jako překlad.

PŘEKLAD — ZÁSADY:
- Nepřekládej doslova. Zachovej smysl, přizpůsob jazykové konvence.
- Tykání: "Hledáme tě", "Budeš mít na starosti", "Co ti nabízíme" — moderní standard CZ/SK inzerátů.
- Typické norské → české výrazy: "vi søker" → "Hledáme", "vi tilbyr" → "Co nabízíme", "arbeidsoppgaver" → "Náplň práce", "kvalifikasjoner / krav" → "Požadujeme / Co očekáváme", "Om oss / Om bedriften" → "O nás".
- HTML formát: <p> pro odstavce, <ul><li> pro seznamy, <strong> pro nadpisy sekcí. Žádné <h1>/<h2>.
- Vyhni se suchému, byrokratickému tónu. Piš přátelsky ale profesionálně.
- DŮLEŽITÉ: Jazyk "norsk/norština" překládej vždy jako "norština" (cs) / "nórčina" (sk) — NIKDY jako "čeština" nebo "slovenčina".
- requires_norwegian: SET TRUE pokud je norština explicitně vyžadována ("kreves norsk", "flytende norsk", "norsk og gjerne engelsk" = norština povinná i když angličtina bonus). SET FALSE pokud stačí angličtina ("norsk eller engelsk") nebo norština jen výhoda ("fordel", "ønskelig").
${contactInstruction}
- Z description_cs a description_sk ODSTRAŇ: název firmy (viz "Firma" níže), kontaktní údaje a veškeré URL (http://, https://, www.)
- Název firmy NEUVÁDEJ v title_cs ani title_sk

Firma: ${company}
Název: ${title}

Popis:
${description}`,
        }],
      });

      const toolUse = response.content.find((b) => b.type === "tool_use");
      const result = toolUse?.input ?? null;
      if (result) {
        // Regex fallback — strip any URLs Claude may have missed
        const stripUrls = (text) => text
          ? text.replace(/https?:\/\/[^\s"'<>]+/gi, "").replace(/www\.[^\s"'<>]+/gi, "").trim()
          : text;
        result.description_cs = stripUrls(result.description_cs);
        result.description_sk = stripUrls(result.description_sk);

        // Override with structured contacts from NAV API if available
        if (knownContact) {
          result.contact_name = knownContact.name;
          result.contact_email = knownContact.email;
          result.contact_phone = knownContact.phone;
        }
      }
      return result;
    } catch (e) {
      if (e.status === 429 || e.message?.includes("overloaded")) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  return null;
}

// ── Token ────────────────────────────────────────────────────────────────────
async function getToken() {
  const res = await fetch(`${FEED_BASE}/api/publicToken`, { headers: { Accept: "text/plain" } });
  const raw = await res.text();
  return raw.trim().split(/\s+/).at(-1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function slugify(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const SEASONAL_CATEGORIES = new Set([
  "Jordbruk, skogbruk og fiske", "Reiseliv og mat", "Bygg og anlegg",
  "Transport og logistikk", "Renhold og eiendomsdrift",
]);

const BLOCKED_CATEGORIES = new Set([
  "Helse og sosial",
]);
const STRICTLY_SEASONAL_TYPES = new Set(["Sesong", "Feriejobb", "sesong", "feriejobb"]);
const TEMP_TYPES = new Set([
  "Sesong", "Vikariat", "Midlertidig", "Feriejobb",
  "sesong", "vikariat", "midlertidig", "feriejobb",
]);

// Secondary safety-net: check Czech translation for missed Norwegian requirements.
// Regex-only — no extra AI call. Returns true if Norwegian is clearly required.
function czechTextRequiresNorwegian(czechText) {
  const t = czechText.toLowerCase();

  // Explicit "Norwegian is an advantage/bonus" — do NOT flag these
  const bonusPatterns = [
    /norština\s+(je\s+)?(výhoda|plus|vítána|výhodou)/,
    /norsky\s+(je\s+)?(výhoda|plus|vítán)/,
    /znalost\s+norštiny\s+(je\s+)?(výhod|vítán|plus)/,
    /norštině?\s+(nebo|či)\s+anglič/,  // "norsky nebo anglicky" = either works
    /anglič\S*\s+(nebo|či)\s+norš/,    // "anglicky nebo norsky"
  ];
  if (bonusPatterns.some((p) => p.test(t))) return false;

  // Mandatory Norwegian signals
  const requiredPatterns = [
    /znalost\s+norštiny/,               // "Znalost norštiny a angličtiny", "znalost norštiny na úrovni B2"
    /plynná?\s+norština/,               // "Plynná norština a angličtina" (nominative)
    /plynně?\s+norsky/,
    /plynnou?\s+norštinu/,
    /komunikace\s+v\s+norštině/,
    /komunikovat\s+v\s+norštině/,
    /norštiny\s+(v\s+)?(písemné|mluvené|ústní|psané|mluveném|písemném)/,
    /norštiny\s+na\s+úrovni/,           // "norštiny na úrovni B2"
    /musí(š|te)?\s+(ovládat|mluvit|umět|rozumět)\s+norsky/,
    /norštinu\s+(je\s+)?(nutné|nutno|povinné|třeba)\s+ovládat/,
    /norský\s+jazyk\s+(je\s+)?(nutný|povinný|požadován|vyžadován)/,
    /norštiny\b.{0,40}(nutnost|podmínka)/,
  ];
  return requiredPatterns.some((p) => p.test(t));
}

function isSeasonal(v) {
  const ad = v.ad_content;
  if (!ad) return false;
  const locs = ad.workLocations ?? [];
  const inNorway = locs.length === 0 || locs.some(
    (l) => !l.country || ["NORGE", "NORWAY"].includes(l.country.toUpperCase())
  );
  if (!inNorway) return false;

  // Blocked categories — always exclude regardless of engagement type
  const hasBlockedCategory = (ad.occupationCategories ?? []).some((c) => BLOCKED_CATEGORIES.has(c.level1));
  if (hasBlockedCategory) return false;

  const engagement = (ad.engagementtype ?? "").toLowerCase();
  const hasStrictlySeasonal = [...STRICTLY_SEASONAL_TYPES].some((t) => engagement.includes(t.toLowerCase()));
  if (hasStrictlySeasonal) return true;
  const categoryMatch = (ad.occupationCategories ?? []).some((c) => SEASONAL_CATEGORIES.has(c.level1));
  const hasTempType = [...TEMP_TYPES].some((t) => engagement.includes(t.toLowerCase()));
  return categoryMatch && hasTempType;
}

function isKommuneJob(v) {
  const contacts = v.ad_content?.contactList ?? [];
  return contacts.some((c) => c.email?.toLowerCase().includes(".kommune.no"));
}

function toRow(v, ai) {
  const j = v.ad_content;
  const loc = j.workLocations?.[0];
  const cat = j.occupationCategories?.[0];
  return {
    nav_id: v.uuid,
    slug: slugify(j.title).slice(0, 60) + "-" + v.uuid.replace(/-/g, "").slice(-8),
    title_no: j.title ?? null,
    title_cs: ai?.title_cs ?? j.title ?? null,
    title_sk: ai?.title_sk ?? j.title ?? null,
    description_no: j.description ?? null,
    description_cs: ai?.description_cs ?? j.description ?? null,
    description_sk: ai?.description_sk ?? j.description ?? null,
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
    requires_norwegian: ai?.requires_norwegian ?? false,
    contact_name: ai?.contact_name ?? null,
    contact_email: ai?.contact_email ?? null,
    contact_phone: ai?.contact_phone ?? null,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log("🔄 NorskoPráce sync — starting...\n");
const token = await getToken();
console.log("✓ NAV token acquired\n");

const args = process.argv.slice(2);
const sinceArg = args.find(a => a.startsWith("--since="))?.split("=")[1];
const maxPages = parseInt(args.find(a => a.startsWith("--max-pages="))?.split("=")[1] ?? "0", 10) || Infinity;
const maxJobs = parseInt(args.find(a => a.startsWith("--max-jobs="))?.split("=")[1] ?? "0", 10) || Infinity;
const sinceDate = new Date(sinceArg ?? Date.now() - 30 * 24 * 60 * 60 * 1000).toUTCString();
console.log(`📅 Syncing since: ${sinceDate}\n`);

let nextUrl = null;
let pages = 0, upserted = 0, deactivated = 0, skipped = 0, jobsProcessed = 0;

do {
  const rawUrl = nextUrl ?? `/api/v1/feed`;
  const url = rawUrl.startsWith("http") ? rawUrl : `${FEED_BASE}${rawUrl}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  if (!nextUrl && sinceDate) headers["If-Modified-Since"] = sinceDate;
  const { status: feedStatus, ok: feedOk, data: page } = await fetchJson(url, { headers }, 20000);

  if (feedStatus === 304) { console.log("  304 Not modified — nothing new"); break; }
  if (!feedOk) { console.error(`  Feed error ${feedStatus}`); break; }
  if (!page.items?.length) break;

  pages++;
  process.stdout.write(`  Page ${pages} — ${page.items.length} items`);

  // Soft-delete inactive
  const inactiveIds = page.items
    .filter((i) => i._feed_entry?.status === "INACTIVE")
    .map((i) => i._feed_entry.uuid);

  for (let i = 0; i < inactiveIds.length; i += 100) {
    const chunk = inactiveIds.slice(i, i + 100);
    await db.from("jobs").update({ is_active: false }).in("nav_id", chunk);
  }
  deactivated += inactiveIds.length;

  const activeItems = page.items.filter((i) => i._feed_entry?.status !== "INACTIVE");
  const BATCH = 5;
  const rows = [];

  async function fetchDetail(item) {
    const detailUrl = item.url.startsWith("http") ? item.url : `${FEED_BASE}${item.url}`;
    try {
      const { ok, data } = await fetchJson(detailUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      }, 5000);
      return ok ? data : null;
    } catch {
      return null;
    }
  }

  for (let i = 0; i < activeItems.length; i += BATCH) {
    const chunk = activeItems.slice(i, i + BATCH);
    const details = await Promise.all(chunk.map(fetchDetail));
    const seasonal = details.filter(Boolean).filter(isSeasonal);
    if (seasonal.length === 0) continue;

    for (const v of seasonal) {
      if (jobsProcessed >= maxJobs) break;
      try {
        // Pre-Claude filters (free)
        if (isKommuneJob(v)) { skipped++; continue; }

        const ai = await claudeProcess(v);
        if (!ai) { skipped++; continue; }

        if (ai.requires_norwegian) { skipped++; continue; }

        // Secondary check: catch Norwegian requirements missed by Claude
        if (czechTextRequiresNorwegian(ai.description_cs ?? "")) { skipped++; continue; }

        const hasContact = ai.contact_email || ai.contact_phone || ai.contact_name;
        const hasApplyUrl = v.ad_content?.applicationUrl;

        if (!hasApplyUrl && !hasContact) { skipped++; continue; }

        rows.push(toRow(v, ai));
        jobsProcessed++;
      } catch (e) {
        console.error("\n  Claude error:", e.message);
        skipped++;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    if (jobsProcessed >= maxJobs) break;

    if (i + BATCH < activeItems.length) await new Promise(r => setTimeout(r, 200));
  }

  // Deduplicate by nav_id
  const uniqueRows = [...new Map(rows.map(r => [r.nav_id, r])).values()];

  if (uniqueRows.length) {
    const { error, data } = await db
      .from("jobs")
      .upsert(uniqueRows, { onConflict: "nav_id" })
      .select("id");
    if (error) console.error("\n  DB error:", error.message);
    else upserted += data?.length ?? 0;
  }

  process.stdout.write(` → ${rows.length} seasonal, ${upserted} total upserted\n`);
  nextUrl = page.next_url;

} while (nextUrl && pages < maxPages && jobsProcessed < maxJobs);

console.log(`
✅ Sync complete
   Pages:       ${pages}
   Upserted:    ${upserted}
   Skipped:     ${skipped}
   Deactivated: ${deactivated}
`);
