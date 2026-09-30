// ============================================================================
// GLOBAL LOKASYON SAYFASI — GERÇEK 24'LÜK SAYFALAMA (saf modül; ağ yok → node --test ile test edilir).
//
// URL sözleşmesi (TR kategori standardıyla aynı: ?page, filtre değişince page düşer, canonical sorgusuz yol):
//   /{locale}/{city}[/{district}[/{neighborhood}]]  [?category=<locale kategori slug>]  [&page=<N>]
//   • "Tümü" çipi → sorgusuz yol · kategori çipi → ?category=slug (page YOK)
//   • sayfa linkleri mevcut category korunarak ?category=..&page=N (page=1 yazılmaz)
//   • geçersiz/eksik page (sayı değil, tam sayı değil, < 1, > toplam) → 1. sayfa (yönlendirme YOK)
//   • bilinmeyen / ürünsüz category → filtre yok sayılır (Tümü)
//
// SIRA → DİLİM: önce SON sıralı liste belirlenir — "Tümü" = planLocationPage.allOrder (öne çıkanlar önce,
// sonra katalog sırası; teslimat süzmesi API'de uygulanmış), kategori = o kategorinin product_ids'i
// (Admin Global sırası). Sonra slice((p-1)*24, p*24). Sıra sayfa başına yeniden hesaplanmaz.
// SSR yalnız dilimi basar; tüm liste istemciye / DOM'a gitmez (gizli ürün, gizli link listesi YOK).
// Çip sayıları filtre-bağımsız toplamlardır (kategori listesi uzunluğu).
// ============================================================================
import type { GlobalLocale } from "./config";

/** Tek sabit: lokasyon sayfasında sayfa başına ürün. */
export const LOCATION_PAGE_SIZE = 24;

/** Next `searchParams` biçimi (Next 14: düz nesne). */
export type LocationSearchParams = { [key: string]: string | string[] | undefined };

/** Sayfalamanın ihtiyaç duyduğu plan alanları (planLocationPage sonucu yapısal olarak uyar). */
export interface LocationPagingPlan {
  allOrder: readonly number[];
  categories: readonly { slug: string; name: string; ids: readonly number[] }[];
}

/** Sorgu değeri: dizi gelirse ilk öğe (?page=2&page=3 → "2"); string değilse undefined. */
export function queryValue(v: unknown): string | undefined {
  const first = Array.isArray(v) ? v[0] : v;
  return typeof first === "string" ? first : undefined;
}

/** Toplam sayfa sayısı (en az 1; ürünsüz liste de tek sayfadır). */
export function locationTotalPages(count: number, size: number = LOCATION_PAGE_SIZE): number {
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  const s = Number.isFinite(size) && size >= 1 ? Math.floor(size) : LOCATION_PAGE_SIZE;
  return Math.max(1, Math.ceil(n / s));
}

/** ?page ham değeri → 1..totalPages; geçersiz (sayı değil, tam sayı değil, < 1, > toplam) → 1. */
export function parseLocationPage(raw: unknown, totalPages: number): number {
  const v = queryValue(raw);
  if (v === undefined || !/^\d{1,6}$/.test(v)) return 1;
  const n = Number(v);
  return n >= 1 && n <= Math.max(1, Math.floor(totalPages)) ? n : 1;
}

/** ?category ham değeri → yalnız bu lokasyonda ürünü olan bilinen kategori slug'ı; aksi hâlde null (Tümü). */
export function parseLocationCategory(raw: unknown, categories: LocationPagingPlan["categories"]): string | null {
  const v = queryValue(raw);
  if (!v) return null;
  const hit = categories.find((c) => c.slug === v);
  return hit && hit.ids.length > 0 ? hit.slug : null;
}

