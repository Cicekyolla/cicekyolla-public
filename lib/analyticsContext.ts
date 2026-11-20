// ============================================================================
// analyticsContext.ts — her ölçüm olayına eklenen ortak bağlam (20 Kas 2026)
// ----------------------------------------------------------------------------
// NEDEN: 20 Kasım teşhisinde GA4'te yurt dışı / dil kırılımı yapılamadı; olaylar
// hangi dil sayfasında ve hangi gösterim para biriminde oluştuğunu taşımıyordu.
//
//   site_language    : sayfanın dili (<html lang>, 2 harf; okunamazsa "tr").
//   display_currency : müşterinin GÖRDÜĞÜ para birimi (TRY / USD / EUR …).
//
// ÖNEMLİ: ecommerce gövdesindeki `currency` alanı DEĞİŞMEZ ve "TRY" kalır.
// Tahsilat her zaman TL'dir ve `value` TL tutarıdır; GA4 `currency`yi `value`nin
// birimi olarak okur. Oraya gösterim para birimi yazılırsa ciro raporu bozulur
// (₺2.499 → "$2.499"). Gösterim para birimi bu yüzden AYRI alandadır.
//
// Saf fonksiyonlar; kişisel veri yok.
// ============================================================================
import { BASE_CURRENCY, defaultCurrencyForLocale, parseCurrencyCookie } from "./currency/config.ts";

export interface AnalyticsContext {
  site_language: string;
  display_currency: string;
}

/** <html lang> → 2 harfli küçük dil kodu. Geçersiz / boş → "tr". */
export function normalizeSiteLanguage(lang: string | null | undefined): string {
  const m = /^([a-zA-Z]{2})(?:[-_]|$)/.exec(String(lang ?? "").trim());
  return m ? m[1].toLowerCase() : "tr";
}

/**
 * Türkçe sayfada gösterim her zaman TL'dir (para birimi seçici yalnız 13 dilde
 * çalışır). Yabancı dilde: müşterinin seçimi (cookie) > dile göre varsayılan.
 */
export function resolveDisplayCurrency(siteLanguage: string, cookieHeader: string | null | undefined): string {
  if (siteLanguage === "tr") return BASE_CURRENCY;
  return parseCurrencyCookie(cookieHeader) ?? defaultCurrencyForLocale(siteLanguage);
}

export function buildAnalyticsContext(lang: string | null | undefined, cookieHeader: string | null | undefined): AnalyticsContext {
  const site_language = normalizeSiteLanguage(lang);
  return { site_language, display_currency: resolveDisplayCurrency(site_language, cookieHeader) };
}

/** Tarayıcıdan okur. Asla fırlatmaz; sunucuda / hata hâlinde varsayılan döner. */
export function readAnalyticsContext(): AnalyticsContext {
  try {
    if (typeof document === "undefined") return buildAnalyticsContext(null, null);
    return buildAnalyticsContext(document.documentElement?.lang, document.cookie);
  } catch {
    return buildAnalyticsContext(null, null);
  }
}

/** Ödeme adımında seçilen yöntem → GA4 `payment_type` değeri. */
export function paymentTypeFor(method: string | null | undefined): "card" | "bank_transfer" {
  return method === "havale" ? "bank_transfer" : "card";
}
