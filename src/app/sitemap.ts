import type { MetadataRoute } from "next";
import { getAllJobSlugs } from "@/lib/jobs";
import { getBlogPosts } from "@/lib/blog";

export const revalidate = 3600;

const BASE = "https://norsko-prace.cz";
const LOCALES = ["cs", "sk"] as const;

const staticPages = [
  { path: "", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/prace", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/ubytovani", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/vybrane", priority: 0.5, changeFrequency: "weekly" as const },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/pruvodce", priority: 0.6, changeFrequency: "weekly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, csBlogPosts] = await Promise.all([
    getAllJobSlugs(),
    Promise.resolve(getBlogPosts("cs")),
  ]);
  const now = new Date().toISOString();

  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    staticPages.map(({ path, priority, changeFrequency }) => ({
      url: `${BASE}/${locale}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }))
  );

  const jobEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    slugs.map(({ slug, updatedAt }) => ({
      url: `${BASE}/${locale}/prace/${slug}`,
      lastModified: updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  const blogEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    csBlogPosts.map((post) => ({
      url: `${BASE}/${locale}/blog/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt).toISOString() : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  );

  return [...staticEntries, ...jobEntries, ...blogEntries];
}
