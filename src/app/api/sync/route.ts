import { NextRequest, NextResponse } from "next/server";
import { iterateFeed } from "@/lib/nav-api";
import { translateBatch } from "@/lib/translate";
import { upsertJobs, deactivateJobs, vacancyToJobRow } from "@/lib/jobs";
import type { NavVacancy } from "@/types";

export const maxDuration = 300; // Vercel max for hobby plan

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ??
    request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sinceDate = request.nextUrl.searchParams.get("since") ?? null;

  let totalProcessed = 0;
  let totalUpserted = 0;
  let totalInactive = 0;
  let pages = 0;

  let totalFilteredNorwegian = 0;
  let totalFilteredNoContact = 0;

  try {
    const stats = await iterateFeed(
      sinceDate,
      async (vacancies: NavVacancy[]) => {
        totalProcessed += vacancies.length;

        const translations = await translateBatch(
          vacancies.map((v) => ({
            title: v.ad_content?.title ?? "",
            description: v.ad_content?.description ?? "",
            company: v.ad_content?.employer?.name ?? "",
            contactList: v.ad_content?.contactList,
          }))
        );

        const allRows = vacancies.map((v, i) => vacancyToJobRow(v, translations[i]));

        // Drop jobs requiring Norwegian — wrong audience
        const nonNorwegian = allRows.filter((r) => {
          if (r.requires_norwegian) { totalFilteredNorwegian++; return false; }
          return true;
        });

        // Drop jobs with no way to apply (no URL and no extracted contact)
        const withContact = nonNorwegian.filter((r) => {
          const hasContact = r.application_url || r.contact_name || r.contact_email || r.contact_phone;
          if (!hasContact) { totalFilteredNoContact++; return false; }
          return true;
        });

        const upserted = await upsertJobs(withContact);
        totalUpserted += upserted;
      },
      async (navIds: string[]) => {
        totalInactive += navIds.length;
        await deactivateJobs(navIds);
      }
    );

    pages = stats.pages;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Sync error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    pages,
    processed: totalProcessed,
    filteredNorwegian: totalFilteredNorwegian,
    filteredNoContact: totalFilteredNoContact,
    upserted: totalUpserted,
    deactivated: totalInactive,
    syncedAt: new Date().toISOString(),
  });
}
