import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { MDXRemote } from "next-mdx-remote/rsc";

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const locales = ["cs", "sk"];
  return locales.flatMap((locale) =>
    getBlogPosts(locale).map((p) => ({ locale, slug: p.slug }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const post = getBlogPost(locale, slug);
  if (!post) return {};
  return { title: post.title, description: post.description };
}

const GUIDE_ORDER = ["d-number", "bankid", "dane-v-norsku", "zivot-v-norsku"];

export default async function PruvodceDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const post = getBlogPost(locale, slug);
  if (!post) notFound();

  const isCs = locale === "cs";
  const allPosts = getBlogPosts(locale);

  const currentIdx = GUIDE_ORDER.indexOf(slug);
  const nextSlug = GUIDE_ORDER[currentIdx + 1] ?? null;
  const nextPost = nextSlug ? allPosts.find((p) => p.slug === nextSlug) : null;

  const formatDate = (str: string) => {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString(isCs ? "cs-CZ" : "sk-SK", {
      day: "numeric", month: "long", year: "numeric",
    });
  };

  return (
    <>
      {/* Header */}
      <section
        className="py-12"
        style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}
      >
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
            <Link href="/pruvodce" className="hover:text-white transition-colors">
              {isCs ? "Průvodce" : "Sprievodcovia"}
            </Link>
            <span>/</span>
            <span className="text-white/80">{post.category}</span>
          </div>

          <h1 className="text-2xl font-extrabold leading-tight text-white md:text-3xl">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readingTime} min {isCs ? "čtení" : "čítania"}</span>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="bg-[var(--color-bg)] py-12">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_220px]">
            {/* MDX */}
            <article className="prose prose-base max-w-none
              prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-[var(--color-text)]
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-[var(--color-text)] prose-p:leading-relaxed
              prose-a:text-[var(--color-primary)] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-[var(--color-text)]
              prose-ul:pl-5 prose-li:my-1
              prose-table:text-sm prose-table:w-full
              prose-th:bg-[var(--color-primary-light)] prose-th:text-[var(--color-primary)] prose-th:font-semibold prose-th:px-4 prose-th:py-2 prose-th:text-left
              prose-td:px-4 prose-td:py-2 prose-td:border-b prose-td:border-[var(--color-border)]
              prose-hr:border-[var(--color-border)] prose-hr:my-10
            ">
              <MDXRemote source={post.content} />
            </article>

            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <Link
                  href="/pruvodce"
                  className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 rotate-180">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  {isCs ? "Všechny průvodce" : "Všetky sprievodcovia"}
                </Link>

                {/* Next guide */}
                {nextPost && (
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                      {isCs ? "Další průvodce" : "Ďalší sprievodca"}
                    </p>
                    <p className="mb-3 text-sm font-bold text-[var(--color-text)] leading-snug">
                      {nextPost.title}
                    </p>
                    <Link
                      href={{ pathname: "/pruvodce/[slug]", params: { slug: nextPost.slug } }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      {isCs ? "Číst" : "Čítať"} →
                    </Link>
                  </div>
                )}

                {/* CTA */}
                <div className="rounded-2xl bg-[var(--color-primary)] p-5 text-white">
                  <p className="mb-2 text-sm font-bold leading-snug">
                    {isCs ? "Hledáš práci v Norsku?" : "Hľadáš prácu v Nórsku?"}
                  </p>
                  <p className="mb-4 text-xs text-white/75 leading-relaxed">
                    {isCs ? "Stovky sezónních nabídek přeložených do češtiny." : "Stovky sezónnych ponúk preložených do slovenčiny."}
                  </p>
                  <Link
                    href="/prace"
                    className="block rounded-full bg-white py-2.5 text-center text-xs font-bold text-[var(--color-primary)] transition hover:opacity-90"
                  >
                    {isCs ? "Procházet nabídky →" : "Prehľadávať ponuky →"}
                  </Link>
                </div>
              </div>
            </aside>
          </div>

          {/* Next guide — mobile */}
          {nextPost && (
            <div className="mt-10 lg:hidden rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {isCs ? "Další průvodce" : "Ďalší sprievodca"}
              </p>
              <p className="mb-3 text-sm font-bold text-[var(--color-text)]">{nextPost.title}</p>
              <Link
                href={{ pathname: "/pruvodce/[slug]", params: { slug: nextPost.slug } }}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white"
              >
                {isCs ? "Číst průvodce" : "Čítať sprievodcu"} →
              </Link>
            </div>
          )}

          {/* Mobile CTA */}
          <div className="mt-6 lg:hidden rounded-2xl bg-[var(--color-primary)] p-5 text-white">
            <p className="mb-3 text-sm font-bold">
              {isCs ? "Hledáš práci v Norsku?" : "Hľadáš prácu v Nórsku?"}
            </p>
            <Link
              href="/prace"
              className="block rounded-full bg-white py-2.5 text-center text-xs font-bold text-[var(--color-primary)]"
            >
              {isCs ? "Procházet nabídky →" : "Prehľadávať ponuky →"}
            </Link>
          </div>

          {/* Back */}
          <div className="mt-10 border-t border-[var(--color-border)] pt-8">
            <Link
              href="/pruvodce"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 rotate-180">
                <path d="M9 18l6-6-6-6" />
              </svg>
              {isCs ? "Zpět na průvodce" : "Späť na sprievodcov"}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
