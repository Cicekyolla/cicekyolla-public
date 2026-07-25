import type { MetadataRoute } from "next";

/* ============================================================================
   CICEKYOLLA PUBLIC — robots.txt (Next metadata route, additive).
   /robots.txt 404'ü kapatır; sitemap referansı verir. Özel/işlemsel sayfalar
   taranmaz. CANLIYA GEÇİŞTE: NEXT_PUBLIC_SITE_URL gerçek domain olmalı
   (bkz. DEVIR-NOTU canlıya geçiş checklist'i).
   ============================================================================ */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://cicekyolla-public.vercel.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
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
    sitemap: `${SITE}/sitemap.xml`,
  };
}
