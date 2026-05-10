import { NextRequest, NextResponse } from "next/server";
import { iterateFinnFeed } from "@/lib/finn-api";
import { translateBatch } from "@/lib/translate";
import { upsertJobs, finnJobToRow } from "@/lib/jobs";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret =
    bearerToken ??
    request.headers.get("x-cron-secret") ??
    request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let fetched = 0;
  let upserted = 0;

  try {
    const stats = await iterateFinnFeed(async (finnJobs) => {
      const translations = await translateBatch(
        finnJobs.map((j) => ({
          title: j.title,
          description: j.description,
          company: j.company ?? "",
          contactList:
            j.contactEmail || j.contactPhone || j.contactName
              ? [{ name: j.contactName ?? undefined, email: j.contactEmail ?? undefined, phone: j.contactPhone ?? undefined }]
              : undefined,
        }))
      );

      const rows = finnJobs
        .map((j, i) => finnJobToRow(j, translations[i]))
        .filter((r) => !r.requires_norwegian);

      upserted += await upsertJobs(rows);
    });

    fetched = stats.fetched;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Finn sync error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fetched, upserted });
}
