// ============================================================================
// GLOBAL — hreflang AİLESİ: Türkçe sürüm + locale sürümleri (ADDITIVE, saf modül;
// ağ yok → node --test ile test edilir: lib/hreflangFamily.test.ts).
//
// NEDEN (SEO yayın zinciri): locale sayfaları yalnız kendi aralarında hreflang
// basıyor, Türkçe sayfa kümenin dışında kalıyordu. Google kuralı: her sürüm
// KENDİNİ ve DİĞER TÜM sürümleri listeler; karşılığı olmayan (tek yönlü) bağ yok
// sayılır; URL'ler mutlaktır. Bu modül aynı kümeyi İKİ TARAFTA DA (Türkçe sayfa +
// locale sayfaları) aynı girdiden, aynı fonksiyonla kurar → kümeler birebir eşit.
//
// KURAL:
//  • Aile = tr (Türkçe sürüm kümeye dahilse) + İNDEXLENEBİLİR locale sürümleri.
//  • x-default kuralı DEĞİŞMEDİ (lib/global/hreflang.ts withXDefault): locale
//    sürümleri içinde EN, yoksa alfabetik ilk locale. TR hiçbir zaman x-default
//    olmaz; Türkçe sayfa locale kardeşleriyle AYNI x-default'u basar.
//  • En az 2 üye: tr + tek locale = 2 üyeli ailedir ve basılır. Yalnız TR ya da
//    (TR kümede değilken) tek locale → null (hiçbir şey basılmaz).
//  • noindex locale sürümü listelenmez; kendisi de küme basmaz (karar çağıranda).
//  • KATEGORİ'de Türkçe sayfa kümeyi yalnız indexlenebilirken (ve 1. sayfada) basar; locale
//    kategori sayfası `tr`yi yalnız karşılığı KESİNKEN ekler: Türkçe sayfa kesin indexlenebilir
//    (trCategoryConfirmedIndexable) VE Türkçe sayfanın küme kaynağı o locale sayfasını listeliyor
//    (listsLocaleVersion). Bilinmeyen / okunamayan her durumda tr eklenmez.
//  • KAPSAM: ürün, ana sayfa, kategori. Lokasyon ve niyet sayfalarına TR EKLENMEZ
//    (Türkçe lokasyon URL'leri taşınıyor) — onlar lib/global/page.tsx pageLanguages
//    ile bugünkü gibi yalnız locale kümesini basar.
// ============================================================================
import { isGlobalLocale, localeProductPath, SEGMENTS } from "./config.ts";
import { withXDefault } from "./hreflang.ts";

export const TR_HREFLANG = "tr";

/** API yüzeylerindeki locale sürümü satırı (product-locales / category-locales / global page `locales`). */
export interface LocaleVersion {
  locale: string;
  slug?: string | null;
  indexable?: boolean | null;
}

type Absolute = (path: string) => string;

/**
 * EK — API yanıtı beklenen biçimde olmayabilir (200 + `locales` bir nesne / içinde null satır …).
 * Aile kurucuları Türkçe ürün / kategori sayfalarının generateMetadata'sında da çalışır; biçim hatası
 * orada fırlarsa sayfa 500 verirdi. Liste değilse boş, nesne olmayan satırlar atılır → fail-open
 * (küme basılmaz, sayfa çizilir).
 */
function versionRows(locales: unknown): LocaleVersion[] {
  if (!Array.isArray(locales)) return [];
  return locales.filter((alt): alt is LocaleVersion => !!alt && typeof alt === "object");
}

/** Türkçe ürün sayfası yolu (kanonik: kayıtlı slug). */
export function trProductPath(slug: string): string {
  return `/urun/${slug}`;
}

/** Türkçe kategori sayfası yolu. */
export function trCategoryPath(slug: string): string {
  return `/kategori/${slug}`;
}

/**
 * Aile haritası: { tr?, <locale>…, "x-default" }. trUrl null/boş → Türkçe sürüm kümede değil
 * (çıktı bugünkü locale kümesiyle birebir aynı). Aile kurulamıyorsa null. Girdi değiştirilmez.
 */
export function hreflangFamily(
  trUrl: string | null | undefined,
  localeUrls: Record<string, string>,
): Record<string, string> | null {
  const locales: Record<string, string> = {};
  for (const [key, url] of Object.entries(localeUrls)) {
    if (isGlobalLocale(key) && url) locales[key] = url;
  }
  const count = Object.keys(locales).length;
  if (count === 0 || (!trUrl && count < 2)) return null;
  // x-default YALNIZ locale sürümlerinden seçilir (TR aday değildir); tr sonradan eklenir.
  const set = withXDefault(locales);
  return trUrl ? { [TR_HREFLANG]: trUrl, ...set } : set;
}

