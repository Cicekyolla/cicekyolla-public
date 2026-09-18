// ---------------------------------------------------------------------------
// COUPON ERRORS — sipariş/ödeme ucundan dönen hatanın SINIFLANDIRILMASI.
//
// KÖK NEDEN: checkout, sipariş oluşturma hatasının üç farklı türünü tek genel
// mesajla ("Sipariş oluşturulamadı…") gösteriyordu. Kupon sunucuda reddedilince
// (limit doldu, ilk sipariş şartı, fiyat değişti, bölge…) müşteri NEDENİNİ hiç
// görmüyor ve aynı düğmeye tekrar basıp yine aynı duvara çarpıyordu.
//
// SÖZLEŞME (DESIGN §5 Faz 2): API 409 + gövdede { error: "<Türkçe cümle>" }
// döner. reason_code henüz gövdede taşınmadığı için kupon reddi
// "409 + BİLİNEN MAKİNE KODU DEĞİL" kuralıyla ayırt edilir. Makine kodları
// (product_not_deliverable_to_address, delivery slot is no longer available,
// duplicate…) tamamı küçük harf ASCII'dir ve MÜŞTERİYE ASLA GÖSTERİLMEZ —
// ham enum yasağı. Sunucunun Türkçe cümlesi ise aynen gösterilir.
// ---------------------------------------------------------------------------

/** Ödeme/sipariş ucunun bilinen makine kodları (müşteriye gösterilmez). */
export const MACHINE_ERROR_CODES = [
  "delivery slot is no longer available",
  "product or variant is not available",
  "product_not_deliverable_to_address",
  "cargo_order_cannot_be_assigned_to_courier",
  "cargo_fields_not_available",
  "payment status transition is not allowed",
  "card payment status is managed by the payment provider",
  "validation_error",
  "invalid_input",
  "duplicate",
  "internal_error",
  "proxy_error",
  "paytr token error",
] as const;

/**
 * Müşteriye gösterilebilir mi? Yalnız gerçek bir cümle gösterilir.
 * Tamamı küçük harf ASCII olan tek/çok kelimelik teknik kod (snake_case,
 * kebab-case veya boşluklu İngilizce anahtar) gösterilmez.
 */
export function isPresentableMessage(text: unknown): boolean {
  const s = typeof text === "string" ? text.trim() : "";
  if (s.length < 3 || s.length > 400) return false;
  if (/^\d+$/.test(s)) return false;
  if (/^[a-z0-9]+([ _-][a-z0-9]+)*$/.test(s)) return false;
  return true;
}

export type CheckoutFailureKind = "coupon" | "slot" | "not_deliverable" | "generic";

export type CheckoutFailure = {
  kind: CheckoutFailureKind;
  /** YALNIZ kind === "coupon" iken dolu: sunucunun Türkçe kupon gerekçesi. */
  couponMessage: string | null;
};

/**
 * Sipariş/ödeme hatasını sınıflandır.
 *  - bilinen slot / teslimat kodları → kendi ekran metinleri (i18n sözlüğü)
 *  - 409 + kupon uygulanmışken + gösterilebilir Türkçe cümle → KUPON reddi
 *  - diğer her şey → genel hata (asla ham kod gösterilmez)
 */
export function classifyCheckoutFailure(input: {
  status: number | null;
  error: string | null;
  hadCoupon: boolean;
}): CheckoutFailure {
  const error = typeof input.error === "string" ? input.error.trim() : "";
  if (error === "delivery slot is no longer available") return { kind: "slot", couponMessage: null };
  if (error === "product_not_deliverable_to_address") return { kind: "not_deliverable", couponMessage: null };
  const machine = (MACHINE_ERROR_CODES as readonly string[]).includes(error);
  // KUPON VERDİKTİ = SUNUCUNUN 409'u. `status === null` demek "sunucudan yanıt
  // HİÇ alınamadı"dır (tarayıcı `fetch` fırlattı: çevrimdışı, DNS, iptal) —
  // `lib/payment.ts` sunucudan gelen her yanıtı CheckoutApiError ile gerçek
  // durum koduyla fırlatır, bu yüzden durumsuz hata yalnız bağlantı hatasıdır.
  // Bu dal eskiden kuponu suçluyordu: tarayıcının "Failed to fetch"/"Load
  // failed" metni (büyük harf taşıdığı için makine kodu sayılmaz) kupon
  // gerekçesi olarak basılıyordu → müşteri ham İngilizce bir cümle görüp
  // GEÇERLİ kuponunu boşuna kaldırıyordu. Bağlantı hatası artık genel hatadır.
  const conflict = input.status === 409;
  if (input.hadCoupon && conflict && !machine && isPresentableMessage(error)) {
    return { kind: "coupon", couponMessage: error };
  }
  return { kind: "generic", couponMessage: null };
}
