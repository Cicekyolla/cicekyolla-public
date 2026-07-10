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
    return isUsable(source) ? mediaUrl(source) : null;
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
    if (isUsable(c)) return mediaUrl(c);
  }
  return null;
}
