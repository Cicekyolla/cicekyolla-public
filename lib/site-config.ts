import type { Metadata } from "next";

const PRODUCTION_SITE_URL = "https://www.cicekyolla.com.tr";

function normalizeSiteUrl(value: string | undefined): string {
  const candidate = value?.trim() || PRODUCTION_SITE_URL;
  try {
    const url = new URL(candidate);
    const normalized = `${url.protocol}//${url.host}`.replace(/\/$/, "");
    return normalized === PRODUCTION_SITE_URL ? normalized : PRODUCTION_SITE_URL;
  } catch {
    return PRODUCTION_SITE_URL;
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const PRODUCTION_HOST = new URL(PRODUCTION_SITE_URL).host;

export interface IndexingEnv {
  VERCEL_ENV?: string;
  SITE_INDEXABLE?: string;
  NEXT_PUBLIC_SITE_URL?: string;
}

// İndeksleme yalnız production + kesin kanonik domain birlikteyse açılır.
// Production işareti platformdan bağımsız: Vercel'de VERCEL_ENV=production,
// diğer barındırmalarda açık SITE_INDEXABLE=true. Kanonik olmayan host'lar
// (önizleme alan adları) next.config.js'te ayrıca noindex alır.
export function computeSiteIndexable(env: IndexingEnv): boolean {
  const isProduction = env.VERCEL_ENV === "production" || env.SITE_INDEXABLE?.trim() === "true";
  return isProduction && env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") === PRODUCTION_SITE_URL;
}

export const SITE_INDEXABLE = computeSiteIndexable({
  VERCEL_ENV: process.env.VERCEL_ENV,
  SITE_INDEXABLE: process.env.SITE_INDEXABLE,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) {
    try {
      const parsed = new URL(path);
      if (
        parsed.hostname.endsWith("cicekyolla.com") ||
        parsed.hostname.endsWith("cicekyolla.com.tr") ||
        parsed.hostname.endsWith("vercel.app")
      ) {
        return `${SITE_URL}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return path;
    } catch {
      return SITE_URL;
    }
  }
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function indexRobots(indexState: string = "index"): Metadata["robots"] {
  const indexable = SITE_INDEXABLE && indexState === "index";
  if (indexable) return { index: true, follow: true };
  // EK (27 Eki 2026 — kapatma kuralı): kanonik canlı sitede kapatılan (noindex) sayfa "noindex, follow" —
  // Google sayfayı dizinden çeker ama iç bağları izler (il/ilçe sayfalarına değer akar). Staging /
  // kanonik olmayan host'ta (SITE_INDEXABLE=false) bugünkü gibi nofollow kalır.
  return SITE_INDEXABLE ? computeClosedRobots() : { index: false, follow: false, nocache: true };
}

/** Kapatılan sayfanın robots değeri (TR ve 13 dil ortak): noindex, follow. */
export function computeClosedRobots(): { index: false; follow: true } {
  return { index: false, follow: true };
}
