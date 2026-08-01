import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";

/* ============================================================================
   CICEKYOLLA PUBLIC — robots.txt
   Canlı kanonik domain üzerinden tüm public sayfaların taranmasına izin verir
   ve Google'a XML sitemap giriş noktasını bildirir.
   ============================================================================ */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
