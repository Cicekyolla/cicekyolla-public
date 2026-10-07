// Genel listeleme + otomatik sayfalama motoru — birim + kaynak nöbeti (node --test).
// v2 (ADMİN TEK MERKEZ — scratchpad/listing/CONTRACT_V2.md): null tavanlar, pagination_enabled, pinned, city-only, locale.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_LISTING_SETTINGS,
  LISTING_LIMITS,
  UNPAGINATED_MAX_ITEMS,
  activeShowcaseIds,
  capListing,
  cappedTotalPages,
  defaultShowcaseConfig,
  deriveSource,
  listingPageState,
  listingQueryFor,
  listingQueryParams,
  listingSortOf,
  listingTotalPages,
  mergePinnedFirst,
  normalizeListingSettings,
  pageItemCount,
  pageSlice,
  pinnedFirst,
  resolveShowcaseConfig,
  resolvedPageSize,
  resolvedTotalPages,
  resolvedTotalPagesFrom,
  unpaginatedLimit,
  type ListingSettings,
} from "./listingEngine.ts";

const oku = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const S: ListingSettings = { ...DEFAULT_LISTING_SETTINGS };

test("saf modül: listingEngine hiçbir şey ithal etmez (kenar güvenli)", () => {
  const src = oku("./listingEngine.ts");
  assert.doesNotMatch(src, /^\s*import\s/m);
  assert.doesNotMatch(src, /\brequire\(/);
});

test("DEFAULTS sözleşme v2 §1 ile birebir; TEKNİK tavanlar 1..200 / 1..5000 / 1..500; tek sayfa 5000", () => {
  assert.deepEqual({ ...DEFAULT_LISTING_SETTINGS }, { auto: true, pagination_enabled: true, per_page: 50, max_items: 500, max_pages: 10, only_active: true, in_stock: true, sort: "default" });
  assert.deepEqual(LISTING_LIMITS.per_page, { min: 1, max: 200 });
  assert.deepEqual(LISTING_LIMITS.max_items, { min: 1, max: 5000 });
  assert.deepEqual(LISTING_LIMITS.max_pages, { min: 1, max: 500 });
  assert.equal(UNPAGINATED_MAX_ITEMS, 5000);
});

test("TEST MATRİSİ: total → total_pages (per_page 50, max_items 500, max_pages 10) — v1 aynen", () => {
  const matris: [number, number][] = [
    [0, 0], [1, 1], [49, 1], [50, 1], [51, 2], [99, 2], [100, 2], [237, 5], [499, 10], [500, 10], [501, 10], [1000, 10],
  ];
  for (const [total, beklenen] of matris) {
    assert.equal(listingTotalPages(total, 50, 500, 10), beklenen, `total ${total}`);
  }
  assert.equal(listingTotalPages(1000, 50, 500, 50), 10);
  assert.equal(listingTotalPages(1000, 50, 500, 5), 5);
  assert.equal(listingTotalPages(1000, 100, 500, 50), 5);
  // Geçersiz girdiler fail-open varsayılanlara
  assert.equal(listingTotalPages(Number.NaN, 50, 500, 10), 0);
  assert.equal(listingTotalPages(120, 0, 500, 10), 3, "per_page 0 → varsayılan 50");
  assert.equal(listingTotalPages(1000, 50, undefined, undefined), 10, "eksik tavan → varsayılan 500/10");
});

test("v2 MATRİSİ: per_page 30/50/75/100 × max_pages 10/30/50/null × max_items null (1000 ürün)", () => {
  const total = 1000;
  const beklenen: Record<number, Record<string, number>> = {
    30: { "10": 10, "30": 30, "50": 34, null: 34 },
    50: { "10": 10, "30": 20, "50": 20, null: 20 },
    75: { "10": 10, "30": 14, "50": 14, null: 14 },
    100: { "10": 10, "30": 10, "50": 10, null: 10 },
  };
  for (const per of [30, 50, 75, 100]) {
    for (const mp of [10, 30, 50, null]) {
      assert.equal(listingTotalPages(total, per, null, mp), beklenen[per][String(mp)], `per_page ${per} max_pages ${mp}`);
    }
  }
  // max_items sayısal + max_pages null: 1000 ürün, 500 tavan, 30'luk → 17
  assert.equal(listingTotalPages(1000, 30, 500, null), 17);
  // max_items null + 5000 ürün + 200'lük → 25 (max_pages null)
  assert.equal(listingTotalPages(5000, 200, null, null), 25);
  // pageItemCount null tavan: 1000 ürün, sayfa 20 (50'lik) = 50; sayfa 21 = 0
  assert.equal(pageItemCount(20, 1000, 50, null), 50);
  assert.equal(pageItemCount(21, 1000, 50, null), 0);
  // capListing: null → aynen; 3 → ilk 3; eksik → varsayılan 500
  assert.equal(capListing(Array.from({ length: 600 }), null).length, 600);
  assert.equal(capListing([1, 2, 3, 4, 5], 3).length, 3);
  assert.equal(capListing(Array.from({ length: 600 }), undefined).length, 500);
});

test("pagination_enabled=false: tek sayfa = min(total, max_items ?? 5000); /sayfa/2 → 404; sorgu paginate=false", () => {
  const cfg = { perPage: 50, maxItems: 500, maxPages: 10, paginationEnabled: false };
  assert.equal(resolvedTotalPages(cfg, 237), 1);
  assert.equal(resolvedTotalPages(cfg, 0), 0);
  assert.equal(resolvedPageSize(cfg), 500, "tek sayfa tavanı max_items");
  assert.equal(resolvedPageSize({ ...cfg, maxItems: null }), 5000, "max_items null → teknik 5000");
  assert.equal(unpaginatedLimit(null), 5000);
  assert.equal(unpaginatedLimit(120), 120);
  assert.equal(listingPageState(2, resolvedTotalPages(cfg, 237), true), "not_found", "/sayfa/2 → 404");
  assert.equal(listingPageState(1, resolvedTotalPages(cfg, 237), true), "redirect_first");
  assert.equal(resolvedTotalPagesFrom(cfg, { total: 900, total_pages: 18 }), 1);
  assert.equal(resolvedTotalPagesFrom(cfg, { total: 0, total_pages: 0 }), 0);
  assert.equal(resolvedTotalPagesFrom({ ...cfg, paginationEnabled: true }, { total: 900, total_pages: 18 }), 10, "açıkken motor tavanı");
  const q = listingQueryFor({ ...defaultShowcaseConfig({ ...S, pagination_enabled: false }, { kind: "catalog" }) }, 3);
  assert.equal(q.page, 1, "tek sayfada sayfa 1");
  assert.equal(q.per_page, 500);
  assert.equal(q.paginate, false);
  assert.deepEqual(listingQueryParams(q), [["source", "catalog"], ["per_page", "200"], ["max_items", "500"], ["max_pages", "10"], ["paginate", "false"], ["in_stock", "true"], ["sort", "default"]], "per_page teknik 200'e çekilir; paginate=false");
});

test("237 ürün: sayfa 5 = 37 öğe, sayfa 6 not_found, sayfa 1 redirect YALNIZ /sayfa/1 yolunda, geçersiz sayfa not_found", () => {
  const totalPages = listingTotalPages(237, 50, 500, 10);
  assert.equal(totalPages, 5);
  assert.deepEqual(pageSlice(5, 50), { offset: 200, limit: 50 });
  assert.equal(pageItemCount(5, 237, 50, 500), 37);
  assert.equal(pageItemCount(6, 237, 50, 500), 0);
  assert.equal(pageItemCount(1, 237, 50, 500), 50);
  assert.equal(listingPageState(5, totalPages), "ok");
  assert.equal(listingPageState(5, totalPages, true), "ok");
  assert.equal(listingPageState(6, totalPages, true), "not_found");
  assert.equal(listingPageState(1, totalPages, true), "redirect_first", "/taban/sayfa/1 → 308 taban");
  assert.equal(listingPageState(1, totalPages, false), "ok", "taban yol: yönlendirme yok");
  assert.equal(listingPageState(1, 0, false), "ok", "0 ürün: taban 200");
  assert.equal(listingPageState(2, 0, true), "not_found", "0 ürün: /sayfa/2 404");
  for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(listingPageState(bad, totalPages, true), "not_found", String(bad));
    assert.equal(listingPageState(bad, totalPages, false), "not_found", String(bad));
  }
  assert.equal(pageItemCount(10, 1000, 50, 500), 50);
  assert.equal(pageItemCount(11, 1000, 50, 500), 0);
});

