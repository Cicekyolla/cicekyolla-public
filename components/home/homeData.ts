/**
 * Homepage Collections verisi — ARTIK tek kanonik kaynaktan gelir.
 * Kaynak: @/lib/catalog (Category Center yapısını yansıtan tek frontend kaynağı).
 * Bu dosya yalnızca geriye-uyumlu re-export shim'idir; tüketici import yolları
 * (home/FloatingCategoryRail → "./homeData") DEĞİŞMEZ. Kategori verisi burada
 * TUTULMAZ → çoğaltma yok, tek kaynak.
 */
export type { CategoryItem } from "@/lib/catalog";
export { categoryBadges } from "@/lib/catalog";
