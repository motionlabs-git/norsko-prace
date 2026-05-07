/**
 * Recheck requires_norwegian for all jobs currently marked false.
 * Uses the Czech translation to detect if the job actually requires Norwegian.
 * Usage: node scripts/recheck-norwegian.mjs [--dry-run]
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

const SYSTEM = `You check whether a Czech-translated job description requires Norwegian language skills.

Answer with a single JSON object: { "requires_norwegian": true | false }

SET TRUE if the description mentions that Norwegian is required or expected:
"norština", "norsky", "norštině", "norský jazyk", "plynně norsky", "komunikace v norštině",
"znalost norštiny", "mluvit norsky", "rozumět norštině", "norské prostředí (komunikace)",
"dobrá komunikace v norštině", or any phrase indicating Norwegian is needed to do the job.

SET FALSE only if:
- Norwegian is NOT mentioned at all, OR
- Norwegian is explicitly listed as "výhoda" / "plus" / "vítána" with no mandatory requirement, OR
- The description says English OR Norwegian is sufficient ("norsky nebo anglicky", "norština nebo angličtina").

Do NOT set false just because English is also mentioned — if Norwegian is required AND English is a bonus, that is still true.`;

async function checkJob(id, title, description) {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 64,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Title: ${title}\n\nDescription (first 800 chars): ${description.slice(0, 800)}`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  try {
    const parsed = JSON.parse(text);
    return parsed.requires_norwegian === true;
  } catch {
    const match = text.match(/"requires_norwegian"\s*:\s*(true|false)/);
    return match ? match[1] === "true" : false;
  }
}

async function main() {
  console.log(`🔍 Rechecking requires_norwegian (dry-run=${DRY_RUN})...\n`);

  const { data: jobs, error } = await db
    .from("jobs")
    .select("id, title_cs, description_cs, title_no")
    .eq("is_active", true)
    .eq("requires_norwegian", false)
    .not("description_cs", "is", null);

  if (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }

  console.log(`Found ${jobs.length} jobs with requires_norwegian=false to recheck.\n`);

  const toUpdate = [];
  const BATCH = 8;

  for (let i = 0; i < jobs.length; i += BATCH) {
    const chunk = jobs.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map((j) => checkJob(j.id, j.title_cs ?? j.title_no ?? "", j.description_cs ?? ""))
    );

    chunk.forEach((j, idx) => {
      const nowRequires = results[idx];
      if (nowRequires) {
        console.log(`  ✗ NEEDS NORWEGIAN: ${j.title_cs ?? j.title_no} [${j.id.slice(0, 8)}]`);
        toUpdate.push(j.id);
      } else {
        console.log(`  ✓ OK (no Norwegian required): ${j.title_cs ?? j.title_no}`);
      }
    });

    process.stdout.write(`  Progress: ${Math.min(i + BATCH, jobs.length)}/${jobs.length}\n`);
  }

  console.log(`\n📊 Result: ${toUpdate.length} jobs should be updated to requires_norwegian=true`);

  if (toUpdate.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  if (DRY_RUN) {
    console.log("--dry-run mode, skipping DB update.");
    return;
  }

  const { error: updateError } = await db
    .from("jobs")
    .update({ requires_norwegian: true })
    .in("id", toUpdate);

  if (updateError) {
    console.error("Update error:", updateError.message);
    process.exit(1);
  }

  console.log(`✅ Updated ${toUpdate.length} jobs to requires_norwegian=true`);
}

main().catch(console.error);
