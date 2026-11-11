/**
 * İLK TEMAS (first-touch) — ziyaretçinin siteye İLK geldiği kaynak (Paket F).
 *
 * Sorun: lib/visitTracker.ts her sayfa yüklemesinde yeni ziyaret numarası açar
 * ve kaynağı (yönlendiren alan adı, utm_*) yalnız O sayfadan okur. Google'dan
 * gelen ziyaretçi sayfayı yenileyince veya tam sayfa geçişte kaynak "doğrudan"
 * görünür; /en/... ile gelen yabancı ziyaretçi /sepet'te "tr" olur.
 *
 * Çözüm (saf, test edilir): ilk sayfanın kaynağını tarayıcı OTURUMU boyunca
 * hatırla ve ziyaret paketine EK alanlar olarak koy (mevcut alanların anlamı
 * değişmez).
 *
 * KVKK — mevcut kuralın birebir aynısı (cy_vid gibi):
 *  • sessionStorage'a YALNIZ "Analiz Çerezleri" onayı (analytics === true)
 *    varken yazılır; onay yoksa/geri alınmışsa var olan kayıt SİLİNİR ve ilk
 *    temas yalnız bu sayfa yüklemesinin belleğinde kalır (bugünkü davranış).
 *  • Saklanan: yönlendirenin YALNIZ alan adı, temizlenmiş utm_source/medium/
 *    campaign, tıklama kimliklerinin yalnız VARLIĞI (değeri değil), sorgusuz
 *    giriş yolu, giriş dili. Diğer sorgu parametreleri (e-posta, telefon vb.)
 *    HİÇ okunmaz; e-posta/telefon benzeri utm değeri tamamen düşürülür.
 */

import { GLOBAL_LOCALES, isGlobalLocale, parseLocalePath } from "./global/config.ts";

export const FIRST_TOUCH_KEY = "cy_ft";