/** ÜRÜN ailesi. trPath: Türkçe PDP'nin kanonik yolu (/urun/<slug>); null → TR kümede değil. */
export function productHreflangFamily(
  trPath: string | null | undefined,
  locales: readonly LocaleVersion[] | null | undefined,
  absolute: Absolute,
): Record<string, string> | null {
  const urls: Record<string, string> = {};
  for (const alt of versionRows(locales)) {
    if (alt.indexable && isGlobalLocale(alt.locale) && alt.slug) {
      urls[alt.locale] = absolute(localeProductPath(alt.locale, alt.slug));
    }
  }
  return hreflangFamily(trPath ? absolute(trPath) : null, urls);
}

/**
 * KATEGORİ ailesi. trPath: Türkçe kategori sayfasının kanonik yolu (/kategori/<slug>);
 * Türkçe sayfa indexlenebilir DEĞİLSE ya da durumu bilinmiyorsa null geçilir (TR kümeye girmez).
 */
export function categoryHreflangFamily(
  trPath: string | null | undefined,
  locales: readonly LocaleVersion[] | null | undefined,
  absolute: Absolute,
): Record<string, string> | null {
  const urls: Record<string, string> = {};
  for (const alt of versionRows(locales)) {
    if (alt.indexable && isGlobalLocale(alt.locale) && alt.slug) {
      urls[alt.locale] = absolute(`/${alt.locale}/${SEGMENTS[alt.locale].category}/${alt.slug}`);
    }
  }
  return hreflangFamily(trPath ? absolute(trPath) : null, urls);
}

/** ANA SAYFA ailesi: tr = site kökü, locale = /<locale>. Türkçe ana sayfa her zaman kümededir. */
export function homeHreflangFamily(
  locales: readonly LocaleVersion[] | null | undefined,
  absolute: Absolute,
): Record<string, string> | null {
  const urls: Record<string, string> = {};
  for (const alt of versionRows(locales)) {
    if (alt.indexable && isGlobalLocale(alt.locale)) urls[alt.locale] = absolute(`/${alt.locale}`);
  }
  return hreflangFamily(absolute("/"), urls);
}

/**
 * Türkçe sayfanın küme kaynağı (ör. category-locales yanıtı) bu locale sürümünü indexlenebilir
 * olarak listeliyor mu? Locale sayfası `tr`yi yalnız bu "evet" ise ekler: Türkçe sayfa bu sayfayı
 * listelemiyorsa (uç henüz yayında değil / okunamadı / sürüm orada yok) `tr` bağı tek yönlü kalırdı.
 */
export function listsLocaleVersion(
  locales: readonly LocaleVersion[] | null | undefined,
  locale: string,
): boolean {
  return versionRows(locales).some((alt) => alt.locale === locale && !!alt.indexable && !!alt.slug);
}

/**
 * Kendi statik rotasından sunulan Türkçe kategori slug'ları (app/kategori/<slug>/page.tsx). Bu sayfalar
 * genel kategori rotasından geçmez ve hreflang kümesi BASMAZ → locale kategori sayfası onlara `tr` bağı
 * veremez (karşılığı olmazdı). Liste app/kategori altındaki klasörlerle eşleşir (nöbet testi).
 */
export const TR_CATEGORY_DEDICATED_ROUTES: readonly string[] = ["turkiye-geneli-kargo"];

/**
 * Locale kategori sayfası TR'yi kümeye alabilir mi? Yalnız KESİN bilgiyle "evet":
 * SEO kaydı okuması yanıt verdi (seoRead), canlı kategori ağacı okundu (treeRead), kategori
 * ağaçta BULUNDU (nodeFound — Türkçe sayfa kümeyi yalnız düğümü bulduğunda basar; locale yüzeyinin
 * kategori kimliği verildiyse düğüm o kimliği taşımalı: iki taraf AYNI category-locales kaydını okur),
 * gizli (pasif/arşiv) değil ve Türkçe sayfanın basacağı index durumu "index".
 * Okunamayan / bilinmeyen her durum → false (tr eklenmez; tek yönlü bağ üretilmez).
 */
export function trCategoryConfirmedIndexable(input: {
  seoRead: boolean;
  treeRead: boolean;
  nodeFound: boolean;
  hidden: boolean;
  indexState: string | null | undefined;
}): boolean {
  return input.seoRead && input.treeRead && input.nodeFound && !input.hidden && input.indexState === "index";
}
