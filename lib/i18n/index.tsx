"use client";

/**
 * I18nProvider / useI18n / useT / Num
 * ---------------------------------------------------------------------------
 * - TR sözlüğü ilk bundle'da; diğer 13 dil yalnız seçilince dynamic import (lazy).
 * - Eksik anahtar → TR metni (asla teknik anahtar gösterilmez); eksikler `missingKeys`'te sayılır.
 * - Sunucu her zaman TR render eder (ISR/statik sayfalar dynamic'e düşmesin); istemci mount'ta
 *   cookie'yi okur ve sözlüğü yükler. Bu yüzden hydration mismatch yok; TR dışı kullanıcıda
 *   ilk boyamada kısa bir TR anı olabilir (inline script html[lang/dir]'i önceden ayarlar).
 * - setLocale: yalnız cookie + html[lang/dir] + sözlük. Sepet, adres, pendingDelivery, slot,
 *   fiyat DOKUNULMAZ — dil değişimi saf sunum değişimidir.
 * - Num: RTL'de sayısal/işlemsel değerleri (saat, fiyat, sipariş no, telefon) LTR izole eder.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import tr, { type Dict, type DictKey } from "./dict/tr";
import { DEFAULT_LOCALE, LANG_COOKIE, LANG_COOKIE_MAX_AGE, isLocale, localeMeta, parseLangCookie, type Locale } from "./config";

export type { Locale, DictKey };
export { LOCALES, DEFAULT_LOCALE, localeMeta } from "./config";

type Vars = Record<string, string | number>;

const loaders: Record<Exclude<Locale, "tr">, () => Promise<{ default: Dict }>> = {
  en: () => import("./dict/en"),
  ar: () => import("./dict/ar"),
  zh: () => import("./dict/zh"),
  nl: () => import("./dict/nl"),
  de: () => import("./dict/de"),
  it: () => import("./dict/it"),
  ja: () => import("./dict/ja"),
  pt: () => import("./dict/pt"),
  ko: () => import("./dict/ko"),
  ru: () => import("./dict/ru"),
  es: () => import("./dict/es"),
  az: () => import("./dict/az"),
  fr: () => import("./dict/fr"),
};

const cache: Partial<Record<Locale, Dict>> = { tr };
/** Rapor için: eksik anahtar (locale:key) kümesi — dev konsola bir kez yazılır. */
export const missingKeys = new Set<string>();

function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function makeT(locale: Locale, dict: Dict | undefined) {
  return (key: DictKey, vars?: Vars): string => {
    const v = dict?.[key];
    if (typeof v === "string" && v.length > 0) return interpolate(v, vars);
    if (locale !== DEFAULT_LOCALE) {
      const id = `${locale}:${key}`;
      if (!missingKeys.has(id)) {
        missingKeys.add(id);
        if (process.env.NODE_ENV !== "production") console.warn("[i18n] missing", id);
      }
    }
    return interpolate(tr[key] ?? key, vars); // güvenli fallback: TR
  };
}

interface Ctx {
  locale: Locale;
  dir: "ltr" | "rtl";
  intl: string;
  ready: boolean;
  t: (key: DictKey, vars?: Vars) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<Ctx | null>(null);

function applyHtml(locale: Locale) {
  if (typeof document === "undefined") return;
  const m = localeMeta(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = m.dir;
}

async function loadDict(locale: Locale): Promise<Dict> {
  if (cache[locale]) return cache[locale] as Dict;
  if (locale === "tr") return tr;
  const mod = await loaders[locale]();
  cache[locale] = mod.default;
  return mod.default;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Sunucu + ilk istemci render'ı daima TR (hydration güvenliği).
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [dict, setDict] = useState<Dict | undefined>(tr);
  const [ready, setReady] = useState(false);

  // Mount: URL locale (13 global dil) > cookie (URL = SEO source of truth;
  // cookie sunum tercihi). DİL SÜREKLİLİĞİ: /xx'te gezen müşteri öneksiz
  // sayfalara (sepet, checkout) geçince dili kaybetmesin diye URL locale'i
  // cookie'ye yazılır; TR müşteride davranış değişmez (önek yoksa dokunulmaz).
  useEffect(() => {
    const urlLocale = /^\/(de|en|fr|nl|it|es|pt|az|ru|ar|zh|ja|ko)(?:\/|$)/.exec(window.location.pathname)?.[1];
    if (urlLocale && isLocale(urlLocale)) {
      try {
        document.cookie = `${LANG_COOKIE}=${urlLocale}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
      } catch { /* cookie kapalıysa oturum içi devam */ }
    }
    const l = urlLocale && isLocale(urlLocale) ? urlLocale : parseLangCookie(document.cookie);
    if (l === DEFAULT_LOCALE) { setReady(true); applyHtml(l); return; }
    let alive = true;
    loadDict(l).then((d) => { if (!alive) return; setDict(d); setLocaleState(l); applyHtml(l); setReady(true); })
      .catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const setLocale = useCallback((l: Locale) => {
    if (!isLocale(l)) return;
    try {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
    } catch { /* cookie kapalıysa oturum içi yine çalışır */ }
    loadDict(l).then((d) => { setDict(d); setLocaleState(l); applyHtml(l); });
  }, []);

  const value = useMemo<Ctx>(() => {
    const m = localeMeta(locale);
    return { locale, dir: m.dir, intl: m.intl, ready, t: makeT(locale, dict), setLocale };
  }, [locale, dict, ready, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  // Provider dışı (test/izole render) → TR sabit, kırılmaz.
  return { locale: DEFAULT_LOCALE, dir: "ltr", intl: "tr-TR", ready: true, t: makeT(DEFAULT_LOCALE, tr), setLocale: () => {} };
}

export function useT() {
  return useI18n().t;
}

/**
 * Num — bidi-safe sayısal değer (Figma 117 "RTL numeric safety").
 * Arapça RTL'de 09:00–12:00, ₺1.499, sipariş no, telefon, SKU asla ters okunmaz.
 * <bdi dir="ltr"> + unicode-bidi:isolate; LTR dillerde görünür etkisi yok.
 */
export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={className} style={{ unicodeBidi: "isolate", display: "inline-block" }}>
      {children}
    </bdi>
  );
}
