// ============================================================================
// GLOBAL — locale routing sözleşmesi (saf modül; test edilir).
// Kanun: tek domain (cicekyolla.com.tr), locale yalnız path öneki. TR route'ları
// bu modülün DIŞINDADIR ve değişmez.
//
// 14-dil foundation: liste API'nin TRANSLATION_LOCALES'iyle birebir (13 hedef
// dil + TR ana site). Yeni locale eklemek = buraya satır + app/<locale>/
// [[...path]] ince sarmalayıcı. Public'e AÇILMA kararı içerik/onay ile (approved
// home) verilir — route'un varlığı tek başına vitrin açmaz (içeriksiz sayfalar
// 404/noindex kalır).
// ============================================================================

export const GLOBAL_LOCALES = [
  "de", "en", "fr", "nl", "it", "es", "pt", "az", "ru", "ar", "zh", "ja", "ko",
] as const;
export type GlobalLocale = (typeof GLOBAL_LOCALES)[number];

export function isGlobalLocale(v: unknown): v is GlobalLocale {
  return typeof v === "string" && (GLOBAL_LOCALES as readonly string[]).includes(v);
}

/** Yazı yönü (ar = RTL). */
export const DIR: Record<GlobalLocale, "ltr" | "rtl"> = {
  de: "ltr", en: "ltr", fr: "ltr", nl: "ltr", it: "ltr", es: "ltr", pt: "ltr",
  az: "ltr", ru: "ltr", ar: "rtl", zh: "ltr", ja: "ltr", ko: "ltr",
};

/** Locale URL bölüm adları — Latin alfabeli dillerde gerçek ticari terim;
    Latin-dışı yazı sistemlerinde URL güvenliği için ASCII 'product/category'. */
export const SEGMENTS: Record<GlobalLocale, { product: string; category: string }> = {
  de: { product: "produkt", category: "kategorie" },
  en: { product: "product", category: "category" },
  fr: { product: "produit", category: "categorie" },
  nl: { product: "product", category: "categorie" },
  it: { product: "prodotto", category: "categoria" },
  es: { product: "producto", category: "categoria" },
  pt: { product: "produto", category: "categoria" },
  az: { product: "mehsul", category: "kateqoriya" },
  ru: { product: "product", category: "category" },
  ar: { product: "product", category: "category" },
  zh: { product: "product", category: "category" },
  ja: { product: "product", category: "category" },
  ko: { product: "product", category: "category" },
};

/** Middleware guard'ı: /<locale> ve /<locale>/... — legacy resolver'lara girmez. */
export function isGlobalLocalePath(pathname: string): boolean {
  return (GLOBAL_LOCALES as readonly string[]).some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
}

export type ParsedLocalePath =
  | { kind: "home" }
  | { kind: "product"; slug: string }
  | { kind: "category"; slug: string }
  | { kind: "page"; key: string } // global_pages: istanbul, istanbul/<ilçe>[/<mahalle>]
  | { kind: "unknown" };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Faz 2 destinasyon kapısı: yalnız İstanbul (kanun §4). Yeni şehir = kurul kararı. */
export const DESTINATION_ROOT = "istanbul";

/** [[...path]] segmentleri → sayfa türü. Bilinmeyen her şey "unknown" (=404). */
export function parseLocalePath(locale: GlobalLocale, segs: string[]): ParsedLocalePath {
  if (segs.length === 0) return { kind: "home" };
  const seg = SEGMENTS[locale];
  if (segs.length === 2 && SLUG_RE.test(segs[1])) {
    if (segs[0] === seg.product) return { kind: "product", slug: segs[1] };
    if (segs[0] === seg.category) return { kind: "category", slug: segs[1] };
  }
  // Lokasyon yüzeyleri: /xx/istanbul, /xx/istanbul/kadikoy, /xx/istanbul/kadikoy/moda
  // (coğrafi adlar korunur — kanun §8; render yalnız approved global_pages kaydıyla).
  if (segs[0] === DESTINATION_ROOT && segs.length <= 3 && segs.every((s) => SLUG_RE.test(s))) {
    return { kind: "page", key: segs.join("/") };
  }
  return { kind: "unknown" };
}

export function localeProductPath(locale: GlobalLocale, slug: string): string {
  return `/${locale}/${SEGMENTS[locale].product}/${slug}`;
}
