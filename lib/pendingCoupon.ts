// ---------------------------------------------------------------------------
// PENDING COUPON — /sepet'te uygulanan kupon KODUNU checkout'a taşıyan köprü.
//
// KÖK NEDEN (E2E baseline Y): /sepet'teki indirim yalnız bileşen state'iydi;
// müşteri kodu sepette uygulayıp checkout'a geçince kupon KAYBOLUYORDU ve
// ödeme ekranında indirimsiz tutarı görüyordu.
//
// KURAL — YALNIZ KOD SAKLANIR, TUTAR SAKLANMAZ. Checkout kodu okuyup motora
// yeniden doğrulatır; gösterilen indirim DAİMA sunucudan gelir. Böylece bayat
// bir tutar müşteriye gösterilemez ve ikinci bir indirim kaynağı doğmaz.
// pendingDelivery ile AYNI depo (sessionStorage) kullanılır; ikinci bir kalıcı
// depo kurulmaz.
// ---------------------------------------------------------------------------

const KEY = "cy_pending_coupon";
/** Sepet oturumu kadar taze: 2 saat sonra kod düşer (teslimat kaydıyla aynı ruh). */
export const PENDING_COUPON_TTL_MS = 2 * 60 * 60 * 1000;

export type PendingCoupon = { code: string; ts: number };

/** Kupon kodu biçimi — backend z.string().min(1).max(60) ile uyumlu. */
export function isCouponCode(value: unknown): boolean {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length >= 1 && s.length <= 60;
}

/** SAF çözümleyici (test edilebilir): bozuk/bayat kayıt → null. */
export function parsePendingCoupon(raw: string | null, nowMs: number): PendingCoupon | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const record = (parsed ?? {}) as { code?: unknown; ts?: unknown };
  if (!isCouponCode(record.code)) return null;
  const ts = Number(record.ts);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  if (nowMs - ts > PENDING_COUPON_TTL_MS) return null;
  return { code: String(record.code).trim(), ts };
}

export function savePendingCoupon(code: string): void {
  if (typeof window === "undefined" || !isCouponCode(code)) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ code: String(code).trim(), ts: Date.now() }));
  } catch {
    /* kota dolu / gizli mod — kupon checkout'ta elle girilebilir kalır */
  }
}

export function readPendingCoupon(): PendingCoupon | null {
  if (typeof window === "undefined") return null;
  try {
    return parsePendingCoupon(window.sessionStorage.getItem(KEY), Date.now());
  } catch {
    return null;
  }
}

export function clearPendingCoupon(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* yok say */
  }
}
