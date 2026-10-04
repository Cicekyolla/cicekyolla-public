// ============================================================================
// lib/categoryPagination.ts — ADDITIVE (10 Eyl 2026). Saf modül (ağ / Next yok).
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
//
// EK (taranma derinliği): yalnız "Önceki / Sonraki" ile 20 sayfalık bir kategoride
// son sayfa ilk sayfadan 19 adım uzaktaydı. Model artık NUMARALI kompakt listeyi de
// taşır (1 … p-1 p p+1 … son; locale sayfalamasıyla aynı kural) → her sayfa en çok
// birkaç adımda.
//
// EK (TAM NUMARALI LİSTE): kompakt listede 22 sayfalık bir kategorinin orta sayfaları
// 1. sayfadan hâlâ birkaç adım uzaktaydı (en büyük kategori 31 sayfa). Numaralı liste
// artık bu modülün KENDİ kuralıdır (categoryPageList, aşağıda): 40 sayfaya kadar HER
// sayfa numarası gerçek bağlantıdır → serinin her sayfası her sayfadan TEK adım. 40'ın
// üstünde pencere + ilk + son + her 10. sayfa. Locale sayfalaması kendi kompakt listesini
// (lib/global/locationPaging.ts compactPageList) kullanmayı sürdürür — o değişmedi.
// Bu modül artık hiçbir şey ithal etmez (yaprak modül).
// ============================================================================

export type CategorySearchParams = { [k: string]: string | string[] | undefined } | undefined;

export interface CategoryPageLink {
  page: number;
  href: string;
}

/** Numaralı liste öğesi: gerçek sayfa bağlantısı ya da "…" boşluğu. */
export type CategoryPageItem =
  | { kind: "page"; page: number; href: string; current: boolean }
  | { kind: "gap"; key: string };

export interface CategoryPagination {
  current: number;
  total: number;
  prev: CategoryPageLink | null;
  next: CategoryPageLink | null;
  /** EK: numaralı liste (tek sayfada [1]; kural categoryPageList); bağlantılar prev/next ile aynı href kuralından. */
  pages: CategoryPageItem[];
}

/** Bu sayfa sayısına kadar (dahil) HER sayfa numarası bağlantı olarak basılır. */
export const CATEGORY_FULL_PAGE_LIST_MAX = 40;
/** Daha uzun seride geçerli sayfanın iki yanında gösterilen sayfa sayısı. */
export const CATEGORY_PAGE_WINDOW = 5;
/** Daha uzun seride her zaman listelenen ara sayfaların adımı (10, 20, 30 …). */
export const CATEGORY_PAGE_STEP = 10;

/**
 * EK (TAM NUMARALI LİSTE) — taranma derinliği için kategori sayfa listesi.
 *  • toplam ≤ 40 → 1 … toplam, HEPSİ (boşluk yok): her sayfa, her sayfadan tek adım.
 *  • toplam > 40 → pencere (p-5 … p+5) + ilk + son + her 10. sayfa; aradaki atlanan
 *    bölümler "gap". Her sayfa en çok iki adımda: herhangi bir sayfa → en yakın 10'luk
 *    sayfa → hedef (pencere yarıçapı = adımın yarısı). Tek sayfalık boşluk "…" yerine
 *    sayfanın kendisiyle doldurulur.
 * Aralık dışı girdiler sıkıştırılır (toplam en az 1; geçerli sayfa 1 … toplam).
 */
