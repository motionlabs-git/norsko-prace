// Backfill sloupce jobs.application_due_at z textového application_due.
// Náhled:  node scripts/backfill-application-due.mjs --dry-run
// Ostře:   node scripts/backfill-application-due.mjs
//
// Vyžaduje sloupec: ALTER TABLE jobs ADD COLUMN application_due_at timestamptz;
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes("--dry-run");
const CHUNK = 100;

// Stejná logika jako src/lib/application-utils.ts → parseApplicationDue
function parseApplicationDue(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const dm = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (dm) {
    const day = parseInt(dm[1], 10);
    const month = parseInt(dm[2], 10);
    const year = parseInt(dm[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) return null;
    const d = new Date(Date.UTC(year, month - 1, day));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Načíst všechny joby s neprázdným application_due ────────────────────────────
const { data: jobs, error } = await supabase
  .from("jobs")
  .select("id, application_due")
  .not("application_due", "is", null);

if (error) { console.error("DB error:", error.message); process.exit(1); }

// Seskupit id podle vypočtené ISO hodnoty (null = nechat, sloupec je defaultně null)
const byValue = new Map(); // iso -> [ids]
let parsed = 0, unparsed = 0;
for (const j of jobs) {
  const iso = parseApplicationDue(j.application_due);
  if (iso === null) { unparsed++; continue; }
  parsed++;
  if (!byValue.has(iso)) byValue.set(iso, []);
  byValue.get(iso).push(j.id);
}

console.log(`${"─".repeat(60)}`);
console.log(`Jobů s application_due: ${jobs.length}`);
console.log(`  naparsováno na datum: ${parsed}  (unikátních hodnot: ${byValue.size})`);
console.log(`  bez data (Snarest/ASAP/prázdné/překlep): ${unparsed} → zůstane NULL`);
console.log(`${"─".repeat(60)}`);

if (DRY_RUN) {
  const sample = [...byValue.entries()].slice(0, 10);
  console.log("\nUkázka mapování (prvních 10 hodnot):");
  for (const [iso, ids] of sample) console.log(`  ${iso.slice(0, 10)}  ← ${ids.length}×`);
  console.log(`\n[DRY-RUN] Nic se nezapsalo.`);
  process.exit(0);
}

// ── Zápis ─────────────────────────────────────────────────────────────────────
process.stdout.write("\nZapisuji application_due_at… ");
let updated = 0;
for (const [iso, ids] of byValue) {
  for (const c of chunk(ids, CHUNK)) {
    const { data, error: ue } = await supabase
      .from("jobs")
      .update({ application_due_at: iso })
      .in("id", c)
      .select("id");
    if (ue) { console.error("\nDB error (update):", ue.message); process.exit(1); }
    updated += data?.length ?? 0;
  }
}
console.log("hotovo.");
console.log(`\nAktualizováno řádků: ${updated}`);
