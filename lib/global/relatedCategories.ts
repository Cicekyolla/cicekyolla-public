// lib/global/relatedCategories.ts — 11 Kas 2026 (ADDITIVE): 13 dil kategori sayfası "ilgili kategoriler".
//
// SORUN (kanıt): ilgili kategoriler kataloğun ALFABETİK ilk 8 canlı kategorisiydi → /en/category/roses
// sayfası "Birthday Cakes, Boutique Cakes, Budget-Friendly Mother's Day…" gösteriyordu; ürün türü karışıyordu.
// ÇÖZÜM: kategorilerin o dildeki gerçek ürün kümesi (catalog.product_slugs, Product Center bağı) üzerinden
// Jaccard benzerliği; adayın ürünlerinin çoğu bu sayfada ise (alt tür: Güller → Kutuda Güller) içerilme oranı
// (×0.6) de puan olur. Ortak ürünü olmayan kategori ilgili sayılmaz (gül sayfasında çelenk/pasta yok).
// Neredeyse aynı liste (J ≥ 0.9) kopya sayılır ve atlanır. Eşitlikte canlı ürün sayısı, sonra ad.
// Veri yoksa (eski API, product_slugs alanı yok) bugünkü alfabetik davranış aynen.

export interface RelatedCategoryInput { slug: string; name: string; live_products?: number; product_slugs?: string[] }

export const RELATED_DUPLICATE_JACCARD = 0.9;
export const RELATED_SUBSET_WEIGHT = 0.6;

export function relatedCategories<T extends RelatedCategoryInput>(currentSlug: string, categories: readonly T[], limit = 8): T[] {
  const live = categories.filter((c) => c.slug !== currentSlug && (c.live_products ?? 0) > 0);
  const current = categories.find((c) => c.slug === currentSlug);
  const mine = new Set(current?.product_slugs ?? []);
  if (!current || !Array.isArray(current.product_slugs) || mine.size === 0) return live.slice(0, limit);
  const scored: { c: T; j: number }[] = [];
  for (const c of live) {
    const theirs = c.product_slugs ?? [];
    if (!theirs.length) continue;
    let inter = 0;
    for (const s of new Set(theirs)) if (mine.has(s)) inter++;
    if (inter === 0) continue;
    const size = new Set(theirs).size;
    const jac = inter / (mine.size + size - inter);
    if (jac >= RELATED_DUPLICATE_JACCARD) continue;
    const j = Math.max(jac, RELATED_SUBSET_WEIGHT * (inter / size));
    scored.push({ c, j });
  }
  scored.sort((a, b) => b.j - a.j || (b.c.live_products ?? 0) - (a.c.live_products ?? 0) || a.c.name.localeCompare(b.c.name));
  return scored.slice(0, limit).map((x) => x.c);
}
