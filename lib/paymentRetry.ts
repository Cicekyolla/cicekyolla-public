// ============================================================================
// paymentRetry.ts — Kart ödemesi: yedek sağlayıcıyla "tekrar dene" (4 Kas 2026)
// ----------------------------------------------------------------------------
// İş kuralı: "Kartla Öde" → önce ana sağlayıcı (PayTR). Ödeme KESİN başarısızsa
// (sunucu imzalı 'failed' bildirimi aldı ya da ödeme ekranı hiç oluşmadı) müşteri
// AYNI sipariş için yedek altyapıyla (iyzico) KENDİ tıklamasıyla tekrar dener.
// Sonuç BELİRSİZSE (bildirim yok) yedek ASLA sunulmaz — "kontrol ediliyor".
//
// Bu modül SAF karar fonksiyonu + bu sekmenin deposunda yeniden deneme anahtarı.
// Durum yalnız SUNUCUDAN okunur; adres çubuğundaki ?fail=1 karar vermez.
// Kart verisi yok; anahtar yalnız bu sekmede (sessionStorage) tutulur.
// ============================================================================
import { isMerchantOid, type KeyValueStorage } from "./cardCheckoutSettle.ts";

export type PaymentProviderId = "paytr" | "iyzico";

/** /api/payment/paytr-status yanıtının bu modülün okuduğu alanları (hepsi sunucudan). */
export interface ServerPaymentStatus {
  paid: boolean;
  status: string;
  order_number: string | null;
  retry_available?: boolean;
  retry_provider?: PaymentProviderId | null;
  retry_needs_email?: boolean;
  order_id?: number | null;
  payment_failed?: boolean;
}

/** Sonuç ekranı görünümleri — müşteriye ham enum/kod GÖSTERİLMEZ. */
export type ResultView = "checking" | "paid" | "retry" | "failed" | "uncertain";

/**
 * Sunucu durumu → ekran. `pendingTooLong`: sonuç ~40 sn içinde gelmedi.
 *  • paid           → "Siparişiniz alındı"
 *  • failed + yedek → "Ödemeniz alınamadı… Diğer altyapıyla tekrar deneyin" + buton
 *  • failed         → "Ödemeniz alınamadı" + diğer yöntemler (yedek yok/kapalı/tükendi)
 *  • pending        → "kontrol ediliyor"; uzun sürerse "birkaç dakika içinde bilgi vereceğiz"
 *                     (yedek ASLA sunulmaz — çift çekim riski)
 */
export function resolveResultView(s: ServerPaymentStatus | null, pendingTooLong: boolean, canRetryHere: boolean): ResultView {
  if (s && s.paid && s.order_number) return "paid";
  if (s && s.status === "failed") {
    if (s.payment_failed) return "failed";
    return s.retry_available && s.retry_provider && canRetryHere ? "retry" : "failed";
  }
  return pendingTooLong ? "uncertain" : "checking";
}

/** Müşteriye gösterilen yedek buton metni (sağlayıcı adı müşteriye açık bir markadır). */
export function retryButtonLabel(provider: PaymentProviderId): string {
  return provider === "iyzico" ? "iyzico ile Öde" : "PayTR ile Öde";
}

/**
 * Yedek başlatma hatası → Türkçe mesaj + yeni görünüm. Ham kod gösterilmez.
 * payment_pending: önceki deneme hâlâ belirsiz → "kontrol ediliyor".
 */
export function retryErrorView(apiError: string | null, status: number): { view: ResultView; message: string | null } {
  if (apiError === "payment_pending" || apiError === "payment_unverified") return { view: "uncertain", message: null };
  if (apiError === "already_paid") return { view: "checking", message: null };
  if (apiError === "exhausted" || apiError === "too_many_attempts" || apiError === "window_closed" || apiError === "not_failed") {
    return { view: "failed", message: null };
  }
  if (apiError === "email_required") return { view: "retry", message: "Devam etmek için e-posta adresinizi yazın." };
  if (status === 403) return { view: "failed", message: null };
  return { view: "retry", message: "Ödeme şu anda başlatılamadı. Lütfen biraz sonra tekrar deneyin ya da bize yazın." };
}

/** C7 — retryErrorView mesajının sözlük anahtarı (ekran müşterinin dilinde gösterir;
 *  `message` alanı TR metniyle aynen kalır). Mesaj yoksa null. */
export function retryErrorMessageKey(apiError: string | null, status: number): "payres.emailRequired" | "payres.startFailed" | null {
  if (retryErrorView(apiError, status).message == null) return null;
  return apiError === "email_required" ? "payres.emailRequired" : "payres.startFailed";
}

/** C7 — yedek buton metninde gösterilen sağlayıcı adı (marka; çevrilmez). */
export function providerBrand(provider: PaymentProviderId): string {
  return provider === "iyzico" ? "iyzico" : "PayTR";
}

// ── Bu sekmenin yeniden deneme anahtarı ───────────────────────────────────────
export const PAY_RETRY_PREFIX = "cicekyolla:pay-retry:";
const PAY_RETRY_TTL_MS = 24 * 60 * 60 * 1000;
const RETRY_KEY_RE = /^[0-9a-f]{20,128}$/;

export interface RetryInfo { v: 1; oid: string; order_id: number; retry_key: string; at: number }

/** init yanıtından sonra çağrılır. Asla fırlatmaz. */
export function saveRetryInfo(
  storage: KeyValueStorage | null | undefined,
  input: { oid: string; order_id: unknown; retry_key: unknown },
  nowMs: number = Date.now(),
): boolean {
  const orderId = Number(input.order_id);
  if (!storage || !isMerchantOid(input.oid) || !Number.isSafeInteger(orderId) || orderId <= 0) return false;
  if (typeof input.retry_key !== "string" || !RETRY_KEY_RE.test(input.retry_key)) return false;
  try {
    const info: RetryInfo = { v: 1, oid: input.oid, order_id: orderId, retry_key: input.retry_key, at: nowMs };
    storage.setItem(`${PAY_RETRY_PREFIX}${input.oid}`, JSON.stringify(info));
    return true;
  } catch {
    return false;
  }
}

export function readRetryInfo(storage: KeyValueStorage | null | undefined, oid: string, nowMs: number = Date.now()): RetryInfo | null {
  if (!storage || !isMerchantOid(oid)) return null;
  try {
    const v = JSON.parse(storage.getItem(`${PAY_RETRY_PREFIX}${oid}`) ?? "null") as Partial<RetryInfo> | null;
    if (!v || v.v !== 1 || v.oid !== oid || typeof v.retry_key !== "string" || !RETRY_KEY_RE.test(v.retry_key)) return null;
    if (!Number.isSafeInteger(v.order_id) || (v.order_id as number) <= 0) return null;
    if (typeof v.at !== "number" || nowMs - v.at > PAY_RETRY_TTL_MS) return null;
    return v as RetryInfo;
  } catch {
    return null;
  }
}

/** Basit e-posta biçim kontrolü (yalnız iyzico e-postasız siparişte istenir). */
export function isEmailLike(value: string): boolean {
  const v = value.trim();
  return v.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
