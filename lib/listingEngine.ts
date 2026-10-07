// ============================================================================
// lib/listingEngine.ts — GENEL ÜRÜN LİSTELEME + OTOMATİK SAYFALAMA MOTORU (saf modül).
// Sözleşme: scratchpad/listing/CONTRACT.md (v1) + CONTRACT_V2.md (ADMİN TEK MERKEZ, additive) — üç repo aynı kurallara uyar.
//
// Bu dosya HİÇBİR ŞEY ithal etmez (kenar güvenli; node --test ile test edilir).
// Ağ, Next ve DOM yok. Yüzeyler (lokasyon / özel gün / kategori / global / ana sayfa)
// yalnız buradaki kararları kullanır; sayfalama matematiği ikinci kez yazılmaz.
//
// KURALLAR (sözleşme v2 §1, §2, §3):
//   • Global ayar: { auto, pagination_enabled, per_page, max_items, max_pages, only_active, in_stock, sort }
//     TEKNİK tavanlar (ticari sayı dayatılmaz): per_page 1..200; max_items null|1..5000; max_pages null|1..500.
//     null = sınırsız (max_items → gerçek havuz; max_pages → ceil(total/per_page)). Ayar okunamazsa DEFAULTS.
//     pagination_enabled=false → tek sayfa = min(total, max_items ?? 5000); /sayfa/2 → 404.
//   • Sayfa bazlı override: seo_page body_blocks içindeki showcase bloğu
//     { type:"showcase", mode?, items?, source?, pagination?{enabled,per_page,max_items,max_pages}, in_stock?, sort?,
//       per_page?, max_items? (v1 eski alanlar — okunur; pagination.* varsa onlar kazanır) }.
//     mode yoksa: items doluysa "manual" (eski kayıt), items yoksa "auto".
//     auto + aktif items → items ÖNE ÇIKARILAN (pinned) ürünlerdir: sırayla önce gösterilir, kalan havuzdan
//     tamamlanır, tekrar yok (uç pinned_ids). auto'ya geçince items silinmez; manual'e dönünce sıra aynen.
//   • total_pages = min(ceil(min(total, max_items) / per_page), max_pages); 0 ürün → 0 sayfa.
//   • page > total_pages → 404; geçersiz page → 404; /sayfa/1 yalnız yol tabanlı seride 308 tabana.
//   • Kaynak türetme (blok source yoksa): city/district/neighborhood → location (il sayfası city-only);
//     kategori → category; special_day → occasion (sayfaya bağlı kategori varsa) yoksa ÜRÜNSÜZ (null).
// ============================================================================

export type ListingSort = "default" | "created_at_desc" | "price_asc" | "price_desc" | "name_asc" | "category_order";

export interface ListingSettings {
  auto: boolean;
  /** v2: false → tek sayfa (per_page yok sayılır; /sayfa/2 404). Eski kayıtta alan yok → true. */
  pagination_enabled: boolean;
  per_page: number;
  /** null = sınırsız (gerçek uygun havuz). Eski kayıt (sayısal 500) aynen çalışır. */
  max_items: number | null;
  /** null = sınırsız (ceil(total / per_page)). Eski kayıt (sayısal 10) aynen çalışır. */
  max_pages: number | null;
  only_active: boolean;
  in_stock: boolean;
  sort: ListingSort;
}

/** Sözleşme §1 varsayılanları — tablo / uç yoksa bunlar geçerlidir (fail-open). */
export const DEFAULT_LISTING_SETTINGS: Readonly<ListingSettings> = Object.freeze({
  auto: true,
  pagination_enabled: true,
  per_page: 50,
  max_items: 500,
  max_pages: 10,
  only_active: true,
  in_stock: true,
  sort: "default",
});

/** Sözleşme v2 TEKNİK tavanları (dahil). Ticari sayı değildir; Admin null yazarsa sınırsız. */
export const LISTING_LIMITS = Object.freeze({
  per_page: { min: 1, max: 200 },
  max_items: { min: 1, max: 5000 },
  max_pages: { min: 1, max: 500 },
});

/** paginate=false (tek sayfa) teknik satır tavanı (sözleşme v2 §3). */
export const UNPAGINATED_MAX_ITEMS = 5000;

export const LISTING_SORTS: readonly ListingSort[] = ["default", "created_at_desc", "price_asc", "price_desc", "name_asc", "category_order"];