export function categoryPageList(current: number, total: number): (number | "gap")[] {
  const t = Number.isFinite(total) && total >= 1 ? Math.floor(total) : 1;
  const c = Number.isFinite(current) ? Math.min(t, Math.max(1, Math.floor(current))) : 1;
  if (t <= CATEGORY_FULL_PAGE_LIST_MAX) return Array.from({ length: t }, (_, i) => i + 1);
  const keep = new Set<number>([1, t]);
  for (let n = c - CATEGORY_PAGE_WINDOW; n <= c + CATEGORY_PAGE_WINDOW; n++) keep.add(n);
  for (let n = CATEGORY_PAGE_STEP; n < t; n += CATEGORY_PAGE_STEP) keep.add(n);
  const sorted = [...keep].filter((n) => n >= 1 && n <= t).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev > 0) {
      if (n - prev === 2) out.push(prev + 1);
      else if (n - prev > 2) out.push("gap");
    }
    out.push(n);
    prev = n;
  }
  return out;
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
  let gaps = 0;
  const pages: CategoryPageItem[] = categoryPageList(current, total).map((n) =>
    n === "gap" ? { kind: "gap", key: `gap-${++gaps}` } : { kind: "page", ...link(n), current: n === current },
  );
  return {
    current,
    total,
    prev: current > 1 ? link(current - 1) : null,
    next: current < total ? link(current + 1) : null,
    pages,
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
//  • EK: sayfa N ≥ 2 kendi canonical'ını ve başlık ekini YALNIZ o sayfanın ana seride
//    (sıralamasız / filtresiz liste) gerçekten VAR olduğu biliniyorsa alır. Liste durumu
//    bilinmiyorsa (okuma başarısız, ağaç okunamadı) yanıt 200 kalır ama çıplak yola
//    canonical verir ve başlık eki almaz (önceki hâl) → kopya içerik kendi adresiyle
//    index'e önerilmez. Kategori CANLI ağaçta yoksa (liste yok) sayfa N ≥ 2 → 404.
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

/** Başlık: sayfa 1 aynen; N ≥ 2 → " – Sayfa N" eki (her sayfanın başlığı ayrışır). Başlık boşsa ek de yok. */
export function categoryPageTitle(title: string, page: number): string {
  const n = Math.trunc(Number(page)) || 1;
  return title && n > 1 ? `${title} – Sayfa ${n}` : title;
}

/**
 * EK — istenen sayfanın liste durumu (tek karar noktası; 404 ve canonical bundan türer):
 *   "ok"      → API yanıt verdi ve sayfa serinin içinde.
 *   "beyond"  → API yanıt verdi ve sayfa son sayfanın ÖTESİNDE → 404.
 *   "unknown" → yanıtın GERÇEK olduğu bilinmiyor (liste yok / okuma başarısız) → karar
 *               verilmez: 404 YOK, sayfa bugünkü gibi çizilir; canonical çıplak yola döner.
 * Yanıt GERÇEK sayılır: (a) `total` > 0 ise — okuma başarısız olduğunda dönen yedek sayfa
 * total 0 taşır, gerçek ürün sayısı taşıyamaz; (b) total 0 iken yalnız API istenen sayfa
 * numarasını `pagination.page` ile yankıladıysa (yedek sayfa page=1 taşır).
 * Böylece karar API'nin sayfa numarasını yankılamasına BAĞLI DEĞİLDİR: numarayı kırpan ya da
 * hiç döndürmeyen bir API'de de son sayfanın ötesi (total > 0 iken) 404 verir.
 */
export type CategoryListingState = "ok" | "beyond" | "unknown";

export function categoryListingState(
  requestedPage: number,
  pagination: { page?: unknown; page_size?: unknown; total?: unknown; total_pages?: unknown } | null | undefined,
): CategoryListingState {
  if (!(requestedPage > 1)) return "ok";
  if (!pagination) return "unknown";
  const total = Number(pagination.total);
  if (!(total > 0) && Number(pagination.page) !== requestedPage) return "unknown";
  let totalPages = Math.trunc(Number(pagination.total_pages));
  if (!(totalPages >= 1)) {
    // total_pages yok / 0: boş listede tek sayfa; dolu listede total ÷ page_size (o da yoksa karar yok).
    const size = Number(pagination.page_size);
    if (total > 0 && !(size > 0)) return "unknown";
    totalPages = total > 0 ? Math.ceil(total / size) : 1;
  }
  return requestedPage > totalPages ? "beyond" : "ok";
}

/**
 * İstenen sayfa son sayfanın ÖTESİNDE mi? Yalnız API o sayfa için GERÇEKTEN yanıt
 * verdiyse true döner (categoryListingState === "beyond"); okuma başarısız olduğunda
 * dönen yedek sayfa (page=1, total 0) "bilinmiyor"dur. Böylece geçici bir API kesintisi
 * geçerli bir ?page=N adresini 404'e çevirmez (o durumda sayfa bugünkü gibi çizilir).
 */
export function isCategoryPageBeyondLast(
  requestedPage: number,
  pagination: { page?: unknown; page_size?: unknown; total?: unknown; total_pages?: unknown } | null | undefined,
): boolean {
  return categoryListingState(requestedPage, pagination) === "beyond";
}

/**
 * EK — sayfa ≥ 2 iken kategorinin LİSTESİ YOK mu (→ 404)? Kategori CANLI ağaçta
 * çözülemiyorsa (yalnız SEO kaydından çizilen sayfa) ürün listesi de sayfalama da yoktur:
 * her ?page=N, 1. sayfanın kopyası olurdu. Ağaç okunamadıysa (statik yedek) karar
 * verilmez → API kesintisi geçerli bir ?page=N adresini 404'e çevirmez.
 */
export function isCategoryPageWithoutListing(
  requestedPage: number,
  input: { liveTree: boolean; categoryId: number | null | undefined },
): boolean {
  return requestedPage > 1 && input.liveTree && !input.categoryId;
}
