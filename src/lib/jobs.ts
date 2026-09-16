import { createServerSupabase, supabaseAdmin } from "./supabase";
import type { Job, LocalizedJob, NavVacancy } from "@/types";
import type { FinnJob } from "./finn-api";
import { parseApplicationDue } from "./application-utils";

// ── Category mapping (NAV Norwegian → display) ─────────────────────────────
export const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string; badgeClass: string; accentClass: string; arrowClass: string }> = {
  "Jordbruk, skogbruk og fiske": {
    label: "Zemědělství",
    icon: "🌾",
    color: "teal",
    badgeClass: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
    accentClass: "bg-[var(--color-primary)]",
    arrowClass: "bg-[var(--color-primary)] text-white",
  },
  "Reiseliv og mat": {
    label: "Gastronomie",
    icon: "🍽️",
    color: "yellow",
    badgeClass: "bg-yellow-50 text-yellow-800",
    accentClass: "bg-yellow-500",
    arrowClass: "bg-yellow-500 text-white",
  },
  "Bygg og anlegg": {
    label: "Stavebnictví",
    icon: "🏗️",
    color: "orange",
    badgeClass: "bg-[var(--color-accent-light)] text-[var(--color-accent)]",
    accentClass: "bg-[var(--color-accent)]",
    arrowClass: "bg-[var(--color-accent)] text-white",
  },
  "Transport og logistikk": {
    label: "Doprava",
    icon: "🚚",
    color: "purple",
    badgeClass: "bg-purple-50 text-purple-700",
    accentClass: "bg-purple-600",
    arrowClass: "bg-purple-600 text-white",
  },
  "Renhold og eiendomsdrift": {
    label: "Úklid",
    icon: "🧹",
    color: "blue",
    badgeClass: "bg-blue-50 text-blue-700",
    accentClass: "bg-blue-500",
    arrowClass: "bg-blue-500 text-white",
  },
};

export const DEFAULT_CATEGORY = {
  label: "Různé",
  icon: "💼",
  color: "gray",
  badgeClass: "bg-gray-100 text-gray-700",
  accentClass: "bg-gray-400",
  arrowClass: "bg-gray-400 text-white",
};

export function getCategoryMeta(categoryLevel1: string | null) {
  if (!categoryLevel1) return DEFAULT_CATEGORY;
  return CATEGORY_MAP[categoryLevel1] ?? DEFAULT_CATEGORY;
}

// ── Read operations ─────────────────────────────────────────────────────────

// PostgREST `.or()` filtr: skryj joby s prošlou lhůtou k přihlášení.
// application_due_at IS NULL (neznámá lhůta / "Snarest") → zobrazit.
// Dnešek se ještě počítá jako otevřený (porovnává se od půlnoci UTC).
function openApplicationOr(): string {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return `application_due_at.is.null,application_due_at.gte.${start.toISOString()}`;
}