export type ListingSourceKind = "catalog" | "category" | "occasion" | "location";

/** Listeleme ucunun kaynağı (sözleşme §3 `source`). `ids` yalnız manuel vitrin kartları içindir.
 *  location: city zorunlu, district opsiyonel (v2 — il sayfası il kapsamında listeler). */
export type ListingSource =
  | { kind: "catalog" }
  | { kind: "category"; category_id: number }
  | { kind: "occasion"; category_id: number }
  | { kind: "location"; city: string; district?: string; neighborhood?: string }
  | { kind: "ids"; ids: number[] };

/** Blok v2 sayfalama alt nesnesi — null alan → global ayar; "none" → açıkça sınırsız. */
export interface ShowcasePaginationConfig {
  enabled?: boolean | null;
  per_page?: number | string | null;
  max_items?: number | string | null;
  max_pages?: number | string | null;
}

/** Admin'in yazdığı showcase bloğu (API passthrough; her alan isteğe bağlı — eski kayıt yalnız items taşır). */
export interface ShowcaseBlockConfig {
  type?: string;
  mode?: "auto" | "manual" | string | null;
  /** v1 eski alanlar: okunur; pagination.* varsa onlar kazanır. */
  per_page?: number | string | null;
  max_items?: number | string | null;
  /** v2 */
  pagination?: ShowcasePaginationConfig | null;
  in_stock?: boolean | null;
  sort?: string | null;
  source?: { kind?: string; category_id?: number | string | null } | null;
  items?: { product_id?: unknown; active?: unknown; pinned?: unknown }[] | null;
  [key: string]: unknown;
}

/** Kaynak türetme için sayfa bağlamı. */
export interface ListingPageContext {
  pageType?: string | null;
  path?: string | null;
  /** Lokasyon sayfası: location bloğu ya da hiyerarşik yol parçaları (city zorunlu; district / neighborhood opsiyonel). */
  location?: { city: string; district?: string | null; neighborhood?: string | null } | null;
  /** Kategori sayfası ya da sayfaya bağlı kategori (özel gün). */
  categoryId?: number | null;
}

export interface ResolvedShowcase {
  mode: "auto" | "manual";
  perPage: number;
  /** null = sınırsız. */
  maxItems: number | null;
  /** null = sınırsız. */
  maxPages: number | null;
  /** false → tek sayfa (sözleşme v2 §1). */
  paginationEnabled: boolean;
  /** auto: listeleme ucunun kaynağı; manual: { kind:"ids", ids } (kartlar ids ucu / per-id ile). */
  source: ListingSource;
  /** manual: aktif ürün kimlikleri blok sırasıyla (maxItems ile kırpılmış); auto: []. */
  items: number[];
  /** auto: ÖNE ÇIKARILAN kimlikler (aktif items, sırayla) → uç pinned_ids; manual: []. */
  pinnedIds: number[];
  /** Stok süzgeci ve sıra: blok override > global ayar (uç isteğine geçer). */
  inStock: boolean;
  sort: ListingSort;
}

export type ListingPageState = "ok" | "not_found" | "redirect_first";

/** En çok bu kadar manuel / öne çıkarılan öğe (lib/showcaseBlocks.ts MAX_SHOWCASE_ITEMS ile aynı değer; ithal edilmez — saf modül). */
const MAX_MANUAL_ITEMS = 500;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function clampInt(raw: unknown, min: number, max: number): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < min) return min === 1 && i <= 0 ? null : min;
  return i > max ? max : i;
}

/** "Sınırsız" işareti mi? (null ya da "none" — Admin null yazar, uç "none" okur.) */
function isUnlimited(raw: unknown): boolean {
  return raw === null || (typeof raw === "string" && raw.trim().toLowerCase() === "none");
}

/**
 * Tavan alanı: null/"none" → null (sınırsız); sayı → teknik sınıra çekilir; eksik/bozuk → `fallback`.
 * Dönüş `undefined` = "alan verilmemiş" (çağıran bir üst katmana düşer).
 */
function capValue(raw: unknown, lim: { min: number; max: number }): number | null | undefined {
  if (raw === undefined) return undefined;
  if (isUnlimited(raw)) return null;
  const v = clampInt(raw, lim.min, lim.max);
  return v === null ? undefined : v;
}

