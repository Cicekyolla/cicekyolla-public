// ---------------------------------------------------------------------------
// MERKEZİ ÜRÜN GÖRSEL ÇÖZÜCÜ (resolver) — TEK KAYNAK.
// Tüm public ürün görselleri bu çözücüden geçer. Görsel alanları backend'e göre
// değişebildiği için savunmacı sırayla denenir; ilk dolu ve geçerli olan kullanılır.
//
// GERÇEK API NOTU: Canlı API bugün liste için `cover_image_url`, detay için
// `images[]` döndürür. Diğer alanlar (image_url/main_image_url/thumbnail_url/
// media[]) ileri uyumluluk için desteklenir — bugün yoksa atlanır (uydurma YOK).
//
// r2.dev URL'leri same-origin /r2 proxy'sine çevrilir (mediaUrl) → TR erişim fix'i.
// ---------------------------------------------------------------------------

import { mediaUrl } from "./media";
import studioMapJson from "./studio-map.json";

// ---------------------------------------------------------------------------
// STÜDYO GÖRSEL KATMANI (additive, geri alınabilir)
// ---------------------------------------------------------------------------
// Tüm ürün kapakları profesyonel stüdyo standardına çekildi: saf beyaz fon,
// korunan doğal temas gölgesi, canlı renk + keskinlik. İşlenmiş kopyalar
// /public/studio/ altında durur; bu harita orijinal dosya adını yerel yola
// bağlar. Haritada OLMAYAN görseller (yeni eklenen ürünler vb.) eskisi gibi
// orijinal URL'den servis edilir — yapı/davranış DEĞİŞMEZ.
// ---------------------------------------------------------------------------
const STUDIO_MAP: Record<string, string> = studioMapJson as Record<string, string>;

/** URL'nin dosya adını çıkarır (sorgu/parça atılır). */
function baseName(u: string): string {
  const clean = u.split("?")[0].split("#")[0];
  const parts = clean.split("/");
  return parts[parts.length - 1] || "";
}

/** İşlenmiş stüdyo kopyası varsa yerel yolunu döndürür; yoksa null. */
export function studioOverride(url: string | null | undefined): string | null {
  if (!url) return null;
  return STUDIO_MAP[baseName(url)] ?? null;
}

/** Yerel stüdyo görseli mi? (/studio/...) — ProductImage türev/blurhash'i atlar. */
export function isStudioImage(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith("/studio/");
}

/** Orijinal URL için nihai çözüm: stüdyo kopyası öncelikli, yoksa mediaUrl. */
function resolveWithStudio(url: string): string {
  return studioOverride(url) ?? mediaUrl(url);
}

/** Görsel taşıyabilecek gevşek kaynak tipi (liste öğesi, detay, öneri vb.). */
export interface ImageSourceLike {
  image_url?: string | null;
  main_image_url?: string | null;
  thumbnail_url?: string | null;
  cover_image_url?: string | null;
  cover_url?: string | null;
  images?: Array<{ url?: string | null } | null> | null;
  media?: Array<{ url?: string | null } | null> | null;
}

/** Bir string'in kullanılabilir bir URL olup olmadığını sezgisel doğrular. */
function isUsable(u: unknown): u is string {
  if (typeof u !== "string") return false;
  const s = u.trim();
  if (!s) return false;
  if (s === "null" || s === "undefined") return false;
  return true;
}

/**
 * Kaynaktan (string veya nesne) premium görsel URL'ini çözer.
 * Sıra: image_url → main_image_url → thumbnail_url → cover_image_url → cover_url
 *       → images[0].url → media[0].url. Bulunamazsa null (çağıran placeholder gösterir).
 * Dönen URL r2.dev ise /r2 proxy'sine normalize edilir.
 */
export function resolveProductImage(source: string | ImageSourceLike | null | undefined): string | null {
  if (source == null) return null;

  // Doğrudan string verildiyse
  if (typeof source === "string") {
    return isUsable(source) ? resolveWithStudio(source) : null;
  }

  const candidates: Array<string | null | undefined> = [
    source.image_url,
    source.main_image_url,
    source.thumbnail_url,
    source.cover_image_url,
    source.cover_url,
    source.images?.find((i) => isUsable(i?.url))?.url ?? null,
    source.media?.find((m) => isUsable(m?.url))?.url ?? null,
  ];

  for (const c of candidates) {
    if (isUsable(c)) return resolveWithStudio(c);
  }
  return null;
}
