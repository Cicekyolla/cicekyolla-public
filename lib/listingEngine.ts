// ============================================================================
// lib/listingEngine.ts — GENEL ÜRÜN LİSTELEME + OTOMATİK SAYFALAMA MOTORU (saf modül).
// Sözleşme: scratchpad/listing/CONTRACT.md (v1) — üç repo aynı kurallara uyar.
//
// Bu dosya HİÇBİR ŞEY ithal etmez (kenar güvenli; node --test ile test edilir).
// Ağ, Next ve DOM yok. Yüzeyler (lokasyon / özel gün / kategori / global / ana sayfa)
// yalnız buradaki kararları kullanır; sayfalama matematiği ikinci kez yazılmaz.
//
// KURALLAR (sözleşme §1, §2, §4):
//   • Global ayar: { auto, per_page, max_items, max_pages, only_active, in_stock, sort }
//     Sınırlar: per_page 1..100, max_items 1..500, max_pages 1..50. Ayar okunamazsa DEFAULTS.
//   • Sayfa bazlı override: seo_page body_blocks içindeki showcase bloğu
//     { type:"showcase", mode?, per_page?, max_items?, source?, items? }.
//     mode yoksa: items doluysa "manual" (eski kayıt), items yoksa "auto".
//   • total_pages = min(ceil(min(total, max_items) / per_page), max_pages); 0 ürün → 0 sayfa.
//   • page > total_pages → 404; geçersiz page → 404; /sayfa/1 yalnız yol tabanlı seride 308 tabana.
//   • Kaynak türetme (blok source yoksa): city/district/neighborhood → location; kategori → category;
//     special_day → occasion (sayfaya bağlı kategori varsa) yoksa catalog.
// ============================================================================

export type ListingSort = "default" | "created_at_desc" | "price_asc" | "price_desc" | "name_asc";

export interface ListingSettings {
  auto: boolean;
  per_page: number;
  max_items: number;
  max_pages: number;
  only_active: boolean;
  in_stock: boolean;
  sort: ListingSort;
}

/** Sözleşme §1 varsayılanları — tablo / uç yoksa bunlar geçerlidir (fail-open). */
export const DEFAULT_LISTING_SETTINGS: Readonly<ListingSettings> = Object.freeze({
  auto: true,
  per_page: 50,
  max_items: 500,
  max_pages: 10,
  only_active: true,
  in_stock: true,
  sort: "default",
});

/** Sözleşme §1 sınırları (dahil). */
export const LISTING_LIMITS = Object.freeze({
  per_page: { min: 1, max: 100 },
  max_items: { min: 1, max: 500 },
  max_pages: { min: 1, max: 50 },
});

export const LISTING_SORTS: readonly ListingSort[] = ["default", "created_at_desc", "price_asc", "price_desc", "name_asc"];

export type ListingSourceKind = "catalog" | "category" | "occasion" | "location";

/** Listeleme ucunun kaynağı (sözleşme §3 `source`). `ids` yalnız manuel vitrin kartları içindir. */
export type ListingSource =
  | { kind: "catalog" }
  | { kind: "category"; category_id: number }
  | { kind: "occasion"; category_id: number }
  | { kind: "location"; city: string; district: string; neighborhood?: string }
  | { kind: "ids"; ids: number[] };

/** Admin'in yazdığı showcase bloğu (API passthrough; her alan isteğe bağlı — eski kayıt yalnız items taşır). */
export interface ShowcaseBlockConfig {
  type?: string;
  mode?: "auto" | "manual" | string | null;
  per_page?: number | string | null;
  max_items?: number | string | null;
  source?: { kind?: string; category_id?: number | string | null } | null;
  items?: { product_id?: unknown; active?: unknown }[] | null;
  [key: string]: unknown;
}

/** Kaynak türetme için sayfa bağlamı. */
export interface ListingPageContext {
  pageType?: string | null;
  path?: string | null;
  /** Lokasyon sayfası: location bloğu ya da hiyerarşik yol parçaları (city+district zorunlu). */
  location?: { city: string; district?: string | null; neighborhood?: string | null } | null;
  /** Kategori sayfası ya da sayfaya bağlı kategori (özel gün). */
  categoryId?: number | null;
}

export interface ResolvedShowcase {
  mode: "auto" | "manual";
  perPage: number;
  maxItems: number;
  maxPages: number;
  /** auto: listeleme ucunun kaynağı; manual: { kind:"ids", ids } (kartlar ids ucu / per-id ile). */
  source: ListingSource;
  /** manual: aktif ürün kimlikleri blok sırasıyla (maxItems ile kırpılmış); auto: []. */
  items: number[];
  /** Global ayardan: stok süzgeci ve varsayılan sıra (uç isteğine geçer). */
  inStock: boolean;
  sort: ListingSort;
}

