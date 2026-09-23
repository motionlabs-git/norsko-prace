import Link from "next/link";
import { getJobs, getTradeCounts, getDistinctCities, getUserFavoriteIds } from "@/lib/jobs";
import { TRADES, buildPermanentHref } from "@/lib/trades";
import { plural } from "@/lib/plural";
import { JobSearch } from "@/components/jobs/JobSearch";
import { PermanentFilters } from "@/components/jobs/PermanentFilters";
import { JobResults } from "@/components/jobs/JobResults";
import { FavoriteButton } from "@/components/jobs/FavoriteButton";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 1800;

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ obor?: string; city?: string; uvazek?: string; norsky?: string; q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams;
  const { total } = await getJobs({ jobType: "permanent", pageSize: 1 });
  return {
    title: `Stálé pozice v Norsku | ${total} ${plural(total, "nabídka", "nabídky", "nabídek")} pro řemeslníky`,
    description:
      "Trvalé pracovní úvazky v Norsku pro elektrikáře, svářeče, mechaniky, instalatéry a řidiče. Inzeráty z norského úřadu práce přeložené do češtiny.",
    alternates: { canonical: "https://norsko-prace.cz/stale-pozice" },
    ...(q ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function StalePozicePage({ searchParams }: Props) {
  const filters = await searchParams;
  const trade = filters.obor ?? "";
  const city = filters.city ?? "";
  const extent = filters.uvazek === "Heltid" || filters.uvazek === "Deltid" ? filters.uvazek : "";
  const withoutNorwegian = filters.norsky === "0";
  const search = (filters.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, parseInt(filters.page ?? "1", 10));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ jobs, total }, counts, cities, favoriteIds] = await Promise.all([
    getJobs({
      jobType: "permanent",
      trade: trade || undefined,
      city: city || undefined,
      extent: extent || undefined,
      search: search || undefined,
      norwegianOk: !withoutNorwegian,
      page,
      pageSize: PAGE_SIZE,
    }),
    getTradeCounts(),
    getDistinctCities("permanent"),
    user ? getUserFavoriteIds(user.id) : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = Boolean(trade || city || extent || withoutNorwegian || search);

  return (
    <>
      <section className="py-16" style={{ background: "linear-gradient(135deg, #0b3d2e 0%, #046353 100%)" }}>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Stálé pozice</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">Práce v Norsku na stálo</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Trvalé úvazky v řemeslech — elektrikáři, svářeči, mechanici, instalatéři a řidiči.
            Na rozdíl od sezónních brigád jde o práci na neurčito, se kterou se do Norska stěhuje celá rodina.
          </p>
          <div className="mt-7">
            <JobSearch key={search} initialQuery={search} placeholder="Elektrikář, svářeč, Bergen, CE…" />
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--color-border)] bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="mb-5 text-lg font-extrabold text-[var(--color-text)]">Obory</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {TRADES.map((t) => (
              <Link
                key={t.slug}
                href={`/stale-pozice/${t.slug}`}
                className="group rounded-2xl border border-[var(--color-border)] bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
              >
                <span className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-lg ${t.badgeClass}`}>
                  {t.icon}
                </span>
                <p className="text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                  {t.label}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {counts[t.slug] ?? 0} {plural(counts[t.slug] ?? 0, "nabídka", "nabídky", "nabídek")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <PermanentFilters
              trade={trade}
              city={city}
              cities={cities}
              extent={extent}
              withoutNorwegian={withoutNorwegian}
            />
            <p className="text-sm text-[var(--color-text-muted)] sm:text-right">
              {total} {plural(total, "nabídka", "nabídky", "nabídek")}{search ? ` pro „${search}“` : ""}
            </p>
          </div>

          <JobResults
            jobs={jobs}
            page={page}
            totalPages={totalPages}
            buildHref={(p) =>
              buildPermanentHref("/stale-pozice", { trade, city, extent, withoutNorwegian, search, page: p })
            }
            renderFavorite={
              user
                ? (jobId) => <FavoriteButton jobId={jobId} initialFavorited={favoriteIds.includes(jobId)} />
                : undefined
            }
            emptyTitle={search ? `Pro „${search}“ jsme nic nenašli` : "Zatím tu nejsou žádné nabídky"}
            emptyHint={
              hasFilters
                ? "Zkus jiné slovo nebo zruš filtry."
                : "Nabídky se doplní při nejbližší synchronizaci s norským úřadem práce."
            }
            resetHref={hasFilters ? "/stale-pozice" : undefined}
          />
        </div>
      </section>
    </>
  );
}
