import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getFavorites, getUserFavoriteIds, localizeJob, getCategoryMeta } from "@/lib/jobs";
import { JobCard } from "@/components/jobs/JobCard";
import { FavoriteButton } from "@/components/jobs/FavoriteButton";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/types";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return {
    title: locale === "cs" ? "Oblíbené inzeráty — Norsko-práce.cz" : "Obľúbené inzeráty — Norsko-práce.cz",
  };
}

export default async function OblibenenePage({ params }: Props) {
  const { locale } = await params;
  const isCs = locale === "cs";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const [jobs, favoriteIds] = await Promise.all([
    getFavorites(user.id),
    getUserFavoriteIds(user.id),
  ]);

  const localized = jobs.map((j) => ({
    job: localizeJob(j, locale as Locale),
    meta: getCategoryMeta(j.category_level1),
  }));

  return (
    <>
      <section
        className="py-16"
        style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">
              {isCs ? "Oblíbené" : "Obľúbené"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">
            {isCs ? "Uložené inzeráty" : "Uložené inzeráty"}
          </h1>
          <p className="mt-3 text-white/65">
            {jobs.length > 0
              ? isCs
                ? `${jobs.length} uložených ${jobs.length === 1 ? "inzerát" : jobs.length < 5 ? "inzeráty" : "inzerátů"}`
                : `${jobs.length} uložených ${jobs.length === 1 ? "inzerát" : "inzerátov"}`
              : isCs
              ? "Zatím žádné uložené inzeráty"
              : "Zatiaľ žiadne uložené inzeráty"}
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          {localized.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-24 text-center">
              <p className="text-4xl mb-4">♡</p>
              <p className="text-lg font-semibold text-[var(--color-text)] mb-2">
                {isCs ? "Žádné oblíbené inzeráty" : "Žiadne obľúbené inzeráty"}
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                {isCs
                  ? "Klikni na srdíčko na kartičce inzerátu a ulož si ho sem."
                  : "Klikni na srdiečko na kartičke inzerátu a ulož si ho sem."}
              </p>
              <Link
                href="/prace"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[var(--color-primary-dark)] transition"
              >
                {isCs ? "Procházet inzeráty" : "Prechádzať inzeráty"} →
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {localized.map(({ job, meta }) => (
                <JobCard
                  key={job.id}
                  job={job}
                  meta={meta}
                  locale={locale}
                  headingLevel="h2"
                  favoriteButton={
                    <FavoriteButton jobId={job.id} initialFavorited={favoriteIds.includes(job.id)} />
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
