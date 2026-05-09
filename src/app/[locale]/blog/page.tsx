import { Link } from "@/i18n/navigation";
import { getBlogPosts } from "@/lib/blog";

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isCs = locale === "cs";
  return {
    title: isCs ? "Blog — práce v Norsku | Norsko-práce.cz" : "Blog — práca v Nórsku | Norsko-práce.cz",
    description: isCs
      ? "Tipy, zkušenosti a novinky o práci v Norsku — co čekat, jak se připravit a jak to tam skutečně chodí."
      : "Tipy, skúsenosti a novinky o práci v Nórsku — čo čakať, ako sa pripraviť a ako to tam skutočne chodí.",
  };
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Administrativa: { bg: "bg-[var(--color-primary-light)]", text: "text-[var(--color-primary)]" },
  Administratíva: { bg: "bg-[var(--color-primary-light)]", text: "text-[var(--color-primary)]" },
  Finance: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Financie: { bg: "bg-emerald-50", text: "text-emerald-700" },
  "Životní styl": { bg: "bg-amber-50", text: "text-amber-700" },
  "Životný štýl": { bg: "bg-amber-50", text: "text-amber-700" },
};

function categoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? { bg: "bg-gray-100", text: "text-gray-600" };
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { category: activeCategory } = await searchParams;
  const isCs = locale === "cs";

  const allPosts = getBlogPosts(locale);
  const categories = [...new Set(allPosts.map((p) => p.category))].sort();
  const posts = activeCategory
    ? allPosts.filter((p) => p.category === activeCategory)
    : allPosts;

  return (
    <>
      {/* Header */}
      <section
        className="pb-0 pt-16"
        style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">
              Blog
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">
            {isCs ? "Práce v Norsku — články a tipy" : "Práca v Nórsku — články a tipy"}
          </h1>
          <p className="mt-3 text-white/65 max-w-xl">
            {isCs
              ? "Co čekat, jak se připravit a jak to tam skutečně chodí — tipy a zkušenosti přímo z Norska."
              : "Čo čakať, ako sa pripraviť a ako to tam skutočne chodí — tipy a skúsenosti priamo z Nórska."}
          </p>

          {/* Category filters */}
          {categories.length > 1 && (
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                href="/blog"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  !activeCategory
                    ? "bg-white text-[#003087]"
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                {isCs ? "Vše" : "Všetko"}
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={{ pathname: "/blog", query: { category: cat } }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    activeCategory === cat
                      ? "bg-white text-[#003087]"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          )}

          {/* Visual bridge to content */}
          <div className="mt-8 h-6 rounded-t-3xl bg-[var(--color-bg)]" />
        </div>
      </section>

      {/* Articles grid */}
      <section className="bg-[var(--color-bg)] py-8">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
              <p className="text-[var(--color-text-muted)]">
                {isCs ? "Žádné články v této kategorii." : "Žiadne články v tejto kategórii."}
              </p>
              <Link href="/blog" className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline">
                {isCs ? "Zobrazit vše" : "Zobraziť všetko"} →
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => {
                const { bg, text } = categoryStyle(post.category);
                return (
                  <Link
                    key={post.slug}
                    href={{ pathname: "/blog/[slug]", params: { slug: post.slug } }}
                    className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="h-1 w-full bg-[var(--color-accent)]" />

                    <div className="flex flex-1 flex-col p-6">
                      <span className={`mb-3 inline-block self-start rounded-full px-3 py-1 text-xs font-semibold ${bg} ${text}`}>
                        {post.category}
                      </span>

                      <h2 className="mb-2 text-lg font-bold leading-snug text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
                        {post.title}
                      </h2>

                      <p className="text-sm leading-relaxed text-[var(--color-text-muted)] line-clamp-3 flex-1">
                        {post.description}
                      </p>

                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {post.readingTime} min čtení
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)]">
                          {isCs ? "Číst" : "Čítať"}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
