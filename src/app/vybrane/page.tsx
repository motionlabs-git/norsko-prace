import Link from "next/link";
import { getPremiumJobs, localizeJob, getCategoryMeta, getUserFavoriteIds } from "@/lib/jobs";
import { JobCard } from "@/components/jobs/JobCard";
import { FavoriteButton } from "@/components/jobs/FavoriteButton";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 1800;

export const metadata = {
  title: "Vybrané práce v Norsku",
  description: "Ručně vybrané pracovní příležitosti v Norsku pro česky mluvící uchazeče.",
};

const FAKE_CARDS = [
  { title: "Sezónní pracovník — rybprodukce", location: "Bergen", badge: "Zemědělství", icon: "🌾", badgeClass: "bg-[var(--color-primary-light)] text-[var(--color-primary)]", accentClass: "bg-[var(--color-primary)]", arrowClass: "bg-[var(--color-primary)] text-white", type: "Sezónní" },
  { title: "Kuchař / kuchařka — horský hotel", location: "Ålesund", badge: "Gastronomie", icon: "🍽️", badgeClass: "bg-yellow-50 text-yellow-800", accentClass: "bg-yellow-500", arrowClass: "bg-yellow-500 text-white", type: "Sezónní" },
  { title: "Stavební dělník — letní brigáda", location: "Stavanger", badge: "Stavebnictví", icon: "🏗️", badgeClass: "bg-[var(--color-accent-light)] text-[var(--color-accent)]", accentClass: "bg-[var(--color-accent)]", arrowClass: "bg-[var(--color-accent)] text-white", type: "Brigáda" },
  { title: "Recepční — turistický resort", location: "Tromsø", badge: "Gastronomie", icon: "🍽️", badgeClass: "bg-yellow-50 text-yellow-800", accentClass: "bg-yellow-500", arrowClass: "bg-yellow-500 text-white", type: "Sezónní" },
  { title: "Skladník s řidičským průkazem", location: "Oslo", badge: "Doprava", icon: "🚚", badgeClass: "bg-purple-50 text-purple-700", accentClass: "bg-purple-600", arrowClass: "bg-purple-600 text-white", type: "Trvalý" },
  { title: "Pomocný personál — úklidové služby", location: "Trondheim", badge: "Úklid", icon: "🧹", badgeClass: "bg-blue-50 text-blue-700", accentClass: "bg-blue-500", arrowClass: "bg-blue-500 text-white", type: "Brigáda" },
];

export default async function VybranePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [premiumJobs, favoriteIds] = user
    ? await Promise.all([getPremiumJobs(), getUserFavoriteIds(user.id)])
    : [[], []];

  const localized = premiumJobs.map((job) => ({
    job: localizeJob(job),
    meta: getCategoryMeta(job.category_level1),
  }));

  const subtitleText = user
    ? localized.length > 0
      ? `${localized.length} ručně vybraných pozic`
      : "Ručně vybrané pracovní příležitosti v Norsku"
    : "Přihlas se a zobraz ručně vybrané příležitosti";

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Kurátorský výběr</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">Vybrané práce</h1>
          <p className="mt-3 max-w-xl text-white/65">{subtitleText}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          {user ? (
            localized.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-4xl mb-4">✦</p>
                <h2 className="text-xl font-extrabold text-[var(--color-text)] mb-2">Žádné vybrané inzeráty</h2>
                <p className="text-[var(--color-text-muted)] text-sm">Admin přidá vybrané inzeráty z administrace.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {localized.map(({ job, meta }) => (
                  <JobCard key={job.id} job={job} meta={meta} headingLevel="h2"
                    favoriteButton={<FavoriteButton jobId={job.id} initialFavorited={favoriteIds.includes(job.id)} />}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="relative">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 select-none pointer-events-none blur-sm opacity-50">
                {FAKE_CARDS.map((fake) => (
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
                <div className="rounded-2xl bg-white/95 backdrop-blur-sm shadow-lg border border-[var(--color-border)] px-8 py-7 text-center max-w-xs">
                  <p className="text-3xl mb-3">🔒</p>
                  <h2 className="text-base font-extrabold text-[var(--color-text)] mb-2">Vybrané inzeráty</h2>
                  <p className="text-sm text-[var(--color-text-muted)] mb-5">Přihlas se zdarma a zobraz ručně vybrané pracovní nabídky.</p>
                  <div className="flex flex-col gap-2.5">
                    <Link href="/auth/register" className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition">
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
    </div>
  );
}
