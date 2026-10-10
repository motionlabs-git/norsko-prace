import { NextRequest, NextResponse } from "next/server";
import { iterateFeed, permanentTradeOf } from "@/lib/nav-api";
import { translateBatch } from "@/lib/translate";
import {
  upsertJobs,
  deactivateJobs,
  vacancyToJobRow,
  splitUnchangedVacancies,
  refreshJobMeta,
} from "@/lib/jobs";
import { supabaseAdmin } from "@/lib/supabase";
import type { NavVacancy } from "@/types";

export const maxDuration = 300;

// Vlastní běh pro stálé pozice — oddělený od sezónního syncu, aby se objem překladů
// u řemesel nepral o čas se sezónními inzeráty a šel vypnout nezávisle.
const FEED_BUDGET_MS = 180_000;
const MAX_HOPS = 20;
// Po chybě (typicky výpadek NAV) stačí pár pokusů — dvacet jen zasype log prázdnými běhy
const ERROR_MAX_HOPS = 3;
const KIND = "permanent";

/** Veřejná adresa pro navázání — origin z Vercel Cronu na ni nemusí ukazovat. */
function selfBase(request: NextRequest): string {
  const configured = process.env.CRON_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  return request.nextUrl.origin;
}

/** Navazující běh; čeká jen na přijetí požadavku. False = nerozjel se nebo vyčerpaná navázání. */
async function chainNext(request: NextRequest, hop: number, maxHops = MAX_HOPS): Promise<boolean> {
  if (hop >= maxHops) return false;
  const url = `${selfBase(request)}/api/sync-permanent?hop=${hop + 1}`;
  try {
    await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name !== "TimeoutError" && name !== "AbortError") {
      console.error(`navazující běh se nepodařilo spustit (${url}):`, err);
      return false;
    }
  }
  return true;
}

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

  const hop = Number(request.nextUrl.searchParams.get("hop") ?? "0") || 0;
  const startedAt = Date.now();
  const syncStarted = new Date(startedAt).toISOString();
  const db = supabaseAdmin();

  // Prošlé deaktivovat vždy a jako první — nezávisle na tom, jestli feed doběhne
  const { data: expiredData } = await db
    .from("jobs")
    .update({ is_active: false })
    .eq("is_active", true)
    .not("expires_at", "is", null)
    .lt("expires_at", syncStarted)
    .select("id");
  const totalExpired = expiredData?.length ?? 0;

  // Kurzor jen v rámci vlastní větve (kind) — sezónní běh má svůj.
  // Bereme NEJNOVĚJŠÍ synced_at, aby nedokončený běh netáhl kurzor zpět a cron se nezacyklil.
  // Důsledek pro doplnění historie: `?since=` je potřeba předat KAŽDÉMU volání (a posouvat ho
  // podle vráceného `cursor`) — jinak navazující běh skočí zpátky na aktuální konec feedu.
  const sinceOverride = request.nextUrl.searchParams.get("since");
  let sinceDate: string | null = sinceOverride;
  if (!sinceDate) {
    const { data } = await db
      .from("sync_log")
      .select("synced_at")
      .eq("kind", KIND)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sinceDate = data?.synced_at ?? null;
  }

  let totalProcessed = 0;
  let totalUpserted = 0;
  let totalInactive = 0;
  let totalUnchanged = 0;
  let totalFailedTranslation = 0;
  let totalFilteredNoContact = 0;
  let totalNorwegianFlagged = 0;
  let pages = 0;
  // Bez uloženého kurzoru začínáme 14 dní zpět — první běh tak nestáhne celou historii feedu
  let cursor = sinceDate ?? new Date(startedAt - 14 * 24 * 3600 * 1000).toISOString();

  const { data: logRow } = await db
    .from("sync_log")
    .insert({
      kind: KIND,
      synced_at: cursor,
      pages: 0,
      processed: 0,
      upserted: 0,
      deactivated: totalExpired,
      filtered_norwegian: 0,
      filtered_no_contact: 0,
    })
    .select("id")
    .single();

  const saveProgress = async () => {
    if (!logRow) return;
    await db
      .from("sync_log")
      .update({
        synced_at: cursor,
        pages,
        processed: totalProcessed,
        upserted: totalUpserted,
        deactivated: totalInactive + totalExpired,
        // U stálých pozic norštinu nevyřazujeme, jen počítáme kolik jich štítek dostalo
        filtered_norwegian: totalNorwegianFlagged,
        filtered_no_contact: totalFilteredNoContact,
      })
      .eq("id", logRow.id);
  };

  let complete = false;
  try {
    const stats = await iterateFeed(
      sinceDate,
      async (vacancies: NavVacancy[]) => {
        totalProcessed += vacancies.length;

        // Inzeráty se stejným norským textem už v DB máme — místo překladu jen levný refresh
        const { changed, unchanged } = await splitUnchangedVacancies(vacancies);
        totalUnchanged += unchanged.length;
        await refreshJobMeta(unchanged);
        if (changed.length === 0) return;

        const translations = await translateBatch(
          changed.map((v) => ({
            title: v.ad_content?.title ?? "",
            description: v.ad_content?.description ?? "",
            company: v.ad_content?.employer?.name ?? "",
            contactList: v.ad_content?.contactList,
          }))
        );

        const rows = changed.flatMap((v, i) => {
          const t = translations[i];
          if (!t) { totalFailedTranslation++; return []; }
          if (t.requires_norwegian) totalNorwegianFlagged++;
          // Požadavek na norštinu se u stálých pozic neřeší vyřazením, ale štítkem na kartě
          return [vacancyToJobRow(v, t, { jobType: "permanent", trade: permanentTradeOf(v) })];
        });

        const withContact = rows.filter((r) => {
          const hasContact = r.application_url || r.contact_name || r.contact_email || r.contact_phone;
          if (!hasContact) { totalFilteredNoContact++; return false; }
          return true;
        });

        totalUpserted += await upsertJobs(withContact);
      },
      async (navIds: string[]) => {
        totalInactive += navIds.length;
        await deactivateJobs(navIds);
      },
      {
        deadline: startedAt + FEED_BUDGET_MS,
        accept: (v) => permanentTradeOf(v) !== null,
        onPageDone: async (pageCursor) => {
          pages++;
          cursor = pageCursor;
          await saveProgress();
        },
      }
    );

    complete = stats.complete;
    if (complete) {
      cursor = syncStarted;
      await saveProgress();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("NAV sync (stálé pozice) error:", message);
    // I po chybě pokračovat — jinak kurzor stojí až do dalšího týdenního cronu
    const retried = await chainNext(request, hop, ERROR_MAX_HOPS);
    return NextResponse.json(
      { error: message, pages, cursor, deactivatedExpired: totalExpired, retried },
      { status: 500 }
    );
  }

  let chained = false;
  if (!complete) {
    chained = await chainNext(request, hop);
  }
  if (!complete && !chained) {
    console.error(`NAV sync (stálé pozice): feed nedočten ani po ${MAX_HOPS} bězích (kurzor ${cursor})`);
  }

  return NextResponse.json({
    ok: true,
    kind: KIND,
    complete,
    hop,
    chained,
    sinceDate,
    cursor,
    pages,
    processed: totalProcessed,
    upserted: totalUpserted,
    unchangedSkipped: totalUnchanged,
    deactivatedByNAV: totalInactive,
    deactivatedExpired: totalExpired,
    norwegianFlagged: totalNorwegianFlagged,
    filteredNoContact: totalFilteredNoContact,
    failedTranslation: totalFailedTranslation,
    durationMs: Date.now() - startedAt,
  });
}
