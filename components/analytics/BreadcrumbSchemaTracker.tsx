"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SCRIPT_ID = "cicekyolla-breadcrumb-schema";
const SITE_URL = "https://www.cicekyolla.com.tr";

type ProductJsonLd = {
  "@type"?: string | string[];
  name?: string;
};

function productNameFromJsonLd(): string | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || "null") as unknown;
      const values = Array.isArray(parsed) ? parsed : [parsed];

      for (const value of values) {
        if (!value || typeof value !== "object") continue;
        const candidate = value as ProductJsonLd;
        const types = Array.isArray(candidate["@type"])
          ? candidate["@type"]
          : [candidate["@type"]];

        if (types.includes("Product") && candidate.name?.trim()) {
          return candidate.name.trim();
        }
      }
    } catch {
      // İlgisiz veya hatalı JSON-LD blokları breadcrumb üretimini engellemez.
    }
  }

  return null;
}

export function BreadcrumbSchemaTracker() {
  const pathname = usePathname();

  useEffect(() => {
    document.getElementById(SCRIPT_ID)?.remove();
    if (!pathname.startsWith("/urun/")) return;

    const timer = window.setTimeout(() => {
      const productName = productNameFromJsonLd();
      if (!productName) return;

      const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Ana Sayfa",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Ürünler",
            item: `${SITE_URL}/urunler`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: productName,
            item: `${SITE_URL}${pathname}`,
          },
        ],
      };

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.type = "application/ld+json";
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [pathname]);

  return null;
}