// PostgREST `.or()` filtr: skryj inzeráty po datu vypršení (expires z NAV/Finn).
// Pojistka nezávislá na syncu — i když sync neproběhne, prošlé se nezobrazí.
// expires_at IS NULL (zdroj datum neuvádí) → zobrazit.
function notExpiredOr(): string {
  return `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;
}

export async function getRecentJobs(limit = 6): Promise<Job[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .or(notExpiredOr())
    .eq("source", "nav")
    .eq("requires_norwegian", false)
    .or(openApplicationOr())
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentJobs error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getFeaturedJobs(limit = 3): Promise<Job[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .or(notExpiredOr())
    .eq("is_featured", true)
    .eq("source", "nav")
    .eq("requires_norwegian", false)
    .or(openApplicationOr())
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  if (!data || data.length === 0) return getRecentJobs(limit);
  return data;
}

export async function getJobBySlug(slug: string): Promise<Job | null> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .or(notExpiredOr())
    .single();

  if (error || !data) return null;
  return data;
}

const DAY_MS = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Hledaný výraz → slova normalizovaná stejně jako sloupec jobs.search_text
// (malá písmena, bez diakritiky; ø/æ NFD nerozloží, řešíme ručně jako Postgres unaccent).
export function searchTerms(search: string): string[] {
  return search
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[%_*\\,()"']/g, " ") // zástupné a řídicí znaky PostgRESTu
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 5);
}

export async function getJobs({
  category,
  engagementType,
  city,
  search,
  period,
  norwegianOk = true,
  accommodation,
  page = 1,
  pageSize = 20,
}: {
  category?: string;
  engagementType?: string;
  city?: string;
  search?: string;
  period?: { from: string; to: string; onlyKnown?: boolean };
  norwegianOk?: boolean;
  accommodation?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ jobs: Job[]; total: number }> {
  const db = await createServerSupabase();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const terms = search ? searchTerms(search) : [];

  // Společné filtry bez řazení; volá se pro každý dotaz zvlášť (builder je jednorázový)
  const base = (head = false) => {
    let query = db
      .from("jobs")
      .select("*", { count: "exact", head })
      .eq("is_active", true)
      .or(notExpiredOr())
      .or(openApplicationOr());
    if (category) query = query.eq("category_level1", category);
    if (engagementType) query = query.ilike("engagement_type", engagementType);
    if (city) query = query.eq("location_city", city);
    if (!norwegianOk) query = query.eq("requires_norwegian", false);
    if (accommodation) query = query.eq("includes_accommodation", true);
    return query;
  };
  type Q = ReturnType<typeof base>;
  // Výchozí řazení až za primárním řazením úrovně (PostgREST řadí podle pořadí volání)
  const ordered = (q: Q) =>
    q.order("source", { ascending: false }).order("published_at", { ascending: false });
  // Každé hledané slovo kdekoli v textu inzerátu (AND)
  const inText = (q: Q) => terms.reduce((acc, t) => acc.ilike("search_text", `%${t}%`), q);

  // Stránkování přes „úrovně" (filtr + vlastní primární řazení): nejdřív celá 1. úroveň, pak 2. …
  // Úrovně se nesmí překrývat. null = dotaz selhal (např. chybí sloupec) → jednoduchý fallback.
  const paginateTiers = async (tiers: ((q: Q) => Q)[]) => {
    const counts = await Promise.all(tiers.map((tier) => tier(base(true))));
    const failed = counts.find((c) => c.error);
    if (failed) {
      console.error("getJobs tiers:", failed.error?.message);
      return null;
    }
    let offset = 0;
    const parts: Q[] = [];
    counts.forEach((c, i) => {
      const n = c.count ?? 0;
      const lo = Math.max(from, offset);
      const hi = Math.min(to, offset + n - 1);
      if (lo <= hi) parts.push(ordered(tiers[i](base())).range(lo - offset, hi - offset) as Q);
      offset += n;
    });
    const results = await Promise.all(parts);
    return { jobs: results.flatMap((r) => (r.data as Job[] | null) ?? []), total: offset };
  };

  let tiers: ((q: Q) => Q)[] | null = null;

  if (period) {
    // Termín pobytu [příjezd, odjezd] vs. termín práce, tolerance ±14 dní. Stejná množina jako
    // „překrývá se" — jen seřazená podle toho, jak dobře sedí:
    const a = new Date(period.from).getTime();
    const b = new Date(period.to).getTime();
    const arrivalTol = isoDay(a - 14 * DAY_MS);
    const departureTol = isoDay(b + 14 * DAY_MS);
    const openEndMin = isoDay(a - 60 * DAY_MS); // bez konce: nástup max 60 dní před příjezdem
    tiers = [
      // 1) začíná kolem příjezdu nebo během pobytu → podle nástupu
      (q) => inText(q).gte("work_start", arrivalTol).lte("work_start", departureTol)
        .order("work_start", { ascending: true }),
      // 2) už běží a pokračuje i během pobytu → nejčerstvější nástup první
      (q) => inText(q).lt("work_start", arrivalTol)
        .or(`work_end.gte.${arrivalTol},and(work_end.is.null,work_start.gte.${openEndMin})`)
        .order("work_start", { ascending: false }),
      // 3) bez uvedeného termínu
      ...(period.onlyKnown ? [] : [(q: Q) => inText(q).is("work_start", null)]),
    ];
  } else if (terms.length > 0) {
    // Relevance hledání: 1) všechna slova v názvu/firmě/místě, 2) zbytek (slova jen v popisu)
    tiers = [
      (q) => terms.reduce((acc, t) => acc.ilike("search_title", `%${t}%`), q),
      (q) => inText(q).or(terms.map((t) => `search_title.not.ilike.*${t}*`).join(",")),
    ];
  }

  if (tiers) {
    const tiered = await paginateTiers(tiers);
    if (tiered) return tiered;
  }

  const { data, error, count } = await ordered(inText(base())).range(from, to);
  if (error) {
    // "Requested range not satisfiable" = page beyond available data
    if (error.code === "PGRST103" || error.message.includes("range not satisfiable")) {
      const { count: total } = await base(true);
      return { jobs: [], total: total ?? 0 };
    }
    console.error("getJobs error:", error.message);
    return { jobs: [], total: 0 };
  }
  return { jobs: data ?? [], total: count ?? 0 };
}

export async function getSimilarJobs(
  currentId: string,
  category: string | null,
  limit = 8
): Promise<Job[]> {
  const db = await createServerSupabase();
  let query = db
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .or(notExpiredOr())
    .neq("id", currentId)
    .or(openApplicationOr())
    .order("published_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category_level1", category);

  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function getDistinctCities(): Promise<string[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("jobs")
    .select("location_city")
    .eq("is_active", true)
    .or(notExpiredOr())
    .not("location_city", "is", null);

  if (error || !data) return [];
  const unique = [...new Set(data.map((r) => r.location_city as string))];
  return unique.sort((a, b) => a.localeCompare(b));
}

export async function getAllJobSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("jobs")
    .select("slug, updated_at")
    .eq("is_active", true)
    .or(notExpiredOr())
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return data.map((r) => ({ slug: r.slug as string, updatedAt: r.updated_at as string }));
}

// ── Norwegian enum translations ──────────────────────────────────────────────

const ENGAGEMENT_TYPE: Record<string, string> = {
  Sesong:      "Sezónní",
  Vikariat:    "Zástup",
  Midlertidig: "Dočasný",
  Fast:        "Trvalý",
  Feriejobb:   "Brigáda",
  Prosjekt:    "Projekt",
};

const EXTENT: Record<string, string> = {
  Heltid: "Plný úvazek",
  Deltid: "Částečný úvazek",
};

const SECTOR: Record<string, string> = {
  Offentlig:      "Veřejný sektor",
  Privat:         "Soukromý sektor",
  "Ikke oppgitt": "Neuvedeno",
};

function translateEnum(map: Record<string, string>, value: string | null): string | null {
  if (!value) return null;
  return map[value] ?? value;
}

// ── Localization helper ──────────────────────────────────────────────────────

export function localizeJob(job: Job): LocalizedJob {
  return {
    id: job.id,
    slug: job.slug,
    title: job.title_cs ?? job.title_no ?? "",
    description: job.description_cs ?? job.description_no ?? "",
    company: job.company,
    location: job.location_city || null,
    category: job.category_level1,
    engagementType: translateEnum(ENGAGEMENT_TYPE, job.engagement_type),
    extent: translateEnum(EXTENT, job.extent),
    applicationDue: job.application_due,
    applicationDueAt: job.application_due_at ?? null,
    publishedAt: job.published_at,
    expiresAt: job.expires_at,
    sourceUrl: job.source_url,
    applicationUrl: job.application_url,
    isFeatured: job.is_featured,
    isPremium: job.is_premium,
    includesAccommodation: job.includes_accommodation,
    workStart: job.work_start ?? null,
    workEnd: job.work_end ?? null,
    source: (job.source ?? "nav") as "nav" | "finn",
  };
}

export function translateSector(value: string | null): string | null {
  return translateEnum(SECTOR, value);
}

export async function getPremiumJobs(): Promise<Job[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .or(notExpiredOr())
    .eq("is_premium", true)
    .or(openApplicationOr())
    .order("published_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getFavorites(userId: string): Promise<Job[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("favorites")
    .select("job_id, jobs(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((row) => row.jobs as unknown as Job).filter(Boolean);
}

export async function getUserFavoriteIds(userId: string): Promise<string[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("favorites")
    .select("job_id")
    .eq("user_id", userId);

  if (error) return [];
  return (data ?? []).map((r) => r.job_id as string);
}

// ── Write operations (used by sync) ─────────────────────────────────────────

export function vacancyToJobRow(
  vacancy: NavVacancy,
  translations: { title_cs: string; title_sk: string; description_cs: string; description_sk: string; requires_norwegian?: boolean; includes_accommodation?: boolean; contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null; work_start?: string | null; work_end?: string | null }
): Omit<Job, "id" | "created_at" | "updated_at"> {
  const v = vacancy.ad_content!;
  const loc = v.workLocations?.[0];
  const cat = v.occupationCategories?.[0];
  const slug = slugify(v.title).slice(0, 60) + "-" + vacancy.uuid.replace(/-/g, "").slice(-8);

  return {
    nav_id: vacancy.uuid,
    source: "nav" as const,
    slug,
    title_no: v.title,
    title_cs: translations.title_cs,
    title_sk: translations.title_sk,
    description_no: v.description,
    description_cs: translations.description_cs,
    description_sk: translations.description_sk,
    work_start: translations.work_start ?? null,
    work_end: translations.work_end ?? null,
    work_period_evaluated_at: new Date().toISOString(),
    company: v.employer?.name ?? null,
    location_city: loc?.city ?? null,
    location_county: loc?.county ?? null,
    category_level1: cat?.level1 ?? null,
    category_level2: cat?.level2 ?? null,
    engagement_type: v.engagementtype ?? null,
    extent: v.extent ?? null,
    sector: v.sector ?? null,
    salary: null,
    position_count: v.positioncount ? parseInt(v.positioncount, 10) : null,
    application_due: v.applicationDue ?? null,
    application_due_at: parseApplicationDue(v.applicationDue),
    published_at: v.published ?? null,
    expires_at: v.expires ?? null,
    source_url: v.sourceurl ?? null,
    application_url: v.applicationUrl ?? null,
    is_featured: false,
    is_premium: false,
    is_active: vacancy.status === "ACTIVE",
    requires_norwegian: translations.requires_norwegian ?? false,
    includes_accommodation: translations.includes_accommodation ?? false,
    contact_name: translations.contact_name ?? null,
    contact_email: translations.contact_email ?? null,
    contact_phone: translations.contact_phone ?? null,
  };
}

export async function upsertJobs(
  rows: ReturnType<typeof vacancyToJobRow>[]
): Promise<number> {
  const db = supabaseAdmin();
  // Deduplicate by nav_id — feed can contain duplicates within a single page
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    if (seen.has(r.nav_id)) return false;
    seen.add(r.nav_id);
    return true;
  });
  const { error, data } = await db
    .from("jobs")
    .upsert(unique, { onConflict: "source,nav_id", ignoreDuplicates: false })
    .select("id");

  if (error) {
    console.error("upsertJobs error:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

export async function deactivateJobs(navIds: string[]): Promise<void> {
  if (navIds.length === 0) return;
  const db = supabaseAdmin();
  const CHUNK = 500;
  for (let i = 0; i < navIds.length; i += CHUNK) {
    const chunk = navIds.slice(i, i + CHUNK);
    const { error } = await db
      .from("jobs")
      .update({ is_active: false })
      .in("nav_id", chunk);
    if (error) console.error("deactivateJobs error:", error.message);
  }
}

export function finnJobToRow(
  job: FinnJob,
  translations: { title_cs: string; title_sk: string; description_cs: string; description_sk: string; requires_norwegian?: boolean; includes_accommodation?: boolean; contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null; work_start?: string | null; work_end?: string | null }
): Omit<Job, "id" | "created_at" | "updated_at"> {
  const slug =
    slugify(job.title).slice(0, 60) + "-finn-" + job.finnId;

  const FINN_ENGAGEMENT: Record<string, string> = {
    TEMPORARY: "Midlertidig",
    PART_TIME: "Deltid",
    FULL_TIME: "Fast",
    SEASONAL: "Sesong",
    OTHER: "Jiné",
  };

  return {
    nav_id: `finn-${job.finnId}`,
    source: "finn",
    slug,
    title_no: job.title,
    title_cs: translations.title_cs,
    title_sk: translations.title_sk,
    description_no: job.description,
    description_cs: translations.description_cs,
    description_sk: translations.description_sk,
    work_start: translations.work_start ?? null,
    work_end: translations.work_end ?? null,
    work_period_evaluated_at: new Date().toISOString(),
    company: job.company ?? null,
    location_city: job.locationCity ?? null,
    location_county: null,
    category_level1: null,
    category_level2: null,
    engagement_type: FINN_ENGAGEMENT[job.employmentType ?? ""] ?? null,
    extent: null,
    sector: null,
    salary: null,
    position_count: null,
    application_due: null,
    application_due_at: null,
    published_at: job.datePosted ?? null,
    expires_at: job.validThrough ?? null,
    source_url: job.sourceUrl,
    application_url: job.applicationUrl ?? null,
    is_featured: false,
    is_premium: false,
    is_active: true,
    requires_norwegian: translations.requires_norwegian ?? false,
    includes_accommodation: translations.includes_accommodation ?? false,
    contact_name: translations.contact_name ?? null,
    contact_email: translations.contact_email ?? null,
    contact_phone: translations.contact_phone ?? null,
  };
}

// ── Utils ────────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
