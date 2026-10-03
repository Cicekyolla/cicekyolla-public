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

// ============================================================================
// EK (SEO YAYIN ZİNCİRİ) — ADDITIVE: sayfalı serinin Google kuralları.
//
// Google "sayfalama" rehberi: serinin her sayfası (1) KENDİ URL'sine, (2) sıralı
// <a href> bağlantılarına ve (3) KENDİ canonical'ına sahip olmalı — ilk sayfa
// diğerlerinin canonical'ı OLAMAZ. Önceden generateMetadata `searchParams`ı
// görmediği için her ?page=N çıplak yola canonical veriyor ve aynı <title>'ı
// taşıyordu: derin sayfalar (ve yalnız oradan bağlanan ürünler) kopya sayılıyordu.
//
//  • Sayfa 1 (ya da `page` yok): canonical çıplak yol, başlık aynen — DEĞİŞMEDİ.
//  • Sayfa N ≥ 2: canonical = yol + YALNIZ "?page=N" (sort/filtre parametresi
//    canonical'a GİRMEZ), başlık " – Sayfa N" ekiyle.
//  • Pozitif tam sayı olmayan ya da son sayfanın ötesindeki `page` → 404
//    (boş/kopya listeyi 200 ile sunmak yerine).
// ============================================================================

/**
 * `?page` ham değeri → sayfa numarası. Parametre yoksa 1 (çıplak yol).
 * Pozitif tam sayı değilse (0, -1, 1.5, "abc", "02", boş, yinelenen parametre)
 * null → rota notFound() verir. "1" geçerlidir ve çıplak yola eşittir.
 */
export function parseCategoryPageParam(raw: string | string[] | undefined): number | null {
  if (raw === undefined) return 1;
  if (typeof raw !== "string" || !/^[1-9]\d{0,5}$/.test(raw)) return null;
  return Number(raw);
}

/** Canonical yolu: sayfa 1 → çıplak yol; N ≥ 2 → yol + yalnız ?page=N. */
export function categoryCanonicalPath(path: string, page: number): string {
  return categoryPageHref(path, undefined, page);
}

/** Başlık: sayfa 1 aynen; N ≥ 2 → " – Sayfa N" eki (her sayfanın başlığı ayrışır). */
export function categoryPageTitle(title: string, page: number): string {
  const n = Math.trunc(Number(page)) || 1;
  return n > 1 ? `${title} – Sayfa ${n}` : title;
}

/**
 * İstenen sayfa son sayfanın ÖTESİNDE mi? Yalnız API o sayfa için GERÇEKTEN yanıt
 * verdiyse true döner: ürün listesi ucu istenen sayfa numarasını `pagination.page`
 * ile yankılar; okuma başarısız olduğunda dönen yedek sayfa ise page=1 taşır.
 * Böylece geçici bir API kesintisi geçerli bir ?page=N adresini 404'e çevirmez
 * (o durumda sayfa bugünkü gibi çizilir).
 */
export function isCategoryPageBeyondLast(
  requestedPage: number,
  pagination: { page?: unknown; total_pages?: unknown } | null | undefined,
): boolean {
  if (!(requestedPage > 1) || !pagination) return false;
  if (Number(pagination.page) !== requestedPage) return false;
  return requestedPage > Math.max(1, Math.trunc(Number(pagination.total_pages)) || 1);
}
