// ============================================================================
// lib/categoryPagination.ts — ADDITIVE (10 Eyl 2026). Yaprak modül, bağımlılık yok.
//
// NEDEN: Kategori grid'i sonsuz kaydırma ile yükleniyor (CategoryProductGrid).
// SSR HTML'de yalnız ilk 50 ürün bağlantısı vardı; `?page=N` sayfaları çalışıyor
// ama HİÇBİR yerden linklenmiyordu. 10 Eyl 2026 tarama grafı (243 kategori ×
// 729 sayfa): 1.496 canlı üründen 343'ü hiçbir tarama yolundan ulaşılamıyordu
// (311'i yalnız sitemap'te, 32'si hiçbir yerde). Google sonsuz kaydırmayı
// tetiklemez; tarayıcı için gerçek <a href="?page=N"> gerekir.
//
// KURAL: Sonsuz kaydırma UX'i DEĞİŞMEZ. Bu modül yalnız SSR'a eklenen
// "Önceki / Sonraki sayfa" bağlantılarının href'ini üretir. Mevcut sorgu
// parametreleri (sort, type, same_day …) korunur; sayfa 1 için `page` yazılmaz
// ki kategori kökü ile `?page=1` ikiz URL olmasın.
// ============================================================================

export type CategorySearchParams = { [k: string]: string | string[] | undefined } | undefined;

export interface CategoryPageLink {
  page: number;
  href: string;
}

export interface CategoryPagination {
  current: number;
  total: number;
  prev: CategoryPageLink | null;
  next: CategoryPageLink | null;
}

/** `?page=N` bağlantısı: mevcut parametreler aynen, `page` en sonda; N ≤ 1 → kök yol. */
export function categoryPageHref(path: string, searchParams: CategorySearchParams, page: number): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (key === "page") continue;
    if (typeof value === "string" && value !== "") q.set(key, value);
  }
  const n = Math.trunc(Number(page)) || 1;
  if (n > 1) q.set("page", String(n));
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Geçerli sayfa/toplam sayfadan önceki-sonraki bağlantıları; aralık dışı girdiler sıkıştırılır. */
export function buildCategoryPagination(
  path: string,
  searchParams: CategorySearchParams,
  currentPage: number,
  totalPages: number,
): CategoryPagination {
  const total = Math.max(1, Math.trunc(Number(totalPages)) || 1);
  const current = Math.min(total, Math.max(1, Math.trunc(Number(currentPage)) || 1));
  const link = (page: number): CategoryPageLink => ({ page, href: categoryPageHref(path, searchParams, page) });
  return {
    current,
    total,
    prev: current > 1 ? link(current - 1) : null,
    next: current < total ? link(current + 1) : null,
  };
}