test("resolveShowcaseConfig: eski blok (yalnız items) → manual + GLOBAL per_page; sıra korunur; pasif/tekrar/geçersiz atılır", () => {
  const block = { type: "showcase", items: [{ product_id: 5, active: true }, { product_id: 3 }, { product_id: 5 }, { product_id: 9, active: false }, { product_id: "x" }] };
  const cfg = resolveShowcaseConfig(block, S, { pageType: "category_location" });
  assert.ok(cfg);
  assert.equal(cfg.mode, "manual");
  assert.equal(cfg.perPage, 50);
  assert.equal(cfg.maxItems, 500);
  assert.equal(cfg.maxPages, 10);
  assert.equal(cfg.paginationEnabled, true);
  assert.deepEqual(cfg.items, [5, 3]);
  assert.deepEqual(cfg.pinnedIds, []);
  assert.deepEqual(cfg.source, { kind: "ids", ids: [5, 3] });
  assert.equal(resolveShowcaseConfig(block, { ...S, per_page: 30 }, null)!.perPage, 30);
  assert.equal(resolveShowcaseConfig({ type: "showcase", mode: "manual", items: [] }, S, { pageType: "district", location: { city: "istanbul", district: "maltepe" } }), null);
  assert.equal(resolveShowcaseConfig({ type: "showcase", items: [{ product_id: 1, active: false }] }, S, null), null);
});

