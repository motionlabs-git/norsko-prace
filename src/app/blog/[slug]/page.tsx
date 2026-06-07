import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { buildBreadcrumb } from "@/lib/seo";
import { MDXRemote } from "next-mdx-remote/rsc";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getBlogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: "article", publishedTime: post.publishedAt },
    alternates: { canonical: `https://norsko-prace.cz/blog/${slug}` },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const formatDate = (str: string) => {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
  };

  const BASE = "https://norsko-prace.cz";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        inLanguage: "cs",
        url: `${BASE}/blog/${slug}`,
        publisher: { "@type": "Organization", name: "Norsko-práce.cz", url: BASE, logo: { "@type": "ImageObject", url: `${BASE}/images/norsko-prace-logo.svg` } },
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumb([
        { name: "Průvodce", url: `${BASE}/blog` },
        { name: post.title, url: `${BASE}/blog/${slug}` },
      ])) }} />

      <section className="py-12" style={{ background: "linear-gradient(135deg, #C8102E 0%, #9e0b21 100%)" }}>
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
            <Link href="/blog" className="hover:text-white transition-colors">Průvodce</Link>
            <span>/</span>
            <span className="text-white/80">{post.category}</span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight text-white md:text-3xl">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readingTime} min čtení</span>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] py-12">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_220px]">
            <article className="prose prose-base max-w-none
              prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-[var(--color-text)]
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-[var(--color-text)] prose-p:leading-relaxed
              prose-a:text-[var(--color-primary)] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-[var(--color-text)]
              prose-ul:pl-5 prose-li:my-1
              prose-table:text-sm
              prose-th:bg-[var(--color-primary-light)] prose-th:text-[var(--color-primary)] prose-th:font-semibold prose-th:px-4 prose-th:py-2
              prose-td:px-4 prose-td:py-2 prose-td:border-b prose-td:border-[var(--color-border)]
              prose-hr:border-[var(--color-border)] prose-hr:my-10
            ">
              <MDXRemote source={post.content} />
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <Link href="/blog" className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 rotate-180"><path d="M9 18l6-6-6-6" /></svg>
                  Všechny průvodce
                </Link>
                <div className="rounded-2xl bg-[var(--color-primary)] p-5 text-white">
                  <p className="mb-3 text-sm font-bold leading-snug">Hledáš práci v Norsku?</p>
                  <p className="mb-4 text-xs text-white/75 leading-relaxed">Stovky sezónních nabídek přeložených do češtiny.</p>
                  <Link href="/prace" className="block rounded-full bg-white py-2.5 text-center text-xs font-bold text-[var(--color-primary)] transition hover:opacity-90">
                    Procházet nabídky →
                  </Link>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-6 lg:hidden rounded-2xl bg-[var(--color-primary)] p-5 text-white">
            <p className="mb-3 text-sm font-bold">Hledáš práci v Norsku?</p>
            <Link href="/prace" className="block rounded-full bg-white py-2.5 text-center text-xs font-bold text-[var(--color-primary)]">
              Procházet nabídky →
            </Link>
          </div>

          <div className="mt-10 border-t border-[var(--color-border)] pt-8">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 rotate-180"><path d="M9 18l6-6-6-6" /></svg>
              Zpět na průvodce
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
