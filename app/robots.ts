import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/site-config";

/* ============================================================================
   CICEKYOLLA PUBLIC — robots.txt (Next metadata route, additive).
   /robots.txt 404'ü kapatır; sitemap referansı verir. Özel/işlemsel sayfalar
   taranmaz. CANLIYA GEÇİŞTE: NEXT_PUBLIC_SITE_URL gerçek domain olmalı
   (bkz. DEVIR-NOTU canlıya geçiş checklist'i).
   ============================================================================ */

export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/arama",
          "/sepet",
          "/checkout",
          "/hesabim",
          "/giris",
          "/onizleme",
          "/siparis-takibi",
          "/siparis-takip",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
