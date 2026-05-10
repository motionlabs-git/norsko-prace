import { getPremiumJobs, localizeJob, getCategoryMeta, getUserFavoriteIds } from "@/lib/jobs";
import { JobCard } from "@/components/jobs/JobCard";
import { FavoriteButton } from "@/components/jobs/FavoriteButton";
import { createClient } from "@/utils/supabase/server";
import type { Locale } from "@/types";

export const revalidate = 1800;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isCs = locale === "cs";
  return {
    title: isCs
      ? "Vybrané práce v Norsku — Norsko-práce.cz"
      : "Vybrané práce v Nórsku — Norsko-práce.cz",
    description: isCs
      ? "Ručně vybrané pracovní příležitosti v Norsku pro česky mluvící uchazeče."
      : "Ručne vybrané pracovné príležitosti v Nórsku pre slovensky hovoriacich uchádzačov.",
  };
}

const FAKE_CARDS = [
  { title_cs: "Sezónní pracovník — rybprodukce", title_sk: "Sezónny pracovník — rybolov", location: "Bergen", badge_cs: "Zemědělství", badge_sk: "Poľnohospodárstvo", icon: "🌾", badgeClass: "bg-[var(--color-primary-light)] text-[var(--color-primary)]", accentClass: "bg-[var(--color-primary)]", arrowClass: "bg-[var(--color-primary)] text-white", type_cs: "Sezónní", type_sk: "Sezónna" },
  { title_cs: "Kuchař / kuchařka — horský hotel", title_sk: "Kuchár / kuchárka — horský hotel", location: "Ålesund", badge_cs: "Gastronomie", badge_sk: "Gastronómia", icon: "🍽️", badgeClass: "bg-yellow-50 text-yellow-800", accentClass: "bg-yellow-500", arrowClass: "bg-yellow-500 text-white", type_cs: "Sezónní", type_sk: "Sezónna" },
  { title_cs: "Stavební dělník — letní brigáda", title_sk: "Stavebný robotník — letná brigáda", location: "Stavanger", badge_cs: "Stavebnictví", badge_sk: "Stavebníctvo", icon: "🏗️", badgeClass: "bg-[var(--color-accent-light)] text-[var(--color-accent)]", accentClass: "bg-[var(--color-accent)]", arrowClass: "bg-[var(--color-accent)] text-white", type_cs: "Brigáda", type_sk: "Brigáda" },
  { title_cs: "Recepční — turistický resort", title_sk: "Recepčná — turistický rezort", location: "Tromsø", badge_cs: "Gastronomie", badge_sk: "Gastronómia", icon: "🍽️", badgeClass: "bg-yellow-50 text-yellow-800", accentClass: "bg-yellow-500", arrowClass: "bg-yellow-500 text-white", type_cs: "Sezónní", type_sk: "Sezónna" },
  { title_cs: "Skladník s řidičským průkazem", title_sk: "Skladník s vodičským preukazom", location: "Oslo", badge_cs: "Doprava", badge_sk: "Doprava", icon: "🚚", badgeClass: "bg-purple-50 text-purple-700", accentClass: "bg-purple-600", arrowClass: "bg-purple-600 text-white", type_cs: "Trvalý", type_sk: "Trvalá" },
  { title_cs: "Pomocný personál — úklidové služby", title_sk: "Pomocný personál — upratovacie služby", location: "Trondheim", badge_cs: "Úklid", badge_sk: "Upratovanie", icon: "🧹", badgeClass: "bg-blue-50 text-blue-700", accentClass: "bg-blue-500", arrowClass: "bg-blue-500 text-white", type_cs: "Brigáda", type_sk: "Brigáda" },
];

export default async function VybranePage({ params }: Props) {
  const { locale } = await params;
  const isCs = locale === "cs";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Reálná data načítáme jen pro přihlášené — nepřihlášení vidí pouze fake karty
  const [premiumJobs, favoriteIds] = user
    ? await Promise.all([getPremiumJobs(), getUserFavoriteIds(user.id)])
    : [[], []];

  const localized = premiumJobs.map((job) => ({
    job: localizeJob(job, locale as Locale),
    meta: getCategoryMeta(job.category_level1),
  }));

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Hero */}
      <section
        className="py-16"
        style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="text-sm">★</span>
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">
              {isCs ? "Kurátorský výběr" : "Kurátorský výber"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">
            {isCs ? "Vybrané práce" : "Vybrané práce"}
          </h1>
          <p className="mt-3 text-white/65">
            {user
              ? localized.length > 0
                ? isCs ? `${localized.length} ručně vybraných pozic` : `${localized.length} ručne vybraných pozícií`
                : isCs ? "Ručně vybrané pracovní příležitosti v Norsku" : "Ručne vybrané pracovné príležitosti v Nórsku"
              : isCs
              ? "Přihlas se a zobraz ručně vybrané příležitosti"
              : "Prihlás sa a zobraz ručne vybrané príležitosti"}
          </p>
        </div>
      </section>

      {/* Jobs grid */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          {user ? (
            localized.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-4xl mb-4">✦</p>
                <h2 className="text-xl font-extrabold text-[var(--color-text)] mb-2">
                  {isCs ? "Žádné vybrané inzeráty" : "Žiadne vybrané inzeráty"}
                </h2>
                <p className="text-[var(--color-text-muted)] text-sm">
                  {isCs ? "Admin přidá vybrané inzeráty z administrace." : "Admin pridá vybrané inzeráty z administrácie."}
                </p>
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
                    favoriteButton={<FavoriteButton jobId={job.id} initialFavorited={favoriteIds.includes(job.id)} />}
                  />
                ))}
              </div>
            )
          ) : (
            /* Nepřihlášený — fake karty + overlay */
            <div className="relative">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 select-none pointer-events-none blur-sm opacity-50">
                {FAKE_CARDS.map((fake) => (
                  <div key={fake.title_cs} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)]">
                    <div className={`h-1 w-full flex-shrink-0 ${fake.accentClass}`} />
                    <div className="flex flex-1 flex-col p-5">
                      <span className={`mb-3 inline-block self-start rounded-full px-3 py-1 text-xs font-semibold ${fake.badgeClass}`}>
                        {fake.icon} {isCs ? fake.badge_cs : fake.badge_sk}
                      </span>
                      <p className="mb-1 text-base font-bold leading-snug text-[var(--color-text)] line-clamp-2">
                        {isCs ? fake.title_cs : fake.title_sk}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">📍 {fake.location}</p>
                      <div className="mt-auto flex items-center justify-between pt-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${fake.badgeClass}`}>
                          {isCs ? fake.type_cs : fake.type_sk}
                        </span>
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${fake.arrowClass}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 18l6-6-6-6" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="rounded-2xl bg-white/95 backdrop-blur-sm shadow-lg border border-[var(--color-border)] px-8 py-7 text-center max-w-xs">
                  <p className="text-3xl mb-3">🔒</p>
                  <h2 className="text-base font-extrabold text-[var(--color-text)] mb-2">
                    {isCs ? "Vybrané inzeráty" : "Vybrané inzeráty"}
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)] mb-5">
                    {isCs
                      ? "Přihlas se zdarma a zobraz ručně vybrané pracovní nabídky."
                      : "Prihlás sa zadarmo a zobraz ručne vybrané pracovné ponuky."}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <a
                      href={`/${locale}/auth/register`}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition"
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
    </div>
  );
}
