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
//  • KAPSAM: ürün, ana sayfa, kategori + (13 Eki 2026) İSTANBUL LOKASYON (il / ilçe / mahalle).
//    İstanbul TR lokasyon taşınması tamamlandı (/istanbul, /{ilçe}-cicek-siparisi,
//    /{ilçe}/{mahalle}-cicek-siparisi). Ortak lokasyon kimliği = global_pages page_key
//    (istanbul[/ilçe[/mahalle]]); Türkçe karşılık YÖNETİLEN 301 haritasından okunur
//    (/istanbul/{ilçe}[/{mahalle}] → Türkçe adres; slug tahmini YOK) ve Türkçe kaydın
//    location bloğu AYNI kimliği taşımalıdır (çift yönlü doğrulama). Diğer şehirler ve niyet
//    sayfaları bugünkü gibi yalnız locale kümesini basar (lib/global/page.tsx pageLanguages).
// ============================================================================
import { isGlobalLocale, localeProductPath, SEGMENTS } from "./config.ts";
import { withXDefault } from "./hreflang.ts";
import { parseLocationKey } from "./locationKey.ts";
import { getLocationBlock, hierarchicalPathOf } from "../showcaseBlocks.ts";

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

// ---------------------------------------------------------------------------
// İSTANBUL LOKASYON AİLESİ (13 Eki 2026, ADDITIVE) — TR ↔ 13 dil.
// Aynı girdiden (global_pages `locales` + doğrulanmış Türkçe yol) iki tarafta da aynı küme kurulur.
// ---------------------------------------------------------------------------

/** Türkçe lokasyon kümesine alınan şehir kökü (TR adresleri taşınmış ve doğrulanmış tek şehir). */
export const TR_LOCATION_CITY = "istanbul";

/** Türkçe lokasyon kaydının asgari şekli (SeoPublicPage alt kümesi; saf modül API tipine bağlanmaz). */
export interface TrLocationPage {
  url_path?: string | null;
  page_type?: string | null;
  index_state?: string | null;
  canonical_url?: string | null;
  body_blocks?: unknown;
}

type RedirectLookup = { get(from: string): string | undefined };

/**
 * Global page_key → Türkçe ADAY yol. İl: "/istanbul". İlçe / mahalle: yönetilen 301 haritasında
 * "/istanbul/{ilçe}[/{mahalle}]" kaynağının hedefi (taşınmış Türkçe adres). Haritada yoksa / İstanbul
 * değilse null (aday YOK → tr eklenmez; slug'tan adres TAHMİN EDİLMEZ).
 */
export function trLocationCandidatePath(key: string, redirects: RedirectLookup, fromRecord?: string | null): string | null {
  const loc = parseLocationKey(key);
  if (!loc || loc.city !== TR_LOCATION_CITY) return null;
  if (loc.kind === "city") return `/${TR_LOCATION_CITY}`;
  // EK (13 Eki 2026): KALICI kaynak önce — TR kaydın kendi location bloğundan çözülen yol (API /global/tr-location).
  // Uç yoksa / belirsizse (null) yönetilen 301 haritası yedektir. Her iki aday da trLocationConfirmed'dan geçmelidir.
  if (isSafePath(fromRecord)) return fromRecord;
  const to = redirects.get(`/${key}`);
  return isSafePath(to) ? to : null;
}

function isSafePath(p: unknown): p is string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//");
}

/** TR sayfanın location bloğundan (İstanbul) Global anahtar ADAYI; doğrulama trLocationKeyOf'ta. */
export function trLocationKeyCandidate(page: TrLocationPage | null | undefined, path: string): string | null {
  if (!page) return null;
  if (path === `/${TR_LOCATION_CITY}`) return page.page_type === "city" ? TR_LOCATION_CITY : null;
  const block = getLocationBlock(page as { body_blocks?: unknown });
  return block && block.city === TR_LOCATION_CITY ? hierarchicalPathOf(block).slice(1) : null;
}

/**
 * Türkçe sayfa bu Global anahtarın KESİN karşılığı ve indexlenebilir mi? Hepsi gerekli:
 * kayıt aday yolda yayında, index, canonical kendisi (boşsa kendi yolu), ve kimlik eşleşiyor —
 * il: page_type "city"; ilçe / mahalle: location bloğunun hiyerarşik yolu "/"+key.
 */
export function trLocationConfirmed(page: TrLocationPage | null | undefined, trPath: string, key: string): boolean {
  if (!page || page.url_path !== trPath) return false;
  if (page.index_state !== "index") return false;
  if ((page.canonical_url || trPath) !== trPath) return false;
  const loc = parseLocationKey(key);
  if (!loc || loc.city !== TR_LOCATION_CITY) return false;
  if (loc.kind === "city") return page.page_type === "city" && trPath === `/${TR_LOCATION_CITY}`;
  const block = getLocationBlock(page as { body_blocks?: unknown });
  return !!block && hierarchicalPathOf(block) === `/${key}`;
}

/**
 * Türkçe sayfa → Global anahtar (Türkçe tarafın kümesi için). İl: "/istanbul" + page_type city.
 * İlçe / mahalle: location bloğu (İstanbul) VE yönetilen 301 haritası bloğun hiyerarşik yolunu
 * BU sayfaya taşıyor olmalı — Global tarafın aday kuralıyla birebir aynı koşul (tek yönlü bağ yok).
 */
export function trLocationKeyOf(
  page: TrLocationPage | null | undefined,
  path: string,
  redirects: RedirectLookup,
  fromRecord?: string | null,
): string | null {
  if (!page) return null;
  if (path === `/${TR_LOCATION_CITY}`) return trLocationConfirmed(page, path, TR_LOCATION_CITY) ? TR_LOCATION_CITY : null;
  const key = trLocationKeyCandidate(page, path);
  if (!key) return null;
  // Global taraf bu sayfayı AYNI kaynaklardan seçmeli: kalıcı kaynak (API) bu yolu gösteriyor YA DA (API yoksa) 301 haritası.
  // Global tarafın seçimi: fromRecord varsa o, yoksa harita → burada da aynı öncelik (tek yönlü bağ yok).
  const globalPick = isSafePath(fromRecord) ? fromRecord : redirects.get(`/${key}`);
  if (globalPick !== path) return null;
  return trLocationConfirmed(page, path, key) ? key : null;
}

/** LOKASYON ailesi: locale sürümleri /<locale>/<key> (yalnız indexlenebilir) + doğrulanmış Türkçe yol. */
export function locationHreflangFamily(
  key: string,
  trPath: string | null | undefined,
  locales: readonly LocaleVersion[] | null | undefined,
  absolute: Absolute,
): Record<string, string> | null {
  const urls: Record<string, string> = {};
  for (const alt of versionRows(locales)) {
    if (alt.indexable && isGlobalLocale(alt.locale)) urls[alt.locale] = absolute(`/${alt.locale}/${key}`);
  }
  return hreflangFamily(trPath ? absolute(trPath) : null, urls);
}
