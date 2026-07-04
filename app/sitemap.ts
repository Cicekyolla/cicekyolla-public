import type { MetadataRoute } from "next";
import { getCategoryTree, flattenCategories } from "@/lib/categories";

/* ============================================================================
   CICEKYOLLA PUBLIC — Sitemap (TEK KAYNAK)
   Kategori URL'leri canlı ağaçtan (getCategoryTree) üretilir — Header/Footer/Rail
   ile AYNI kaynak. Admin'de kategori eklenince sitemap otomatik güncellenir.
   ============================================================================ */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cicekyolla-public.vercel.app";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/hakkimizda`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/iletisim`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const tree = await getCategoryTree();
    categoryRoutes = flattenCategories(tree).map((c) => ({
      url: `${SITE}${c.href}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    categoryRoutes = [];
  }

  return [...staticRoutes, ...categoryRoutes];
}
