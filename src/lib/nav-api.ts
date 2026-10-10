/**
 * NAV pam-stilling-feed API client
 * Docs: https://navikt.github.io/pam-stilling-feed/
 *
 * Feed je event-driven changelog — každá změna inzerátu = nová položka.
 * Filtrování sezónních pozic probíhá na naší straně (API nefiltruje).
 */

import type { NavFeedPage, NavFeedItem, NavVacancy } from "@/types";
import {
  ALLOWED_OCCUPATION_CATEGORIES,
  BLOCKED_OCCUPATION_CATEGORIES,
  SEASONAL_ENGAGEMENT_TYPES,
  PERMANENT_ENGAGEMENT_TYPES,
  hasBlockedTitle,
} from "./job-filter";
import { tradeForCategories, type TradeSlug } from "./trades";

const FEED_BASE_URL = "https://pam-stilling-feed.nav.no";

let cachedToken: string | null = null;
let tokenFetchedAt: number = 0;
const TOKEN_TTL_MS = 55 * 60 * 1000;

async function getPublicToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now - tokenFetchedAt < TOKEN_TTL_MS) {
    return cachedToken;
  }

  // Tenhle endpoint NAV je pomalý (běžně 25 s) a občas vrátí 500. Jeden neúspěch
  // dřív shodil celý běh ještě před prvním řádkem feedu — proto tři pokusy s prodlevou.
  let res: Response | null = null;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(`${FEED_BASE_URL}/api/publicToken`, {
        headers: { Accept: "text/plain" },
        cache: "no-store",
        signal: AbortSignal.timeout(45_000),
      });
      if (r.ok) { res = r; break; }
      lastStatus = r.status;
    } catch (err) {
      lastStatus = 0;
      console.warn(`NAV token: pokus ${attempt} selhal (${err instanceof Error ? err.name : "chyba"})`);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 3000));
  }

  if (!res) {
    throw new Error(`NAV: failed to get public token (${lastStatus || "timeout"})`);
  }

  const raw = await res.text();
  cachedToken = raw.trim().split(/\s+/).at(-1) ?? raw.trim();
  tokenFetchedAt = now;
  return cachedToken;
}

