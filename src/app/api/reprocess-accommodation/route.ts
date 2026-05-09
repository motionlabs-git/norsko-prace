import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 120;

const client = new Anthropic();

// Check 10 jobs in one Claude call — returns array of {id, includes_accommodation}
async function checkBatch(
  jobs: Array<{ id: string; title: string; description_no: string }>
): Promise<Array<{ id: string; includes_accommodation: boolean }>> {
  const payload = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    // Truncate long descriptions — first 600 chars are usually enough for benefits section
    text: j.description_no?.slice(0, 600) ?? "",
  }));

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: `You detect whether Norwegian job ads include employer-provided accommodation.
Return ONLY a JSON array — no markdown, no commentary.
Each element: {"id": "<job id>", "includes_accommodation": true/false}

SET true if the employer provides housing/accommodation:
keywords: losji, bolig tilbys, bolig er inkludert, bolig inkludert, innkvartering, boplass, husvære, kost og losji, vi tilbyr bolig, gratis bolig, bolig på stedet, firmahytte, brakke, hybel tilbys

SET false if accommodation is not mentioned or only available for a fee.`,
    messages: [
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return jobs.map((j) => ({ id: j.id, includes_accommodation: false }));
  }
}

// Regex fallback on Norwegian text
function regexCheck(text: string): boolean {
  const t = text.toLowerCase();
  return [
    /\blosji\b/,
    /\binnkvartering\b/,
    /\bboplass\b/,
    /\bhusvære\b/,
    /kost\s+og\s+losji/,
    /bolig\s+(tilbys|inkludert|er\s+inkludert|på\s+stedet)/,
    /vi\s+tilbyr\s+bolig/,
    /gratis\s+bolig/,
    /firmahytte/,
    /\bbrakke\b/,
  ].some((p) => p.test(t));
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ??
    request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10),
    200
  );

  const db = supabaseAdmin();
  const { data: jobs, error } = await db
    .from("jobs")
    .select("id, title_no, description_no")
    .eq("is_active", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !jobs) {
    return NextResponse.json({ error: error?.message ?? "No data" }, { status: 500 });
  }

  const BATCH = 10;
  const results: Array<{
    id: string;
    title: string;
    claude: boolean;
    regex: boolean;
    final: boolean;
  }> = [];

  for (let i = 0; i < jobs.length; i += BATCH) {
    const chunk = jobs.slice(i, i + BATCH).map((j) => ({
      id: j.id as string,
      title: (j.title_no as string) ?? "",
      description_no: (j.description_no as string) ?? "",
    }));

    const claudeResults = await checkBatch(chunk);
    const claudeMap = new Map(claudeResults.map((r) => [r.id, r.includes_accommodation]));

    for (const job of chunk) {
      const claude = claudeMap.get(job.id) ?? false;
      const regex = regexCheck(job.description_no);
      const final = claude || regex;
      results.push({ id: job.id, title: job.title, claude, regex, final });
    }
  }

  // Update DB — only jobs where value changes
  const toSetTrue = results.filter((r) => r.final).map((r) => r.id);
  const toSetFalse = results.filter((r) => !r.final).map((r) => r.id);

  const updates = await Promise.all([
    toSetTrue.length > 0
      ? db.from("jobs").update({ includes_accommodation: true }).in("id", toSetTrue)
      : Promise.resolve({ error: null }),
    toSetFalse.length > 0
      ? db.from("jobs").update({ includes_accommodation: false }).in("id", toSetFalse)
      : Promise.resolve({ error: null }),
  ]);

  const updateError = updates.find((u) => u.error)?.error;
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const flagged = results.filter((r) => r.final);

  return NextResponse.json({
    ok: true,
    checked: results.length,
    flagged: flagged.length,
    details: flagged.map((r) => ({
      title: r.title,
      claude: r.claude,
      regex: r.regex,
    })),
    processedAt: new Date().toISOString(),
  });
}
