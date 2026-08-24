// ============================================================================
// GLOBAL Faz 1 — locale routing sözleşmesi (saf modül; test edilir).
// Kanun: tek domain (cicekyolla.com.tr), locale yalnız /de/ /en/ path öneki.
// TR route'ları bu modülün DIŞINDADIR ve değişmez. Yeni locale eklemek =
// GLOBAL_LOCALES + SEGMENTS'e satır + app/<locale>/[[...path]] ince sarmalayıcı.
// ============================================================================

export const GLOBAL_LOCALES = ["de", "en"] as const;
export type GlobalLocale = (typeof GLOBAL_LOCALES)[number];

export function isGlobalLocale(v: unknown): v is GlobalLocale {
  return typeof v === "string" && (GLOBAL_LOCALES as readonly string[]).includes(v);
}

/** Locale URL bölüm adları — gerçek hedef-dil ticari terminoloji (çeviri değil). */
export const SEGMENTS: Record<GlobalLocale, { product: string; category: string }> = {
  de: { product: "produkt", category: "kategorie" },
  en: { product: "product", category: "category" },
};

/** Middleware guard'ı: /de, /de/..., /en, /en/... — legacy resolver'lara girmez. */
export function isGlobalLocalePath(pathname: string): boolean {
  return (GLOBAL_LOCALES as readonly string[]).some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
}

export type ParsedLocalePath =
  | { kind: "home" }
  | { kind: "product"; slug: string }
  | { kind: "category"; slug: string }
  | { kind: "unknown" };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** [[...path]] segmentleri → sayfa türü. Bilinmeyen her şey "unknown" (=404). */
export function parseLocalePath(locale: GlobalLocale, segs: string[]): ParsedLocalePath {
  if (segs.length === 0) return { kind: "home" };
  const seg = SEGMENTS[locale];
  if (segs.length === 2 && SLUG_RE.test(segs[1])) {
    if (segs[0] === seg.product) return { kind: "product", slug: segs[1] };
    if (segs[0] === seg.category) return { kind: "category", slug: segs[1] };
  }
  return { kind: "unknown" };
}

export function localeProductPath(locale: GlobalLocale, slug: string): string {
  return `/${locale}/${SEGMENTS[locale].product}/${slug}`;
}