export async function fetchFeedPage(
  sinceDate: string | null,
  nextUrl: string | null
): Promise<NavFeedPage> {
  const token = await getPublicToken();
  const rawUrl = nextUrl ?? `/api/v1/feed`;
  const url = rawUrl.startsWith("http") ? rawUrl : `${FEED_BASE_URL}${rawUrl}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  if (sinceDate && !nextUrl) {
    headers["If-Modified-Since"] = new Date(sinceDate).toUTCString();
  }

  // Feed NAV je nespolehlivý: část dotazů končí 500 nebo vyprší, zbytek projde.
  // Jediné selhání dřív shodilo celý běh, proto tři pokusy s krátkou prodlevou.
  let res: Response | null = null;
  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(45_000) });
      if (r.status === 304 || r.ok) { res = r; break; }
      lastError = `${r.status} ${r.statusText}`;
    } catch (err) {
      lastError = err instanceof Error ? err.name : "chyba";
    }
    console.warn(`NAV feed: pokus ${attempt} selhal (${lastError})`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2500));
  }

  if (!res) {
    throw new Error(`NAV feed fetch failed: ${lastError}`);
  }

  if (res.status === 304) {
    return { version: "", title: "", feed_url: url, next_url: null, next_id: null, items: [] };
  }

  return res.json();
}

export async function fetchVacancyDetail(itemUrl: string): Promise<NavVacancy | null> {
  const token = await getPublicToken();
  const url = itemUrl.startsWith("http") ? itemUrl : `${FEED_BASE_URL}${itemUrl}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Rozhodne, zda je inzerát vhodný pro sezónní CZ/SK pracovníky.
 *
 * Pravidla (v pořadí):
 *  1. Musí být v Norsku
 *  2. Blokované kategorie → vždy vyloučit
 *  3. Blokovaná klíčová slova v titulu → vždy vyloučit
 *  4. Musí mít sezónní/dočasný typ úvazku
 *  5. Musí být v povolené kategorii
 */
export function isSeasonalJob(vacancy: NavVacancy): boolean {
  const ad = vacancy.ad_content;
  if (!ad) return false;

  // 1. Lokace — pouze Norsko
  const locations = ad.workLocations ?? [];
  const isInNorway =
    locations.length === 0 ||
    locations.some(
      (l) => !l.country || l.country.toUpperCase() === "NORGE" || l.country.toUpperCase() === "NORWAY"
    );
  if (!isInNorway) return false;

  const categories = ad.occupationCategories ?? [];

  // 2. Blokované kategorie (healthcare, retail, office...)
  const isBlocked = categories.some(
    (cat) =>
      BLOCKED_OCCUPATION_CATEGORIES.has(cat.level1) ||
      BLOCKED_OCCUPATION_CATEGORIES.has(cat.level2 ?? "")
  );
  if (isBlocked) return false;

  // 3. Blokovaná klíčová slova v titulu
  if (hasBlockedTitle(ad.title ?? "")) return false;

  // 4. Typ úvazku musí být sezónní/dočasný (ne trvalý)
  const engLower = (ad.engagementtype ?? "").toLowerCase();
  const hasSeasonal = [...SEASONAL_ENGAGEMENT_TYPES].some((t) => engLower.includes(t.toLowerCase()));
  if (!hasSeasonal) return false;

  // 5. Musí být v povolené kategorii
  const inAllowedCategory = categories.some((cat) =>
    ALLOWED_OCCUPATION_CATEGORIES.has(cat.level1)
  );
  return inAllowedCategory;
}

/**
 * Základní vhodnost inzerátu bez ohledu na typ úvazku:
 * musí být v Norsku, mimo blokované kategorie a bez blokovaného slova v titulu.
 */
function passesBaseChecks(vacancy: NavVacancy): boolean {
  const ad = vacancy.ad_content;
  if (!ad) return false;

  const locations = ad.workLocations ?? [];
  const isInNorway =
    locations.length === 0 ||
    locations.some(
      (l) => !l.country || l.country.toUpperCase() === "NORGE" || l.country.toUpperCase() === "NORWAY"
    );
  if (!isInNorway) return false;

  const blocked = (ad.occupationCategories ?? []).some(
    (cat) =>
      BLOCKED_OCCUPATION_CATEGORIES.has(cat.level1) ||
      BLOCKED_OCCUPATION_CATEGORIES.has(cat.level2 ?? "")
  );
  if (blocked) return false;

  return !hasBlockedTitle(ad.title ?? "");
}

/**
 * Obor stálé pozice, nebo null když inzerát do „Stálých pozic" nepatří.
 *
 * Na rozdíl od sezónních tu NEfiltrujeme požadavek na norštinu — u stálých řemesel
 * je běžný a inzerát se místo vyhození označí štítkem (rozhodnutí uživatele).
 */
export function permanentTradeOf(vacancy: NavVacancy): TradeSlug | null {
  if (!passesBaseChecks(vacancy)) return null;
  const ad = vacancy.ad_content!;

  const engagement = (ad.engagementtype ?? "").toLowerCase();
  const isPermanent = [...PERMANENT_ENGAGEMENT_TYPES].some((t) => engagement === t.toLowerCase());
  if (!isPermanent) return null;

  return tradeForCategories(ad.occupationCategories);
}

export async function iterateFeed(
  sinceDate: string | null,
  onBatch: (vacancies: NavVacancy[]) => Promise<void>,
  onInactive: (navIds: string[]) => Promise<void>,
  opts: {
    /** Po tomto čase (ms epoch) nezačínat další stránku — zbytek dojede příští běh. */
    deadline?: number;
    /** Po každé zpracované stránce: date_modified posledního záznamu = kurzor pro příští běh. */
    onPageDone?: (cursor: string) => Promise<void>;
    /** Které inzeráty brát; výchozí je sezónní filtr. */
    accept?: (vacancy: NavVacancy) => boolean;
  } = {}
): Promise<{ processed: number; inactive: number; pages: number; complete: boolean }> {
  let nextUrl: string | null = null;
  let processed = 0;
  let inactive = 0;
  let pages = 0;

  do {
    if (opts.deadline && Date.now() > opts.deadline) {
      return { processed, inactive, pages, complete: false };
    }

    const page = await fetchFeedPage(sinceDate, nextUrl);

    if (page.items.length === 0) break;

    pages++;

    // Feed je changelog — stejný inzerát může být na stránce víckrát; platí poslední stav
    const latest = new Map<string, NavFeedItem>();
    for (const item of page.items) latest.set(item._feed_entry?.uuid ?? item.id, item);

    const activeItems: NavFeedItem[] = [];
    const inactiveIds: string[] = [];

    for (const item of latest.values()) {
      if (item._feed_entry?.status === "INACTIVE") {
        inactiveIds.push(item._feed_entry.uuid);
      } else {
        activeItems.push(item);
      }
    }

    if (inactiveIds.length > 0) {
      await onInactive(inactiveIds);
      inactive += inactiveIds.length;
    }

    if (activeItems.length > 0) {
      const CONCURRENCY = 8;
      const details: (NavVacancy | null)[] = [];
      for (let i = 0; i < activeItems.length; i += CONCURRENCY) {
        const chunk = activeItems.slice(i, i + CONCURRENCY);
        const results = await Promise.all(chunk.map((item) => fetchVacancyDetail(item.url)));
        details.push(...results);
      }

      // Prošlé inzeráty vůbec nepřekládat (šetří čas i API) — v DB by je stejně hned deaktivoval sync
      const now = Date.now();
      const accept = opts.accept ?? isSeasonalJob;
      const matching = details.filter(
        (v): v is NavVacancy =>
          v !== null &&
          accept(v) &&
          !(v.ad_content?.expires && new Date(v.ad_content.expires).getTime() < now)
      );

      if (matching.length > 0) {
        await onBatch(matching);
        processed += matching.length;
      }
    }

    const cursor = page.items.reduce(
      (max, it) => (it.date_modified > max ? it.date_modified : max),
      page.items[0].date_modified
    );
    await opts.onPageDone?.(new Date(cursor).toISOString());

    nextUrl = page.next_url;
  } while (nextUrl !== null);

  return { processed, inactive, pages, complete: true };
}