/** Blok (sayfa) düzeyi tavan alanı: null / eksik → global (undefined); "none" → sınırsız (null); sayı → teknik sınır. */
function blockCap(raw: unknown, lim: { min: number; max: number }): number | null | undefined {
  if (raw === null || raw === undefined) return undefined;
  return capValue(raw, lim);
}

function positiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Ham ayar nesnesi → geçerli ayar (sınır dışı / eksik / bozuk alanlar varsayılana ya da sınıra çekilir; null = sınırsız). */
export function normalizeListingSettings(raw: unknown): ListingSettings {
  const d = DEFAULT_LISTING_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...d };
  const r = raw as Record<string, unknown>;
  const sort = typeof r.sort === "string" && (LISTING_SORTS as readonly string[]).includes(r.sort) ? (r.sort as ListingSort) : d.sort;
  return {
    auto: typeof r.auto === "boolean" ? r.auto : d.auto,
    pagination_enabled: typeof r.pagination_enabled === "boolean" ? r.pagination_enabled : d.pagination_enabled,
    per_page: clampInt(r.per_page, LISTING_LIMITS.per_page.min, LISTING_LIMITS.per_page.max) ?? d.per_page,
    max_items: capValue(r.max_items, LISTING_LIMITS.max_items) === undefined ? d.max_items : (capValue(r.max_items, LISTING_LIMITS.max_items) as number | null),
    max_pages: capValue(r.max_pages, LISTING_LIMITS.max_pages) === undefined ? d.max_pages : (capValue(r.max_pages, LISTING_LIMITS.max_pages) as number | null),
    // only_active public'te HER ZAMAN true (sözleşme §1).
    only_active: true,
    in_stock: typeof r.in_stock === "boolean" ? r.in_stock : d.in_stock,
    sort,
  };
}

/** Blok items → aktif, tekrarsız, pozitif tam sayı kimlikler (sıra korunur; en çok 500). getShowcaseItems ile aynı kural. */
export function activeShowcaseIds(items: unknown): number[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of items.slice(0, MAX_MANUAL_ITEMS)) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as { product_id?: unknown; active?: unknown };
    const id = positiveInt(it.product_id);
    if (id === null || seen.has(id)) continue;
    if (it.active === false) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Tavan değeri: null → sınırsız; geçersiz / eksik → `fallback` (fail-open). */
function capOf(raw: number | null | undefined, fallback: number | null): number | null {
  if (raw === null) return null;
  return Number.isFinite(raw as number) && (raw as number) >= 1 ? Math.floor(raw as number) : fallback;
}

/** Listeyi max_items tavanıyla kırpar (null → aynen). Global dilimleri de aynı tavandan geçer. */
export function capListing<T>(list: readonly T[], maxItems: number | null | undefined): T[] {
  const cap = capOf(maxItems, DEFAULT_LISTING_SETTINGS.max_items);
  return cap === null ? [...list] : list.slice(0, cap);
}

/** Toplam sayfa = min(ceil(min(total, maxItems) / perPage), maxPages); 0 ürün → 0. null tavan = sınırsız. */
export function listingTotalPages(total: number, perPage: number, maxItems: number | null = DEFAULT_LISTING_SETTINGS.max_items, maxPages: number | null = DEFAULT_LISTING_SETTINGS.max_pages): number {
  const t = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const size = Number.isFinite(perPage) && perPage >= 1 ? Math.floor(perPage) : DEFAULT_LISTING_SETTINGS.per_page;
  const cap = capOf(maxItems, DEFAULT_LISTING_SETTINGS.max_items);
  const pagesCap = capOf(maxPages, DEFAULT_LISTING_SETTINGS.max_pages);
  const effective = cap === null ? t : Math.min(t, cap);
  if (effective <= 0) return 0;
  const pages = Math.ceil(effective / size);
  return pagesCap === null ? pages : Math.min(pages, pagesCap);
}

/** Tek sayfa modunda (pagination_enabled=false) sayfa başına satır = min(maxItems ?? 5000, teknik per_page tavanı değil — uç tek sayfa ≤5000). */
export function unpaginatedLimit(maxItems: number | null | undefined): number {
  const cap = capOf(maxItems, DEFAULT_LISTING_SETTINGS.max_items);
  return cap === null ? UNPAGINATED_MAX_ITEMS : Math.min(cap, UNPAGINATED_MAX_ITEMS);
}

