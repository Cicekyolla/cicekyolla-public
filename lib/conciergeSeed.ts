// ============================================================================
// Asistan → ürün sayfası TEK SEFERLİK ön-doldurma (22 Kas 2026, satış hunisi).
//
// "Bu ürünle devam et" tıklanınca sohbetten bilinen gün / saat aralığı / semt bu kayda yazılır;
// ürün sayfasındaki teslimat planlayıcısı (DeliveryPlanner) yalnız AYNI ürün yolunda ve 30 dk
// içinde bir kez okur, sonra siler. İkinci bir adres sistemi DEĞİLDİR: kayıtlı adres
// (cy_pending_delivery / cy_delivery_address_v1) olduğu gibi kalır; semt yalnız adres kutusuna
// arama metni olarak yazılır, müşteri yine haritadan seçer. Telefon / açık adres hiç taşınmaz.
// ============================================================================

export const CONCIERGE_SEED_KEY = "cy_concierge_seed";
export const CONCIERGE_SEED_TTL_MS = 30 * 60_000;

export interface ConciergeSeed {
  /** Hedef ürün sayfasının yolu (dil önekli olabilir). */
  path: string;
  /** YYYY-MM-DD (geçersizse null). */
  date: string | null;
  /** Ör. "12:00 - 15:00" (yalnız eşleşen açık slot varsa seçilir). */
  time: string | null;
  /** Adres kutusuna arama metni (ör. "Esenyurt, İstanbul"). */
  place: string | null;
  /** true → planlayıcı görünür alana kaydırılır ("Bu ürünle devam et"). */
  focus: boolean;
  ts: number;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const PATH = /^\/[A-Za-z0-9\-._~%/]{1,300}$/;

export function buildSeed(
  path: string,
  ctx: { date?: string | null; time?: string | null; district?: string | null; city?: string | null } | null | undefined,
  focus: boolean,
  now: number,
): ConciergeSeed | null {
  if (!PATH.test(path)) return null;
  const date = ctx?.date && ISO.test(ctx.date) ? ctx.date : null;
  const time = ctx?.time && /\d{1,2}[:.]\d{2}/.test(ctx.time) ? ctx.time.slice(0, 20) : null;
  const district = ctx?.district && !/\d/.test(ctx.district) ? ctx.district.slice(0, 40) : null;
  const city = ctx?.city && !/\d/.test(ctx.city) ? ctx.city.slice(0, 40) : null;
  const place = district ? `${district}, ${city ?? "İstanbul"}` : null;
  if (!date && !time && !place && !focus) return null;
  return { path, date, time, place, focus, ts: now };
}

/** Kayıt yalnız aynı ürün yolunda ve süresi içinde geçerlidir; bozuk / başka ürün → null. */
export function readSeed(raw: string | null | undefined, pathname: string, now: number): ConciergeSeed | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as ConciergeSeed;
    if (!s || typeof s !== "object" || s.path !== pathname || typeof s.ts !== "number") return null;
    if (now - s.ts > CONCIERGE_SEED_TTL_MS || s.ts > now + 60_000) return null;
    return {
      path: s.path, date: typeof s.date === "string" && ISO.test(s.date) ? s.date : null,
      time: typeof s.time === "string" ? s.time.slice(0, 20) : null,
      place: typeof s.place === "string" ? s.place.slice(0, 90) : null, focus: s.focus === true, ts: s.ts,
    };
  } catch { return null; }
}

/** Bugünden (yerel takvim) hedef güne kaç gün (0-29); aralık dışı / geçmiş → null. */
export function dayOffsetFor(date: string | null, today: Date): number | null {
  if (!date || !ISO.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const base = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target - base) / 86_400_000);
  return diff >= 0 && diff <= 29 ? diff : null;
}

/** "12:00 - 15:00", "12.00-15.00", "12:00–15:00" → "12:00-15:00" (karşılaştırma için). */
export function normalizeSlotLabel(v: string | null | undefined): string {
  return String(v ?? "").replace(/\./g, ":").replace(/[–—]/g, "-").replace(/\s+/g, "").replace(/(^|-)(\d):/g, "$10$2:");
}

export function writeConciergeSeed(seed: ConciergeSeed | null): void {
  try {
    if (seed) window.sessionStorage.setItem(CONCIERGE_SEED_KEY, JSON.stringify(seed));
  } catch { /* depolama kapalıysa ön-doldurma olmaz; akış aynen çalışır */ }
}

/** Bu ürün yolu için geçerliyse okur ve SİLER (tek seferlik); başka ürünün kaydına dokunmaz (süresi dolunca geçersiz). */
export function consumeConciergeSeed(pathname: string): ConciergeSeed | null {
  try {
    const seed = readSeed(window.sessionStorage.getItem(CONCIERGE_SEED_KEY), pathname, Date.now());
    if (seed) window.sessionStorage.removeItem(CONCIERGE_SEED_KEY);
    return seed;
  } catch { return null; }
}
