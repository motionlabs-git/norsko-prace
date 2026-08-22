import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "./supabase";

// Automatické hodnocení "premium" (vybraných) inzerátů.
// Skóre 0–100 = kvalita od Clauda (0–100) + bonusy (ubytování, atraktivní obor).
// Nad prahem → is_premium = true. NIKDY nesnižuje už nastavené premium (jen povyšuje).
// Manuální/backfill varianta téže logiky: scripts/evaluate-premium.mjs (drž je v souladu).

const client = new Anthropic();

// ── Ladicí konstanty (musí sedět s scripts/evaluate-premium.mjs) ───────────────
export const PREMIUM_THRESHOLD = 85;
const ACCOMMODATION_BONUS = 25; // ubytování = velká výhoda pro zahraniční pracovníky
const TOP_SECTOR_BONUS = 8;
const MID_SECTOR_BONUS = 4;
const BATCH = 10;
const CONCURRENCY = 6;
const UPDATE_CHUNK = 100;
const DEFAULT_LIMIT = 500;

const TOP_SECTORS = new Set([
  "Reiseliv og mat",
  "Jordbruk, skogbruk og fiske",
  "Natur og miljø",
]);
const MID_SECTORS = new Set([
  "Bygg og anlegg",
  "Transport og logistikk",
  "Industriarbeid",
]);

interface PremiumJobRow {
  id: string;
  title_cs: string | null;
  description_cs: string | null;
  company: string | null;
  category_level1: string | null;
  includes_accommodation: boolean | null;
}

export interface PremiumEvalResult {
  evaluated: number; // ohodnoceno a označeno
  premium: number; // z toho povýšeno na premium
  failed: number; // dávky s nevalidním JSON (neoznačeno, retry příště)
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function bonusScore(job: PremiumJobRow): number {
  let s = 0;
  if (job.includes_accommodation === true) s += ACCOMMODATION_BONUS;
  if (job.category_level1 && TOP_SECTORS.has(job.category_level1)) s += TOP_SECTOR_BONUS;
  else if (job.category_level1 && MID_SECTORS.has(job.category_level1)) s += MID_SECTOR_BONUS;
  return s;
}

function stripHtml(s: string | null): string {
  return (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Vrátí naparsované pole, nebo null pokud JSON nešel přečíst (dávka se pak neoznačí).
async function qualityBatch(
  jobs: PremiumJobRow[]
): Promise<Array<{ id: string; quality: number }> | null> {
  const payload = jobs.map((j) => ({
    id: j.id,
    title: j.title_cs ?? "",
    company: j.company ?? "",
    category: j.category_level1 ?? "",
    description: stripHtml(j.description_cs).slice(0, 1500),
  }));

  let msg;
  try {
    msg = await client.messages.create({
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
  } catch (err) {
    console.error("evaluateNewPremium Claude error:", err instanceof Error ? err.message : err);
    return null; // → dávka se označí jako failed a zkusí se příště
  }

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* padá níž */
      }
    }
    return null;
  }
}

// Ohodnotí jednu dávku → seznam id k povýšení / označení; failed = nevalidní JSON.
async function processBatch(
  batch: PremiumJobRow[]
): Promise<{ toPremium: string[]; rest: string[]; failed: boolean }> {
  let q = await qualityBatch(batch);
  if (q === null) q = await qualityBatch(batch); // jeden pokus navíc
  if (q === null) return { toPremium: [], rest: [], failed: true };

  const qMap = new Map(q.map((r) => [r.id, r]));
  const toPremium: string[] = [];
  const rest: string[] = [];
  for (const job of batch) {
    const quality = Math.max(0, Math.min(100, Number(qMap.get(job.id)?.quality) || 0));
    const final = Math.min(100, Math.round(quality + bonusScore(job)));
    if (final >= PREMIUM_THRESHOLD) toPremium.push(job.id);
    else rest.push(job.id);
  }
  return { toPremium, rest, failed: false };
}

/**
 * Ohodnotí dosud nehodnocené, zobrazitelné aktivní inzeráty a povýší nejlepší na premium.
 * Zapisuje průběžně po skupinách — odolné vůči timeoutu sync route (nedokončené se
 * neoznačí a příště se zkusí znovu). Volá se na konci /api/sync i /api/sync-finn.
 */
export async function evaluateNewPremium(opts?: { limit?: number }): Promise<PremiumEvalResult> {
  const db = supabaseAdmin();

  // Jen zobrazitelné joby — s prošlou lhůtou k přihlášení se ve "Vybraných" stejně neukážou.
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);

  const { data: jobs, error } = await db
    .from("jobs")
    .select("id, title_cs, description_cs, company, category_level1, includes_accommodation")
    .eq("is_active", true)
    .is("premium_evaluated_at", null)
    .or(`application_due_at.is.null,application_due_at.gte.${cutoff.toISOString()}`)
    .order("published_at", { ascending: false })
    .limit(opts?.limit ?? DEFAULT_LIMIT);

  if (error) {
    console.error("evaluateNewPremium select error:", error.message);
    return { evaluated: 0, premium: 0, failed: 0 };
  }
  if (!jobs || jobs.length === 0) return { evaluated: 0, premium: 0, failed: 0 };

  const NOW = new Date().toISOString();
  const batches = chunk(jobs as PremiumJobRow[], BATCH);
  let evaluated = 0;
  let premium = 0;
  let failed = 0;

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const group = batches.slice(i, i + CONCURRENCY);
    const groupResults = await Promise.all(group.map(processBatch));

    const toPremium = groupResults.flatMap((r) => r.toPremium);
    const rest = groupResults.flatMap((r) => r.rest);
    failed += groupResults.filter((r) => r.failed).length * BATCH;

    // Zápis skupiny hned — přežije timeout. Premium povyšuje, ostatní jen značí (never demote).
    for (const c of chunk(toPremium, UPDATE_CHUNK)) {
      const { error: e1 } = await db
        .from("jobs")
        .update({ is_premium: true, premium_evaluated_at: NOW })
        .in("id", c);
      if (e1) console.error("evaluateNewPremium premium update error:", e1.message);
    }
    for (const c of chunk(rest, UPDATE_CHUNK)) {
      const { error: e2 } = await db
        .from("jobs")
        .update({ premium_evaluated_at: NOW })
        .in("id", c);
      if (e2) console.error("evaluateNewPremium mark update error:", e2.message);
    }

    evaluated += toPremium.length + rest.length;
    premium += toPremium.length;
  }

  return { evaluated, premium, failed };
}
