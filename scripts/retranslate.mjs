/**
 * Re-translate existing jobs with improved Sonnet prompt.
 * Usage:
 *   node scripts/retranslate.mjs --limit=3   # test first 3 jobs
 *   node scripts/retranslate.mjs             # all active jobs
 *   node scripts/retranslate.mjs --dry-run   # preview only, no DB write
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
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

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DRY_RUN = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;
const MAX_DESC_CHARS = 4000;

async function translateJob(title, description, company) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        tools: [{
          name: "translate_job",
          description: "Přelož norský pracovní inzerát do češtiny a slovenštiny",
          input_schema: {
            type: "object",
            properties: {
              title_cs:       { type: "string" },
              title_sk:       { type: "string" },
              description_cs: { type: "string" },
              description_sk: { type: "string" },
            },
            required: ["title_cs", "title_sk", "description_cs", "description_sk"],
          },
        }],
        tool_choice: { type: "tool", name: "translate_job" },
        messages: [{
          role: "user",
          content: `Jsi zkušený copywriter pracovního portálu. Přelož tento norský inzerát přirozeně do češtiny a slovenštiny TAK, aby zněl jako inzerát napsaný rodilým mluvčím, ne jako překlad.

PŘEKLAD — ZÁSADY:
- Nepřekládej doslova. Zachovej smysl, přizpůsob jazykové konvence.
- Tykání: "Hledáme tě", "Budeš mít na starosti", "Co ti nabízíme" — moderní standard CZ/SK inzerátů.
- Typické norské → české výrazy: "vi søker" → "Hledáme", "vi tilbyr" → "Co nabízíme", "arbeidsoppgaver" → "Náplň práce", "kvalifikasjoner / krav" → "Požadujeme / Co očekáváme", "Om oss / Om bedriften" → "O nás".
- HTML formát: <p> pro odstavce, <ul><li> pro seznamy, <strong> pro nadpisy sekcí. Žádné <h1>/<h2>.
- Vyhni se suchému, byrokratickému tónu. Piš přátelsky ale profesionálně.
- DŮLEŽITÉ: Jazyk "norsk/norština" překládej vždy jako "norština" (cs) / "nórčina" (sk) — NIKDY jako "čeština" nebo "slovenčina".
- Z description_cs a description_sk ODSTRAŇ: název firmy (viz "Firma" níže), kontaktní údaje (jméno, email, telefon) a veškeré URL (http://, https://, www.)
- Název firmy NEUVÁDEJ v title_cs ani title_sk

Firma: ${company}
Název: ${title}

Popis:
${description.slice(0, MAX_DESC_CHARS)}`,
        }],
      });

      const toolUse = response.content.find((b) => b.type === "tool_use");
      if (!toolUse?.input) return null;

      const result = toolUse.input;
      // Regex fallback — strip any URLs Claude may have missed
      const stripUrls = (text) => text
        ? text.replace(/https?:\/\/[^\s"'<>]+/gi, "").replace(/www\.[^\s"'<>]+/gi, "").trim()
        : text;
      result.description_cs = stripUrls(result.description_cs);
      result.description_sk = stripUrls(result.description_sk);
      return result;
    } catch (e) {
      if (e.status === 429 || e.message?.includes("overloaded")) {
        await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  return null;
}

async function main() {
  console.log(`🔄 Retranslating jobs (dry-run=${DRY_RUN}, limit=${LIMIT ?? "all"})...\n`);

  let query = db
    .from("jobs")
    .select("id, title_no, description_no, company")
    .eq("is_active", true)
    .not("description_no", "is", null)
    .order("published_at", { ascending: false });

  if (LIMIT) query = query.limit(LIMIT);

  const { data: jobs, error } = await query;
  if (error) { console.error("DB error:", error.message); process.exit(1); }

  console.log(`Found ${jobs.length} jobs to retranslate.\n`);

  let done = 0;
  const CONCURRENCY = 4;

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const chunk = jobs.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map((j) => translateJob(j.title_no ?? "", j.description_no ?? "", j.company ?? ""))
    );

    for (let idx = 0; idx < chunk.length; idx++) {
      const job = chunk[idx];
      const t = results[idx];
      if (!t) { console.log(`  ⚠ Failed: ${job.title_no}`); continue; }

      if (DRY_RUN) {
        console.log(`\n── ${job.title_no}`);
        console.log(`   CS title: ${t.title_cs}`);
        console.log(`   SK title: ${t.title_sk}`);
        console.log(`   CS desc preview: ${t.description_cs.replace(/<[^>]+>/g, " ").slice(0, 250).trim()}...`);
      } else {
        const { error: upErr } = await db
          .from("jobs")
          .update({ title_cs: t.title_cs, title_sk: t.title_sk, description_cs: t.description_cs, description_sk: t.description_sk })
          .eq("id", job.id);
        if (upErr) console.log(`  ⚠ Update failed for ${job.title_no}: ${upErr.message}`);
        else console.log(`  ✓ ${t.title_cs}`);
      }
      done++;
    }
  }

  console.log(`\n✅ Done — ${done}/${jobs.length} jobs ${DRY_RUN ? "previewed" : "updated"}`);
}

main().catch(console.error);
