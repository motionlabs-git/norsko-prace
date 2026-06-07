import Link from "next/link";
import { getBlogPosts } from "@/lib/blog";

export const revalidate = 3600;

export const metadata = {
  title: "Průvodce: Práce v Norsku",
  description: "Vše co potřebuješ před odjezdem — D-number, BankID, daně, ubytování a život v Norsku.",
};

const GUIDES = [
  { slug: "d-number", icon: "🪪", color: "bg-[var(--color-primary-light)]", iconBg: "bg-[var(--color-primary)]", label: "D-number", desc: "Identifikační číslo pro cizince — bez něj nepracuješ legálně ani si neotevřeš účet.", step: "01" },
  { slug: "bankid", icon: "🔐", color: "bg-blue-50", iconBg: "bg-blue-600", label: "BankID", desc: "Norský digitální podpis — klíč k bankovnictví, daňovému přiznání i správě financí online.", step: "02" },
  { slug: "dane-v-norsku", icon: "📊", color: "bg-emerald-50", iconBg: "bg-emerald-600", label: "Daně v Norsku", desc: "Skattekort, kildeskatt, daňové přiznání — co vědět před první výplatou.", step: "03" },
  { slug: "zivot-v-norsku", icon: "🏔️", color: "bg-amber-50", iconBg: "bg-amber-500", label: "Život v Norsku", desc: "Ubytování, náklady, doprava, kultura — realistický pohled na každodenní život na severu.", step: "04" },
];

export default async function PruvoducePage() {
  const posts = getBlogPosts();
  const postMap = Object.fromEntries(posts.map((p) => [p.slug, p]));

  return (
    <>
      <section className="py-16" style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Zdarma · Praktické · Aktuální</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">Průvodce pro práci v Norsku</h1>
          <p className="mt-3 max-w-xl text-white/65">Vše co potřebuješ vědět před odjezdem — od D-numberu po každodenní život na severu.</p>
        </div>
      </section>

      <section className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {GUIDES.map((g) => (
              <div key={g.slug} className="flex items-center gap-3">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-base ${g.iconBg}`}>
                  <span>{g.icon}</span>
                </div>
                <span className="text-sm font-semibold text-[var(--color-text)]">{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-[var(--color-text)]">Všechny průvodce</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {GUIDES.map((g) => {
              const post = postMap[g.slug];
              return (
                <Link key={g.slug} href={`/pruvodce/${g.slug}`} className="group relative flex overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
                  <div className={`w-1.5 flex-shrink-0 ${g.iconBg}`} />
                  <div className="flex flex-1 items-start gap-5 p-6">
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${g.color}`}>{g.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-text-muted)]">{g.step}</span>
                        <h3 className="text-lg font-extrabold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{g.label}</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{g.desc}</p>
                      {post && <p className="mt-3 text-xs text-[var(--color-text-muted)]">{post.readingTime} min čtení</p>}
                    </div>
                    <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] transition-all duration-200 group-hover:bg-[var(--color-primary)] group-hover:text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