/** Çözülmüş vitrin için toplam sayfa: sayfalama kapalıysa tek sayfa (ürün varsa 1, yoksa 0). */
export function resolvedTotalPages(cfg: Pick<ResolvedShowcase, "perPage" | "maxItems" | "maxPages" | "paginationEnabled">, total: number): number {
  if (!cfg.paginationEnabled) return Number.isFinite(total) && total > 0 ? 1 : 0;
  return listingTotalPages(total, cfg.perPage, cfg.maxItems, cfg.maxPages);
}

/** Çözülmüş vitrin için sayfa başına satır (sayfalama kapalıysa tek sayfanın tavanı). */
export function resolvedPageSize(cfg: Pick<ResolvedShowcase, "perPage" | "maxItems" | "paginationEnabled">): number {
  return cfg.paginationEnabled ? cfg.perPage : unpaginatedLimit(cfg.maxItems);
}

/**
 * İstenen sayfanın durumu:
 *   • geçersiz sayfa (tam sayı değil, < 1) → "not_found"
 *   • sayfa 1, yol tabanlı /sayfa/1 ile istenmişse → "redirect_first" (308 tabana); aksi hâlde "ok" (taban 200 — 0 üründe de)
 *   • sayfa > toplam → "not_found"
 */
export function listingPageState(page: number, totalPages: number, viaPagedPath: boolean = false): ListingPageState {
  if (!Number.isInteger(page) || page < 1) return "not_found";
  if (page === 1) return viaPagedPath ? "redirect_first" : "ok";
  const t = Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 0;
  return page > t ? "not_found" : "ok";
}

/** 1 tabanlı sayfa → { offset, limit }. Geçersiz sayfa 1 sayılır. */
export function pageSlice(page: number, perPage: number): { offset: number; limit: number } {
  const size = Number.isFinite(perPage) && perPage >= 1 ? Math.floor(perPage) : DEFAULT_LISTING_SETTINGS.per_page;
  const p = Number.isInteger(page) && page >= 1 ? page : 1;
  return { offset: (p - 1) * size, limit: size };
}

/** Bu sayfada kaç öğe olur (son sayfa eksik adet olabilir; tavan dışı sayfa 0). null maxItems = sınırsız. */
export function pageItemCount(page: number, total: number, perPage: number, maxItems: number | null = DEFAULT_LISTING_SETTINGS.max_items): number {
  const { offset, limit } = pageSlice(page, perPage);
  const cap = capOf(maxItems, DEFAULT_LISTING_SETTINGS.max_items);
  const t = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const effective = cap === null ? t : Math.min(t, cap);
  return Math.max(0, Math.min(limit, effective - offset));
}

function validLocation(loc: ListingPageContext["location"]): { city: string; district?: string; neighborhood?: string } | null {
  if (!loc) return null;
  const city = typeof loc.city === "string" ? loc.city.trim() : "";
  if (!SLUG_RE.test(city)) return null;
  const district = typeof loc.district === "string" ? loc.district.trim() : "";
  if (district && !SLUG_RE.test(district)) return null;
  const neighborhood = typeof loc.neighborhood === "string" ? loc.neighborhood.trim() : "";
  if (neighborhood && !SLUG_RE.test(neighborhood)) return null;
  // Mahalle yalnız ilçeyle anlamlı (v2: city-only il sayfası; ilçesiz mahalle yok).
  if (!district) return { city };
  return neighborhood ? { city, district, neighborhood } : { city, district };
}

/** Lokasyon tipli sayfa mı? (city / district / neighborhood / category_location / delivery_info; "_" ile türevleri). */
export function isLocationPageType(pageType: string | null | undefined): boolean {
  const t = (pageType ?? "").toLowerCase();
  return ["city", "district", "neighborhood", "category_location", "delivery_info"].some((p) => t === p || t.startsWith(`${p}_`));
}

/**
 * Kaynak türetme (sözleşme §4): blok source yoksa sayfadan.
 *   • special_day → occasion(category_id) (bağlı kategori varsa) yoksa null (ÜRÜNSÜZ — katalog gösterilmez)
 *   • category → category(category_id) (kategori yoksa null)
 *   • lokasyon tipli sayfa + city[/district[/neighborhood]] → location (v2: il sayfası city-only kaynak alır)
 */