/** Sıralı listenin p. sayfa dilimi (sıra korunur; liste kopyalanır, değiştirilmez). */
export function sliceLocationPage<T>(list: readonly T[], page: number, size: number = LOCATION_PAGE_SIZE): T[] {
  const p = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const s = Number.isFinite(size) && size >= 1 ? Math.floor(size) : LOCATION_PAGE_SIZE;
  return list.slice((p - 1) * s, p * s);
}

/** Sayfa/filtre linki: sorgusuz yol + ?category (varsa) + &page (yalnız ≥ 2). */
export function locationPageHref(basePath: string, opts: { category?: string | null; page?: number } = {}): string {
  const q: string[] = [];
  if (opts.category) q.push(`category=${encodeURIComponent(opts.category)}`);
  if (opts.page !== undefined && Number.isFinite(opts.page) && Math.floor(opts.page) > 1) q.push(`page=${Math.floor(opts.page)}`);
  return q.length ? `${basePath}?${q.join("&")}` : basePath;
}

/**
 * Kompakt sayfa listesi: 7 sayfaya kadar hepsi; daha fazlasında 1, …, p-1, p, p+1, …, son.
 * Tek sayfalık boşluk "…" yerine sayfanın kendisiyle doldurulur (1 … 3 yerine 1 2 3).
 * En çok 7 öğe → Önceki/Sonraki ile mobilde tek satır.
 */
export function compactPageList(current: number, total: number): (number | "gap")[] {
  const t = Number.isFinite(total) && total >= 1 ? Math.floor(total) : 1;
  const c = Number.isFinite(current) ? Math.min(t, Math.max(1, Math.floor(current))) : 1;
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
  const keep = [...new Set([1, c - 1, c, c + 1, t])].filter((n) => n >= 1 && n <= t).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const n of keep) {
    if (prev > 0) {
      if (n - prev === 2) out.push(prev + 1);
      else if (n - prev > 2) out.push("gap");
    }
    out.push(n);
    prev = n;
  }
  return out;
}

export type LocationPageLink =
  | { kind: "page"; page: number; href: string; current: boolean }
  | { kind: "gap"; key: string };

export interface LocationPagination {
  page: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
  items: LocationPageLink[];
}

/** Sayfalama navigasyonu modeli; tek sayfada null (navigasyon basılmaz). */
export function locationPagination(basePath: string, category: string | null, page: number, totalPages: number): LocationPagination | null {
  const t = Number.isFinite(totalPages) && totalPages >= 1 ? Math.floor(totalPages) : 1;
  if (t <= 1) return null;
  const p = Math.min(t, Math.max(1, Math.floor(page) || 1));
  const href = (n: number) => locationPageHref(basePath, { category, page: n });
  let gaps = 0;
  const items: LocationPageLink[] = compactPageList(p, t).map((n) =>
    n === "gap" ? { kind: "gap", key: `gap-${++gaps}` } : { kind: "page", page: n, href: href(n), current: n === p },
  );
  return { page: p, totalPages: t, prevHref: p > 1 ? href(p - 1) : null, nextHref: p < t ? href(p + 1) : null, items };
}

/** Çip (gerçek link): "Tümü" key=null; sayı filtre-bağımsız toplam. */
export interface LocationCatalogChip {
  key: string | null;
  label: string;
  count: number;
  href: string;
  active: boolean;
}

export interface LocationCatalogView {
  /** Normalize edilmiş etkin kategori slug'ı (null = Tümü). */
  category: string | null;
  /** Normalize edilmiş sayfa (1..totalPages). */
  page: number;
  totalPages: number;
  /** Filtreli (son) listenin uzunluğu. */
  total: number;
  /** YALNIZ bu sayfanın ürün id'leri (en çok LOCATION_PAGE_SIZE), son sıralı listeden dilim. */
  ids: number[];
  chips: LocationCatalogChip[];
  pagination: LocationPagination | null;
}

/**
 * Lokasyon kataloğunun bu istekteki görünümü — tek giriş noktası (GlobalPageBody'de bir kez).
 * basePath = canonical sorgusuz yol (/{locale}/{page_key}).
 */
