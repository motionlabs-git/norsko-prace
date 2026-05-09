import { NextRequest, NextResponse } from "next/server";
import { iterateFeed } from "@/lib/nav-api";
import { iterateFinnFeed } from "@/lib/finn-api";
import { translateBatch } from "@/lib/translate";
import { upsertJobs, deactivateJobs, vacancyToJobRow, finnJobToRow } from "@/lib/jobs";
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

  const skipNav = request.nextUrl.searchParams.get("skip_nav") === "1";
  const skipFinn = request.nextUrl.searchParams.get("skip_finn") === "1";

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
  let finnFetched = 0;
  let finnUpserted = 0;

  // ── NAV sync ────────────────────────────────────────────────────────────────
  if (!skipNav) {
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
  }

  // ── Finn sync ────────────────────────────────────────────────────────────────
  if (!skipFinn) {
    try {
      const finnStats = await iterateFinnFeed(async (finnJobs) => {
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

        const upserted = await upsertJobs(rows);
        finnUpserted += upserted;
      });

      finnFetched = finnStats.fetched;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Finn sync error:", message);
      // Non-fatal — log and continue
    }
  }

  // Persist sync record only on success
  await db.from("sync_log").insert({
    synced_at: syncStarted,
    pages,
    processed: totalProcessed,
    upserted: totalUpserted + finnUpserted,
    deactivated: totalInactive,
    filtered_norwegian: totalFilteredNorwegian,
    filtered_no_contact: totalFilteredNoContact,
  });

  return NextResponse.json({
    ok: true,
    sinceDate,
    nav: { pages, processed: totalProcessed, upserted: totalUpserted, deactivated: totalInactive, filteredNorwegian: totalFilteredNorwegian, filteredNoContact: totalFilteredNoContact },
    finn: { fetched: finnFetched, upserted: finnUpserted },
    syncedAt: syncStarted,
  });
}
