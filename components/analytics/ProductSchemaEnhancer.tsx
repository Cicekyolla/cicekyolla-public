"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SITE_URL = "https://www.cicekyolla.com.tr";

type JsonLdRecord = Record<string, unknown> & {
  "@type"?: string | string[];
  offers?: Record<string, unknown>;
};

function isProductSchema(value: unknown): value is JsonLdRecord {
  if (!value || typeof value !== "object") return false;
  const type = (value as JsonLdRecord)["@type"];
  return Array.isArray(type) ? type.includes("Product") : type === "Product";
}

export function ProductSchemaEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/urun/")) return;

    const timer = window.setTimeout(() => {
      const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');

      for (const script of scripts) {
        try {
          const parsed = JSON.parse(script.textContent || "null") as unknown;
          if (!isProductSchema(parsed)) continue;

          const productUrl = `${SITE_URL}${pathname}`;
          const offers = parsed.offers && typeof parsed.offers === "object"
            ? parsed.offers
            : { "@type": "Offer" };

          const enhanced: JsonLdRecord = {
            ...parsed,
            url: productUrl,
            brand: {
              "@type": "Brand",
              name: "ÇiçekYolla",
            },
            offers: {
              ...offers,
              url: productUrl,
              itemCondition: "https://schema.org/NewCondition",
            },
          };

          script.textContent = JSON.stringify(enhanced);
          break;
        } catch {
          // İlgisiz veya geçersiz JSON-LD blokları ürün sayfasını etkilemez.
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
