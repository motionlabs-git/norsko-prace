import Link from "next/link";
import { getJobs, getPremiumJobs, getUserFavoriteIds, localizeJob, getCategoryMeta, CATEGORY_MAP, getDistinctCities } from "@/lib/jobs";
import { JobFilters } from "@/components/jobs/JobFilters";
import { JobCard } from "@/components/jobs/JobCard";
import { FavoriteButton } from "@/components/jobs/FavoriteButton";
import { createClient } from "@/utils/supabase/server";

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

function Pagination({ page, totalPages, buildHref }: { page: number; totalPages: number; buildHref: (p: number) => string }) {
  const range = getPaginationRange(page, totalPages);
  const btnBase = "flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors";
  return (
    <div className="mt-12 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={`${btnBase} border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]`} aria-label="Předchozí stránka">←</Link>
      ) : (
        <span className={`${btnBase} border border-[var(--color-border)] text-[var(--color-border)] cursor-not-allowed`}>←</span>
      )}
      {range.map((p, i) =>
        p === null ? (
          <span key={`e-${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-[var(--color-text-muted)]">…</span>
        ) : p === page ? (
          <span key={p} className={`${btnBase} bg-[var(--color-primary)] text-white cursor-default`}>{p}</span>
        ) : (
          <Link key={p} href={buildHref(p)} className={`${btnBase} border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]`}>{p}</Link>
        )
      )}
      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={`${btnBase} border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]`} aria-label="Další stránka">→</Link>
      ) : (
        <span className={`${btnBase} border border-[var(--color-border)] text-[var(--color-border)] cursor-not-allowed`}>→</span>
      )}
    </div>
  );
}

function buildQueryString(params: { category: string; engagementType: string; city: string; page: number }) {
  const q = new URLSearchParams();
  if (params.category) q.set("category", params.category);
  if (params.engagementType) q.set("type", params.engagementType);
  if (params.city) q.set("city", params.city);
  if (params.page > 1) q.set("page", String(params.page));
  const s = q.toString();
  return `/prace${s ? `?${s}` : ""}`;
}

interface Props {
  searchParams: Promise<{ category?: string; type?: string; city?: string; page?: string; ubytovani?: string }>;
}

export async function generateMetadata() {
  const { total } = await getJobs({ pageSize: 1 });
  return {
    title: `Pracovní nabídky v Norsku | ${total} sezónních pozic`,
    description: `Procházej ${total} aktuálních sezónních pracovních nabídek v Norsku přeložených do češtiny.`,
  };
}

const PAGE_SIZE = 20;

export default async function PracePage({ searchParams }: Props) {
  const filters = await searchParams;
  const category = filters.category ?? "";
  const engagementType = filters.type ?? "";
  const city = filters.city ?? "";
  const accommodation = filters.ubytovani === "1";
  const page = Math.max(1, parseInt(filters.page ?? "1", 10));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ jobs, total }, cities, premiumJobs, favoriteIds] = await Promise.all([
    getJobs({ category: category || undefined, engagementType: engagementType || undefined, city: city || undefined, norwegianOk: false, accommodation: accommodation || undefined, page, pageSize: PAGE_SIZE }),
    getDistinctCities(),
    getPremiumJobs(),
    user ? getUserFavoriteIds(user.id) : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const localized = jobs.map((j) => ({ job: localizeJob(j), meta: getCategoryMeta(j.category_level1) }));
  const localizedPremium = premiumJobs.map((j) => ({ job: localizeJob(j), meta: getCategoryMeta(j.category_level1) }));
  const categoryLabel = category ? (CATEGORY_MAP[category]?.label ?? category) : "Všechny kategorie";

  return (
    <>
      <section className="py-16" style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Pracovní nabídky</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">Nabídky práce v Norsku</h1>
          <p className="mt-3 max-w-xl text-white/65">
            {total > 0 ? `${total} sezónních pozic — aktualizováno denně` : "Sezónní a krátkodobé pozice přeložené do češtiny"}
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <JobFilters category={category} engagementType={engagementType} city={city} cities={cities} accommodation={accommodation} />
            <p className="text-sm text-[var(--color-text-muted)]">
              {total} nabídek{category ? ` · ${categoryLabel}` : ""}
            </p>
          </div>

          {localized.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {localized.map(({ job, meta }) => (
                <JobCard key={job.id} job={job} meta={meta} headingLevel="h2"
                  favoriteButton={user ? <FavoriteButton jobId={job.id} initialFavorited={favoriteIds.includes(job.id)} /> : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
              <p className="text-lg text-[var(--color-text-muted)]">Žádné nabídky nenalezeny</p>
              {(category || engagementType) && (
                <Link href="/prace" className="mt-4 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline">Zrušit filtry →</Link>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} buildHref={(p) => buildQueryString({ category, engagementType, city, page: p })} />
          )}
        </div>
      </section>

      {localizedPremium.length > 0 && (
        <section className="border-t border-[var(--color-border)] bg-white py-12">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">★ Vybrané inzeráty</span>
                <p className="hidden text-sm text-[var(--color-text-muted)] sm:block">Ručně vybrané příležitosti</p>
              </div>
              {user && (
                <Link href="/vybrane" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">Zobrazit vše →</Link>
              )}
            </div>

            {user ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {localizedPremium.map(({ job, meta }) => (
                  <JobCard key={job.id} job={job} meta={meta} headingLevel="h2"
                    favoriteButton={<FavoriteButton jobId={job.id} initialFavorited={favoriteIds.includes(job.id)} />}
                  />
                ))}
              </div>
            ) : (
              <div className="relative">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 select-none pointer-events-none blur-sm opacity-50">
                  {[
                    { title: "Sezónní pracovník — rybprodukce", location: "Bergen", badge: "Zemědělství", icon: "🌾", badgeClass: "bg-[var(--color-primary-light)] text-[var(--color-primary)]", accentClass: "bg-[var(--color-primary)]", arrowClass: "bg-[var(--color-primary)] text-white", type: "Sezónní" },
                    { title: "Kuchař / kuchařka — horský hotel", location: "Ålesund", badge: "Gastronomie", icon: "🍽️", badgeClass: "bg-yellow-50 text-yellow-800", accentClass: "bg-yellow-500", arrowClass: "bg-yellow-500 text-white", type: "Sezónní" },
                    { title: "Stavební dělník — letní brigáda", location: "Stavanger", badge: "Stavebnictví", icon: "🏗️", badgeClass: "bg-[var(--color-accent-light)] text-[var(--color-accent)]", accentClass: "bg-[var(--color-accent)]", arrowClass: "bg-[var(--color-accent)] text-white", type: "Brigáda" },
                  ].map((fake) => (
                    <div key={fake.title} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)]">
                      <div className={`h-1 w-full flex-shrink-0 ${fake.accentClass}`} />
                      <div className="flex flex-1 flex-col p-5">
                        <span className={`mb-3 inline-block self-start rounded-full px-3 py-1 text-xs font-semibold ${fake.badgeClass}`}>{fake.icon} {fake.badge}</span>
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
                    <h3 className="text-base font-extrabold text-[var(--color-text)] mb-1">Vybrané inzeráty</h3>
                    <p className="text-sm text-[var(--color-text-muted)] mb-4">Přihlas se zdarma a zobraz ručně vybrané nabídky.</p>
                    <div className="flex flex-col gap-2">
                      <Link href="/auth/register" className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition">
                        Registrovat se zdarma
                      </Link>
                      <Link href="/auth/login" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition">
                        Už mám účet — přihlásit se
                      </Link>
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
