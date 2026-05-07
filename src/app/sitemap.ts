import type { MetadataRoute } from "next";
import { getAllJobSlugs } from "@/lib/jobs";

export const revalidate = 3600;

const BASE = "https://norsko-prace.cz";
const LOCALES = ["cs", "sk"] as const;

const staticPages = [
  { path: "", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/prace", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/pruvodce", priority: 0.6, changeFrequency: "weekly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllJobSlugs();
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

  return [...staticEntries, ...jobEntries];
}
