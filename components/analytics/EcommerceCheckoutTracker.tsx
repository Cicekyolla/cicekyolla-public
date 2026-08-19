"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pushEcommerceEvent } from "@/lib/analytics";
import { metaTrack } from "@/lib/metaPixel";
import { useCart } from "@/lib/cart";

export function EcommerceCheckoutTracker() {
  const pathname = usePathname();
  const { items, subtotalMinor, hydrated } = useCart();
  const trackedVisit = useRef(false);

  useEffect(() => {
    if (pathname !== "/checkout") {
      trackedVisit.current = false;
      return;
    }

    if (!hydrated || trackedVisit.current || items.length === 0) return;

    pushEcommerceEvent("begin_checkout", {
      currency: "TRY",
      value: subtotalMinor / 100,
      items: items.map((item) => ({
        item_id: item.productSlug || String(item.productId),
        item_name: item.name,
        item_brand: "ÇiçekYolla",
        item_variant: item.variantTitle || undefined,
        price: item.unitPriceMinor / 100,
        quantity: item.quantity,
      })),
    });

    /* Meta Pixel — gerçek products.id, ikinci kez tetiklenmez (aynı ref guard). */
    metaTrack("InitiateCheckout", {
      content_ids: items.map((item) => String(item.productId)),
      content_type: "product",
      value: subtotalMinor / 100,
      currency: "TRY",
      num_items: items.reduce((sum, item) => sum + item.quantity, 0),
    });

    trackedVisit.current = true;
  }, [hydrated, items, pathname, subtotalMinor]);

  return null;
}