test("resolveShowcaseConfig: auto + aktif items → pinnedIds (sıralı); manual→auto→manual VERİ KAYBI YOK; blok source öncelikli", () => {
  const ctx = { pageType: "district", location: { city: "istanbul", district: "maltepe" } };
  const items = [{ product_id: 7, active: true, pinned: true }, { product_id: 2, active: false }, { product_id: 9 }, { product_id: 7 }];
  const auto = resolveShowcaseConfig({ type: "showcase", mode: "auto", items }, S, ctx)!;
  assert.equal(auto.mode, "auto");
  assert.deepEqual(auto.items, []);
  assert.deepEqual(auto.pinnedIds, [7, 9], "aktif items = öne çıkarılan, blok sırası, tekrar yok");
  assert.deepEqual(auto.source, { kind: "location", city: "istanbul", district: "maltepe" });
  const manual = resolveShowcaseConfig({ type: "showcase", mode: "manual", items }, S, ctx)!;
  assert.deepEqual(manual.items, [7, 9], "manual'e dönünce sıra aynen");
  assert.deepEqual(manual.pinnedIds, []);
  assert.deepEqual(resolveShowcaseConfig({ type: "showcase", mode: "auto", items: [] }, S, ctx)!.pinnedIds, []);
  assert.equal(resolveShowcaseConfig({ type: "showcase" }, S, ctx)!.mode, "auto");
  const cat = resolveShowcaseConfig({ type: "showcase", mode: "auto", source: { kind: "category", category_id: 77 } }, S, ctx);
  assert.deepEqual(cat!.source, { kind: "category", category_id: 77 });
  const bozuk = resolveShowcaseConfig({ type: "showcase", mode: "auto", source: { kind: "category" } }, S, ctx);
  assert.deepEqual(bozuk!.source, { kind: "location", city: "istanbul", district: "maltepe" });
  // v2: il sayfası (ilçe yok) city-only kaynak alır
  assert.deepEqual(resolveShowcaseConfig({ type: "showcase", mode: "auto" }, S, { pageType: "city", location: { city: "istanbul" } })!.source, { kind: "location", city: "istanbul" });
  // sorgu: pinned_ids geçer
  const q = listingQueryParams(listingQueryFor(auto, 2));
  assert.deepEqual(q, [["source", "location"], ["city", "istanbul"], ["district", "maltepe"], ["pinned_ids", "7,9"], ["page", "2"], ["per_page", "50"], ["max_items", "500"], ["max_pages", "10"], ["in_stock", "true"], ["sort", "default"]]);
});

test("resolveShowcaseConfig: blok yok → settings.auto ise auto; auto kapalıysa null; pagination.* > eski per_page/max_items > global; in_stock/sort override", () => {
  const ctx = { pageType: "neighborhood", location: { city: "istanbul", district: "maltepe", neighborhood: "aydinevler-mah" } };
  const a = resolveShowcaseConfig(null, S, ctx);
  assert.ok(a && a.mode === "auto");
  assert.deepEqual(a.source, { kind: "location", city: "istanbul", district: "maltepe", neighborhood: "aydinevler-mah" });
  assert.equal(resolveShowcaseConfig(null, { ...S, auto: false }, ctx), null);
  assert.equal(resolveShowcaseConfig(undefined, S, { pageType: "brand" }), null, "kaynak yok → vitrin yok");
  // v1 eski alanlar
  const o = resolveShowcaseConfig({ type: "showcase", mode: "auto", per_page: 20, max_items: 100 }, { ...S, max_pages: 3 }, ctx)!;
  assert.equal(o.perPage, 20);
  assert.equal(o.maxItems, 100);
  assert.equal(o.maxPages, 3, "max_pages eski blokta yok → global");
  // v2 pagination.* kazanır
  const p = resolveShowcaseConfig({ type: "showcase", mode: "auto", per_page: 20, max_items: 100, pagination: { enabled: false, per_page: 40, max_items: "none", max_pages: 7 } }, S, ctx)!;
  assert.equal(p.perPage, 40);
  assert.equal(p.maxItems, null, "\"none\" → sınırsız");
  assert.equal(p.maxPages, 7);
  assert.equal(p.paginationEnabled, false);
  // pagination alanı null → global
  const g = resolveShowcaseConfig({ type: "showcase", mode: "auto", pagination: { enabled: null, per_page: null, max_items: null, max_pages: null } }, { ...S, max_items: null, max_pages: 30 }, ctx)!;
  assert.equal(g.perPage, 50);
  assert.equal(g.maxItems, null, "global null = sınırsız");
  assert.equal(g.maxPages, 30);
  assert.equal(g.paginationEnabled, true);
  // sınır dışı blok değerleri teknik sınıra çekilir; "0" → global
  const c = resolveShowcaseConfig({ type: "showcase", mode: "auto", per_page: 999, max_items: "0" }, S, ctx)!;
  assert.equal(c.perPage, 200);
  assert.equal(c.maxItems, 500, "0 → global");
  assert.equal(resolveShowcaseConfig({ type: "showcase", mode: "auto", per_page: null }, S, ctx)!.perPage, 50);
  // in_stock / sort override
  const s = resolveShowcaseConfig({ type: "showcase", mode: "auto", in_stock: false, sort: "price_asc" }, S, ctx)!;
  assert.equal(s.inStock, false);
  assert.equal(s.sort, "price_asc");
  assert.equal(resolveShowcaseConfig({ type: "showcase", mode: "auto", sort: "bogus" }, { ...S, sort: "name_asc" }, ctx)!.sort, "name_asc", "geçersiz sort → global");
  // manual'da items maxItems ile kırpılır; null tavan → hepsi
  const many = Array.from({ length: 30 }, (_, i) => ({ product_id: i + 1 }));
  const m = resolveShowcaseConfig({ type: "showcase", items: many, max_items: 10 }, S, ctx)!;
  assert.equal(m.items.length, 10);
  assert.equal(m.maxItems, 10);
  assert.equal(resolveShowcaseConfig({ type: "showcase", items: many, pagination: { max_items: "none" } }, S, ctx)!.items.length, 30);
  assert.equal(resolveShowcaseConfig({ type: "showcase", items: many }, { ...S, max_items: null }, ctx)!.items.length, 30);
});

