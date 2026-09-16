import { NextRequest, NextResponse } from "next/server";
import { iterateFeed } from "@/lib/nav-api";
import { translateBatch } from "@/lib/translate";
import { upsertJobs, deactivateJobs, vacancyToJobRow } from "@/lib/jobs";
import { evaluateNewPremium } from "@/lib/premium";
import { supabaseAdmin } from "@/lib/supabase";
import type { NavVacancy } from "@/types";

export const maxDuration = 300; // Vercel max for hobby plan

// Po této době už nezačínat další stránku feedu — běh skončí sám a zbytek dojede příští cron.
// Rezerva do 300 s pokryje rozpracovanou stránku (detaily + překlad).
const FEED_BUDGET_MS = 180_000;
// Hodnocení „Vybraných" jen pokud zbývá čas (není kritické, dožene se příště).
const PREMIUM_BUDGET_MS = 240_000;
// Cron běží jednou týdně; týden změn (~12 stránek feedu) se do jednoho běhu nevejde.
// Nedokončený běh proto spustí navazující (od uloženého kurzoru), nejvýš tolikrát:
const MAX_HOPS = 20;

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

  const hop = Number(request.nextUrl.searchParams.get("hop") ?? "0") || 0;
  const startedAt = Date.now();
  const syncStarted = new Date(startedAt).toISOString();
  const db = supabaseAdmin();

  // 1) Prošlé inzeráty deaktivovat VŽDY a jako první — nezávisle na tom, jestli feed doběhne.
  //    (Dřív to bylo až za feedem; když feed spadl/vypršel, prošlé zůstávaly na webu.)
  const { data: expiredData } = await db
    .from("jobs")
    .update({ is_active: false })
    .eq("is_active", true)
    .not("expires_at", "is", null)
    .lt("expires_at", syncStarted)
    .select("id");
  const totalExpired = expiredData?.length ?? 0;

  // 2) Kurzor: ?since=<ISO> override, jinak kam došel poslední běh (i nedokončený)
  const sinceOverride = request.nextUrl.searchParams.get("since");
  let sinceDate: string | null = sinceOverride;
  if (!sinceDate) {
    const { data } = await db
      .from("sync_log")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sinceDate = data?.synced_at ?? null;
  }

  let totalProcessed = 0;
  let totalUpserted = 0;
  let totalInactive = 0;
  let pages = 0;
  let totalFilteredNorwegian = 0;
  let totalFilteredNoContact = 0;
  let totalFailedTranslation = 0;
  let cursor = sinceDate ?? new Date(startedAt - 30 * 24 * 3600 * 1000).toISOString();

  // Záznam běhu zakládáme hned a po každé stránce posouváme kurzor (synced_at).
  // Timeout nebo pád uprostřed tak neztratí postup — příští běh naváže, místo aby
  // donekonečna začínal od stejného data (to byla příčina, proč sync od června neběžel).
  const { data: logRow } = await db
    .from("sync_log")
    .insert({
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
        filtered_norwegian: totalFilteredNorwegian,
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

        const translations = await translateBatch(
          vacancies.map((v) => ({
            title: v.ad_content?.title ?? "",
            description: v.ad_content?.description ?? "",
            company: v.ad_content?.employer?.name ?? "",
            contactList: v.ad_content?.contactList,
          }))
        );

        // Nepřeložené neukládat (prázdný inzerát na webu); dožene se při další změně inzerátu
        const allRows = vacancies.flatMap((v, i) => {
          const t = translations[i];
          if (!t) { totalFailedTranslation++; return []; }
          return [vacancyToJobRow(v, t)];
        });

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
      },
      {
        deadline: startedAt + FEED_BUDGET_MS,
        onPageDone: async (pageCursor) => {
          pages++;
          cursor = pageCursor;
          await saveProgress();
        },
      }
    );

    complete = stats.complete;
    if (complete) {
      // Feed dočten do konce → příště stačí změny od začátku tohoto běhu
      cursor = syncStarted;
      await saveProgress();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && (err as NodeJS.ErrnoException).cause;
    console.error("NAV sync error:", message, cause ?? "");
    // Postup do poslední dokončené stránky je uložený; příští běh naváže
    return NextResponse.json(
      { error: message, cause: String(cause ?? ""), pages, cursor, deactivatedExpired: totalExpired },
      { status: 500 }
    );
  }

  // Nedočteno → navazující běh. Čekáme jen na přijetí požadavku (ne na jeho dokončení),
  // jinak by tento běh přesáhl limit; navazující běh pokračuje od uloženého kurzoru.
  let chained = false;
  if (!complete && hop < MAX_HOPS) {
    chained = true;
    await fetch(`${request.nextUrl.origin}/api/sync?hop=${hop + 1}`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(3000),
    }).catch(() => {}); // timeout abortu je očekávaný
  } else if (!complete) {
    console.error(`NAV sync: ani po ${MAX_HOPS} navazujících bězích feed nedočten (kurzor ${cursor})`);
  }

  // Ohodnotit nově vložené inzeráty pro "Vybrané" (premium) — až v posledním (dokončeném) běhu,
  // ať se nekryje s navazujícím, a jen když zbývá čas. Selhání nesmí shodit celý sync.
  let premiumStats = { evaluated: 0, premium: 0, failed: 0 };
  if (complete && Date.now() - startedAt < PREMIUM_BUDGET_MS) {
    try {
      premiumStats = await evaluateNewPremium();
    } catch (err) {
      console.error("premium eval failed:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({
    ok: true,
    complete, // false = došel čas, zbytek feedu dojede navazující běh
    hop,
    chained,
    sinceDate,
    cursor,
    pages,
    processed: totalProcessed,
    upserted: totalUpserted,
    deactivatedByNAV: totalInactive,
    deactivatedExpired: totalExpired,
    filteredNorwegian: totalFilteredNorwegian,
    filteredNoContact: totalFilteredNoContact,
    failedTranslation: totalFailedTranslation,
    premiumEvaluated: premiumStats.evaluated,
    premiumFlagged: premiumStats.premium,
    durationMs: Date.now() - startedAt,
  });
}