export function deriveSource(ctx: ListingPageContext | null | undefined): ListingSource | null {
  if (!ctx) return null;
  const t = (ctx.pageType ?? "").toLowerCase();
  const categoryId = positiveInt(ctx.categoryId);
  if (t === "special_day") return categoryId ? { kind: "occasion", category_id: categoryId } : null;
  if (t === "category") return categoryId ? { kind: "category", category_id: categoryId } : null;
  const loc = validLocation(ctx.location);
  if (loc && (isLocationPageType(t) || t === "")) return { kind: "location", ...loc };
  return null;
}

/** Bloktaki source nesnesi → geçerli kaynak (category/occasion için category_id zorunlu); geçersizse null. */
export function normalizeBlockSource(raw: ShowcaseBlockConfig["source"], ctx?: ListingPageContext | null): ListingSource | null {
  if (!raw || typeof raw !== "object") return null;
  const kind = typeof raw.kind === "string" ? raw.kind : "";
  if (kind === "catalog") return { kind: "catalog" };
  if (kind === "category" || kind === "occasion") {
    const id = positiveInt(raw.category_id) ?? positiveInt(ctx?.categoryId);
    return id ? { kind, category_id: id } : null;
  }
  if (kind === "location") {
    const loc = validLocation(ctx?.location);
    return loc ? { kind: "location", ...loc } : null;
  }
  return null;
}

/** Yalnız global ayardan (blok yok) otomatik vitrin — settings.auto'ya BAKMAZ (çağıran karar verir). */
export function defaultShowcaseConfig(settings: ListingSettings | null | undefined, source: ListingSource): ResolvedShowcase {
  const s = normalizeListingSettings(settings);
  return {
    mode: "auto", perPage: s.per_page, maxItems: s.max_items, maxPages: s.max_pages, paginationEnabled: s.pagination_enabled,
    source, items: [], pinnedIds: [], inStock: s.in_stock, sort: s.sort,
  };
}

/**
 * Showcase bloğu + global ayar + sayfa bağlamı → etkin vitrin yapılandırması; vitrin / liste YOKSA null
 * (çağıran bugünkü yoluna düşer).
 *   • blok yok: settings.auto ve kaynak türetilebiliyorsa auto; aksi hâlde null.
 *   • blok var, mode yok: items doluysa manual (eski kayıt), boşsa auto.
 *   • manual: aktif öğe yoksa null; items maxItems ile kırpılır; source = ids.
 *   • auto: kaynak blok source > sayfadan türetme; kaynak yoksa null; aktif items → pinnedIds (sırayla; veri kaybı yok).
 *   • sayfalama: pagination.* > eski per_page/max_items > global; enabled/max_pages yalnız pagination.* ya da global.
 *   • in_stock / sort: blok override > global.
 */
export function resolveShowcaseConfig(
  block: ShowcaseBlockConfig | null | undefined,
  settings: ListingSettings | null | undefined,
  ctx: ListingPageContext | null | undefined,
): ResolvedShowcase | null {
  const s = normalizeListingSettings(settings);
  if (!block || typeof block !== "object") {
    if (!s.auto) return null;
    const source = deriveSource(ctx);
    return source ? defaultShowcaseConfig(s, source) : null;
  }
  const items = activeShowcaseIds(block.items);
  const mode: "auto" | "manual" = block.mode === "auto" ? "auto" : block.mode === "manual" ? "manual" : items.length > 0 ? "manual" : "auto";
  const pg = block.pagination && typeof block.pagination === "object" ? block.pagination : null;
  const perPage = clampInt(pg?.per_page, LISTING_LIMITS.per_page.min, LISTING_LIMITS.per_page.max)
    ?? clampInt(block.per_page, LISTING_LIMITS.per_page.min, LISTING_LIMITS.per_page.max)
    ?? s.per_page;
  // Blok düzeyinde null = "global" (sözleşme v2 §2); yalnız "none" açıkça sınırsız. Global düzeyde null = sınırsız.
  const pgMaxItems = blockCap(pg?.max_items, LISTING_LIMITS.max_items);
  const oldMaxItems = blockCap(block.max_items, LISTING_LIMITS.max_items);
  const maxItems = pgMaxItems !== undefined ? pgMaxItems : oldMaxItems !== undefined ? oldMaxItems : s.max_items;
  const pgMaxPages = blockCap(pg?.max_pages, LISTING_LIMITS.max_pages);
  const maxPages = pgMaxPages !== undefined ? pgMaxPages : s.max_pages;
  const paginationEnabled = typeof pg?.enabled === "boolean" ? pg.enabled : s.pagination_enabled;
  const inStock = typeof block.in_stock === "boolean" ? block.in_stock : s.in_stock;
  const sort = typeof block.sort === "string" && (LISTING_SORTS as readonly string[]).includes(block.sort) ? (block.sort as ListingSort) : s.sort;
  if (mode === "manual") {
    if (items.length === 0) return null;
    const ids = maxItems === null ? items : items.slice(0, maxItems);
    return { mode, perPage, maxItems, maxPages, paginationEnabled, source: { kind: "ids", ids }, items: ids, pinnedIds: [], inStock, sort };
  }
  const source = normalizeBlockSource(block.source, ctx) ?? deriveSource(ctx);
  return source ? { mode, perPage, maxItems, maxPages, paginationEnabled, source, items: [], pinnedIds: items, inStock, sort } : null;
}