test("deriveSource: location (il city-only / ilçe / mahalle) / category / occasion; kategorisiz özel gün ÜRÜNSÜZ (null); bilinmeyen tip null", () => {
  assert.deepEqual(deriveSource({ pageType: "district", location: { city: "istanbul", district: "kadikoy" } }), { kind: "location", city: "istanbul", district: "kadikoy" });
  assert.deepEqual(deriveSource({ pageType: "category_location", location: { city: "istanbul", district: "maltepe", neighborhood: "" } }), { kind: "location", city: "istanbul", district: "maltepe" });
  assert.deepEqual(deriveSource({ pageType: "delivery_info", location: { city: "ankara", district: "cankaya" } }), { kind: "location", city: "ankara", district: "cankaya" });
  assert.deepEqual(deriveSource({ pageType: "city", location: { city: "istanbul" } }), { kind: "location", city: "istanbul" }, "v2: il sayfası city-only");
  assert.deepEqual(deriveSource({ pageType: "city", location: { city: "izmir", district: null } }), { kind: "location", city: "izmir" });
  assert.deepEqual(deriveSource({ pageType: "district", location: { city: "istanbul", neighborhood: "x-mah" } }), { kind: "location", city: "istanbul" }, "ilçesiz mahalle yok sayılır");
  assert.equal(deriveSource({ pageType: "district", location: { city: "İstanbul", district: "maltepe" } }), null, "slug değil");
  assert.equal(deriveSource({ pageType: "district", location: { city: "istanbul", district: "Maltepe!" } }), null, "ilçe slug değil");
  assert.deepEqual(deriveSource({ pageType: "category", categoryId: 12 }), { kind: "category", category_id: 12 });
  assert.equal(deriveSource({ pageType: "category" }), null);
  assert.deepEqual(deriveSource({ pageType: "special_day", categoryId: 40 }), { kind: "occasion", category_id: 40 });
  assert.equal(deriveSource({ pageType: "special_day" }), null, "kategorisiz özel gün: katalog gösterilmez");
  assert.equal(deriveSource({ pageType: "brand", location: { city: "istanbul", district: "maltepe" } }), null, "lokasyon tipli olmayan sayfa lokasyon kaynağı almaz");
  assert.equal(deriveSource(null), null);
});

test("fail-open DEFAULTS: bozuk / eksik / sınır dışı ayar varsayılana ya da sınıra çekilir; null/\"none\" = sınırsız; only_active her zaman true", () => {
  assert.deepEqual(normalizeListingSettings(null), { ...DEFAULT_LISTING_SETTINGS });
  assert.deepEqual(normalizeListingSettings("x"), { ...DEFAULT_LISTING_SETTINGS });
  assert.deepEqual(normalizeListingSettings({}), { ...DEFAULT_LISTING_SETTINGS });
  const n = normalizeListingSettings({ auto: false, pagination_enabled: false, per_page: 500, max_items: "0", max_pages: 999, only_active: false, in_stock: false, sort: "bogus" });
  assert.deepEqual(n, { auto: false, pagination_enabled: false, per_page: 200, max_items: 500, max_pages: 500, only_active: true, in_stock: false, sort: "default" });
  // eski kayıt (sayısal 500/10) aynen
  assert.deepEqual(normalizeListingSettings({ per_page: 50, max_items: 500, max_pages: 10 }), { ...DEFAULT_LISTING_SETTINGS });
  // null → sınırsız; "none" → sınırsız; eksik → varsayılan
  assert.equal(normalizeListingSettings({ max_items: null }).max_items, null);
  assert.equal(normalizeListingSettings({ max_pages: null }).max_pages, null);
  assert.equal(normalizeListingSettings({ max_items: "none" }).max_items, null);
  assert.equal(normalizeListingSettings({ max_items: undefined }).max_items, 500);
  assert.equal(normalizeListingSettings({ max_items: 9999 }).max_items, 5000, "teknik tavan");
  assert.equal(normalizeListingSettings({ max_pages: 30 }).max_pages, 30);
  assert.equal(normalizeListingSettings({ per_page: "24" }).per_page, 24, "metin sayı kabul");
  assert.equal(normalizeListingSettings({ per_page: -5 }).per_page, 50);
  assert.equal(normalizeListingSettings({ sort: "price_desc" }).sort, "price_desc");
  assert.equal(normalizeListingSettings({ sort: "category_order" }).sort, "category_order");
  assert.equal(normalizeListingSettings({ pagination_enabled: "false" }).pagination_enabled, true, "yalnız boolean");
});