export interface FirstTouch {
  /** Yönlendiren alan adı (site dışıysa). */
  r?: string;
  us?: string;
  um?: string;
  uc?: string;
  /** Google tıklama kimliği VARDI (değer tutulmaz). */
  g?: 1;
  /** Meta tıklama kimliği VARDI (değer tutulmaz). */
  f?: 1;
  /** Giriş yolu (sorgu/parça yok). */
  p: string;
  /** Giriş dili — yalnız yabancı locale önekiyle gelindiyse (en, de, ...). */
  ll?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocationLike {
  pathname: string;
  search: string;
  hostname: string;
}

/** Ziyaret paketine eklenen alanların TAM listesi (başka anahtar gönderilmez). */
export const FIRST_TOUCH_FIELD_KEYS = ["fr", "fus", "fum", "fuc", "fg", "ff", "fp", "ll"] as const;

const PHONE_RE = /(\+|\b00)\d[\d\s().-]{8,}\d|\b0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/;

/**
 * utm değeri temizliği: e-posta veya telefon benzeri değer TAMAMEN düşer;
 * kalan değerden harf/rakam/._-+| ve boşluk dışındaki karakterler atılır.
 */
export function sanitizeUtm(v: string | null | undefined, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  if (/@|%40/i.test(s) || PHONE_RE.test(s)) return undefined;
  const clean = s.replace(/[^\p{L}\p{N}._\-+| ]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);
  return clean || undefined;
}

/** Yalnız site içi yol; sorgu ve parça atılır. */
export function cleanLandingPath(pathname: string | null | undefined): string {
  if (typeof pathname !== "string" || !pathname.startsWith("/") || pathname.startsWith("//")) return "/";
  return pathname.split(/[?#]/)[0].slice(0, 300) || "/";
}

/** Yönlendirenin yalnız alan adı (küçük harf); site içiyse veya bozuksa yok. */
export function referrerHostOf(referrer: string | null | undefined, siteHost: string): string | undefined {
  try {
    if (!referrer) return undefined;
    const h = new URL(referrer).hostname.toLowerCase();
    if (!h || h === siteHost.toLowerCase()) return undefined;
    return /^[a-z0-9.-]{3,120}$/.test(h) ? h : undefined;
  } catch {
    return undefined;
  }
}

/** Yolun yabancı locale öneki (/en/..., /de) → "en"; TR yolları → undefined. */
export function localePrefixOf(pathname: string): string | undefined {
  const first = cleanLandingPath(pathname).split("/")[1] ?? "";
  return isGlobalLocale(first) ? first : undefined;
}

/** TR (/urun/<slug>) veya 13 dilin ürün yolu (/en/product/<slug>, /de/produkt/<slug> ...). */
export function isProductPath(pathname: string | null | undefined): boolean {
  if (typeof pathname !== "string") return false;
  if (pathname.startsWith("/urun/")) return pathname.length > "/urun/".length;
  const segs = cleanLandingPath(pathname).split("/").filter(Boolean);
  const loc = segs[0];
  if (!isGlobalLocale(loc)) return false;
  return parseLocalePath(loc, segs.slice(1)).kind === "product";
}

/** Bu sayfa yüklemesinin kaynağı (yalnız izinli alanlar). */
export function captureTouch(loc: LocationLike, referrer: string | null | undefined): FirstTouch {
  const p = new URLSearchParams(loc.search || "");
  const t: FirstTouch = { p: cleanLandingPath(loc.pathname) };
  const r = referrerHostOf(referrer, loc.hostname);
  if (r) t.r = r;
  const us = sanitizeUtm(p.get("utm_source"), 80);
  const um = sanitizeUtm(p.get("utm_medium"), 40);
  const uc = sanitizeUtm(p.get("utm_campaign"), 120);
  if (us) t.us = us;
  if (um) t.um = um;
  if (uc) t.uc = uc;
  if (p.has("gclid") || p.has("gbraid") || p.has("wbraid")) t.g = 1;
  if (p.has("fbclid")) t.f = 1;
  const ll = localePrefixOf(loc.pathname);
  if (ll) t.ll = ll;
  return t;
}

/** Saklanan kaydı okur ve YENİDEN temizler (elle bozulmuş kayıt güvenle düşer). */
export function parseStoredTouch(raw: string | null | undefined): FirstTouch | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object" || typeof o.p !== "string") return null;
    const t: FirstTouch = { p: cleanLandingPath(o.p) };
    if (typeof o.r === "string" && /^[a-z0-9.-]{3,120}$/.test(o.r)) t.r = o.r;
    const us = sanitizeUtm(o.us as string, 80);
    const um = sanitizeUtm(o.um as string, 40);
    const uc = sanitizeUtm(o.uc as string, 120);
    if (us) t.us = us;
    if (um) t.um = um;
    if (uc) t.uc = uc;
    if (o.g === 1) t.g = 1;
    if (o.f === 1) t.f = 1;
    if (typeof o.ll === "string" && (GLOBAL_LOCALES as readonly string[]).includes(o.ll)) t.ll = o.ll;
    return t;
  } catch {
    return null;
  }
}

/** Ödeme dönüş sayfası ilk temas sayılmaz (PayTR dönüşü). */
function isExcludedLanding(pathname: string): boolean {
  return pathname.startsWith("/checkout/sonuc");
}

/**
 * Sayfa yüklemesinin başında çağrılır: oturumda kayıtlı ilk temas varsa onu,
 * yoksa bu sayfanın kaynağını döndürür. Onay varsa yeni kaydı saklar; onay
 * yoksa var olan kaydı siler (yalnız bellekte kalır). Asla fırlatmaz.
 */
export function resolveFirstTouch(input: {
  storage: StorageLike | null;
  consent: boolean;
  location: LocationLike;
  referrer: string | null | undefined;
}): FirstTouch {
  const current = captureTouch(input.location, input.referrer);
  const { storage, consent } = input;
  if (!storage) return current;
  try {
    if (!consent) {
      storage.removeItem(FIRST_TOUCH_KEY);
      return current;
    }
    const stored = parseStoredTouch(storage.getItem(FIRST_TOUCH_KEY));
    if (stored) return stored;
    if (!isExcludedLanding(current.p)) storage.setItem(FIRST_TOUCH_KEY, JSON.stringify(current));
    return current;
  } catch {
    return current;
  }
}

/**
 * Gönderim anında çağrılır: onay sonradan verildiyse bellekteki ilk teması
 * saklar (aynı sekmede sonraki sayfa yüklemeleri için); onay geri alındıysa
 * siler. Asla fırlatmaz.
 */
export function rememberFirstTouch(storage: StorageLike | null, consent: boolean, ft: FirstTouch | null): void {
  if (!storage) return;
  try {
    if (!consent) {
      storage.removeItem(FIRST_TOUCH_KEY);
      return;
    }
    if (ft && !isExcludedLanding(ft.p) && !storage.getItem(FIRST_TOUCH_KEY)) {
      storage.setItem(FIRST_TOUCH_KEY, JSON.stringify(ft));
    }
  } catch {
    /* ölçüm asla akışı bozmaz */
  }
}

/** Ziyaret paketi `x` içine eklenen EK alanlar (mevcut l/r/us/um/uc anlamı değişmez). */
export function firstTouchFields(ft: FirstTouch | null): Record<string, string | number> {
  if (!ft) return {};
  const out: Record<string, string | number> = { fp: ft.p };
  if (ft.r) out.fr = ft.r;
  if (ft.us) out.fus = ft.us;
  if (ft.um) out.fum = ft.um;
  if (ft.uc) out.fuc = ft.uc;
  if (ft.g) out.fg = 1;
  if (ft.f) out.ff = 1;
  if (ft.ll) out.ll = ft.ll;
  return out;
}
