"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pushEcommerceEvent } from "@/lib/analytics";
import { useCart } from "@/lib/cart";

const PAYMENT_MARKERS = ["Havale / EFT", "Ödeme Yöntemi", "Siparişi Oluştur"];

export function EcommercePaymentInfoTracker() {
  const pathname = usePathname();
  const { items, subtotalMinor, hydrated } = useCart();
  const trackedVisit = useRef(false);

  useEffect(() => {
    if (pathname !== "/checkout") {
      trackedVisit.current = false;
      return;
    }

    if (!hydrated || items.length === 0 || trackedVisit.current) return;

    const trackWhenPaymentStepIsVisible = () => {
      if (trackedVisit.current) return;

      const pageText = document.body.innerText;
      const paymentStepVisible = PAYMENT_MARKERS.every((marker) =>
        pageText.includes(marker),
      );

      if (!paymentStepVisible) return;

      pushEcommerceEvent("add_payment_info", {
        currency: "TRY",
        value: subtotalMinor / 100,
        payment_type: "havale",
        items: items.map((item) => ({
          item_id: item.productSlug || String(item.productId),
          item_name: item.name,
          item_brand: "ÇiçekYolla",
          item_variant: item.variantTitle || undefined,
          price: item.unitPriceMinor / 100,
          quantity: item.quantity,
        })),
      });

      trackedVisit.current = true;
    };

    trackWhenPaymentStepIsVisible();

    const observer = new MutationObserver(trackWhenPaymentStepIsVisible);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [hydrated, items, pathname, subtotalMinor]);

  return null;
}
