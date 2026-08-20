"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type ProductJsonLd = {
  "@type"?: string | string[];
  name?: string;
  sku?: string;
  /** Gerçek products.id (Merchant offerId / Order item product_id ile aynı kimlik). */
  productID?: string;
  brand?: string | { name?: string };
  offers?: {
    price?: string | number;
    priceCurrency?: string;
  };
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function findProductJsonLd(): ProductJsonLd | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || "null") as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") continue;
        const value = candidate as ProductJsonLd;
        const types = Array.isArray(value["@type"])
          ? value["@type"]
          : [value["@type"]];

        if (types.includes("Product")) return value;
      }
    } catch {
      // Geçersiz veya bu takip için ilgisiz JSON-LD bloklarını sessizce atla.
    }
  }

  return null;
}

export function EcommerceViewItemTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/urun/")) return;
    if (lastTrackedPath.current === pathname) return;

    const timer = window.setTimeout(() => {
      const product = findProductJsonLd();
      if (!product?.name || !product.offers) return;

      const price = Number(product.offers.price);
      if (!Number.isFinite(price)) return;

      const slug = pathname.split("/").filter(Boolean).at(-1) || pathname;
      const brand =
        typeof product.brand === "string"
          ? product.brand
          : product.brand?.name || "ÇiçekYolla";

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ ecommerce: null });
      window.dataLayer.push({
        event: "view_item",
        ecommerce: {
          currency: product.offers.priceCurrency || "TRY",
          value: price,
          items: [
            {
              item_id: product.productID || slug,
              item_name: product.name,
              item_brand: brand,
              price,
              quantity: 1,
            },
          ],
        },
      });

      lastTrackedPath.current = pathname;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
