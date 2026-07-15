import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cicekyolla.com.tr";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/onizleme"] }, sitemap: `${site}/sitemap.xml`, host: site };
}
