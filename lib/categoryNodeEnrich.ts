// ============================================================================
// categoryNodeEnrich.ts — HAFİF kategori ağacı ↔ kategori sayfası SEO fallback köprüsü
// ----------------------------------------------------------------------------
// Maliyet kaçağı #1 düzeltmesi: vitrin artık kategori ağacını hafif uçtan
// (/api/categories/public-tree → id, name, slug, status, banner_image,
// product_count, is_indexable, children) okur. Kategori sayfasının SEO fallback'i
// (syntheticCategoryPage / withCategoryFallbacks) ise description, faq_json,
// seo_title, seo_description, h1_title alanlarını ister. Bu alanlar YALNIZ
// gerektiğinde (admin SEO kaydı yok ya da başlık/h1/meta boş) tek kategori için
// mevcut GET /api/categories/:id ucundan okunur ve düğümle birleştirilir.
// Saf yardımcılar — Next/HTTP bağımlılığı yok, birim testli.
// ============================================================================
import type { SeoPublicPage } from "./api";

const blank = (v: string | null | undefined): boolean => !v || v.trim() === "";

/** Admin SEO kaydı yok ya da eksik → ağaç düğümünün SEO alanlarına ihtiyaç var. */
export function needsCategorySeoFields(seo: SeoPublicPage | null): boolean {
  if (!seo) return true;
  return blank(seo.h1) || blank(seo.title_tag) || blank(seo.meta_description);
}

/** Hafif düğüm mü? Tam ağaçta `description` anahtarı her zaman vardır (null olsa bile). */
export function isLightCategoryNode(node: Record<string, unknown>): boolean {
  return !("description" in node);
}

/**
 * Tek kayıt (GET /api/categories/:id) ile hafif düğümü birleştirir. Kayıt alanları
 * kazanır; ağaçtan gelen `children` ve kimlik alanları korunur. Kayıt okunamadıysa
 * düğüm olduğu gibi döner (kesintide davranış: bugünkü fallback ağacıyla aynı —
 * description'sız sentetik sayfa).
 */
export function mergeCategoryNode(
  node: Record<string, unknown>,
  row: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!row) return node;
  const { children: _rowChildren, ...rest } = row;
  return { ...node, ...rest, children: node.children };
}
