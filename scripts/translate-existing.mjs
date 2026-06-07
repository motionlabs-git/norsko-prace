/**
 * Translate existing jobs in Supabase to Czech only
 * Usage: node scripts/translate-existing.mjs [--max-jobs=1000]
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

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

async function claudeProcessCZ(job) {
  const title = job.title_no ?? "";
  const company = job.company ?? "";
  const description = (job.description_no ?? "").slice(0, MAX_DESC_CHARS);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        tools: [{
          name: "process_job",
          description: "Zpracuj norský inzerát do češtiny",
          input_schema: {
            type: "object",
            properties: {
              title_cs: { type: "string" },
              description_cs: { type: "string" },
            },
            required: ["title_cs", "description_cs"],
          },
        }],
        tool_choice: { type: "tool", name: "process_job" },
        messages: [{
          role: "user",
          content: `Jsi zkušený copywriter pracovního portálu. Přelož tento norský inzerát přirozeně do češtiny TAK, aby zněl jako inzerát napsaný rodilým mluvčím, ne jako překlad.

PŘEKLAD — ZÁSADY:
- Nepřekládej doslova. Zachovej smysl, přizpůsob jazykové konvence.
- Tykání: "Hledáme tě", "Budeš mít na starosti", "Co ti nabízíme" — moderní standard CZ inzerátů.
- Typické norské → české výrazy: "vi søker" → "Hledáme", "vi tilbyr" → "Co nabízíme", "arbeidsoppgaver" → "Náplň práce", "kvalifikasjoner / krav" → "Požadujeme / Co očekáváme", "Om oss / Om bedriften" → "O nás".
- HTML formát: <p> pro odstavce, <ul><li> pro seznamy, <strong> pro nadpisy sekcí. Žádné <h1>/<h2>.
- Vyhni se suchému, byrokratickému tónu. Piš přátelsky ale profesionálně.
- DŮLEŽITÉ: Jazyk "norsk/norština" překládej vždy jako "norština" — NIKDY jako "čeština".
- Z popisu ODSTRAŇ: název firmy (viz "Firma" níže), kontaktní údaje a veškeré URL (http://, https://, www.)
- Název firmy NEUVÁDEJ v title_cs

Firma: ${company}
Název: ${title}

Popis:
${description}`,
        }],
      });

      const toolUse = response.content.find((b) => b.type === "tool_use");
      const result = toolUse?.input ?? null;
      if (result) {
        // Strip any URLs Claude may have missed
        const stripUrls = (text) => text
          ? text.replace(/https?:\/\/[^\s"'<>]+/gi, "").replace(/www\.[^\s"'<>]+/gi, "").trim()
          : text;
        result.description_cs = stripUrls(result.description_cs);
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

// ── Main ─────────────────────────────────────────────────────────────────────
console.log("🔄 Translating jobs to Czech — starting...\n");

const args = process.argv.slice(2);
const maxJobs = parseInt(args.find(a => a.startsWith("--max-jobs="))?.split("=")[1] ?? "1000", 10);

console.log(`📊 Fetching first ${maxJobs} jobs from Supabase...\n`);

// Get active jobs that have Norwegian content but are NOT yet translated to Czech
const { data: jobs, error: fetchError } = await db
  .from("jobs")
  .select("id, nav_id, title_no, description_no, company")
  .eq("is_active", true)
  .not("title_no", "is", null)
  .not("description_no", "is", null)
  .or("title_cs.is.null,title_cs.eq.")
  .limit(maxJobs);

if (fetchError) {
  console.error("Error fetching jobs:", fetchError.message);
  process.exit(1);
}

console.log(`Found ${jobs.length} jobs to translate\n`);

let translated = 0;
let skipped = 0;

for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i];
  process.stdout.write(`[${i + 1}/${jobs.length}] Job ${job.nav_id}... `);

  try {
    const cs = await claudeProcessCZ(job);
    if (!cs || !cs.title_cs || !cs.description_cs) {
      console.log("⚠️  No translation");
      skipped++;
      continue;
    }

    // Update job in Supabase
    const { error: updateError } = await db
      .from("jobs")
      .update({
        title_cs: cs.title_cs,
        description_cs: cs.description_cs,
      })
      .eq("id", job.id);

    if (updateError) {
      console.log(`❌ DB error: ${updateError.message}`);
      skipped++;
    } else {
      console.log("✅ Translated");
      translated++;
    }
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
    skipped++;
  }

  // Rate limit: 200ms between requests
  if (i < jobs.length - 1) {
    await new Promise(r => setTimeout(r, 200));
  }
}

console.log(`
✅ Translation complete
   Translated: ${translated}
   Skipped:    ${skipped}
`);
