import { Link } from "@/i18n/navigation";
import { getJobs, getPremiumJobs, getUserFavoriteIds, localizeJob, getCategoryMeta, CATEGORY_MAP, getDistinctCities } from "@/lib/jobs";
import { buildAlternates } from "@/lib/seo";
import { JobFilters } from "@/components/jobs/JobFilters";
import { JobCard } from "@/components/jobs/JobCard";
import { FavoriteButton } from "@/components/jobs/FavoriteButton";
import { createClient } from "@/utils/supabase/server";
import type { Locale } from "@/types";

export const revalidate = 1800;

function getPaginationRange(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const left = Math.max(2, current - 2);
  const right = Math.min(total - 1, current + 2);
  const range: (number | null)[] = [1];

  if (left > 2) range.push(null);
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push(null);
  range.push(total);

  return range;
}

function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (p: number) => Parameters<typeof Link>[0]["href"];
}) {
  const range = getPaginationRange(page, totalPages);
  const btnBase = "flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors";

  return (
    <div className="mt-12 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className={`${btnBase} border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]`}
          aria-label="Předchozí stránka"
        >
          ←
        </Link>
      ) : (
        <span className={`${btnBase} border border-[var(--color-border)] text-[var(--color-border)] cursor-not-allowed`}>←</span>
      )}

      {range.map((p, i) =>
        p === null ? (
          <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-[var(--color-text-muted)]">
            …
          </span>
        ) : p === page ? (
          <span key={p} className={`${btnBase} bg-[var(--color-primary)] text-white cursor-default`}>
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className={`${btnBase} border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]`}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className={`${btnBase} border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]`}
          aria-label="Další stránka"
        >
          →
        </Link>
      ) : (
        <span className={`${btnBase} border border-[var(--color-border)] text-[var(--color-border)] cursor-not-allowed`}>→</span>
      )}
    </div>
  );
}

function buildQuery(params: {
  category: string;
  engagementType: string;
  city: string;
  page: number;
}) {
  const q: Record<string, string> = {};
  if (params.category) q.category = params.category;
  if (params.engagementType) q.type = params.engagementType;
  if (params.city) q.city = params.city;
  if (params.page > 1) q.page = String(params.page);
  return q;
}

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    type?: string;
    city?: string;
    page?: string;
    ubytovani?: string;
  }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isCs = locale === "cs";
  const { total } = await getJobs({ pageSize: 1 });
  return {
    title: isCs
      ? `Pracovní nabídky v Norsku | ${total} sezónních pozic — Norsko-práce.cz`
      : `Pracovné ponuky v Nórsku | ${total} sezónnych pozícií — Norsko-práce.cz`,
    description: isCs
      ? `Procházej ${total} aktuálních sezónních pracovních nabídek v Norsku přeložených do češtiny. Filtruj podle kategorie, lokality nebo typu úvazku.`
      : `Prechádzaj ${total} aktuálnych sezónnych pracovných ponúk v Nórsku preložených do slovenčiny. Filtruj podľa kategórie, lokality alebo typu úväzku.`,
    alternates: buildAlternates(locale, "/prace"),
  };
}

const PAGE_SIZE = 20;

