// lib/locationDeliveryTag.ts — ADDITIVE. Lokasyon sayfasındaki ürün kartı üst etiketi.
// Sorun: kart etiketi yalnız ürünün sameDay alanına bakıyordu → İstanbul dışı (kargo) ve uzak bölge
// sayfalarında da "Aynı Gün Teslimat" yazıyordu; sayfanın kendi "1–3 iş günü kargo" sözüyle çelişiyordu.
// Etiket artık sayfanın teslimat kararına (Delivery Motor reach) bağlı. Bağlam verilmezse bugünkü davranış birebir.

/** Sayfanın teslimat kararı: cargo = İstanbul dışı / reach 'out'; far = uzak bölge özel araç bandı; neutral = mixed/unknown. */
export type LocationDeliveryContext =
  | { mode: "cargo" }
  | { mode: "far"; minPriceMinor: number | null }
  | { mode: "neutral" };

export function locationDeliveryTag(
  product: { sameDay?: boolean; priceMinor?: number | null; price?: number | null },
  ctx?: LocationDeliveryContext | null,
): string {
  if (!ctx) return product.sameDay ? "Aynı Gün Teslimat" : "Premium Aranjman";
  if (ctx.mode === "cargo") return "Kargoyla 1–3 İş Günü";
  if (ctx.mode === "far") {
    const minor = product.priceMinor ?? (product.price != null ? Math.round(product.price * 100) : null);
    if (ctx.minPriceMinor != null && minor != null && minor >= ctx.minPriceMinor) return "Özel Araçla Teslimat";
    return "Kargoyla 1–3 İş Günü";
  }
  return "Premium Aranjman";
}
