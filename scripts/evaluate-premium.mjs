// Automatické označení "premium" (vybraných) inzerátů.
// Náhled:  node scripts/evaluate-premium.mjs --dry-run
// Ostře:   node scripts/evaluate-premium.mjs
// Flagy:   --limit=200  --threshold=70  --dry-run  --reeval
//
// Hybridní skóre 0–100 = pravidla (0–40) + Claude kvalita (0–60).
// Nad prahem → is_premium=true. NIKDY nesnižuje už nastavené premium (jen povyšuje).
// Vyžaduje sloupec jobs.premium_evaluated_at (timestamptz).
import Anthropic from "@anthropic-ai/sdk";
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
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Flagy ─────────────────────────────────────────────────────────────────────
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : def;
};
const LIMIT = parseInt(arg("limit", "200"), 10);
const THRESHOLD = parseInt(arg("threshold", "85"), 10);
const DRY_RUN = process.argv.includes("--dry-run");
const REEVAL = process.argv.includes("--reeval");
const BATCH = 10;
const UPDATE_CHUNK = 100; // kratší URL pro .in() (ids jdou v query stringu)

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Pravidla: atraktivní obory (NAV category_level1) ───────────────────────────
const TOP_SECTORS = new Set([
  "Reiseliv og mat",             // cestovní ruch / gastro
  "Jordbruk, skogbruk og fiske", // zemědělství / lesnictví / rybářství
  "Natur og miljø",              // příroda / prostředí
]);
const MID_SECTORS = new Set([
  "Bygg og anlegg",         // stavebnictví
  "Transport og logistikk", // doprava / logistika
  "Industriarbeid",         // průmysl
]);

// Bonusy nad rámec kvality. Ubytování = velká výhoda pro zahraniční pracovníky → silná váha.
const ACCOMMODATION_BONUS = 25;
const TOP_SECTOR_BONUS = 8;
const MID_SECTOR_BONUS = 4;

function bonusScore(job) {
  let s = 0;
  if (job.includes_accommodation === true) s += ACCOMMODATION_BONUS;
  if (TOP_SECTORS.has(job.category_level1)) s += TOP_SECTOR_BONUS;
  else if (MID_SECTORS.has(job.category_level1)) s += MID_SECTOR_BONUS;
  return s;
}

