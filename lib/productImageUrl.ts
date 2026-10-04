// ============================================================================
// lib/productImageUrl.ts — EK / ADDITIVE (SEO YAYIN ZİNCİRİ — TEK GÖRSEL KAYNAĞI).
//
// SORUN: görünür ürün görseli lib/productImage.ts'ten geçer (resolveProductImage:
// stüdyo kopyası → /studio/<dosya>, yoksa medya normalizasyonu). Makineye dönük
// çıktılar (Product JSON-LD, og:image / twitter:image, image sitemap, merchant feed)
// ise KAYITLI ham adresi basıyordu. Kapağı eski "/storage/products/….webp" yolunda
// kalan ürünlerde (4 Eki 2026 taraması: 131 aktif ürün × 14 dil sürümü) sayfa çalışan
// /studio/… dosyasını gösterirken Google'a 404 veren bir görsel bildiriliyordu.
//
// KURAL: makineye dönük her çıktı, görünür <img> ile AYNI kararı kullanır
// (resolveProductImage — ikinci bir karar yazılmaz) ve MUTLAK adres basar.
//   • stüdyo kopyası varsa        → https://www…/studio/<dosya>
//   • r2.dev / "/r2/…"            → https://www…/r2/<anahtar>   (bugünkü çıktı, bayt bayt)
//   • harici http(s) adresi       → aynen
//   • stüdyo kopyası OLMAYAN eski Plesk yolu (artık sunulmuyor) → null
//   • istenebilir bir görsel adresi olmayan değer (boş, data:, blob:, "//host",
//     şemasız) → null
// null dönen aday BASILMAZ (çağıran etiketi / alanı atlar) — ölü adres bildirilmez.
// Ürün görseli bileşeni (ProductImage) bu dosyadan GEÇMEZ ve değişmez.
//
// EK (HOST KURALI): mutlak adresin hostu YALNIZ vitrinin kendi hostuysa (kanonik host ya da
// www'siz / www'li ikizi) kanonik adrese sabitlenir — aynı dosyadır, yönlendirme adımı kalkar.
// Başka HER host (CDN alt alan adı, API hostu, harici) AYNEN basılır: görünür <img> o adresi
// gösterir; hostu www'ye çevirmek var olmayan bir dosya bildirirdi.
// EK (VİDEO): ürün `images[]` galeri videosu da taşıyabilir (PDP onu <video> ile çizer) →
// video dosyası görsel olarak BASILMAZ (null).
// EK (ADRES NORMALİZASYONU): çıktı URL ayrıştırıcısından geçer — boşluk ve ASCII dışı karakter
// yüzde-kodlanır (sitemap / feed / JSON-LD geçerli URL ister); temiz adresin baytları değişmez.
// ============================================================================
import { resolveProductImage, studioOverride } from "./productImage.ts";
import { isLegacyPleskMedia } from "./media.ts";
import { absoluteUrl, SITE_URL } from "./site-config.ts";

/** Video dosyası mı? components/product/ProductDetail.tsx isVideo ile AYNI uzantılar (PDP bunları <video> çizer). */
const PRODUCT_VIDEO_URL = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i;

/** Vitrinin KENDİ hostu mu? (kanonik host ya da www'siz / www'li ikizi) — yalnız bu host kanonik adrese sabitlenir. */
function isStorefrontHost(hostname: string): boolean {
  let canonical: string;
  try {
    canonical = new URL(SITE_URL).hostname;
  } catch {
    return false;
  }
  const bare = canonical.replace(/^www\./, "");
  return hostname === canonical || hostname === bare || hostname === `www.${bare}`;
}

/** Kayıtlı ürün görseli adresi → vitrinin GERÇEKTEN sunduğu MUTLAK adres; sunulamıyorsa null. */
export function servedProductImageUrl(raw: string | null | undefined): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  // Görünür <img> ile AYNI karar: stüdyo kopyası öncelikli, yoksa medya normalizasyonu.
  const served = value ? resolveProductImage(value) : null;
  if (!served) return null;
  // EK (VİDEO): galeri videosu görsel çıktısına girmez.
  if (PRODUCT_VIDEO_URL.test(served)) return null;
  let absolute: string;
  if (/^https?:\/\//i.test(served)) {
    let parsed: URL;
    try {
      parsed = new URL(served);
    } catch {
      return null;
    }
    // EK (HOST KURALI): yalnız vitrinin kendi hostu kanonik adrese çevrilir; başka host AYNEN.
    absolute = isStorefrontHost(parsed.hostname) ? absoluteUrl(served) : served;
  } else if (!served.startsWith("/") || served.startsWith("//")) {
    return null;
  } else {
    absolute = absoluteUrl(served);
  }
  // Ölü eski Plesk yolu host-normalize kopyada aranır (eski alan adındaki aynı yol da ölüdür); çıktı etkilenmez.
  if (isLegacyPleskMedia(absoluteUrl(absolute))) return null;
  // EK (ADRES NORMALİZASYONU): geçerli URL biçimi (boşluk / ASCII dışı → yüzde-kodlu).
  try {
    return new URL(absolute).toString();
  } catch {
    return null;
  }
}

/** Aday listesinden (öncelik sırasıyla) sunulabilen İLK görselin mutlak adresi; hiçbiri sunulamıyorsa null. */
export function firstServedProductImageUrl(candidates: ReadonlyArray<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const url = servedProductImageUrl(candidate);
    if (url) return url;
  }
  return null;
}

/**
 * EK (KATEGORİ KAROSU YEDEĞİ) — kategorinin kendi görseli yokken karoya konan ÜRÜN KAPAĞI.
 * Kapak bugünkü adresiyle AYNEN döner; YALNIZ artık sunulmayan eski Plesk yolundaysa
 * ("/storage/products/…" → 404) ürün kartının gösterdiği stüdyo kopyası kullanılır, kopya da
 * yoksa null (çağıran sıradaki adaya / yer tutucuya düşer). Böylece karo ölü bir dosyayı
 * göstermez; çalışan kapakların karodaki görünümü değişmez.
 */
export function productCoverTileUrl(raw: string | null | undefined): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  if (!isLegacyPleskMedia(value)) return value;
  return studioOverride(value);
}
