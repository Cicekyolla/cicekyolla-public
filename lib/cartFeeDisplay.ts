// lib/cartFeeDisplay.ts — 11 Kas 2026 (ADDITIVE): sepet özetindeki teslimat ücreti satırının SUNUMU.
// SORUN (kanıt): teslimatı seçilmemiş satır varken ücret 0 kabul ediliyor ve özet "Ücretsiz / Kostenlos / Free"
// yazıyordu; satır adı da "Kargo" çıkıyordu. Ücret henüz hesaplanmadı — ücretsiz değil.
// Hesap DEĞİŞMEZ (lib/deliveryFee.ts aynen): yalnız ne yazılacağı seçilir. Saf modül → node --test.

export type FeeRowState = "pending" | "free" | "amount";

/** Teslimatı tam seçilmemiş (tarih + yöntem) en az bir satır varsa ücret "hesaplanacak"tır. */
export function cartFeeRowState(
  deliveries: ReadonlyArray<{ date?: string | null; mode?: string | null } | null | undefined>,
  feeMinor: number,
): FeeRowState {
  if (deliveries.length === 0 || deliveries.some((d) => !d?.date || !d?.mode)) return "pending";
  return feeMinor > 0 ? "amount" : "free";
}
