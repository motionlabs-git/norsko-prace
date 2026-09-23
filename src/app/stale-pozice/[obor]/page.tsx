import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobs, getDistinctCities, getUserFavoriteIds } from "@/lib/jobs";
import { TRADES, getTrade, buildPermanentHref } from "@/lib/trades";
import { plural } from "@/lib/plural";
import { PermanentFilters } from "@/components/jobs/PermanentFilters";
import { JobResults } from "@/components/jobs/JobResults";
import { FavoriteButton } from "@/components/jobs/FavoriteButton";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 1800;

const PAGE_SIZE = 20;

interface Props {
  params: Promise<{ obor: string }>;
  searchParams: Promise<{ city?: string; uvazek?: string; norsky?: string; page?: string }>;
}

export function generateStaticParams() {
  return TRADES.map((t) => ({ obor: t.slug }));
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { obor } = await params;
  const trade = getTrade(obor);
  if (!trade) return {};
  const { city, uvazek, norsky } = await searchParams;
  const { total } = await getJobs({ jobType: "permanent", trade: trade.slug, pageSize: 1 });
  const filtered = Boolean(city || uvazek || norsky);
  return {
    title: `Práce ${trade.title} v Norsku | ${total} ${plural(total, "stálá nabídka", "stálé nabídky", "stálých nabídek")}`,
    description: trade.description,
    alternates: { canonical: `https://norsko-prace.cz/stale-pozice/${trade.slug}` },
    // filtrované výpisy = tenký duplicitní obsah; odkazy z nich ale sledovat
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function TradePage({ params, searchParams }: Props) {
  const { obor } = await params;
  const trade = getTrade(obor);
  if (!trade) notFound();

  const filters = await searchParams;
  const city = filters.city ?? "";
  const extent = filters.uvazek === "Heltid" || filters.uvazek === "Deltid" ? filters.uvazek : "";
  const withoutNorwegian = filters.norsky === "0";
  const page = Math.max(1, parseInt(filters.page ?? "1", 10));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ jobs, total }, cities, favoriteIds] = await Promise.all([
    getJobs({
      jobType: "permanent",
      trade: trade.slug,
      city: city || undefined,
      extent: extent || undefined,
      norwegianOk: !withoutNorwegian,
      page,
      pageSize: PAGE_SIZE,
    }),
    getDistinctCities("permanent"),
    user ? getUserFavoriteIds(user.id) : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const base = `/stale-pozice/${trade.slug}`;
  const hasFilters = Boolean(city || extent || withoutNorwegian);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Stálé pozice", item: "https://norsko-prace.cz/stale-pozice" },
              { "@type": "ListItem", position: 2, name: trade.label, item: `https://norsko-prace.cz${base}` },
            ],
          }),
        }}
      />

      <section className="py-14" style={{ background: "linear-gradient(135deg, #0b3d2e 0%, #046353 100%)" }}>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <Link href="/stale-pozice" className="text-sm font-semibold text-white/70 transition hover:text-white">
            ← Stálé pozice
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold text-white md:text-5xl">
            {trade.icon} Práce {trade.title} v Norsku
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-white/70">{trade.intro}</p>
          <p className="mt-4 text-sm text-white/60">
            {total} {plural(total, "aktuální nabídka", "aktuální nabídky", "aktuálních nabídek")} ·
            trvalý úvazek · zdroj: norský úřad práce NAV
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-8">
            <PermanentFilters
              showTrade={false}
              city={city}
              cities={cities}
              extent={extent}
              withoutNorwegian={withoutNorwegian}
            />
          </div>

          <JobResults
            jobs={jobs}
            page={page}
            totalPages={totalPages}
            buildHref={(p) => buildPermanentHref(base, { city, extent, withoutNorwegian, page: p })}
            renderFavorite={
              user
                ? (jobId) => <FavoriteButton jobId={jobId} initialFavorited={favoriteIds.includes(jobId)} />
                : undefined
            }
            emptyTitle={`Pro obor ${trade.label.toLowerCase()} teď nemáme žádnou nabídku`}
            emptyHint={
              hasFilters
                ? "Zkus zrušit filtry — nabídek bez nich bývá víc."
                : "Nabídky se doplní při nejbližší synchronizaci s norským úřadem práce."
            }
            resetHref={hasFilters ? base : undefined}
          />

          <div className="mt-12 rounded-2xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-lg font-extrabold text-[var(--color-text)]">Další obory</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {TRADES.filter((t) => t.slug !== trade.slug).map((t) => (
                <Link
                  key={t.slug}
                  href={`/stale-pozice/${t.slug}`}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-80 ${t.badgeClass}`}
                >
                  {t.icon} {t.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