export type ListingPageState = "ok" | "not_found" | "redirect_first";

/** En çok bu kadar manuel öğe (lib/showcaseBlocks.ts MAX_SHOWCASE_ITEMS ile aynı değer; ithal edilmez — saf modül). */
const MAX_MANUAL_ITEMS = 500;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function clampInt(raw: unknown, min: number, max: number): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < min) return min === 1 && i <= 0 ? null : min;
  return i > max ? max : i;
}

function positiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Ham ayar nesnesi → geçerli ayar (sınır dışı / eksik / bozuk alanlar varsayılana ya da sınıra çekilir). */
export function normalizeListingSettings(raw: unknown): ListingSettings {
  const d = DEFAULT_LISTING_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...d };
  const r = raw as Record<string, unknown>;
  const sort = typeof r.sort === "string" && (LISTING_SORTS as readonly string[]).includes(r.sort) ? (r.sort as ListingSort) : d.sort;
  return {
    auto: typeof r.auto === "boolean" ? r.auto : d.auto,
    per_page: clampInt(r.per_page, LISTING_LIMITS.per_page.min, LISTING_LIMITS.per_page.max) ?? d.per_page,
    max_items: clampInt(r.max_items, LISTING_LIMITS.max_items.min, LISTING_LIMITS.max_items.max) ?? d.max_items,
    max_pages: clampInt(r.max_pages, LISTING_LIMITS.max_pages.min, LISTING_LIMITS.max_pages.max) ?? d.max_pages,
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

/** Toplam sayfa = min(ceil(min(total, maxItems) / perPage), maxPages); 0 ürün → 0. */
export function listingTotalPages(total: number, perPage: number, maxItems: number, maxPages: number): number {
  const t = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const size = Number.isFinite(perPage) && perPage >= 1 ? Math.floor(perPage) : DEFAULT_LISTING_SETTINGS.per_page;
  const cap = Number.isFinite(maxItems) && maxItems >= 1 ? Math.floor(maxItems) : DEFAULT_LISTING_SETTINGS.max_items;
  const pagesCap = Number.isFinite(maxPages) && maxPages >= 1 ? Math.floor(maxPages) : DEFAULT_LISTING_SETTINGS.max_pages;
  const effective = Math.min(t, cap);
  if (effective <= 0) return 0;
  return Math.min(Math.ceil(effective / size), pagesCap);
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

/** Bu sayfada kaç öğe olur (son sayfa eksik adet olabilir; tavan dışı sayfa 0). */
export function pageItemCount(page: number, total: number, perPage: number, maxItems: number): number {
  const { offset, limit } = pageSlice(page, perPage);
  const cap = Number.isFinite(maxItems) && maxItems >= 1 ? Math.floor(maxItems) : DEFAULT_LISTING_SETTINGS.max_items;
  const effective = Math.min(Number.isFinite(total) && total > 0 ? Math.floor(total) : 0, cap);
  return Math.max(0, Math.min(limit, effective - offset));
}

function validLocation(loc: ListingPageContext["location"]): { city: string; district: string; neighborhood?: string } | null {
  if (!loc) return null;
  const city = typeof loc.city === "string" ? loc.city.trim() : "";
  const district = typeof loc.district === "string" ? loc.district.trim() : "";
  if (!SLUG_RE.test(city) || !SLUG_RE.test(district)) return null;
  const neighborhood = typeof loc.neighborhood === "string" ? loc.neighborhood.trim() : "";
  if (neighborhood && !SLUG_RE.test(neighborhood)) return null;
  return neighborhood ? { city, district, neighborhood } : { city, district };
}

/** Lokasyon tipli sayfa mı? (city / district / neighborhood / category_location / delivery_info; "_" ile türevleri). */
export function isLocationPageType(pageType: string | null | undefined): boolean {
  const t = (pageType ?? "").toLowerCase();
  return ["city", "district", "neighborhood", "category_location", "delivery_info"].some((p) => t === p || t.startsWith(`${p}_`));
}

/**
 * Kaynak türetme (sözleşme §4): blok source yoksa sayfadan.
 *   • special_day → occasion(category_id) (bağlı kategori varsa) yoksa catalog
 *   • category → category(category_id) (kategori yoksa null)
 *   • lokasyon tipli sayfa + city/district → location (il sayfası — ilçe yok — null: bugünkü yol)
 */
export function deriveSource(ctx: ListingPageContext | null | undefined): ListingSource | null {
  if (!ctx) return null;
  const t = (ctx.pageType ?? "").toLowerCase();
  const categoryId = positiveInt(ctx.categoryId);
  if (t === "special_day") return categoryId ? { kind: "occasion", category_id: categoryId } : { kind: "catalog" };
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

/**
 * Showcase bloğu + global ayar + sayfa bağlamı → etkin vitrin yapılandırması; vitrin / liste YOKSA null
 * (çağıran bugünkü yoluna düşer).
 *   • blok yok: settings.auto ve kaynak türetilebiliyorsa auto; aksi hâlde null.
 *   • blok var, mode yok: items doluysa manual (eski kayıt), boşsa auto.
 *   • manual: aktif öğe yoksa null; per_page/max_items blok > global; items maxItems ile kırpılır.
 *   • auto: kaynak blok source > sayfadan türetme; kaynak yoksa null.
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
    return source ? { mode: "auto", perPage: s.per_page, maxItems: s.max_items, maxPages: s.max_pages, source, items: [], inStock: s.in_stock, sort: s.sort } : null;
  }
  const items = activeShowcaseIds(block.items);
  const mode: "auto" | "manual" = block.mode === "auto" ? "auto" : block.mode === "manual" ? "manual" : items.length > 0 ? "manual" : "auto";
  const perPage = clampInt(block.per_page, LISTING_LIMITS.per_page.min, LISTING_LIMITS.per_page.max) ?? s.per_page;
  const maxItems = clampInt(block.max_items, LISTING_LIMITS.max_items.min, LISTING_LIMITS.max_items.max) ?? s.max_items;
  const maxPages = s.max_pages;
  if (mode === "manual") {
    if (items.length === 0) return null;
    const ids = items.slice(0, maxItems);
    return { mode, perPage, maxItems, maxPages, source: { kind: "ids", ids }, items: ids, inStock: s.in_stock, sort: s.sort };
  }
  const source = normalizeBlockSource(block.source, ctx) ?? deriveSource(ctx);
  return source ? { mode, perPage, maxItems, maxPages, source, items: [], inStock: s.in_stock, sort: s.sort } : null;
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
  max_items?: number;
  in_stock?: boolean;
  sort?: ListingSort;
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
      out.push(["city", q.source.city], ["district", q.source.district]);
      if (q.source.neighborhood) out.push(["neighborhood", q.source.neighborhood]);
      break;
    case "ids":
      out.push(["ids", q.source.ids.slice(0, MAX_MANUAL_ITEMS).join(",")]);
      return out; // ids: sayfalama yok (sözleşme §3)
    default:
      break;
  }
  if (q.page && q.page > 1) out.push(["page", String(Math.trunc(q.page))]);
  const perPage = clampInt(q.per_page, LISTING_LIMITS.per_page.min, LISTING_LIMITS.per_page.max);
  if (perPage !== null) out.push(["per_page", String(perPage)]);
  const maxItems = clampInt(q.max_items, LISTING_LIMITS.max_items.min, LISTING_LIMITS.max_items.max);
  if (maxItems !== null) out.push(["max_items", String(maxItems)]);
  if (typeof q.in_stock === "boolean") out.push(["in_stock", q.in_stock ? "true" : "false"]);
  if (q.sort && (LISTING_SORTS as readonly string[]).includes(q.sort)) out.push(["sort", q.sort]);
  return out;
}

/** Uç yanıtındaki pagination → motorun kendi tavanlarıyla doğrulanmış sayfa sayısı (uç tavanı uygulamamışsa bile). */
export function cappedTotalPages(
  pagination: { total?: unknown; total_pages?: unknown } | null | undefined,
  perPage: number,
  maxItems: number,
  maxPages: number,
): number {
  const total = Number(pagination?.total);
  const fromTotal = listingTotalPages(Number.isFinite(total) ? total : 0, perPage, maxItems, maxPages);
  const declared = Math.trunc(Number(pagination?.total_pages));
  if (!(declared >= 0)) return fromTotal;
  const pagesCap = Number.isFinite(maxPages) && maxPages >= 1 ? Math.floor(maxPages) : DEFAULT_LISTING_SETTINGS.max_pages;
  // Uç total'ı söylediyse motor matematiği; söylemediyse (total yok) ucun sayfa sayısı yalnız max_pages ile kırpılır.
  return Number.isFinite(total) ? fromTotal : Math.min(declared, pagesCap);
}
