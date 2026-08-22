// Úklid expirovaných inzerátů z DB.
// Náhled:  node scripts/cleanup-inactive.mjs
// Ostře:   node scripts/cleanup-inactive.mjs --commit
//
// Maže jen joby, které jsou is_active=false A mají expires_at v minulosti.
// Joby stažené z NAV (bez expirace / s budoucí expirací) ponechává.
// Favorites ukazující na mazané joby smaže jako první (kvůli FK).
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

const COMMIT = process.argv.includes("--commit");
const CHUNK = 100; // menší dávky = kratší URL (Supabase posílá .in() ids v query stringu)

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Načíst expirované neaktivní joby ───────────────────────────────────────────
const now = new Date().toISOString();

const { data: jobs, error } = await supabase
  .from("jobs")
  .select("id, title_cs, title_no, expires_at")
  .eq("is_active", false)
  .not("expires_at", "is", null)
  .lt("expires_at", now)
  .order("expires_at", { ascending: true });

if (error) { console.error("DB error (jobs):", error.message); process.exit(1); }

const ids = jobs.map((j) => j.id);
console.log(`${"─".repeat(60)}`);
console.log(`Expirovaných neaktivních inzerátů k smazání: ${ids.length}`);
console.log(`${"─".repeat(60)}`);

if (ids.length === 0) {
  console.log("Nic k mazání. Konec.");
  process.exit(0);
}

// ── Dotčené favorites ───────────────────────────────────────────────────────
let affectedFavorites = 0;
for (const c of chunk(ids, CHUNK)) {
  const { count, error: fe } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .in("job_id", c);
  if (fe) { console.error("DB error (favorites count):", fe.message); process.exit(1); }
  affectedFavorites += count ?? 0;
}
console.log(`Dotčených favorites (smažou se také): ${affectedFavorites}\n`);

// Ukázka titulů
console.log("Ukázka (prvních 10):");
for (const j of jobs.slice(0, 10)) {
  const title = j.title_cs || j.title_no || "(bez názvu)";
  console.log(`  [expirace ${(j.expires_at ?? "").slice(0, 10)}] ${title}`);
}
if (jobs.length > 10) console.log(`  … a dalších ${jobs.length - 10}`);

// ── Dry-run vs commit ─────────────────────────────────────────────────────────
if (!COMMIT) {
  console.log(`\n[DRY-RUN] Nic se nesmazalo. Pro ostré smazání spusť s --commit`);
  process.exit(0);
}

console.log(`\nMažu favorites…`);
let delFavs = 0;
for (const c of chunk(ids, CHUNK)) {
  const { data, error: fe } = await supabase
    .from("favorites")
    .delete()
    .in("job_id", c)
    .select("id");
  if (fe) { console.error("DB error (delete favorites):", fe.message); process.exit(1); }
  delFavs += data?.length ?? 0;
}
console.log(`  smazáno favorites: ${delFavs}`);

console.log(`Mažu inzeráty…`);
let delJobs = 0;
for (const c of chunk(ids, CHUNK)) {
  const { data, error: je } = await supabase
    .from("jobs")
    .delete()
    .in("id", c)
    .select("id");
  if (je) { console.error("DB error (delete jobs):", je.message); process.exit(1); }
  delJobs += data?.length ?? 0;
}

console.log(`\n${"─".repeat(60)}`);
console.log(`Hotovo. Smazáno inzerátů: ${delJobs} | favorites: ${delFavs}`);
console.log(`${"─".repeat(60)}`);
