import type { MetadataRoute } from "next";
import { getAllAgencySlugs } from "@/lib/queries";

const SITE_URL = "https://www.foiatracker.org";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/agencies`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/data`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const agencies = await getAllAgencySlugs();
    const agencyRoutes: MetadataRoute.Sitemap = agencies.map((a) => ({
      url: `${SITE_URL}/agency/${a.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...agencyRoutes];
  } catch {
    return staticRoutes;
  }
}