// ── Claude: kvalita / důvěryhodnost (0–60 po přeškálování z 0–100) ─────────────
function stripHtml(s) {
  return (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function qualityBatch(jobs) {
  const payload = jobs.map((j) => ({
    id: j.id,
    title: j.title_cs ?? "",
    company: j.company ?? "",
    category: j.category_level1 ?? "",
    description: stripHtml(j.description_cs).slice(0, 1500),
  }));

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: `Hodnotíš kvalitu norských sezónních pracovních inzerátů pro český/slovenský pracovní portál.
Vrať POUZE JSON pole, žádný markdown, žádné code fences.
Každý prvek: {"id":"<id>","quality":<0-100>,"reason":"<zdůvodnění česky, max 160 znaků>"}
V poli "reason" NIKDY nepoužívej znak uvozovky ("). Pokud potřebuješ citovat, použij apostrof (').

Hodnoť "quality" 0–100 podle toho, jak dobrá a důvěryhodná je nabídka pro zahraničního sezónního pracovníka:
- Serióznost a rozpoznatelnost zaměstnavatele (jméno firmy, ne anonymní inzerát).
- Úplnost a čitelnost popisu (co se dělá, co se nabízí, jasné podmínky).
- Jasná a snadná cesta k přihlášení.
- Celková atraktivita nabídky (mzda/benefity zmíněny, rozumná náplň, žádné varovné signály).

DŮLEŽITÉ: Text popisu může být kvůli délce oříznutý (končí uprostřed věty). NEHODNOŤ to jako
neúplnost inzerátu — hodnoť jen kvalitu toho, co je uvedeno. Chybějící mzda/kontakt je běžné,
nesnižuj kvůli tomu skóre výrazně; kontaktní údaje se na portál doplňují zvlášť.

Vyšší = lepší nabídka. Nízké (0–30) = vágní, podezřelý nebo velmi neúplný inzerát.`,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  // Vrátí naparsované pole, nebo null pokud se JSON nepodařilo přečíst (dávka se pak
  // NEoznačí jako zpracovaná a příště se zkusí znovu).
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* padá níž */ }
    }
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
// Hodnotíme jen zobrazitelné joby — s prošlou lhůtou k přihlášení se stejně
// v "Vybraných" neukážou (getPremiumJobs je filtruje), tak je neplýtvej Claudem.
const cutoff = new Date();
cutoff.setUTCHours(0, 0, 0, 0);

let query = supabase
  .from("jobs")
  .select("id, title_cs, description_cs, company, category_level1, category_level2, includes_accommodation, is_premium")
  .eq("is_active", true)
  .or(`application_due_at.is.null,application_due_at.gte.${cutoff.toISOString()}`)
  .order("published_at", { ascending: false })
  .limit(LIMIT);

if (!REEVAL) query = query.is("premium_evaluated_at", null);

const { data: jobs, error } = await query;
if (error) { console.error("DB error:", error.message); process.exit(1); }

console.log(`${"─".repeat(64)}`);
console.log(`K vyhodnocení: ${jobs.length} inzerátů | práh: ${THRESHOLD}${REEVAL ? " | --reeval" : ""}${DRY_RUN ? " | DRY-RUN" : ""}`);
console.log(`${"─".repeat(64)}\n`);

if (jobs.length === 0) {
  console.log("Žádné nové inzeráty k vyhodnocení. Konec.");
  process.exit(0);
}

const results = [];

// Rozdělit na dávky a zpracovávat je po CONCURRENCY paralelně (jako translate.ts).
const batches = [];
for (let i = 0; i < jobs.length; i += BATCH) batches.push(jobs.slice(i, i + BATCH));
const CONCURRENCY = 6;
let done = 0;

async function processBatch(batch) {
  // Jeden pokus navíc, když Claude vrátí nevalidní JSON
  let q = await qualityBatch(batch);
  if (q === null) q = await qualityBatch(batch);
  const failed = q === null;
  const qMap = new Map((q ?? []).map((r) => [r.id, r]));

  const out = batch.map((job) => {
    const bonus = bonusScore(job);
    const qEntry = qMap.get(job.id) ?? { quality: 0, reason: "chybí" };
    const quality = Math.max(0, Math.min(100, Number(qEntry.quality) || 0));
    const final = Math.min(100, Math.round(quality + bonus)); // 0–100
    return {
      id: job.id,
      title: job.title_cs ?? "(bez názvu)",
      alreadyPremium: job.is_premium === true,
      bonus,
      quality,
      final,
      premium: !failed && final >= THRESHOLD,
      failed,          // nevalidní JSON → nezapisovat, příště zkusit znovu
      reason: qEntry.reason ?? "",
    };
  });

  done++;
  const flagged = out.filter((r) => r.premium).length;
  console.log(`  [${done}/${batches.length}] ${failed ? "CHYBA JSON (přeskočeno)" : `hotovo${flagged ? ` (${flagged} premium)` : ""}`}`);
  return out;
}

for (let i = 0; i < batches.length; i += CONCURRENCY) {
  const group = batches.slice(i, i + CONCURRENCY);
  const groupResults = await Promise.all(group.map(processBatch));
  for (const arr of groupResults) results.push(...arr);
}

// ── Zápis do DB ────────────────────────────────────────────────────────────
const NOW = new Date().toISOString();
const toPremium = results.filter((r) => r.premium && !r.failed).map((r) => r.id);
// "rest" = ohodnoceno, ale pod prahem → jen značka. Failed dávky se NEznačí (retry příště).
const rest = results.filter((r) => !r.premium && !r.failed).map((r) => r.id);
const failedCount = results.filter((r) => r.failed).length;

if (!DRY_RUN) {
  process.stdout.write("\nUkládám do DB… ");
  // Premium: povýšit is_premium + značka. Never demote → u ostatních is_premium NEsaháme.
  for (const c of chunk(toPremium, UPDATE_CHUNK)) {
    const { error: e1 } = await supabase
      .from("jobs")
      .update({ is_premium: true, premium_evaluated_at: NOW })
      .in("id", c);
    if (e1) { console.error("\nDB error (premium update):", e1.message); process.exit(1); }
  }
  for (const c of chunk(rest, UPDATE_CHUNK)) {
    const { error: e2 } = await supabase
      .from("jobs")
      .update({ premium_evaluated_at: NOW })
      .in("id", c);
    if (e2) { console.error("\nDB error (mark update):", e2.message); process.exit(1); }
  }
  console.log("hotovo.");
} else {
  console.log("\n[DRY-RUN] Nic se neuložilo.");
}

// ── Report ───────────────────────────────────────────────────────────────────
results.sort((a, b) => b.final - a.final);

console.log(`\n${"─".repeat(64)}`);
console.log(`Vyhodnoceno: ${results.length} | nově/premium (>= ${THRESHOLD}): ${toPremium.length} | pod prahem: ${rest.length}${failedCount ? ` | přeskočeno (chyba JSON): ${failedCount}` : ""}`);
console.log(`${"─".repeat(64)}`);

const shown = DRY_RUN ? results : results.filter((r) => r.premium);
for (const r of shown) {
  const mark = r.premium ? "★" : " ";
  const detail = DRY_RUN ? ` (kvalita ${r.quality} + bonus ${r.bonus})` : "";
  const wasPremium = r.alreadyPremium ? " [již premium]" : "";
  console.log(`  ${mark} ${String(r.final).padStart(3)}${detail}  ${r.title}${wasPremium}`);
  if (DRY_RUN && r.reason) console.log(`        → ${r.reason}`);
}

if (!DRY_RUN && toPremium.length === 0) {
  console.log("  (žádný inzerát nedosáhl prahu)");
}