test("yardımcılar: activeShowcaseIds 500 tavanı; listingSortOf; listingQueryParams v1+v2; cappedTotalPages null tavan", () => {
  const many = Array.from({ length: 600 }, (_, i) => ({ product_id: i + 1 }));
  assert.equal(activeShowcaseIds(many).length, 500);
  assert.deepEqual(activeShowcaseIds(null), []);
  assert.equal(listingSortOf("category_order"), "default");
  assert.equal(listingSortOf(undefined), "default");
  assert.equal(listingSortOf("price_asc"), "price_asc");
  assert.equal(listingSortOf("zzz"), "default");
  // v1 sorgu AYNEN
  assert.deepEqual(
    listingQueryParams({ source: { kind: "location", city: "istanbul", district: "maltepe", neighborhood: "aydinevler-mah" }, page: 3, per_page: 50, max_items: 500, in_stock: true, sort: "default" }),
    [["source", "location"], ["city", "istanbul"], ["district", "maltepe"], ["neighborhood", "aydinevler-mah"], ["page", "3"], ["per_page", "50"], ["max_items", "500"], ["in_stock", "true"], ["sort", "default"]],
  );
  assert.deepEqual(listingQueryParams({ source: { kind: "category", category_id: 7 }, page: 1, per_page: 12 }), [["source", "category"], ["category_id", "7"], ["per_page", "12"]], "page 1 yazılmaz");
  assert.deepEqual(listingQueryParams({ source: { kind: "occasion", category_id: 9 } }), [["source", "occasion"], ["category_id", "9"]]);
  assert.deepEqual(listingQueryParams({ source: { kind: "catalog" }, per_page: 1000 }), [["source", "catalog"], ["per_page", "200"]], "teknik sınıra çekilir");
  assert.deepEqual(listingQueryParams({ source: { kind: "ids", ids: [3, 1, 2] }, page: 2, per_page: 50 }), [["source", "ids"], ["ids", "3,1,2"]], "ids: sayfalama yok");
  // v2
  assert.deepEqual(listingQueryParams({ source: { kind: "location", city: "istanbul" } }), [["source", "location"], ["city", "istanbul"]], "city-only");
  assert.deepEqual(listingQueryParams({ source: { kind: "location", city: "istanbul", neighborhood: "x" } }), [["source", "location"], ["city", "istanbul"]], "ilçesiz mahalle gönderilmez");
  assert.deepEqual(
    listingQueryParams({ source: { kind: "category", category_id: 7 }, pinned_ids: [3, 1, 0, -2, 3], per_page: 50, max_items: null, max_pages: null, paginate: false, in_stock: true, sort: "category_order", locale: "en" }),
    [["source", "category"], ["category_id", "7"], ["pinned_ids", "3,1"], ["per_page", "50"], ["max_items", "none"], ["max_pages", "none"], ["paginate", "false"], ["in_stock", "true"], ["sort", "default"], ["locale", "en"]],
    "pinned_ids temiz+sıralı; none; paginate=false; category_order → default; locale son",
  );
  assert.deepEqual(listingQueryParams({ source: { kind: "ids", ids: [3, 1, 2] }, locale: "de" }), [["source", "ids"], ["ids", "3,1,2"], ["locale", "de"]]);
  assert.deepEqual(listingQueryParams({ source: { kind: "catalog" }, max_pages: 9999 }), [["source", "catalog"], ["max_pages", "500"]]);
  assert.deepEqual(listingQueryParams({ source: { kind: "catalog" }, pinned_ids: [] }), [["source", "catalog"]], "boş pinned yazılmaz");
  // cappedTotalPages
  assert.equal(cappedTotalPages({ total: 1300, total_pages: 26 }, 50, 500, 10), 10, "uç tavan uygulamamışsa motor kırpar");
  assert.equal(cappedTotalPages({ total: 90, total_pages: 2 }, 50, 500, 10), 2);
  assert.equal(cappedTotalPages({ total_pages: 26 }, 50, 500, 10), 10, "total yoksa ucun sayfa sayısı max_pages ile");
  assert.equal(cappedTotalPages({ total_pages: 26 }, 50, 500, null), 26, "max_pages null → ucun sayısı");
  assert.equal(cappedTotalPages({ total: 1300, total_pages: 26 }, 50, null, null), 26, "null tavanlar: gerçek havuz");
  assert.equal(cappedTotalPages(null, 50, 500, 10), 0);
});

