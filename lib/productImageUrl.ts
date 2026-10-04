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
// Görünür render bu dosyadan GEÇMEZ ve değişmez.
// ============================================================================
import { resolveProductImage } from "./productImage.ts";
import { isLegacyPleskMedia } from "./media.ts";
import { absoluteUrl } from "./site-config.ts";

/** Kayıtlı ürün görseli adresi → vitrinin GERÇEKTEN sunduğu MUTLAK adres; sunulamıyorsa null. */
export function servedProductImageUrl(raw: string | null | undefined): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  // Görünür <img> ile AYNI karar: stüdyo kopyası öncelikli, yoksa medya normalizasyonu.
  const served = value ? resolveProductImage(value) : null;
  if (!served) return null;
  const http = /^https?:\/\//i.test(served);
  if (http) {
    try {
      new URL(served);
    } catch {
      return null;
    }
  } else if (!served.startsWith("/") || served.startsWith("//")) {
    return null;
  }
  const absolute = absoluteUrl(served);
  return isLegacyPleskMedia(absolute) ? null : absolute;
}

/** Aday listesinden (öncelik sırasıyla) sunulabilen İLK görselin mutlak adresi; hiçbiri sunulamıyorsa null. */
export function firstServedProductImageUrl(candidates: ReadonlyArray<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const url = servedProductImageUrl(candidate);
    if (url) return url;
  }
  return null;
}
