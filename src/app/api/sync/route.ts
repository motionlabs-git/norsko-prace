import { NextRequest, NextResponse } from "next/server";
import { iterateFeed } from "@/lib/nav-api";
import { translateBatch } from "@/lib/translate";
import { upsertJobs, deactivateJobs, vacancyToJobRow } from "@/lib/jobs";
import { supabaseAdmin } from "@/lib/supabase";
import type { NavVacancy } from "@/types";

export const maxDuration = 300; // Vercel max for hobby plan

export async function GET(request: NextRequest) {
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  // Manual calls can use: x-cron-secret header or ?secret= query param
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret = bearerToken
    ?? request.headers.get("x-cron-secret")
    ?? request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  // Use ?since=<ISO> override, otherwise load from last successful sync
  const sinceOverride = request.nextUrl.searchParams.get("since");
  let sinceDate: string | null = sinceOverride;

  if (!sinceDate) {
    const { data } = await db
      .from("sync_log")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();
    sinceDate = data?.synced_at ?? null;
  }

  const syncStarted = new Date().toISOString();

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

        const nonNorwegian = allRows.filter((r) => {
          if (r.requires_norwegian) { totalFilteredNorwegian++; return false; }
          return true;
        });

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
    const cause = err instanceof Error && (err as NodeJS.ErrnoException).cause;
    console.error("NAV sync error:", message, cause ?? "");
    return NextResponse.json({ error: message, cause: String(cause ?? "") }, { status: 500 });
  }

  // Deactivate jobs whose expires_at has passed (NAV doesn't always send INACTIVE for these)
  const { data: expiredData } = await db
    .from("jobs")
    .update({ is_active: false })
    .eq("is_active", true)
    .not("expires_at", "is", null)
    .lt("expires_at", syncStarted)
    .select("id");

  const totalExpired = expiredData?.length ?? 0;

  await db.from("sync_log").insert({
    synced_at: syncStarted,
    pages,
    processed: totalProcessed,
    upserted: totalUpserted,
    deactivated: totalInactive + totalExpired,
    filtered_norwegian: totalFilteredNorwegian,
    filtered_no_contact: totalFilteredNoContact,
  });

  return NextResponse.json({
    ok: true,
    sinceDate,
    pages,
    processed: totalProcessed,
    upserted: totalUpserted,
    deactivatedByNAV: totalInactive,
    deactivatedExpired: totalExpired,
    filteredNorwegian: totalFilteredNorwegian,
    filteredNoContact: totalFilteredNoContact,
    syncedAt: syncStarted,
  });
}
