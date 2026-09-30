// ============================================================================
// TESLİMAT ÜCRETİ — TEK KAYNAK MOTOR (25 Eyl 2026). Public hesap YAPMAZ: /api/public/delivery/check yanıtındaki
// band ücreti (same_day.fee_minor) + slot ek ücreti (slots[].extra_fee_minor) ya da kargo ücreti (cargo.fee_minor)
// seçimle birlikte PendingDelivery.deliveryFeeMinor'a yazılır; sepet ve checkout toplamı bunu gösterir.
// Sunucu sipariş anında aynı ücreti motordan yeniden hesaplar ve expected_total_minor ile eşleşmezse 409 total_changed döner.
// ============================================================================
import type { PendingDelivery } from "./pendingDelivery";

/** Sepet TEK gönderimdir (bir adres, bir yöntem): ücret = seçili teslimatın ücreti. Kalemler ayrışırsa en büyüğü (sunucu kesin karar verir). */
export function cartDeliveryFeeMinor(deliveries: ReadonlyArray<PendingDelivery | null | undefined>): number {
  let fee = 0;
  for (const d of deliveries) {
    const v = Number(d?.deliveryFeeMinor ?? 0);
    if (Number.isFinite(v) && v > fee) fee = v;
  }
  return Math.max(0, Math.round(fee));
}

/** Toplam = ara toplam − indirim + teslimat ücreti (TRY kuruş; sunucu formülüyle aynı). */
export function cartTotalMinor(subtotalMinor: number, discountMinor: number, deliveryFeeMinor: number): number {
  return Math.max(0, Math.round(subtotalMinor) - Math.round(discountMinor) + Math.round(deliveryFeeMinor));
}

/** Teslimat satırının adı: kurye/özel araç → motorun band adı ("İstanbul - " öneki düşer), kargo → kargo etiketi, seçim yoksa varsayılan. */
export function deliveryMethodLabel(
  d: Pick<PendingDelivery, "mode" | "band"> | null | undefined,
  labels: { sameDay: string; cargo: string; none: string },
): string {
  if (!d?.mode) return labels.none;
  if (d.mode === "cargo") return labels.cargo;
  const band = (d.band ?? "").replace(/^İstanbul\s*-\s*/i, "").trim();
  return band || labels.sameDay;
}

/** Teslimat seçiminin kimliği: adres (placeId ya da metin), tarih, yöntem, slot. Ücret kimliğe girmez (motor belirler). */
export function deliverySelectionKey(d: Pick<PendingDelivery, "placeId" | "address" | "date" | "mode" | "slotId"> | null | undefined): string | null {
  if (!d?.date || !(d.placeId || d.address)) return null;
  return [d.placeId || d.address, d.date, d.mode ?? "", d.mode === "cargo" ? "" : String(d.slotId ?? "")].join("|");
}

/**
 * Sepet TEK gönderimdir (sipariş modeli tek teslimat taşır; checkout ilk satırın teslimatını kullanır). Satırların
 * seçimi (adres/tarih/yöntem/slot) farklıysa sessizce tek teslimata indirgenmez: sepet ödeme öncesi durur.
 */
export function cartDeliveriesMatch(deliveries: ReadonlyArray<PendingDelivery | null | undefined>): boolean {
  const keys = deliveries.map(deliverySelectionKey);
  if (keys.length === 0 || keys.some((k) => k === null)) return false;
  return keys.every((k) => k === keys[0]);
}