/** Kategori yüzeyi sıralaması → listeleme ucu sıralaması ("category_order" = ucun varsayılanı). */
export function listingSortOf(sort: string | null | undefined): ListingSort {
  if (!sort || sort === "category_order") return "default";
  return (LISTING_SORTS as readonly string[]).includes(sort) ? (sort as ListingSort) : "default";
}

export interface ListingQuery {
  source: ListingSource;
  page?: number;
  per_page?: number;
  /** null → "none" (sınırsız); eksik → uç varsayılanı. */
  max_items?: number | null;
  max_pages?: number | null;
  in_stock?: boolean;
  sort?: ListingSort;
  /** v2: ÖNE ÇIKARILAN kimlikler (sıralı, ≤500) — sonuçta önce gelir, havuzdan dışlanır. */
  pinned_ids?: number[];
  /** v2: false → tek sayfa (≤ max_items ?? 5000). */
  paginate?: boolean;
  /** v2: dil — yalnız o dilde canlı çeviri olan ürünler; satıra locale_name / locale_slug eklenir. */
  locale?: string;
}

/** Çözülmüş vitrin + sayfa → uç sorgusu (tek yerde; yüzeyler ikinci kez kurmaz). */
export function listingQueryFor(cfg: ResolvedShowcase, page: number, extra: { locale?: string } = {}): ListingQuery {
  return {
    source: cfg.source,
    page: cfg.paginationEnabled ? page : 1,
    per_page: resolvedPageSize(cfg),
    max_items: cfg.maxItems,
    max_pages: cfg.maxPages,
    paginate: cfg.paginationEnabled,
    in_stock: cfg.inStock,
    sort: cfg.sort,
    pinned_ids: cfg.pinnedIds,
    ...(extra.locale ? { locale: extra.locale } : {}),
  };
}

/** GET /api/public/seo/listing sorgu çiftleri (sözleşme §3; sabit sıra → önbellek anahtarı kararlı). */
export function listingQueryParams(q: ListingQuery): [string, string][] {
  const out: [string, string][] = [["source", q.source.kind]];
  switch (q.source.kind) {
    case "category":
    case "occasion":
      out.push(["category_id", String(q.source.category_id)]);
      break;
    case "location":
      out.push(["city", q.source.city]);
      if (q.source.district) out.push(["district", q.source.district]);
      if (q.source.district && q.source.neighborhood) out.push(["neighborhood", q.source.neighborhood]);
      break;
    case "ids":
      out.push(["ids", q.source.ids.slice(0, MAX_MANUAL_ITEMS).join(",")]);
      if (q.locale) out.push(["locale", q.locale]);
      return out; // ids: sayfalama yok (sözleşme §3)
    default:
      break;
  }
  const pinned = Array.isArray(q.pinned_ids) ? [...new Set(q.pinned_ids.filter((id) => Number.isInteger(id) && id > 0))].slice(0, MAX_MANUAL_ITEMS) : [];
  if (pinned.length > 0) out.push(["pinned_ids", pinned.join(",")]);
  if (q.page && q.page > 1) out.push(["page", String(Math.trunc(q.page))]);
  const perPage = clampInt(q.per_page, LISTING_LIMITS.per_page.min, LISTING_LIMITS.per_page.max);
  if (perPage !== null) out.push(["per_page", String(perPage)]);
  if (q.max_items === null) out.push(["max_items", "none"]);
  else {
    const maxItems = clampInt(q.max_items, LISTING_LIMITS.max_items.min, LISTING_LIMITS.max_items.max);
    if (maxItems !== null) out.push(["max_items", String(maxItems)]);
  }
  if (q.max_pages === null) out.push(["max_pages", "none"]);
  else {
    const maxPages = clampInt(q.max_pages, LISTING_LIMITS.max_pages.min, LISTING_LIMITS.max_pages.max);
    if (maxPages !== null) out.push(["max_pages", String(maxPages)]);
  }
  if (q.paginate === false) out.push(["paginate", "false"]);
  if (typeof q.in_stock === "boolean") out.push(["in_stock", q.in_stock ? "true" : "false"]);
  // category_order = ucun kategori varsayılanı (categoryOrderSql) → "default" gönderilir (eski uç tanımasa da aynı sıra).
  const sort = q.sort === "category_order" ? "default" : q.sort;
  if (sort && (LISTING_SORTS as readonly string[]).includes(sort)) out.push(["sort", sort]);
  if (q.locale) out.push(["locale", q.locale]);
  return out;
}

