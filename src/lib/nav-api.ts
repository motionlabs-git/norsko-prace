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
  hasBlockedTitle,
} from "./job-filter";

const FEED_BASE_URL = "https://pam-stilling-feed.nav.no";

let cachedToken: string | null = null;
let tokenFetchedAt: number = 0;
const TOKEN_TTL_MS = 55 * 60 * 1000;

async function getPublicToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now - tokenFetchedAt < TOKEN_TTL_MS) {
    return cachedToken;
  }

  const res = await fetch(`${FEED_BASE_URL}/api/publicToken`, {
    headers: { Accept: "text/plain" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`NAV: failed to get public token (${res.status})`);
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

  const res = await fetch(url, { headers, cache: "no-store" });

  if (res.status === 304) {
    return { version: "", title: "", feed_url: url, next_url: null, next_id: null, items: [] };
  }

  if (!res.ok) {
    throw new Error(`NAV feed fetch failed: ${res.status} ${res.statusText}`);
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

    const activeItems: NavFeedItem[] = [];
    const inactiveIds: string[] = [];

    for (const item of page.items) {
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
