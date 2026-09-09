// ============================================================================
// homepageDerivatives.ts — ana sayfa ürün kartlarına kapak türevleri (Adım 3)
// ----------------------------------------------------------------------------
// SORUN (Lighthouse 9 Eyl 2026): ana sayfada 39 ProductCard, ProductImage'a
// türev vermediği için <picture> içinde <source> üretmiyor; her kart orijinal
// kapağı (150–280 KB, 1024–1512 px) indiriyor. Backend pipeline türevleri
// (400/800/1500 WebP + AVIF + blurhash) zaten üretiyor ve /api/products listesi
// döndürüyor; ama CMS ana sayfa DTO'su (/api/public/homepage) taşımıyor.
//
// ÇÖZÜM (additive, public tarafı, yeni uç YOK):
//   1) Otomatik dolgu (buildShowcaseFills) listeleri zaten fetchProducts'tan
//      gelir → toHpProduct türevleri taşır; buradan id → türev dizini kurulur.
//   2) CMS'te elle seçilmiş ürünler için önce dizine bakılır; yoksa ürün detayı
//      (fetchProductBySlug, Data Cache 120 sn) tek sefer çekilir ve süreç içinde
//      10 dk hatırlanır. Eşzamanlı, tavanlı, HATA YUTAR: bulunamazsa ürün
//      bugünkü gibi orijinal görselle kalır.
// DTO değiştirilmez (yeni nesne); sıra/ürün/başlık aynen korunur.
// ============================================================================

import type { HomepageDTO, HpProduct, HpSection } from "./homepage";
import type { MediaDerivatives, PublicProductDetail } from "./api";

export interface CoverDerivatives {
  cover_derivatives: MediaDerivatives | null;
  cover_blurhash: string | null;
}

export type DerivativeIndex = Map<number, CoverDerivatives>;

export function hasDerivatives(p: Pick<HpProduct, "cover_derivatives">): boolean {
  const d = p.cover_derivatives;
  return !!d && (!!d.webp || !!d.avif || !!(d.responsive && Object.keys(d.responsive).length > 0));
}

/** Ürün listelerinden (dolgular vb.) id → türev dizini. Türevsiz kayıt eklenmez, ilk görülen kazanır. */
export function derivativeIndexFromLists(lists: ReadonlyArray<{ products: ReadonlyArray<HpProduct> }>): DerivativeIndex {
  const index: DerivativeIndex = new Map();
  for (const list of lists) {
    for (const p of list.products) {
      if (!p || typeof p.id !== "number") continue;
      if (!hasDerivatives(p) || index.has(p.id)) continue;
      index.set(p.id, { cover_derivatives: p.cover_derivatives ?? null, cover_blurhash: p.cover_blurhash ?? null });
    }
  }
  return index;
}

function baseName(u: string | null | undefined): string {
  if (!u) return "";
  const clean = u.split("?")[0].split("#")[0];
  return clean.slice(clean.lastIndexOf("/") + 1);
}

/** Ürün detayından kapağa ait türevi seçer: kapak URL'siyle aynı dosya adı, yoksa ilk görsel. */
export function coverFromDetail(detail: PublicProductDetail | null, coverUrl: string | null): CoverDerivatives | null {
  const images = detail?.images;
  if (!Array.isArray(images) || images.length === 0) return null;
  const want = baseName(coverUrl);
  const match = (want && images.find((im) => baseName(im.url) === want)) || images[0];
  const derivatives = match.derivatives ?? null;
  const blurhash = match.blurhash ?? null;
  if (!derivatives && !blurhash) return null;
  return { cover_derivatives: derivatives, cover_blurhash: blurhash };
}

export type DetailFetcher = (slug: string) => Promise<PublicProductDetail | null>;

const MEMO_TTL_MS = 10 * 60_000;
const EMPTY_MEMO_TTL_MS = 60_000;
const memo = new Map<string, { value: CoverDerivatives | null; expiresAt: number }>();
/** Tek üretimde çekilecek en fazla ürün detayı (Render'a giden istek tavanı). */
export const DETAIL_FETCH_CAP = 48;

async function lookupDetail(p: HpProduct, fetchDetail: DetailFetcher): Promise<CoverDerivatives | null> {
  const hit = memo.get(p.slug);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  let value: CoverDerivatives | null = null;
  try {
    value = coverFromDetail(await fetchDetail(p.slug), p.cover_image_url);
  } catch {
    value = null; // fail-safe: orijinal görsel kalır
  }
  memo.set(p.slug, { value, expiresAt: Date.now() + (value ? MEMO_TTL_MS : EMPTY_MEMO_TTL_MS) });
  return value;
}

/**
 * DTO'daki tüm ürün bölümlerini türevle zenginleştirir. Girdi DEĞİŞTİRİLMEZ;
 * bölüm/ürün sırası ve alanları aynen kalır, yalnız cover_derivatives /
 * cover_blurhash dolar. Hiçbir koşulda fırlatmaz.
 */
export async function enrichHomepageProducts(
  dto: HomepageDTO,
  index: DerivativeIndex,
  fetchDetail: DetailFetcher,
  cap: number = DETAIL_FETCH_CAP,
): Promise<HomepageDTO> {
  try {
    const missing = new Map<string, HpProduct>();
    for (const s of dto.sections) {
      for (const p of s.products ?? []) {
        if (!p?.slug || hasDerivatives(p) || index.has(p.id)) continue;
        if (!missing.has(p.slug) && missing.size < cap) missing.set(p.slug, p);
      }
    }
    const fetched = new Map<string, CoverDerivatives | null>();
    await Promise.all([...missing.values()].map(async (p) => { fetched.set(p.slug, await lookupDetail(p, fetchDetail)); }));
    const sections: HpSection[] = dto.sections.map((s) => {
      if (!s.products || s.products.length === 0) return s;
      const products = s.products.map((p) => {
        if (!p || hasDerivatives(p)) return p;
        const found = index.get(p.id) ?? fetched.get(p.slug) ?? null;
        return found
          ? { ...p, cover_derivatives: found.cover_derivatives, cover_blurhash: found.cover_blurhash ?? p.cover_blurhash ?? null }
          : p;
      });
      return { ...s, products };
    });
    return { ...dto, sections };
  } catch {
    return dto;
  }
}
