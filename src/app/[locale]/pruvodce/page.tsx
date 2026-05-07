import { Link } from "@/i18n/navigation";
import { getBlogPosts } from "@/lib/blog";

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isCs = locale === "cs";
  return {
    title: isCs ? "Průvodce: Práce v Norsku" : "Sprievodcovia: Práca v Nórsku",
    description: isCs
      ? "Vše co potřebuješ před odjezdem — D-number, BankID, daně, ubytování a život v Norsku."
      : "Všetko čo potrebuješ pred odchodom — D-number, BankID, dane, ubytovanie a život v Nórsku.",
  };
}

const GUIDES = [
  {
    slug: "d-number",
    icon: "🪪",
    color: "bg-[var(--color-primary-light)]",
    iconBg: "bg-[var(--color-primary)]",
    label: { cs: "D-number", sk: "D-number" },
    desc: {
      cs: "Identifikační číslo pro cizince — bez něj nepracuješ legálně ani si neotevřeš účet.",
      sk: "Identifikačné číslo pre cudzincov — bez neho nepracuješ legálne ani si neotvoríš účet.",
    },
    step: "01",
  },
  {
    slug: "bankid",
    icon: "🔐",
    color: "bg-blue-50",
    iconBg: "bg-blue-600",
    label: { cs: "BankID", sk: "BankID" },
    desc: {
      cs: "Norský digitální podpis — klíč k bankovnictví, daňovému přiznání i správě financí online.",
      sk: "Nórsky digitálny podpis — kľúč k bankovníctvu, daňovému priznaniu aj správe financií online.",
    },
    step: "02",
  },
  {
    slug: "dane-v-norsku",
    icon: "📊",
    color: "bg-emerald-50",
    iconBg: "bg-emerald-600",
    label: { cs: "Daně v Norsku", sk: "Dane v Nórsku" },
    desc: {
      cs: "Skattekort, kildeskatt, daňové přiznání — co vědět před první výplatou.",
      sk: "Skattekort, kildeskatt, daňové priznanie — čo vedieť pred prvou výplatou.",
    },
    step: "03",
  },
  {
    slug: "zivot-v-norsku",
    icon: "🏔️",
    color: "bg-amber-50",
    iconBg: "bg-amber-500",
    label: { cs: "Život v Norsku", sk: "Život v Nórsku" },
    desc: {
      cs: "Ubytování, náklady, doprava, kultura — realistický pohled na každodenní život na severu.",
      sk: "Ubytovanie, náklady, doprava, kultúra — realistický pohľad na každodenný život na severe.",
    },
    step: "04",
  },
];

export default async function PruvoducePage({ params }: Props) {
  const { locale } = await params;
  const isCs = locale === "cs";
  const posts = getBlogPosts(locale);
  const postMap = Object.fromEntries(posts.map((p) => [p.slug, p]));

  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden py-20"
        style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white opacity-[0.03]" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-[var(--color-accent)] opacity-10" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5">
            <span className="text-xs font-semibold text-white/70">
              {isCs ? "Zdarma · Praktické · Aktuální" : "Zadarmo · Praktické · Aktuálne"}
            </span>
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            {isCs ? "Průvodce pro práci\nv Norsku" : "Sprievodcovia pre prácu\nv Nórsku"}
          </h1>
          <p className="max-w-xl text-lg text-white/70">
            {isCs
              ? "Vše co potřebuješ vědět před odjezdem — od D-numberu po každodenní život na severu."
              : "Všetko čo potrebuješ vedieť pred odchodom — od D-numbera po každodenný život na severe."}
          </p>
        </div>
      </section>

      {/* Steps overview */}
      <section className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {GUIDES.map((g) => (
              <div key={g.slug} className="flex items-center gap-3">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-base ${g.iconBg}`}>
                  <span>{g.icon}</span>
                </div>
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {g.label[locale as "cs" | "sk"]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guide cards */}
      <section className="bg-[var(--color-bg)] py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
            {isCs ? "Všechny průvodce" : "Všetky sprievodcovia"}
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {GUIDES.map((g) => {
              const post = postMap[g.slug];
              return (
                <Link
                  key={g.slug}
                  href={{ pathname: "/pruvodce/[slug]", params: { slug: g.slug } }}
                  className="group relative flex overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                >
                  {/* Left accent */}
                  <div className={`w-1.5 flex-shrink-0 ${g.iconBg}`} />

                  <div className="flex flex-1 items-start gap-5 p-6">
                    {/* Icon */}
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${g.color}`}>
                      {g.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-text-muted)]">{g.step}</span>
                        <h3 className="text-lg font-extrabold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                          {g.label[locale as "cs" | "sk"]}
                        </h3>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                        {g.desc[locale as "cs" | "sk"]}
                      </p>
                      {post && (
                        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                          {post.readingTime} min {isCs ? "čtení" : "čítania"}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] transition-all duration-200 group-hover:bg-[var(--color-primary)] group-hover:text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[var(--color-bg)] pb-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div
            className="relative overflow-hidden rounded-2xl p-8 md:p-10"
            style={{ background: "linear-gradient(135deg, #C8102E 0%, #9e0b21 100%)" }}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white opacity-[0.07]" />
            <div className="relative max-w-lg">
              <h2 className="mb-3 text-2xl font-extrabold text-white md:text-3xl">
                {isCs ? "Připravený vyrazit?" : "Pripravený vyraziť?"}
              </h2>
              <p className="mb-6 text-white/80">
                {isCs
                  ? "Procházej stovky sezónních nabídek a najdi svoji práci v Norsku."
                  : "Prehľadávaj stovky sezónnych ponúk a nájdi svoju prácu v Nórsku."}
              </p>
              <Link
                href="/prace"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--color-accent)] transition hover:opacity-90"
              >
                {isCs ? "Hledat práci →" : "Hľadať prácu →"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