export function resolveLocationCatalog(
  plan: LocationPagingPlan,
  searchParams: LocationSearchParams | null | undefined,
  basePath: string,
  allLabel: string,
  size: number = LOCATION_PAGE_SIZE,
): LocationCatalogView {
  const sp: LocationSearchParams = searchParams ?? {};
  const category = parseLocationCategory(sp.category, plan.categories);
  const list = category ? plan.categories.find((c) => c.slug === category)?.ids ?? [] : plan.allOrder;
  const totalPages = locationTotalPages(list.length, size);
  const page = parseLocationPage(sp.page, totalPages);
  const chips: LocationCatalogChip[] = [
    { key: null, label: allLabel, count: plan.allOrder.length, href: locationPageHref(basePath), active: category === null },
    ...plan.categories
      .filter((c) => c.ids.length > 0)
      .map((c) => ({ key: c.slug, label: c.name, count: c.ids.length, href: locationPageHref(basePath, { category: c.slug }), active: c.slug === category })),
  ];
  return {
    category,
    page,
    totalPages,
    total: list.length,
    ids: sliceLocationPage(list, page, size),
    chips,
    pagination: locationPagination(basePath, category, page, totalPages),
  };
}

/**
 * Sayfa ≥ 2 hafif devam sayfası mı? (hero: kırıntı + H1, giriş YOK; yalnız ürün alanı.)
 * Yalnız katalog görünümü varsa VE ürün alanı (commerce) render sırasındaysa — Admin ürün alanını
 * kapattıysa ?page anlamsızdır, sayfa normal 1. sayfa olarak basılır.
 */
export function isLocationContinuationPage(view: { page: number } | null | undefined, order: readonly string[]): boolean {
  return !!view && view.page > 1 && order.includes("commerce");
}

// ---- Yerelleştirilmiş navigasyon etiketleri (13 dil) ------------------------------------------
// V80 metinlerinde sayfalama anahtarı yok → küçük, sabit harita. `page` şablonu {n} taşır.
export const LOCATION_PAGING_LABELS: Record<GlobalLocale, { nav: string; prev: string; next: string; page: string }> = {
  de: { nav: "Seitennavigation", prev: "Zurück", next: "Weiter", page: "Seite {n}" },
  en: { nav: "Pagination", prev: "Previous", next: "Next", page: "Page {n}" },
  fr: { nav: "Pagination", prev: "Précédent", next: "Suivant", page: "Page {n}" },
  nl: { nav: "Paginering", prev: "Vorige", next: "Volgende", page: "Pagina {n}" },
  it: { nav: "Paginazione", prev: "Precedente", next: "Successiva", page: "Pagina {n}" },
  es: { nav: "Paginación", prev: "Anterior", next: "Siguiente", page: "Página {n}" },
  pt: { nav: "Paginação", prev: "Anterior", next: "Seguinte", page: "Página {n}" },
  az: { nav: "Səhifələr", prev: "Əvvəlki", next: "Növbəti", page: "Səhifə {n}" },
  ru: { nav: "Навигация по страницам", prev: "Назад", next: "Далее", page: "Страница {n}" },
  ar: { nav: "التنقل بين الصفحات", prev: "السابق", next: "التالي", page: "صفحة {n}" },
  zh: { nav: "分页", prev: "上一页", next: "下一页", page: "第 {n} 页" },
  ja: { nav: "ページ送り", prev: "前へ", next: "次へ", page: "{n} ページ" },
  ko: { nav: "페이지 탐색", prev: "이전", next: "다음", page: "{n} 페이지" },
};

/** "Page 3" / "第 3 页" — sayfa numarası linkinin erişilebilir adı. */
export function locationPageLabel(locale: GlobalLocale, n: number): string {
  return LOCATION_PAGING_LABELS[locale].page.replace("{n}", String(n));
}
