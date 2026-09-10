// ============================================================================
// lib/sitemapProductCoverage.ts — ADDITIVE (10 Eyl 2026). Yaprak modül, bağımlılık yok.
//
// NEDEN: products.xml yalnız SEO envanterinden (seo_page, status=published)
// besleniyor. Ürün seo_page kayıtları 27 Tem 2026 toplu envanterle oluşturuldu;
// sonradan eklenen ürünlerin kaydı yok → 10 Eyl 2026 sayımı: 1.496 canlı
// üründen 205'i products.xml'de değildi (seo/page API 404). Bu modül envanter
// düğümlerine DOKUNMAZ; yalnız envanterde OLMAYAN aktif ürün yollarını üretir.
// Sıra: envanter önce (bugünkü çıktı birebir), eksikler sona eklenir.
// ============================================================================

export interface CatalogProductRef {
  slug: string;
  updated_at?: string | null;
}

export interface MissingProductPath {
  path: string;
  updated_at: string | null;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Envanterde olmayan aktif ürün yolları; slug doğrulanır, path bazında teklenir. */
export function missingProductPaths(
  inventoryPaths: ReadonlySet<string>,
  products: ReadonlyArray<CatalogProductRef>,
): MissingProductPath[] {
  const seen = new Set<string>();
  const out: MissingProductPath[] = [];
  for (const product of products) {
    const slug = typeof product?.slug === "string" ? product.slug.trim() : "";
    if (!slug || !SLUG_RE.test(slug)) continue;
    const path = `/urun/${slug}`;
    if (inventoryPaths.has(path) || seen.has(path)) continue;
    seen.add(path);
    out.push({ path, updated_at: product.updated_at ?? null });
  }
  return out;
}
