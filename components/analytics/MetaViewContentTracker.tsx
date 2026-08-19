"use client";

// MetaViewContentTracker.tsx — Meta Pixel ViewContent, GERÇEK server-side ürün
// verisiyle (products.id, gerçek fiyat) — mevcut EcommerceViewItemTracker'ın
// JSON-LD/slug tabanlı GA4 event'ine dokunmaz, ondan tamamen bağımsız çalışır.
import { useEffect, useRef } from "react";
import { metaTrack } from "@/lib/metaPixel";

export function MetaViewContentTracker({ productId, priceTRY }: { productId: number; priceTRY: number }) {
  const tracked = useRef<number | null>(null);

  useEffect(() => {
    if (tracked.current === productId) return;
    tracked.current = productId;
    metaTrack("ViewContent", {
      content_ids: [String(productId)],
      content_type: "product",
      value: priceTRY,
      currency: "TRY",
    });
  }, [productId, priceTRY]);

  return null;
}
