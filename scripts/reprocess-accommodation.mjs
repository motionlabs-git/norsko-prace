// Run: node scripts/reprocess-accommodation.mjs
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

const LIMIT = parseInt(process.argv[2] ?? "200", 10);
const BATCH = 10;

function regexCheck(text) {
  const t = (text ?? "").toLowerCase();
  const negatives = [
    /tilbyr\s+dessverre\s+ikke\s+(overnatting|bolig|losji)/,
    /ikke\s+(tilbyr|inkludert)\s+(bolig|losji|overnatting)/,
    /boligen\s+tilbyr\s+heldøgns/,
    /tilgang\s+til\s+firmahytter/,
  ];
  if (negatives.some((p) => p.test(t))) return false;
  return [
    /\blosji\b/,
    /\binnkvartering\b/,
    /\bboplass\b/,
    /\bhusvære\b/,
    /kost\s+og\s+losji/,
    /bolig\s+(tilbys|inkludert|er\s+inkludert|på\s+stedet)/,
    /vi\s+tilbyr\s+bolig/,
    /gratis\s+bolig/,
    /personalbolig/,
    /\bfirmahytte\b/,
    /\bbrakke\b/,
    /hybel\s+tilbys/,
    /\bovernatting\s+inkludert\b/,
  ].some((p) => p.test(t));
}

async function checkBatch(jobs) {
  const payload = jobs.map((j) => ({
    id: j.id,
    title: j.title_no ?? "",
    text: (j.description_no ?? "").slice(0, 800),
  }));

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: `Detect if Norwegian job ads include employer-provided accommodation for the worker.
Return ONLY a JSON array, no markdown.
Each element: {"id":"<id>","includes_accommodation":true/false}

TRUE if employer offers housing/accommodation as a benefit:
"losji", "kost og losji", "bolig tilbys", "bolig inkludert", "bolig er inkludert", "vi tilbyr bolig",
"gratis bolig", "bolig på stedet", "innkvartering", "boplass", "husvære", "brakke", "firmahytte",
"hybel tilbys", "overnatting inkludert", "fri bolig", "bolig kan ordnes", "vi hjelper med bolig"

FALSE if:
- accommodation not mentioned
- accommodation is explicitly denied ("tilbyr dessverre ikke overnatting")
- "bolig" refers to the job location/type (e.g. cleaning homes, working at care facility)
- accommodation is for a fee with no employer subsidy`,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });

  const text = msg.content[0].text;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : jobs.map((j) => ({ id: j.id, includes_accommodation: false }));
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const { data: jobs, error } = await supabase
  .from("jobs")
  .select("id, title_no, description_no")
  .eq("is_active", true)
  .order("published_at", { ascending: false })
  .limit(LIMIT);

if (error) { console.error("DB error:", error.message); process.exit(1); }
console.log(`Fetched ${jobs.length} jobs. Processing in batches of ${BATCH}...\n`);

const results = [];

for (let i = 0; i < jobs.length; i += BATCH) {
  const chunk = jobs.slice(i, i + BATCH);
  const batchNum = Math.floor(i / BATCH) + 1;
  const total = Math.ceil(jobs.length / BATCH);
  process.stdout.write(`  Batch ${batchNum}/${total}... `);

  const claudeResults = await checkBatch(chunk);
  const claudeMap = new Map(claudeResults.map((r) => [r.id, r.includes_accommodation]));

  for (const job of chunk) {
    const claude = claudeMap.get(job.id) ?? false;
    const regex = regexCheck(job.description_no);
    results.push({ id: job.id, title: job.title_no, claude, regex, final: claude || regex });
  }

  const batchFlagged = results.slice(i, i + BATCH).filter((r) => r.final).length;
  console.log(`done${batchFlagged ? ` (${batchFlagged} s ubytováním)` : ""}`);
}

// Update DB
const toTrue  = results.filter((r) =>  r.final).map((r) => r.id);
const toFalse = results.filter((r) => !r.final).map((r) => r.id);

process.stdout.write("\nUkládám do DB... ");
await Promise.all([
  toTrue.length  ? supabase.from("jobs").update({ includes_accommodation: true  }).in("id", toTrue)  : null,
  toFalse.length ? supabase.from("jobs").update({ includes_accommodation: false }).in("id", toFalse) : null,
]);
console.log("hotovo.\n");

// Report
const flagged = results.filter((r) => r.final);
console.log(`${"─".repeat(60)}`);
console.log(`Zkontrolováno: ${results.length} | S ubytováním: ${flagged.length}`);
console.log(`${"─".repeat(60)}`);

if (flagged.length === 0) {
  console.log("Žádné inzeráty s ubytováním nenalezeny.");
} else {
  for (const r of flagged) {
    const method = r.claude && r.regex ? "Claude+regex" : r.claude ? "Claude" : "regex";
    console.log(`  [${method.padEnd(12)}] ${r.title}`);
  }
}

const mismatch = results.filter((r) => r.claude !== r.regex);
if (mismatch.length) {
  console.log(`\nNeshody Claude vs regex (${mismatch.length}):`);
  for (const r of mismatch) {
    console.log(`  Claude=${String(r.claude).padEnd(5)} regex=${String(r.regex).padEnd(5)} | ${r.title}`);
  }
}
