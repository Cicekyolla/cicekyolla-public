// ---------------------------------------------------------------------------
// i18n — 14 dil (Figma Version 117 listesi, sıra korunur). TR varsayılan/fallback.
// DİL = SUNUM. Hiçbir iş kuralı (fiyat/teslimat/slot/sepet/ödeme) locale okumaz.
// Tek tercih kaynağı: cookie `cy_lang` (1 yıl) — ikinci state/storage YOK.
// ---------------------------------------------------------------------------

export const LOCALES = [
  { code: "tr", flag: "🇹🇷", name: "Türkçe", dir: "ltr", intl: "tr-TR" },
  { code: "en", flag: "🇬🇧", name: "English", dir: "ltr", intl: "en-GB" },
  { code: "ar", flag: "🇸🇦", name: "العربية", dir: "rtl", intl: "ar-u-nu-latn" },
  { code: "zh", flag: "🇨🇳", name: "简体中文", dir: "ltr", intl: "zh-CN" },
  { code: "nl", flag: "🇳🇱", name: "Nederlands", dir: "ltr", intl: "nl-NL" },
  { code: "de", flag: "🇩🇪", name: "Deutsch", dir: "ltr", intl: "de-DE" },
  { code: "it", flag: "🇮🇹", name: "Italiano", dir: "ltr", intl: "it-IT" },
  { code: "ja", flag: "🇯🇵", name: "日本語", dir: "ltr", intl: "ja-JP" },
  { code: "pt", flag: "🇵🇹", name: "Português", dir: "ltr", intl: "pt-PT" },
  { code: "ko", flag: "🇰🇷", name: "한국어", dir: "ltr", intl: "ko-KR" },
  { code: "ru", flag: "🇷🇺", name: "Русский", dir: "ltr", intl: "ru-RU" },
  { code: "es", flag: "🇪🇸", name: "Español", dir: "ltr", intl: "es-ES" },
  { code: "az", flag: "🇦🇿", name: "Azərbaycan dili", dir: "ltr", intl: "az-Latn-AZ" },
  { code: "fr", flag: "🇫🇷", name: "Français", dir: "ltr", intl: "fr-FR" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export type LocaleMeta = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";
export const LANG_COOKIE = "cy_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 yıl

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && LOCALES.some((l) => l.code === v);
}

export function localeMeta(code: Locale): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

/** `document.cookie` / `Cookie` header metninden dil okur (yoksa TR). */
export function parseLangCookie(cookieHeader: string | null | undefined): Locale {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const m = new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([a-z]{2})`).exec(cookieHeader);
  return m && isLocale(m[1]) ? m[1] : DEFAULT_LOCALE;
}
