import { Link } from "@/i18n/navigation";
import { getFeaturedJobs, localizeJob, getCategoryMeta } from "@/lib/jobs";
import { JobCard } from "@/components/jobs/JobCard";
import type { Locale } from "@/types";

export const revalidate = 3600; // ISR — rebuild at most once per hour

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isCs = locale === "cs";
  return {
    title: isCs
      ? "Práce v Norsku česky | Sezónní nabídky — Norsko-práce.cz"
      : "Práca v Nórsku po slovensky | Sezónne ponuky — Norsko-práce.cz",
    description: isCs
      ? "Stovky sezónních pracovních nabídek z Norska přeložených do češtiny. Zemědělství, gastronomie, stavebnictví — aktualizováno denně."
      : "Stovky sezónnych pracovných ponúk z Nórska preložených do slovenčiny. Poľnohospodárstvo, gastronómia, stavebníctvo — aktualizované denne.",
    openGraph: {
      title: isCs
        ? "Práce v Norsku česky | Norsko-práce.cz"
        : "Práca v Nórsku po slovensky | Norsko-práce.cz",
      description: isCs
        ? "Sezónní pracovní nabídky z Norska přeložené do češtiny. Aktualizováno denně."
        : "Sezónne pracovné ponuky z Nórska preložené do slovenčiny. Aktualizované denne.",
      type: "website",
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const jobs = await getFeaturedJobs(3);
  const localizedJobs = jobs.map((j) => ({
    job: localizeJob(j, locale as Locale),
    meta: getCategoryMeta(j.category_level1),
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Norsko-práce.cz",
            url: "https://norsko-prace.cz",
            description:
              locale === "cs"
                ? "Sezónní pracovní nabídky z Norska přeložené do češtiny"
                : "Sezónne pracovné ponuky z Nórska preložené do slovenčiny",
            inLanguage: locale === "cs" ? "cs" : "sk",
            potentialAction: {
              "@type": "SearchAction",
              target: `https://norsko-prace.cz/${locale}/prace?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <HeroSection />
      <FeaturedJobs items={localizedJobs} />
      <HowItWorks />
      <BlogCta />
    </>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      className="relative flex flex-col justify-end overflow-hidden"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {/* Background photo */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1744619438365-19c55e108cb7?w=1920&q=80')",
        }}
      />

      {/* Gradient overlay — světlý nahoře, tmavý dole pro čitelnost textu */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.82) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative mx-auto w-full max-w-6xl px-6 pb-20 pt-40 md:px-8 md:pb-24">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-white/90">
            Sezónní práce v Norsku
          </span>
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-7xl lg:text-8xl">
          Najdi práci
          <br />
          <span className="relative inline-block">
            v Norsku
            <span className="absolute -bottom-1 left-0 h-[5px] w-full rounded-full bg-[#C8102E]" />
          </span>
          <br />
          <span className="text-white/70">na tohle léto</span>
        </h1>

        <p className="mb-10 max-w-xl text-lg leading-relaxed text-white/70">
          Tisíce sezónních nabídek přeložených do češtiny a slovenštiny —
          aktualizováno každý den.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/prace"
            className="inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-8 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#9e0b21] hover:shadow-xl"
          >
            Procházet inzeráty →
          </Link>
          <a
            href="#jak-to-funguje"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 text-base font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Jak to funguje
          </a>
        </div>

        {/* Mini stats */}
        <div className="mt-12 flex flex-wrap gap-6 border-t border-white/15 pt-8">
          {[
            { num: "1 200+", label: "aktivních inzerátů" },
            { num: "Denně", label: "aktualizováno" },
            { num: "100%", label: "přeloženo do češtiny" },
          ].map((s) => (
            <div key={s.label}>
              <span className="text-xl font-extrabold text-white">{s.num}</span>
              <span className="ml-2 text-sm text-white/55">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Featured jobs ─────────────────────────────────────────────────────────────

type JobItem = {
  job: ReturnType<typeof localizeJob>;
  meta: ReturnType<typeof getCategoryMeta>;
};

function FeaturedJobs({ items }: { items: JobItem[] }) {
  const hasJobs = items.length > 0;

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#fde8ec] px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#C8102E]">
                Aktuální nabídky
              </span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-text)] md:text-4xl">
              Sezónní práce v Norsku
            </h2>
            <p className="mt-2 text-[var(--color-text-muted)]">
              Denně aktualizované pozice přeložené do češtiny
            </p>
          </div>
          <Link
            href="/prace"
            className="hidden items-center gap-2 rounded-full bg-[#C8102E] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#9e0b21] hover:shadow-lg md:inline-flex"
          >
            Zobrazit vše →
          </Link>
        </div>

        {hasJobs ? (
          <div className="grid gap-5 md:grid-cols-3">
            {items.map(({ job, meta }) => (
              <JobCard
                key={job.id}
                job={job}
                meta={meta}
                locale="cs"
                headingLevel="h3"
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
            <p className="text-[var(--color-text-muted)]">
              Inzeráty se načítají. Spusť synchronizaci přes{" "}
              <code className="rounded bg-[#fde8ec] px-1.5 py-0.5 text-xs text-[#C8102E]">
                /api/sync
              </code>
              .
            </p>
          </div>
        )}

        <div className="mt-10 text-center md:hidden">
          <Link
            href="/prace"
            className="inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#9e0b21]"
          >
            Zobrazit vše →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: "01",
      color: "#C8102E",
      bg: "rgba(200,16,46,0.15)",
      title: "Najdi inzerát",
      desc: "Procházej stovky sezónních nabídek přeložených do češtiny a slovenštiny.",
    },
    {
      num: "02",
      color: "#ffffff",
      bg: "rgba(255,255,255,0.1)",
      title: "Přihlaš se",
      desc: "Klikni na odkaz a přihlaš se přímo na norském pracovním portálu.",
    },
    {
      num: "03",
      color: "#003087",
      bg: "rgba(0,48,135,0.35)",
      title: "Odjeď do Norska",
      desc: "Naše průvodce tě provedou D-numberem, BankID a životem na severu.",
    },
  ];

  return (
    <section
      id="jak-to-funguje"
      className="relative overflow-hidden py-24"
      style={{ background: "#0d1117" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-[#003087] opacity-15" />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#C8102E] opacity-10" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/15">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">
            Jak to funguje
          </span>
        </div>
        <h2 className="mb-16 mt-4 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Práce v Norsku ve třech krocích
        </h2>

        <div className="grid gap-10 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="group">
              <div
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: s.bg }}
              >
                <span
                  className="text-xl font-extrabold"
                  style={{ color: s.color }}
                >
                  {s.num}
                </span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{s.title}</h3>
              <p className="text-base leading-relaxed text-white/50">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link
            href="/prace"
            className="inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-[#9e0b21] hover:shadow-xl"
          >
            Procházet inzeráty →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Blog CTA ──────────────────────────────────────────────────────────────────

function BlogCta() {
  return (
    <section
      className="relative overflow-hidden py-20"
      style={{
        background: "linear-gradient(135deg, #C8102E 0%, #9e0b21 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white opacity-[0.07]" />
        <div className="absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-white opacity-[0.05]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        <div className="max-w-2xl">
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Průvodci pro práci v Norsku
          </h2>
          <p className="mb-8 text-lg text-white/80">
            D-number, BankID, zdanění — vše co potřebuješ před odjezdem. Přečti
            si naše bezplatné průvodce.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-[#C8102E] transition-opacity hover:opacity-90"
          >
            Číst průvodce →
          </Link>
        </div>
      </div>
    </section>
  );
}
