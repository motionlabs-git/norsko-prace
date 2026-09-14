import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { buildBreadcrumb } from "@/lib/seo";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

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
          <article className="prose max-w-none">
            <MDXRemote
              source={post.content}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </article>

          <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-[var(--color-primary)] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold">Hledáš práci v Norsku?</p>
              <p className="mt-1 text-sm text-white/75">Stovky sezónních nabídek přeložených do češtiny.</p>
            </div>
            <Link href="/prace" className="cta-arrow inline-flex flex-shrink-0 items-center rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[var(--color-primary)] transition hover:opacity-90">
              Procházet nabídky
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
