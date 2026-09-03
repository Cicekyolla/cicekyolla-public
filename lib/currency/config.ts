// ---------------------------------------------------------------------------
// PARA BİRİMİ — TRY / USD / EUR. TR varsayılan/taban.
//
// ANAYASA (i18n/config.ts'teki DİL kuralının kardeşi):
//   PARA BİRİMİ ≠ DİL ≠ PAZAR ≠ TESLİMAT ÜLKESİ.
//   13 Global dilin TAMAMI üç para biriminin ÜÇÜNÜ DE seçebilir. Hiçbir dil
//   belirli bir paraya KİLİTLİ DEĞİLDİR. Dil yalnız MANTIKLI BİR VARSAYILAN
//   belirler; kullanıcının seçimi her zaman varsayılanı ezer ve kalıcıdır.
//
//   Para birimi bir TİCARET/UX durumudur, SEO durumu DEĞİLDİR:
//   URL'yi, canonical'ı, hreflang'i, sitemap'i ETKİLEMEZ. /usd/ ve /en-eur/
//   gibi ikinci bir URL ailesi ASLA oluşturulmaz.
//
//   Tek tercih kaynağı: cookie `cy_currency` (1 yıl) — ikinci state/storage YOK.
// ---------------------------------------------------------------------------
import type { Locale } from "@/lib/i18n/config";

export const CURRENCIES = [
  { code: "TRY", symbol: "₺", name: "Türk Lirası", label: "TRY" },
  { code: "USD", symbol: "$", name: "US Dollar", label: "USD" },
  { code: "EUR", symbol: "€", name: "Euro", label: "EUR" },
] as const;

export type Currency = (typeof CURRENCIES)[number]["code"];
export type CurrencyMeta = (typeof CURRENCIES)[number];

/** Ürün fiyatının tek gerçeği. Tüm çevrimler bundan başlar. */
export const BASE_CURRENCY: Currency = "TRY";

export const CURRENCY_COOKIE = "cy_currency";
export const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 yıl

/**
 * YAYIN BAYRAĞI — deploy ≠ müşteriye açılma (mevcut NEXT_PUBLIC_PAYTR_ENABLED deseni).
 *
 * `false` (varsayılan) iken:
 *   • para birimi seçici hiç render edilmez
 *   • kur ucu hiç çağrılmaz
 *   • her şey TRY'dir → vitrin bugünküyle BİREBİR aynı
 * Böylece kod production'a çıkabilir ama müşteri hiçbir değişiklik görmez.
 *
 * Vercel'de `NEXT_PUBLIC_CURRENCY_ENABLED=true` yapılınca herkese açılır.
 */
export const CURRENCY_ENABLED = process.env.NEXT_PUBLIC_CURRENCY_ENABLED === "true";

/**
 * KANARYA — bayrak kapalıyken TEK BİR TARAYICI için açar.
 *
 * `?cy_currency_preview=1` ile girilir, `cy_currency_preview` cookie'sine yazılır.
 * Amacı tek şey: kod canlıdayken **operatörün gerçek bir USD siparişi verip**
 * PayTR → callback → Admin → GA4 zincirini doğrulaması; müşterilerin hiçbiri
 * bu sırada döviz görmez.
 *
 * Güvenlik notu: bu yalnız bir GÖRÜNÜRLÜK anahtarıdır, yetki değildir. Fiyat,
 * kur ve tahsil edilecek tutar her hâlükârda sunucuda hesaplanır; bu cookie'yi
 * elle koyan biri de yalnız kendi ekranında döviz görür, hiçbir fiyat avantajı
 * elde edemez.
 */
export const CURRENCY_PREVIEW_COOKIE = "cy_currency_preview";
export const CURRENCY_PREVIEW_PARAM = "cy_currency_preview";

/**
 * Kanarya cookie'si ayarlı mı? Tam olarak `=1` olmalı — `cy_currency_preview=10`
 * ya da `=1x` KABUL EDİLMEZ (para birimi cookie'siyle aynı sınır kuralı).
 */
export function hasPreviewCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return new RegExp(`(?:^|;\\s*)${CURRENCY_PREVIEW_COOKIE}=1(?=\\s*(?:;|$))`).test(cookieHeader);
}

export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && CURRENCIES.some((c) => c.code === v);
}

export function currencyMeta(code: Currency): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/**
 * Dile göre MANTIKLI VARSAYILAN para birimi — yalnız kullanıcı henüz seçim
 * yapmadıysa kullanılır.
 *
 * IP tabanlı tahmin BİLEREK YAPILMAZ (§35): VPN, tatildeki kullanıcı ve
 * yurt dışındaki Türk müşteri yanlış paraya düşerdi. Dil, kullanıcının kendi
 * beyan ettiği tek sinyaldir; deterministik ve açıklanabilir.
 *
 * Avro bölgesi dilleri → EUR. Diğer global diller → USD (uluslararası çiçek
 * gönderiminde fiili referans para). Türkçe → TRY.
 */
const EURO_LOCALES: readonly string[] = ["de", "fr", "nl", "it", "es", "pt"];

export function defaultCurrencyForLocale(locale: Locale | string): Currency {
  if (locale === "tr") return "TRY";
  if (EURO_LOCALES.includes(locale)) return "EUR";
  return "USD";
}

/**
 * `document.cookie` / `Cookie` header metninden para birimi okur.
 * `null` = kullanıcı HENÜZ SEÇMEDİ (dile göre varsayılan uygulanabilir).
 * Bir değer varsa kullanıcı bilinçli seçmiştir; dil değişse bile KORUNUR (§14).
 */
export function parseCurrencyCookie(cookieHeader: string | null | undefined): Currency | null {
  if (!cookieHeader) return null;
  // Sondaki sınır (`(?=\s*(?:;|$))`) ZORUNLU: onsuz "cy_currency=TRY123" gibi
  // manipüle bir değer ilk üç harfinden "TRY" diye kabul edilirdi. Değer TAM
  // olarak üç harf olmalı; aksi hâlde seçim yok sayılır (allowlist, §40).
  const m = new RegExp(`(?:^|;\\s*)${CURRENCY_COOKIE}=([A-Za-z]{3})(?=\\s*(?:;|$))`).exec(cookieHeader);
  if (!m) return null;
  const code = m[1].toUpperCase();
  return isCurrency(code) ? code : null;
}
