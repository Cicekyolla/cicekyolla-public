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

/**
 * Destinasyon kökleri (kanun §4, 3 Eyl 2026 genişlemesi): İstanbul + Antalya +
 * Muğla + İzmir. API `GLOBAL_DESTINATIONS` ile birebir aynı küme; yeni şehir =
 * iki listeye de satır + Global Merkezi'nden onaylı içerik (route tek başına
 * vitrin açmaz: approved global_pages kaydı yoksa 404).
 *
 * TESLİMAT GERÇEĞİ: yalnız İstanbul aynı gün kurye (Delivery Motor bantları);
 * diğer üç şehir Türkiye geneli kargo (teslimat profili cargo_capable, 1–3 iş
 * günü). Sunum bu ayrımı `isSameDayDestination` ile yapar — vaat kopyalanmaz.
 */
export const DESTINATION_ROOTS = ["istanbul", "antalya", "mugla", "izmir"] as const;
export type DestinationRoot = (typeof DESTINATION_ROOTS)[number];

export function isDestinationRoot(v: unknown): v is DestinationRoot {
  return typeof v === "string" && (DESTINATION_ROOTS as readonly string[]).includes(v);
}

/** Geriye uyumluluk: aynı gün teslimat şehri (İstanbul). */
export const DESTINATION_ROOT: DestinationRoot = "istanbul";

/** Yalnız İstanbul aynı gün; Antalya/Muğla/İzmir kargo destinasyonudur. */
export function isSameDayDestination(city: string): boolean {
  return city === DESTINATION_ROOT;
}

/** [[...path]] segmentleri → sayfa türü. Bilinmeyen her şey "unknown" (=404). */
export function parseLocalePath(locale: GlobalLocale, segs: string[]): ParsedLocalePath {
  if (segs.length === 0) return { kind: "home" };
  const seg = SEGMENTS[locale];
  if (segs.length === 2 && SLUG_RE.test(segs[1])) {
    if (segs[0] === seg.product) return { kind: "product", slug: segs[1] };
    if (segs[0] === seg.category) return { kind: "category", slug: segs[1] };
  }
  // Lokasyon yüzeyleri: /xx/<şehir>, /xx/<şehir>/<ilçe>, /xx/<şehir>/<ilçe>/<mahalle>
  // — şehir DESTINATION_ROOTS'tan biri (coğrafi adlar korunur — kanun §8;
  // render yalnız approved global_pages kaydıyla; bilinmeyen şehir = 404).
  if (isDestinationRoot(segs[0]) && segs.length <= 3 && segs.every((s) => SLUG_RE.test(s))) {
    return { kind: "page", key: segs.join("/") };
  }
  return { kind: "unknown" };
}

export function localeProductPath(locale: GlobalLocale, slug: string): string {
  return `/${locale}/${SEGMENTS[locale].product}/${slug}`;
}
