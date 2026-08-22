/**
 * Aplikuje aktuální filtr na existující joby v Supabase.
 * Joby, které nesplňují kritéria, jsou soft-deleted (is_active = false).
 *
 * Usage:
 *   node scripts/filter-existing.mjs          # dry run (jen zobrazí co by smazal)
 *   node scripts/filter-existing.mjs --apply  # reálně deaktivuje
 */

import { createClient } from "@supabase/supabase-js";
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

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const APPLY = process.argv.includes("--apply");

// ── Filtrační konstanty (zrcadlo nav-api.ts) ─────────────────────────────────

const ALLOWED_CATEGORIES = new Set([
  "Jordbruk, skogbruk og fiske",
  "Reiseliv og mat",
  "Bygg og anlegg",
  "Transport og logistikk",
  "Renhold og eiendomsdrift",
  "Industriarbeid",
  "Natur og miljø",
]);

const BLOCKED_CATEGORIES = new Set([
  "Helse, pleie og omsorg",
  "Helse og sosial",
  "Pleie og omsorg",
  "Sosial og omsorg",
  "Sykepleier",
  "Butikk og dagligvare",
  "Salg, markedsføring og reklame",
  "Salg og service",
  "Kontor og administrasjon",
  "Økonomi, regnskap og finans",
  "IT og software",
  "Juridisk",
  "Undervisning",
  "Skole og undervisning",
  "Barnevern",
  "Sosialt arbeid",
]);

const BLOCKED_TITLE_KEYWORDS = [
  // Zdravotnictví / péče (norsky i dánsky) — zrcadlo src/lib/job-filter.ts
  "sykepleie",
  "sygeplejer",
  "sygepleje",
  "hjelpepleier",
  "helsefagarbeider",
  "helsearbeider",
  "helsesekretær",
  "pleieassistent",
  "omsorgsarbeider",
  "omsorgsperson",
  "vernepleier",
  "ergoterapeut",
  "fysioterapeut",
  "jordmor",
  "bioingeni",
  "radiograf",
  "farmasøyt",
  "apoteker",
  "tannlege",
  "tannhelse",
  "tannpleier",
  "anestesi",
  "anæstesi",
  "legevakt",
  "fastlege",
  "ambulanse",
  "sosionom",
  "miljøterapeut",
  "audiograf",
  "overlege",
  "psykolog",
  "barnehagelærer",
  "sykehjem",
  "hjemmepleie",
  "hjemmesykepleie",
  "butikkmedarbeider",
  "butikkleder",
  "butikksjef",
  "salgsmedarbeider",
  "salgsassistent",
  "kassemedarbeider",
  "kasserer",
  "barnehageassistent",
  "skolefritid",
];

const SEASONAL_TYPES = new Set([
  "sesong", "feriejobb", "vikariat", "midlertidig",
]);

// ── Filtr ────────────────────────────────────────────────────────────────────

function shouldDeactivate(job) {
  const reasons = [];

  // 1. Blokovaná kategorie (zdravotnictví, obchod, ...)
  if (job.category_level1 && BLOCKED_CATEGORIES.has(job.category_level1)) {
    reasons.push(`blocked category: ${job.category_level1}`);
  }

  // 2. Blokované klíčové slovo v titulu (norský originál)
  const titleLower = (job.title_no ?? "").toLowerCase();
  const blockedKw = BLOCKED_TITLE_KEYWORDS.find((kw) => titleLower.includes(kw));
  if (blockedKw) {
    reasons.push(`blocked keyword in title: "${blockedKw}"`);
  }

  return reasons.length > 0 ? reasons : null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`🔍 Filtrování existujících jobů — ${APPLY ? "LIVE (deaktivuje)" : "DRY RUN (jen zobrazí)"}\n`);

const { data: jobs, error } = await db
  .from("jobs")
  .select("id, nav_id, source, title_no, category_level1, engagement_type, company")
  .eq("is_active", true);

if (error) {
  console.error("DB error:", error.message);
  process.exit(1);
}

console.log(`Celkem aktivních jobů: ${jobs.length}\n`);

const toDeactivate = [];
const categoryStats = {};
const keywordStats = {};
const typeStats = {};

for (const job of jobs) {
  const reasons = shouldDeactivate(job);
  if (reasons) {
    toDeactivate.push({ job, reasons });

    // Statistiky
    reasons.forEach((r) => {
      if (r.startsWith("blocked category")) {
        categoryStats[job.category_level1] = (categoryStats[job.category_level1] ?? 0) + 1;
      } else if (r.startsWith("blocked keyword")) {
        const kw = r.match(/"(.+)"/)?.[1];
        if (kw) keywordStats[kw] = (keywordStats[kw] ?? 0) + 1;
      } else if (r.startsWith("non-seasonal type")) {
        const t = job.engagement_type ?? "null";
        typeStats[t] = (typeStats[t] ?? 0) + 1;
      }
    });
  }
}

console.log(`📋 Jobů k deaktivaci: ${toDeactivate.length} / ${jobs.length}\n`);

// Zobraz nejčastější důvody
if (Object.keys(categoryStats).length > 0) {
  console.log("Blokované kategorie:");
  Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${v}x  ${k}`);
  });
}
if (Object.keys(keywordStats).length > 0) {
  console.log("\nBlokovaná klíčová slova v titulu:");
  Object.entries(keywordStats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${v}x  "${k}"`);
  });
}
if (Object.keys(typeStats).length > 0) {
  console.log("\nNesezónní typy:");
  Object.entries(typeStats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${v}x  "${k}"`);
  });
}

// Ukázka prvních 20 jobů k deaktivaci
console.log("\n📄 Ukázka jobů k deaktivaci (prvních 20):");
toDeactivate.slice(0, 20).forEach(({ job, reasons }) => {
  console.log(`  [${job.source}] ${job.title_no?.slice(0, 60) ?? "—"}`);
  console.log(`       → ${reasons[0]}`);
});

if (!APPLY) {
  console.log(`\n⚠️  DRY RUN — žádná změna v DB.`);
  console.log(`   Spusť s --apply pro reálnou deaktivaci:\n`);
  console.log(`   node scripts/filter-existing.mjs --apply\n`);
  process.exit(0);
}

// ── Deaktivace ───────────────────────────────────────────────────────────────

console.log(`\n🗑️  Deaktivuji ${toDeactivate.length} jobů...`);

const ids = toDeactivate.map(({ job }) => job.id);
const CHUNK = 500;
let deactivated = 0;

for (let i = 0; i < ids.length; i += CHUNK) {
  const chunk = ids.slice(i, i + CHUNK);
  const { error: updateError } = await db
    .from("jobs")
    .update({ is_active: false })
    .in("id", chunk);

  if (updateError) {
    console.error(`Chyba při deaktivaci chunk ${i}–${i + CHUNK}:`, updateError.message);
  } else {
    deactivated += chunk.length;
    process.stdout.write(`\r  ${deactivated}/${ids.length} deaktivováno...`);
  }
}

console.log(`\n\n✅ Hotovo — deaktivováno ${deactivated} jobů.\n`);