export default async function PracePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const filters = await searchParams;

  const category = filters.category ?? "";
  const engagementType = filters.type ?? "";
  const city = filters.city ?? "";
  const accommodation = filters.ubytovani === "1";
  const page = Math.max(1, parseInt(filters.page ?? "1", 10));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ jobs, total }, cities, premiumJobs, favoriteIds] = await Promise.all([
    getJobs({
      category: category || undefined,
      engagementType: engagementType || undefined,
      city: city || undefined,
      norwegianOk: false,
      accommodation: accommodation || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    getDistinctCities(),
    getPremiumJobs(),
    user ? getUserFavoriteIds(user.id) : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const localized = jobs.map((j) => ({
    job: localizeJob(j, locale as Locale),
    meta: getCategoryMeta(j.category_level1),
  }));
  const localizedPremium = premiumJobs.map((j) => ({
    job: localizeJob(j, locale as Locale),
    meta: getCategoryMeta(j.category_level1),
  }));

  const isCs = locale === "cs";
  const categoryLabel = category
    ? (CATEGORY_MAP[category]?.label ?? category)
    : isCs
    ? "Všechny kategorie"
    : "Všetky kategórie";

  return (
    <>
      {/* Header */}
      <section
        className="py-16"
        style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">
              {isCs ? "Pracovní nabídky" : "Pracovné ponuky"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">
            {isCs ? "Nabídky práce v Norsku" : "Ponuky práce v Nórsku"}
          </h1>
          <p className="mt-3 max-w-xl text-white/65">
            {total > 0
              ? isCs
                ? `${total} sezónních pozic — aktualizováno denně`
                : `${total} sezónnych pozícií — aktualizované denne`
              : isCs
              ? "Sezónní a krátkodobé pozice přeložené do češtiny"
              : "Sezónné a krátkodobé pozície preložené do slovenčiny"}
          </p>
        </div>
      </section>

      {/* Premium section */}
      {/* Filters + results */}
      <section className="bg-[var(--color-bg)] py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          {/* Filter bar */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <JobFilters
              locale={locale as Locale}
              category={category}
              engagementType={engagementType}
              city={city}
              cities={cities}
              accommodation={accommodation}
            />
            <p className="text-sm text-[var(--color-text-muted)]">
              {total}{" "}
              {isCs ? "nabídek" : "ponúk"}
              {category ? ` · ${categoryLabel}` : ""}
            </p>
          </div>

          {/* Grid */}
          {localized.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {localized.map(({ job, meta }) => (
                <JobCard
                  key={job.id}
                  job={job}
                  meta={meta}
                  locale={locale}
                  headingLevel="h2"
                  favoriteButton={user ? <FavoriteButton jobId={job.id} initialFavorited={favoriteIds.includes(job.id)} /> : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
              <p className="text-lg text-[var(--color-text-muted)]">
                {isCs ? "Žádné nabídky nenalezeny" : "Žiadne ponuky nenájdené"}
              </p>
              {(category || engagementType) && (
                <Link
                  href="/prace"
                  className="mt-4 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline"
                >
                  {isCs ? "Zrušit filtry" : "Zrušiť filtre"} →
                </Link>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => ({ pathname: "/prace", query: buildQuery({ category, engagementType, city, page: p }) })}
            />
          )}
        </div>
      </section>

      {/* ── Vybrané inzeráty — dole jako nabídková sekce ── */}
      {localizedPremium.length > 0 && (
        <section className="border-t border-[var(--color-border)] bg-white py-12">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                  ★ {isCs ? "Vybrané inzeráty" : "Vybrané inzeráty"}
                </span>
                <p className="hidden text-sm text-[var(--color-text-muted)] sm:block">
                  {isCs ? "Ručně vybrané příležitosti" : "Ručne vybrané príležitosti"}
                </p>
              </div>
              {user && (
                <Link
                  href="/vybrane"
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                >
                  {isCs ? "Zobrazit vše →" : "Zobraziť všetko →"}
                </Link>
              )}
            </div>

            {user ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {localizedPremium.map(({ job, meta }) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    meta={meta}
                    locale={locale}
                    headingLevel="h2"
                    favoriteButton={<FavoriteButton jobId={job.id} initialFavorited={favoriteIds.includes(job.id)} />}
                  />
                ))}
              </div>
            ) : (
              <div className="relative">
                {/* Fake placeholder karty — žádná reálná data */}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 select-none pointer-events-none blur-sm opacity-50">
                  {[
                    { title: isCs ? "Sezónní pracovník — rybprodukce" : "Sezónny pracovník — rybolov", location: "Bergen", badge: isCs ? "Zemědělství" : "Poľnohospodárstvo", icon: "🌾", badgeClass: "bg-[var(--color-primary-light)] text-[var(--color-primary)]", accentClass: "bg-[var(--color-primary)]", arrowClass: "bg-[var(--color-primary)] text-white", type: isCs ? "Sezónní" : "Sezónna" },
                    { title: isCs ? "Kuchař / kuchařka — horský hotel" : "Kuchár / kuchárka — horský hotel", location: "Ålesund", badge: isCs ? "Gastronomie" : "Gastronómia", icon: "🍽️", badgeClass: "bg-yellow-50 text-yellow-800", accentClass: "bg-yellow-500", arrowClass: "bg-yellow-500 text-white", type: isCs ? "Sezónní" : "Sezónna" },
                    { title: isCs ? "Stavební dělník — letní brigáda" : "Stavebný robotník — letná brigáda", location: "Stavanger", badge: isCs ? "Stavebnictví" : "Stavebníctvo", icon: "🏗️", badgeClass: "bg-[var(--color-accent-light)] text-[var(--color-accent)]", accentClass: "bg-[var(--color-accent)]", arrowClass: "bg-[var(--color-accent)] text-white", type: isCs ? "Brigáda" : "Brigáda" },
                  ].map((fake) => (
                    <div key={fake.title} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)]">
                      <div className={`h-1 w-full flex-shrink-0 ${fake.accentClass}`} />
                      <div className="flex flex-1 flex-col p-5">
                        <span className={`mb-3 inline-block self-start rounded-full px-3 py-1 text-xs font-semibold ${fake.badgeClass}`}>
                          {fake.icon} {fake.badge}
                        </span>
                        <p className="mb-1 text-base font-bold leading-snug text-[var(--color-text)] line-clamp-2">{fake.title}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">📍 {fake.location}</p>
                        <div className="mt-auto flex items-center justify-between pt-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${fake.badgeClass}`}>{fake.type}</span>
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${fake.arrowClass}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 18l6-6-6-6" /></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="rounded-2xl bg-white/95 backdrop-blur-sm shadow-lg border border-[var(--color-border)] px-8 py-6 text-center max-w-xs">
                    <p className="text-2xl mb-2">🔒</p>
                    <h3 className="text-base font-extrabold text-[var(--color-text)] mb-1">
                      {isCs ? "Vybrané inzeráty" : "Vybrané inzeráty"}
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)] mb-4">
                      {isCs
                        ? "Přihlas se zdarma a zobraz ručně vybrané nabídky."
                        : "Prihlás sa zadarmo a zobraz ručne vybrané ponuky."}
                    </p>
                    <div className="flex flex-col gap-2">
                      <a
                        href={`/${locale}/auth/register`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition"
                      >
                        {isCs ? "Registrovat se zdarma" : "Registrovať sa zadarmo"}
                      </a>
                      <a
                        href={`/${locale}/auth/login`}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                      >
                        {isCs ? "Už mám účet — přihlásit se" : "Už mám účet — prihlásiť sa"}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