test("pinned: mergePinnedFirst (önce pinned, sıra korunur, tekrar yok, limit); pinnedFirst (DTO pinned önce, kararlı)", () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
  assert.deepEqual(mergePinnedFirst([3, 1, 99], rows).map((r) => r.id), [3, 1, 2, 4], "listede olmayan pinned atlanır");
  assert.deepEqual(mergePinnedFirst([3, 1], rows, 3).map((r) => r.id), [3, 1, 2]);
  assert.deepEqual(mergePinnedFirst([], rows).map((r) => r.id), [1, 2, 3, 4]);
  assert.deepEqual(mergePinnedFirst([2, 2], [{ id: 2 }, { id: 2 }, { id: 5 }]).map((r) => r.id), [2, 5], "tekrar yok");
  const dto = [{ id: 1, pinned: false }, { id: 2, pinned: true }, { id: 3 }, { id: 4, pinned: true }];
  assert.deepEqual(pinnedFirst(dto).map((p) => p.id), [2, 4, 1, 3]);
  assert.deepEqual(pinnedFirst([]), []);
});

// ---------------------------------------------------------------------------
// KAYNAK NÖBETİ — yüzeyler motoru kullanır; ikinci bir sayfalama sistemi yok; fail-open dalları yerinde.
// ---------------------------------------------------------------------------
test("KAYNAK: app/[...slug]/page.tsx — lokasyon (il city-only / ilçe / mahalle) + özel gün tek sorgu yardımcısıyla uca gider, null'da bugünkü fallback", () => {
  const page = oku("../app/[...slug]/page.tsx");
  assert.ok(page.includes("const listing = await fetchListingPage(listingQueryFor(cfg, pageNumber));"), "sorgu tek yerde (pinned_ids / paginate / max none / locale)");
  assert.ok(page.includes("if (!listing) return null; // FAIL-OPEN: uç yok / 404 / 5xx / zaman aşımı → bugünkü yol (LocationProducts / fetchProducts / per-id)"));
  assert.ok(page.includes("totalPages: resolvedTotalPagesFrom(cfg, listing.pagination),"), "toplam sayfa listing pagination'dan (motor tavanları, tek sayfa modu)");
  assert.ok(page.includes("const rows = pageNumber === 1 && cfg.pinnedIds.length ? mergePinnedFirst(cfg.pinnedIds, listing.items) : listing.items;"), "eski uç pinned'ı tanımasa da önce");
  assert.ok(page.includes("const cards = await fetchListingCardsByIds(cfg.items);"), "manual: kartlar toplu uç");
  assert.ok(page.includes("if (cards === null) {"), "ids ucu yoksa per-id yola düşer");
  assert.ok(page.includes("loadShowcaseCards("), "per-id fallback korunur");
  assert.ok(page.includes("totalPages: resolvedTotalPages(cfg, cards.length)"), "manual: çözülen kart sayısından");
  assert.ok(page.includes("<ShowcaseGrid items={showcase.items} basePath={ownPath} page={pageNumber} totalPages={showcase.totalPages} />"));
  // Nöbet sırası (lib/maltepeFamily.test.ts ile aynı): güvenli yol → taban sayfa → /sayfa/1 yönlendirmesi; sayfa > toplam → 404.
  const iSafe = page.indexOf("isSafeInternalPath(parsed.basePath)");
  const iFetch = page.indexOf("const base = await fetchSeoPage(parsed.basePath)");
  const iRedirect = page.indexOf('if (parsed.page === 1) return { kind: "redirect"');
  const iState = page.indexOf('listingPageState(parsed.page, view.totalPages, true) !== "ok"');
  assert.ok(iSafe > 0 && iFetch > iSafe && iRedirect > iFetch && iState > iRedirect);
  // Ayarlar fail-open; sentetik sayfada seri yok; blok yokken seri yalnız yayınlı lokasyon + özel gün (bağlı kategori) sayfasında.
  assert.ok(page.includes("fetchListingSettings()"));
  assert.ok(page.includes("if (!block && (page.synthetic === true || !autoSeriesPageType(page.page_type))) return null;"));
  assert.ok(page.includes('return isLocationPageType(pageType) || (pageType ?? "").toLowerCase() === "special_day";'));
  // v2: il sayfası (tek parça) city-only bağlam → uç city-only'yi tanımıyorsa null → bugünkü 30/100 vitrin.
  assert.ok(page.includes("if (parts.length === 1) return { city: parts[0] };"), "il sayfası city-only");
  assert.ok(page.includes('const specialShowcase = page.page_type === "special_day" && showcase ? showcase : null;'));
  assert.ok(page.includes("if (pageNumber > 1 && !specialShowcase) notFound();"));
  // Bugünkü fallback zinciri AYNEN (LocationProducts + fetchProducts) ve sabit 30 yalnız fallback'te.
  assert.ok(page.includes("const LOCATION_PAGE_SIZE = 30;"));
  assert.ok(page.includes("pageSize={LOCATION_PAGE_SIZE}"), "LocationProducts ilk tık hatası: SSR ile aynı sayfa boyutu");
  assert.ok(page.includes("const productsPromise = isDistrictScope || showcase ? null : fetchProducts(productsQuery);"), "fetchProducts yalnız vitrin yokken");
  assert.ok(!page.includes("cappedTotalPages(") && !page.includes("listingTotalPages("), "sayfa hesabı yalnız resolvedTotalPages* ile (tek yol)");
});