/** Uç yanıtındaki pagination → motorun kendi tavanlarıyla doğrulanmış sayfa sayısı (uç tavanı uygulamamışsa bile). null tavan = sınırsız. */
export function cappedTotalPages(
  pagination: { total?: unknown; total_pages?: unknown } | null | undefined,
  perPage: number,
  maxItems: number | null = DEFAULT_LISTING_SETTINGS.max_items,
  maxPages: number | null = DEFAULT_LISTING_SETTINGS.max_pages,
): number {
  const total = Number(pagination?.total);
  const fromTotal = listingTotalPages(Number.isFinite(total) ? total : 0, perPage, maxItems, maxPages);
  const declared = Math.trunc(Number(pagination?.total_pages));
  if (!(declared >= 0)) return fromTotal;
  const pagesCap = capOf(maxPages, DEFAULT_LISTING_SETTINGS.max_pages);
  // Uç total'ı söylediyse motor matematiği; söylemediyse (total yok) ucun sayfa sayısı yalnız max_pages ile kırpılır.
  return Number.isFinite(total) ? fromTotal : pagesCap === null ? declared : Math.min(declared, pagesCap);
}

/** Çözülmüş vitrin + uç zarfı → toplam sayfa (sayfalama kapalıysa tek sayfa). */
export function resolvedTotalPagesFrom(cfg: Pick<ResolvedShowcase, "perPage" | "maxItems" | "maxPages" | "paginationEnabled">, pagination: { total?: unknown; total_pages?: unknown } | null | undefined): number {
  if (!cfg.paginationEnabled) {
    const total = Number(pagination?.total);
    return Number.isFinite(total) && total > 0 ? 1 : 0;
  }
  return cappedTotalPages(pagination, cfg.perPage, cfg.maxItems, cfg.maxPages);
}

/** Ana sayfa DTO ürünleri: `pinned` işaretliler önce; iki grupta da DTO (manual_order) sırası korunur (kararlı). */
export function pinnedFirst<T extends { pinned?: boolean | null }>(products: readonly T[]): T[] {
  return [...products.filter((p) => p.pinned === true), ...products.filter((p) => p.pinned !== true)];
}

/** Öne çıkarılanlar önce (sıra korunur), sonra havuz; tekrar yok. Uç pinned_ids'i uygulamadıysa (eski uç) burada aynı sonuç. */
export function mergePinnedFirst<T extends { id: number }>(pinnedIds: readonly number[], rows: readonly T[], limit?: number): T[] {
  const byId = new Map(rows.map((r) => [Number(r.id), r] as const));
  const out: T[] = [];
  const seen = new Set<number>();
  for (const id of pinnedIds) {
    const r = byId.get(id);
    if (r && !seen.has(id)) { seen.add(id); out.push(r); }
  }
  for (const r of rows) {
    const id = Number(r.id);
    if (!seen.has(id)) { seen.add(id); out.push(r); }
  }
  return typeof limit === "number" && limit >= 0 ? out.slice(0, limit) : out;
}
