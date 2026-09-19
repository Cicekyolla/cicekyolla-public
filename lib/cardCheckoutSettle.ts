// ---------------------------------------------------------------------------
// KART ÖDEMESİ SONRASI SEPET — yalnız DOĞRULANMIŞ ödemeden sonra, yalnız ödenen
// sepet satırlarını düşürür.
//
// KÖK NEDEN (19 Eyl canlı test CY-20260919-184308): havale akışı sipariş
// oluşunca sepeti temizler (CheckoutWizard onComplete → clearCart). Kart akışı
// ise PayTR'ye giderken sepeti BİLEREK tutar (kart reddinde müşteri bilgileriyle
// geri dönebilsin) ve dönüş sayfası /checkout/sonuc sepete HİÇ dokunmaz. Sonuç:
// ödeme alınmış, sipariş numarası gösterilmiş, ama sepet dolu kalmıştı —
// müşteri siparişin verilmediğini sanıp tekrar ödeyebilir.
//
// KURAL:
//   • Ödeme başladığında (PayTR init başarılı) bu sekmeye merchant_oid +
//     o anki sepet satır anahtarları not edilir (sessionStorage; tek sekme).
//   • /checkout/sonuc sepeti YALNIZ sunucu "paid" dediğinde (HMAC doğrulanmış
//     PayTR callback'inin yazdığı payments.status) ve not bu oid için varsa
//     temizler. PayTR'nin istemci yönlendirmesi (ok/fail URL) tek başına
//     hiçbir şeyi silmez.
//   • Silinen yalnız o anda sepette olan satırlardır; ödeme başladıktan sonra
//     eklenen satır KALIR. Havale akışıyla aynı sonuç: ödenen sepet boşalır.
//   • Başarısız / bekleyen / iptal / geri dönüş: not durur, sepet durur.
//     Sayfa yenileme: not silinmiş olduğundan ikinci temizlik olmaz.
//
// Depo enjekte edilir → saf ve test edilebilir (`node --test lib/*.test.ts`).
// ---------------------------------------------------------------------------

export const CARD_CHECKOUT_PREFIX = "cicekyolla:card-checkout:";
/** Terk edilmiş notlar bir gün sonra süpürülür (sekme açık kalsa bile). */
export const CARD_CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;
/** Backend merchant_oid biçimi (ör. CY20260919184308) — tire yok. */
const OID_RE = /^[A-Za-z0-9]{6,64}$/;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length?: number;
  key?(index: number): string | null;
}

export interface CardCheckoutStash {
  v: 1;
  oid: string;
  cartKeys: string[];
  draftKey: string | null;
  at: number;
}

/** Sonuç sayfasının güvendiği TEK kaynak: sunucunun ödeme durumu. */
export interface VerifiedPaymentStatus {
  paid: boolean;
  order_number: string | null;
}

/** Bu sekmenin deposu (tarayıcı dışında ya da erişim engelliyse null).
 *  Sayfalar depoya doğrudan dokunmaz; ölçüm kilidi testleri bunu korur. */
export function tabStorage(): KeyValueStorage | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function isMerchantOid(value: unknown): value is string {
  return typeof value === "string" && OID_RE.test(value);
}

function storageKey(oid: string): string {
  return `${CARD_CHECKOUT_PREFIX}${oid}`;
}

function parseStash(raw: string | null, nowMs: number): CardCheckoutStash | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CardCheckoutStash> | null;
    if (!value || value.v !== 1 || !isMerchantOid(value.oid)) return null;
    if (!Array.isArray(value.cartKeys) || !value.cartKeys.every((key) => typeof key === "string")) return null;
    if (typeof value.at !== "number" || !Number.isFinite(value.at)) return null;
    if (nowMs - value.at > CARD_CHECKOUT_TTL_MS) return null;
    return {
      v: 1,
      oid: value.oid,
      cartKeys: value.cartKeys,
      draftKey: typeof value.draftKey === "string" && value.draftKey ? value.draftKey : null,
      at: value.at,
    };
  } catch {
    return null;
  }
}

/** Süresi dolmuş ya da bozuk notları süpürür (yalnız bu modülün önekini). */
function pruneStale(storage: KeyValueStorage, nowMs: number): void {
  if (typeof storage.key !== "function" || typeof storage.length !== "number") return;
  const stale: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || !key.startsWith(CARD_CHECKOUT_PREFIX)) continue;
    if (!parseStash(storage.getItem(key), nowMs)) stale.push(key);
  }
  for (const key of stale) storage.removeItem(key);
}

/** PayTR init başarılı olunca çağrılır. Hata ASLA fırlatmaz: ödeme akışı durmaz. */
export function stashCardCheckout(
  storage: KeyValueStorage | null | undefined,
  input: { oid: string; cartKeys: string[]; draftKey?: string | null },
  nowMs: number = Date.now(),
): boolean {
  if (!storage || !isMerchantOid(input.oid)) return false;
  try {
    pruneStale(storage, nowMs);
    const stash: CardCheckoutStash = {
      v: 1,
      oid: input.oid,
      cartKeys: input.cartKeys.filter((key) => typeof key === "string" && key.length > 0),
      draftKey: input.draftKey ? input.draftKey : null,
      at: nowMs,
    };
    storage.setItem(storageKey(input.oid), JSON.stringify(stash));
    return true;
  } catch {
    return false;
  }
}

export function readCardCheckout(
  storage: KeyValueStorage | null | undefined,
  oid: string,
  nowMs: number = Date.now(),
): CardCheckoutStash | null {
  if (!storage || !isMerchantOid(oid)) return null;
  try {
    return parseStash(storage.getItem(storageKey(oid)), nowMs);
  } catch {
    return null;
  }
}

export function dropCardCheckout(storage: KeyValueStorage | null | undefined, oid: string): void {
  if (!storage || !isMerchantOid(oid)) return;
  try { storage.removeItem(storageKey(oid)); } catch { /* yok say */ }
}

/** Sunucu ödemeyi onayladı mı? (paid + sipariş numarası birlikte şart) */
export function paymentConfirmed(status: VerifiedPaymentStatus | null | undefined): boolean {
  return status?.paid === true && typeof status.order_number === "string" && status.order_number.trim() !== "";
}

export interface SettleDecision<T> {
  settle: boolean;
  /** Temizlikten sonra sepette kalacak satırlar. */
  remaining: T[];
  /** Sepetten düşecek satır anahtarları (yalnız ödeme başladığında sepette olanlar). */
  removedKeys: string[];
}

/**
 * Karar SAF: sunucu onayı + bu oid'ye ait not ŞART. Biri eksikse sepet olduğu
 * gibi kalır. Ödeme başladıktan sonra eklenen satırlar hiçbir koşulda silinmez.
 */
export function settleCardCheckout<T extends { key: string }>(input: {
  oid: string;
  status: VerifiedPaymentStatus | null | undefined;
  stash: CardCheckoutStash | null;
  items: T[];
}): SettleDecision<T> {
  const keep: SettleDecision<T> = { settle: false, remaining: input.items, removedKeys: [] };
  if (!paymentConfirmed(input.status)) return keep;
  if (!input.stash || input.stash.oid !== input.oid) return keep;
  const paidKeys = new Set(input.stash.cartKeys);
  const removedKeys = input.items.filter((item) => paidKeys.has(item.key)).map((item) => item.key);
  return {
    settle: true,
    remaining: input.items.filter((item) => !paidKeys.has(item.key)),
    removedKeys,
  };
}
