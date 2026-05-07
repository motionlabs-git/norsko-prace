/**
 * NAV pam-stilling-feed API client
 * Docs: https://navikt.github.io/pam-stilling-feed/
 *
 * Feed je event-driven changelog — každá změna inzerátu = nová položka.
 * Filtrování sezónních pozic probíhá na naší straně (API nefiltruje).
 */

import type { NavFeedPage, NavFeedItem, NavVacancy } from "@/types";

const FEED_BASE_URL = "https://pam-stilling-feed.nav.no";

// Kategorie relevantní pro sezónní pracovníky z CZ/SK
const SEASONAL_OCCUPATION_CATEGORIES = new Set([
  "Jordbruk, skogbruk og fiske",
  "Reiseliv og mat",
  "Bygg og anlegg",
  "Transport og logistikk",
  "Renhold og eiendomsdrift",
]);

// Čistě sezónní typy — stačí samotné (bez ohledu na kategorii)
const STRICTLY_SEASONAL_TYPES = new Set([
  "Sesong", "Feriejobb", "sesong", "feriejobb",
]);

// Dočasné typy — akceptovatelné jen v kombinaci se sezónní kategorií
const TEMP_ENGAGEMENT_TYPES = new Set([
  "Sesong", "Vikariat", "Midlertidig", "Feriejobb",
  "sesong", "vikariat", "midlertidig", "feriejobb",
]);

let cachedToken: string | null = null;
let tokenFetchedAt: number = 0;
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minut (tokeny platí ~1h)

async function getPublicToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now - tokenFetchedAt < TOKEN_TTL_MS) {
    return cachedToken;
  }

  const res = await fetch(`${FEED_BASE_URL}/api/publicToken`, {
    headers: { Accept: "text/plain" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`NAV: failed to get public token (${res.status})`);
  }

  const raw = await res.text();
  // Response may contain a human-readable prefix line — extract just the JWT
  cachedToken = raw.trim().split(/\s+/).at(-1) ?? raw.trim();
  tokenFetchedAt = now;
  return cachedToken;
}

/**
 * Stáhne jednu stránku feedu.
 * @param sinceDate ISO-8601 nebo RFC-1123 datum pro If-Modified-Since header
 * @param nextUrl   URL pro paginaci (null = začátek feedu)
 */
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
    // If-Modified-Since použijeme jen na první stránce (nextUrl má datum v sobě)
    headers["If-Modified-Since"] = new Date(sinceDate).toUTCString();
  }

  const res = await fetch(url, { headers, next: { revalidate: 0 } });

  if (res.status === 304) {
    // Žádné nové inzeráty od posledního syncu
    return {
      version: "",
      title: "",
      feed_url: url,
      next_url: null,
      next_id: null,
      items: [],
    };
  }

  if (!res.ok) {
    throw new Error(`NAV feed fetch failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Stáhne detail jednoho inzerátu z URL v položce feedu.
 */
export async function fetchVacancyDetail(itemUrl: string): Promise<NavVacancy | null> {
  const token = await getPublicToken();
  const url = itemUrl.startsWith("http") ? itemUrl : `${FEED_BASE_URL}${itemUrl}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Rozhodne, zda je inzerát relevantní pro sezónní pracovníky z CZ/SK.
 * Kritéria:
 *   - engagementtype patří mezi sezónní typy, NEBO
 *   - occupationCategories.level1 je v sezónních kategoriích
 *   - Inzerát je v Norsku (workLocations.country === 'NORGE' nebo prázdné)
 */
export function isSeasonalJob(vacancy: NavVacancy): boolean {
  const ad = vacancy.ad_content;
  if (!ad) return false; // INACTIVE — no ad_content

  // Kontrola lokace — chceme jen Norsko
  const locations = ad.workLocations ?? [];
  const isInNorway =
    locations.length === 0 ||
    locations.some(
      (l) => !l.country || l.country.toUpperCase() === "NORGE" || l.country.toUpperCase() === "NORWAY"
    );
  if (!isInNorway) return false;

  const engagement = ad.engagementtype ?? "";
  const engLower = engagement.toLowerCase();

  // Čistě sezónní typ (Sesong, Feriejobb) → vždy zahrnout (i v kombinovaných řetězcích)
  const hasStrictlySeasonal = [...STRICTLY_SEASONAL_TYPES].some((t) => engLower.includes(t.toLowerCase()));
  if (hasStrictlySeasonal) return true;

  // Sezónní kategorie + dočasný úvazek → zahrnout (vyloučí Fast/trvalé pozice)
  const categoryMatch = (ad.occupationCategories ?? []).some((cat) =>
    SEASONAL_OCCUPATION_CATEGORIES.has(cat.level1)
  );
  const hasTempType = [...TEMP_ENGAGEMENT_TYPES].some((t) => engLower.includes(t.toLowerCase()));
  return categoryMatch && hasTempType;
}

/**
 * Iteruje celý feed od daného datumu a vrací relevantní aktivní inzeráty.
 * Callback dostává dávky inzerátů pro postupné zpracování (překlad + uložení).
 *
 * @param sinceDate   Datum posledního úspěšného syncu (null = full sync)
 * @param onBatch     Callback volaný pro každou dávku (feedová stránka)
 * @param onInactive  Callback pro INACTIVE položky (soft delete)
 */
export async function iterateFeed(
  sinceDate: string | null,
  onBatch: (vacancies: NavVacancy[]) => Promise<void>,
  onInactive: (navIds: string[]) => Promise<void>
): Promise<{ processed: number; inactive: number; pages: number }> {
  let nextUrl: string | null = null;
  let processed = 0;
  let inactive = 0;
  let pages = 0;

  do {
    const page = await fetchFeedPage(sinceDate, nextUrl);

    if (page.items.length === 0) break;

    pages++;

    // Rozděl položky na aktivní a neaktivní
    const activeItems: NavFeedItem[] = [];
    const inactiveIds: string[] = [];

    for (const item of page.items) {
      if (item._feed_entry?.status === "INACTIVE") {
        inactiveIds.push(item._feed_entry.uuid);
      } else {
        activeItems.push(item);
      }
    }

    // Zpracuj neaktivní
    if (inactiveIds.length > 0) {
      await onInactive(inactiveIds);
      inactive += inactiveIds.length;
    }

    // Stáhni detaily aktivních a filtruj sezónní
    if (activeItems.length > 0) {
      const detailPromises = activeItems.map((item) => fetchVacancyDetail(item.url));
      const details = await Promise.all(detailPromises);

      const seasonal = details.filter(
        (v): v is NavVacancy => v !== null && isSeasonalJob(v)
      );

      if (seasonal.length > 0) {
        await onBatch(seasonal);
        processed += seasonal.length;
      }
    }

    nextUrl = page.next_url;
  } while (nextUrl !== null);

  return { processed, inactive, pages };
}
