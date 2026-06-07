import type { MetadataRoute } from "next";
import { getAllJobSlugs } from "@/lib/jobs";
import { getBlogPosts } from "@/lib/blog";

export const revalidate = 3600;

const BASE = "https://norsko-prace.cz";

const staticPages = [
  { path: "", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/prace", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/ubytovani", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/vybrane", priority: 0.5, changeFrequency: "weekly" as const },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/pruvodce", priority: 0.6, changeFrequency: "weekly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, blogPosts] = await Promise.all([
    getAllJobSlugs(),
    Promise.resolve(getBlogPosts()),
  ]);
  const now = new Date().toISOString();

  const staticEntries: MetadataRoute.Sitemap = staticPages.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const jobEntries: MetadataRoute.Sitemap = slugs.map(({ slug, updatedAt }) => ({
    url: `${BASE}/prace/${slug}`,
    lastModified: updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: post.publishedAt ? new Date(post.publishedAt).toISOString() : now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...jobEntries, ...blogEntries];
}