test("KAYNAK: KATEGORİ TEK SERİ — sayfa 1, ?page=N, sonsuz kaydırma ve metadata aynı yardımcı; /api/products yalnız fail-open dalında", () => {
  const surface = oku("./listingSurface.ts");
  assert.ok(surface.includes("export async function fetchCategoryListing("));
  assert.ok(surface.includes("export function categoryShowcaseConfig("), "kategori bloğu (manual / auto+pinned) tek çözücü");
  assert.ok(surface.includes("const cards = await fetchListingCardsByIds(cfg.items);"), "manual → ids kaynağı");
  assert.ok(surface.includes("const listing = await fetchListingPage({ ...listingQueryFor(cfg, input.page), sort });"), "auto → pinned_ids dahil tek sorgu");
  assert.equal(surface.split("fetchProductsPaged({").length - 1, 1, "bugünkü uç TEK yerde");
  assert.ok(surface.indexOf("// FAIL-OPEN / filtreli: bugünkü uç") < surface.indexOf("fetchProductsPaged({"), "ve yalnız fail-open dalında");
  assert.ok(surface.includes("page_size: perPage"));
  assert.ok(surface.includes('source: "listing"') && surface.includes('source: "fallback"'), "kaynak etiketi (kapak süzgeci yalnız fallback'te)");
  const action = oku("./categoryProducts.actions.ts");
  assert.ok(action.includes("fetchCategoryListing({"), "server action aynı yardımcı");
  assert.ok(!action.includes("fetchProductsPaged") && !action.includes("/api/products") && !action.includes("fetchProducts("), "server action bugünkü uca DOĞRUDAN gitmez");
  assert.ok(action.includes("fetchListingSettings()") && action.includes("getShowcaseBlock(seoPage)"), "ayar + blok sunucuda (istemci değeri yok)");
  assert.ok(action.includes('const rows = pageData.source === "listing" ? pageData.items : (pageData.items ?? []).filter((p) => p.cover_image_url);'));
  assert.ok(action.includes("maxPages?: number | null;"), "eski alan geriye uyumlu kalır");
  const landing = oku("../components/category/CategoryLanding.tsx");
  assert.ok(landing.includes("const settings = await fetchListingSettings();"));
  assert.ok(landing.includes("const perPage = settings.per_page;"));
  assert.ok(landing.includes("const block = getShowcaseBlock(page);"));
  assert.ok(landing.includes("categoryId, page: pageNum, sort, settings, block,"));
  assert.ok(landing.includes("pageSize={perPage}"));
  assert.ok(landing.includes("maxPages={settings.max_pages}"));
  assert.ok(landing.includes("path={path}"), "grid yolu alır → action aynı bloğu okur");
  assert.ok(landing.includes('productPage?.source === "listing" ? productPage.items : (productPage?.items ?? []).filter((p) => p.cover_image_url)'), "kapak süzgeci yalnız fail-open");
  assert.ok(!/page_size: 50\b/.test(landing), "düz 50 kalmadı");
  const route = oku("../app/kategori/[...slug]/page.tsx");
  assert.ok(route.includes("const settings = await fetchListingSettings();"));
  assert.ok(route.includes("fetchCategoryListing({ categoryId, page: pageNo, sort: CATEGORY_DEFAULT_SORT, settings, block })"), "metadata aynı yardımcı + aynı blok");
  assert.ok(!/page_size: 50\b/.test(route), "düz 50 kalmadı");
  const grid = oku("../components/category/CategoryProductGrid.tsx");
  assert.ok(grid.includes("maxPages?: number | null;"));
  assert.ok(grid.includes("path?: string;") && grid.includes("        path,\n        sort,"), "grid yolu action'a geçirir");
});

