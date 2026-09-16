// Backfill termínu práce (jobs.work_start / work_end) pro živé inzeráty, které ho ještě nemají.
// Nové inzeráty ho dostávají rovnou při překladu (src/lib/translate.ts) — tohle je jen pro stávající.
//
// Náhled (bez API):        node scripts/backfill-work-period.mjs --dry-run
// Ukázka (API, nezapisuje): node scripts/backfill-work-period.mjs --preview=10
// Zkušebně (zapíše N):     node scripts/backfill-work-period.mjs --limit=20
// Ostře:                   node scripts/backfill-work-period.mjs
//
// Vyžaduje: supabase/migrations/20260915_jobs_work_period.sql
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length && !k.trim().startsWith("#")) process.env[k.trim()] = v.join("=").trim();
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic();

const DRY_RUN = process.argv.includes("--dry-run");
const PREVIEW = parseInt(process.argv.find((a) => a.startsWith("--preview="))?.split("=")[1] ?? "0", 10) || 0;
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10) || 0;
const CONCURRENCY = 5;
const MODEL = "claude-opus-5";

// Stejná pravidla jako work_start/work_end v src/lib/translate.ts
const SYSTEM = `You extract the work period from a Norwegian job ad for a job portal filter.
Resolve dates relative to "Published" (the ad's publication date).
- work_start (YYYY-MM-DD): explicit date → that date. Only a month ("fra oktober") → first day of its next occurrence after Published. "snarest"/"straks"/ASAP/"etter avtale"/permanent position → Published. Season only: summer ("sommersesong", "sommerjobb") → June 1; winter ("vintersesong", "sesongen 2026/2027") → December 1 (next occurrence). null if the ad gives no hint at all.
- work_end (YYYY-MM-DD): only a month ("ut august", "til slutten av mai") → last day of that month. Summer season → August 31; winter season → April 30 of the following year. null for permanent/open-ended positions or when unknown.
- Never invent dates: if the ad says nothing about timing, both are null.
- evidence: the short phrase from the ad your dates are based on (max 120 chars), or null.`;

const SCHEMA = {
  type: "object",
  properties: {
    work_start: { type: ["string", "null"] },
    work_end: { type: ["string", "null"] },
    evidence: { type: ["string", "null"] },
  },
  required: ["work_start", "work_end", "evidence"],
  additionalProperties: false,
};

const validDate = (d) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime()) ? d : null);
const stripHtml = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function extract(job) {
  const published = (job.published_at ?? new Date().toISOString()).slice(0, 10);
  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // odmítnutí → server zkusí doporučený záložní model
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `Published: ${published}\nEngagement type: ${job.engagement_type ?? "unknown"}\nTitle: ${job.title_no ?? job.title_cs}\n\n${stripHtml(job.description_no ?? job.description_cs)}`,
    }],
  });
  if (response.stop_reason === "refusal") throw new Error("refusal");
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error(`bez výstupu (stop_reason ${response.stop_reason})`);
  const out = JSON.parse(text);
  const start = validDate(out.work_start);
  let end = validDate(out.work_end);
  if (start && end && end < start) end = null;
  return { start, end, evidence: out.evidence, usage: response.usage };
}

const { data: jobs, error } = await supabase
  .from("jobs")
  .select("id, title_no, title_cs, description_no, description_cs, engagement_type, published_at")
  .eq("is_active", true)
  .is("work_period_evaluated_at", null)
  .order("published_at", { ascending: false });
if (error) { console.error("DB:", error.message); process.exit(1); }

const todo = PREVIEW ? jobs.slice(0, PREVIEW) : LIMIT ? jobs.slice(0, LIMIT) : jobs;
console.log(`živých bez termínu: ${jobs.length} | zpracuji: ${todo.length}${PREVIEW ? " (preview — nic se nezapíše)" : ""}`);
if (DRY_RUN) { console.log("--dry-run: bez volání API a bez zápisu."); process.exit(0); }

let done = 0, withDates = 0, failed = 0, inTok = 0, outTok = 0;
const t0 = Date.now();
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  const chunk = todo.slice(i, i + CONCURRENCY);
  const results = await Promise.allSettled(chunk.map(extract));
  for (let j = 0; j < chunk.length; j++) {
    const job = chunk[j], r = results[j];
    if (r.status === "rejected") { failed++; console.log(`  ❌ ${job.title_cs?.slice(0, 50)} — ${r.reason?.message ?? r.reason}`); continue; }
    const { start, end, evidence, usage } = r.value;
    inTok += usage?.input_tokens ?? 0; outTok += usage?.output_tokens ?? 0;
    done++; if (start) withDates++;
    if (PREVIEW) {
      console.log(`  ${start ?? "—"} → ${end ?? (start ? "bez konce" : "—")} | ${job.title_cs?.slice(0, 45)} | „${(evidence ?? "").slice(0, 70)}“`);
      continue;
    }
    const { error: upErr } = await supabase
      .from("jobs")
      .update({ work_start: start, work_end: end, work_period_evaluated_at: new Date().toISOString() })
      .eq("id", job.id);
    if (upErr) { failed++; done--; console.log(`  ❌ DB: ${upErr.message}`); }
  }
  if (!PREVIEW) console.log(`… ${Math.min(i + CONCURRENCY, todo.length)}/${todo.length} | s termínem ${withDates} | chyby ${failed}`);
}

// Opus 5: $5 / 1M vstup, $25 / 1M výstup
const cost = (inTok * 5 + outTok * 25) / 1e6;
console.log(`\nhotovo: ${done} (s termínem ${withDates}, bez termínu ${done - withDates}) | chyby ${failed} | ${((Date.now() - t0) / 1000).toFixed(0)} s | ~${cost.toFixed(2)} USD`);
if (done) console.log(`průměr na inzerát ~${(cost / done).toFixed(4)} USD → zbytek ${jobs.length - todo.length} inzerátů ~${((cost / done) * (jobs.length - todo.length)).toFixed(2)} USD`);