test("KAYNAK: ana sayfa — pinned önce; rule/hybrid dolgusu listeleme ucuna in_stock + pinned_ids geçer; hybrid dolu vitrin limit'e kadar tamamlanır; LOCKED parçalar yok", () => {
  const src = oku("./homepageShowcase.ts");
  assert.ok(src.includes("const LIMIT = 12;"));
  assert.ok(src.includes('fetchListingPage({ source: { kind: "category", category_id: categoryId }, page: 1, per_page: LIMIT, sort: "created_at_desc", in_stock: settings.in_stock, pinned_ids })'));
  assert.ok(src.includes("fetchProducts({ category_id: categoryId, page_size: LIMIT * 2, sort: \"created_at_desc\" })"), "kesintide bugünkü dolgu");
  assert.ok(src.includes("const seen = new Set<number>(slot?.pinnedIds ?? []);"), "Admin seçimi dolguda tekrar etmez");
  assert.ok(src.includes("const settings = await fetchListingSettings(); // fail-open DEFAULTS (in_stock: true)"));
  const renderer = oku("../components/home/HomepageRenderer.tsx");
  assert.ok(renderer.includes('import { pinnedFirst } from "@/lib/listingEngine";'));
  assert.ok(renderer.includes("const dtoProducts = pinnedFirst(s.products ?? []);"));
  assert.ok(renderer.includes("products = dtoProducts.slice(0, limit);"), "manual: pinned önce, limit");
  assert.ok(renderer.includes("const pinned = dtoProducts.filter((p) => p.pinned).slice(0, limit);"), "rule: pinned önce + dolgu");
  assert.ok(renderer.includes("const auto = fill.products.filter(p => !seen.has(p.id)).slice(0, Math.max(0, limit - manual.length));"), "hybrid: tekrar yok, limit'e kadar");
  assert.ok(renderer.includes("return [4, 8, 12].includes(n) ? n : 12;"), "limit 4/8/12 DTO'dan");
  const home = oku("../app/page.tsx");
  assert.ok(home.includes("buildShowcaseFills(tree, showcaseSlots)"));
  assert.ok(home.includes('s.selection_mode === "rule" || (s.selection_mode === "hybrid" && s.products.length < showcaseLimitOf(s.config))'), "hybrid dolu vitrinde de tamamlama");
  assert.ok(home.includes("pinnedIds: (s.products ?? []).map((p) => p.id), limit: showcaseLimitOf(s.config)"));
  // LOCKED: HomeHero / header / footer bu değişiklikte dokunulmaz (renderer'da aynı kullanım).
  assert.ok(renderer.includes('case "hero":               return <HomeHero config={s.config} banner={ctx.heroBanner ?? null} />;'));
});

test("KAYNAK: global — locale kategori / lokasyon / storefront autoPool listeleme ucundan (locale, pinned_ids, no-store); uç locale'i tanımıyorsa bugünkü yol; sayfalama tek hesap", () => {
  const src = oku("./global/page.tsx");
  assert.ok(src.includes("const categoryTotalPages = (await localeCategorySeries(locale, surface, listingSettings, listingPage)).totalPages;"), "metadata");
  assert.ok(src.includes("const series = await localeCategorySeries(locale, surface, listingSettings, categoryPage);"), "gövde aynı yardımcı");
  assert.ok(src.includes("const listing = await fetchListingPage(listingQueryFor(cfg, page, { locale }), { noStore: true });"), "kategori: locale + no-store");
  assert.ok(src.includes("if (listing && listingRowsLocalized(listing.items)) {"), "locale_name yoksa surface yolu");
  assert.ok(src.includes("getShowcaseBlock(await fetchSeoPage(`/kategori/${surface.tr_slug}`, { noStore: true }).catch(() => null))"), "kategori bloğu (pinned/manual) no-store");
  assert.ok(src.includes("resolveLocationCatalog(plan, searchParams, `/${locale}/${row.page_key}`, SHOP[locale].all, listingSize, listingCaps)"), "lokasyon tavanları");
  assert.ok(src.includes("const listing = await fetchListingPage(listingQueryFor(cfg, wantedPage, { locale }), { noStore: true });"), "lokasyon: Tümü listesi uçtan");
  assert.ok(src.includes("if (isCategoryListingNotFound(searchParams, categoryTotalPages)) notFound();"));
  assert.ok(src.includes("<GlobalPagination locale={locale} pagination={locationPagination("));
  assert.ok(src.includes("if (isCategoryListingNotFound(listing, categoryTotalPages)) return { robots: NOINDEX };"));
  assert.ok(!src.includes("listingTotalPages("), "ikinci sayfa hesabı yok");
  const kategoriMeta = src.slice(src.indexOf('if (parsed.kind === "category")'), src.indexOf('if (parsed.kind === "product")'));
  assert.ok(kategoriMeta.includes("if (surface.indexable) {") && kategoriMeta.includes("if (listingPage === 1) {"), "hreflang kümesi yalnız 1. sayfada");
  assert.ok(kategoriMeta.indexOf("if (listingPage === 1) {") < kategoriMeta.indexOf("fetchCategoryLocaleVersions("), "sayfa ≥ 2 küme okumaz");
  const v80 = oku("./global/v80/data.ts");
  assert.ok(v80.includes("const listed = await autoPoolFromListing(locale, config, products);"));
  assert.ok(v80.includes('fetchListingPage({ source: { kind: "catalog" }, locale, page: 1, per_page: limit, in_stock: settings.in_stock, sort: settings.sort, pinned_ids }, { noStore: true })'));
  assert.ok(v80.includes("const autoIds = bundle.auto_product_ids;"), "bugünkü auto sırası fail-open");
  const paging = oku("./global/locationPaging.ts");
  assert.ok(paging.includes('import { capListing, resolvedPageSize, resolvedTotalPages } from "../listingEngine.ts";'), "lokasyon tavanları aynı motor");
});
