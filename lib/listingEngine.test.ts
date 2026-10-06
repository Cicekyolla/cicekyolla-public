// Genel listeleme + otomatik sayfalama motoru — birim + kaynak nöbeti (node --test).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_LISTING_SETTINGS,
  LISTING_LIMITS,
  activeShowcaseIds,
  cappedTotalPages,
  deriveSource,
  listingPageState,
  listingQueryParams,
  listingSortOf,
  listingTotalPages,
  normalizeListingSettings,
  pageItemCount,
  pageSlice,
  resolveShowcaseConfig,
  type ListingSettings,
} from "./listingEngine.ts";

const oku = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const S: ListingSettings = { ...DEFAULT_LISTING_SETTINGS };

test("saf modül: listingEngine hiçbir şey ithal etmez (kenar güvenli)", () => {
  const src = oku("./listingEngine.ts");
  assert.doesNotMatch(src, /^\s*import\s/m);
  assert.doesNotMatch(src, /\brequire\(/);
});

test("DEFAULTS sözleşme §1 ile birebir; sınırlar 1..100 / 1..500 / 1..50", () => {
  assert.deepEqual({ ...DEFAULT_LISTING_SETTINGS }, { auto: true, per_page: 50, max_items: 500, max_pages: 10, only_active: true, in_stock: true, sort: "default" });
  assert.deepEqual(LISTING_LIMITS.per_page, { min: 1, max: 100 });
  assert.deepEqual(LISTING_LIMITS.max_items, { min: 1, max: 500 });
  assert.deepEqual(LISTING_LIMITS.max_pages, { min: 1, max: 50 });
});

test("TEST MATRİSİ: total → total_pages (per_page 50, max_items 500, max_pages 10)", () => {
  const matris: [number, number][] = [
    [0, 0], [1, 1], [49, 1], [50, 1], [51, 2], [99, 2], [100, 2], [237, 5], [499, 10], [500, 10], [501, 10], [1000, 10],
  ];
  for (const [total, beklenen] of matris) {
    assert.equal(listingTotalPages(total, 50, 500, 10), beklenen, `total ${total}`);
  }
  // max_pages tavanı gerçekten kırpar: 1000 ürün, max_pages 50 → 20 sayfa (max_items 500 → 10 sayfa olur)
  assert.equal(listingTotalPages(1000, 50, 500, 50), 10);
  assert.equal(listingTotalPages(1000, 50, 500, 5), 5);
  assert.equal(listingTotalPages(1000, 100, 500, 50), 5);
  // Geçersiz girdiler fail-open varsayılanlara
  assert.equal(listingTotalPages(Number.NaN, 50, 500, 10), 0);
  assert.equal(listingTotalPages(120, 0, 500, 10), 3, "per_page 0 → varsayılan 50");
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
  // max_items tavanı dilime de uygulanır: 1000 ürün, sayfa 10 = 50; sayfa 11 = 0
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
  assert.deepEqual(cfg.items, [5, 3]);
  assert.deepEqual(cfg.source, { kind: "ids", ids: [5, 3] });
  // Global per_page değişirse eski blok onu izler (blok per_page yazmadı).
  assert.equal(resolveShowcaseConfig(block, { ...S, per_page: 30 }, null)!.perPage, 30);
  // manual ama aktif öğe yok → vitrin yok (bugünkü fallback)
  assert.equal(resolveShowcaseConfig({ type: "showcase", mode: "manual", items: [] }, S, { pageType: "district", location: { city: "istanbul", district: "maltepe" } }), null);
  assert.equal(resolveShowcaseConfig({ type: "showcase", items: [{ product_id: 1, active: false }] }, S, null), null);
});

test("resolveShowcaseConfig: mode auto + items boş → auto, kaynak sayfadan türetilir; blok source öncelikli", () => {
  const ctx = { pageType: "district", location: { city: "istanbul", district: "maltepe" } };
  const auto = resolveShowcaseConfig({ type: "showcase", mode: "auto", items: [] }, S, ctx);
  assert.ok(auto);
  assert.equal(auto.mode, "auto");
  assert.deepEqual(auto.items, []);
  assert.deepEqual(auto.source, { kind: "location", city: "istanbul", district: "maltepe" });
  // mode yok + items yok → auto (eski/boş kayıt)
  assert.equal(resolveShowcaseConfig({ type: "showcase" }, S, ctx)!.mode, "auto");
  // blok source: category_id ile
  const cat = resolveShowcaseConfig({ type: "showcase", mode: "auto", source: { kind: "category", category_id: 77 } }, S, ctx);
  assert.deepEqual(cat!.source, { kind: "category", category_id: 77 });
  // geçersiz blok source → türetmeye düşer
  const bozuk = resolveShowcaseConfig({ type: "showcase", mode: "auto", source: { kind: "category" } }, S, ctx);
  assert.deepEqual(bozuk!.source, { kind: "location", city: "istanbul", district: "maltepe" });
  // auto ama kaynak türetilemiyor (il sayfası, ilçe yok) → null → bugünkü yol
  assert.equal(resolveShowcaseConfig({ type: "showcase", mode: "auto" }, S, { pageType: "city", location: { city: "istanbul" } }), null);
  // mode:"auto" items dolu olsa da auto kalır (items yok sayılır)
  const karma = resolveShowcaseConfig({ type: "showcase", mode: "auto", items: [{ product_id: 1 }] }, S, ctx);
  assert.equal(karma!.mode, "auto");
  assert.deepEqual(karma!.items, []);
});

test("resolveShowcaseConfig: blok yok → settings.auto ise auto; auto kapalıysa null; per_page/max_items override blok > global, sınırlar", () => {
  const ctx = { pageType: "neighborhood", location: { city: "istanbul", district: "maltepe", neighborhood: "aydinevler-mah" } };
  const a = resolveShowcaseConfig(null, S, ctx);
  assert.ok(a && a.mode === "auto");
  assert.deepEqual(a.source, { kind: "location", city: "istanbul", district: "maltepe", neighborhood: "aydinevler-mah" });
  assert.equal(resolveShowcaseConfig(null, { ...S, auto: false }, ctx), null);
  assert.equal(resolveShowcaseConfig(undefined, S, { pageType: "brand" }), null, "kaynak yok → vitrin yok");
  // override
  const o = resolveShowcaseConfig({ type: "showcase", mode: "auto", per_page: 20, max_items: 100 }, { ...S, max_pages: 3 }, ctx)!;
  assert.equal(o.perPage, 20);
  assert.equal(o.maxItems, 100);
  assert.equal(o.maxPages, 3, "max_pages yalnız global");
  // sınır dışı blok değerleri sınıra çekilir; null/boş → global
  const c = resolveShowcaseConfig({ type: "showcase", mode: "auto", per_page: 999, max_items: "0" }, S, ctx)!;
  assert.equal(c.perPage, 100);
  assert.equal(c.maxItems, 500, "0 → global");
  assert.equal(resolveShowcaseConfig({ type: "showcase", mode: "auto", per_page: null }, S, ctx)!.perPage, 50);
  // manual'da items maxItems ile kırpılır
  const many = Array.from({ length: 30 }, (_, i) => ({ product_id: i + 1 }));
  const m = resolveShowcaseConfig({ type: "showcase", items: many, max_items: 10 }, S, ctx)!;
  assert.equal(m.items.length, 10);
  assert.equal(m.maxItems, 10);
});

test("deriveSource: location / category / occasion / catalog; il sayfası ve bilinmeyen tip null", () => {
  assert.deepEqual(deriveSource({ pageType: "district", location: { city: "istanbul", district: "kadikoy" } }), { kind: "location", city: "istanbul", district: "kadikoy" });
  assert.deepEqual(deriveSource({ pageType: "category_location", location: { city: "istanbul", district: "maltepe", neighborhood: "" } }), { kind: "location", city: "istanbul", district: "maltepe" });
  assert.deepEqual(deriveSource({ pageType: "delivery_info", location: { city: "ankara", district: "cankaya" } }), { kind: "location", city: "ankara", district: "cankaya" });
  assert.equal(deriveSource({ pageType: "city", location: { city: "istanbul" } }), null, "ilçe zorunlu");
  assert.equal(deriveSource({ pageType: "district", location: { city: "İstanbul", district: "maltepe" } }), null, "slug değil");
  assert.deepEqual(deriveSource({ pageType: "category", categoryId: 12 }), { kind: "category", category_id: 12 });
  assert.equal(deriveSource({ pageType: "category" }), null);
  assert.deepEqual(deriveSource({ pageType: "special_day", categoryId: 40 }), { kind: "occasion", category_id: 40 });
  assert.deepEqual(deriveSource({ pageType: "special_day" }), { kind: "catalog" });
  assert.equal(deriveSource({ pageType: "brand", location: { city: "istanbul", district: "maltepe" } }), null, "lokasyon tipli olmayan sayfa lokasyon kaynağı almaz");
  assert.equal(deriveSource(null), null);
});

test("fail-open DEFAULTS: bozuk / eksik / sınır dışı ayar varsayılana ya da sınıra çekilir; only_active her zaman true", () => {
  assert.deepEqual(normalizeListingSettings(null), { ...DEFAULT_LISTING_SETTINGS });
  assert.deepEqual(normalizeListingSettings("x"), { ...DEFAULT_LISTING_SETTINGS });
  assert.deepEqual(normalizeListingSettings({}), { ...DEFAULT_LISTING_SETTINGS });
  const n = normalizeListingSettings({ auto: false, per_page: 500, max_items: "0", max_pages: 99, only_active: false, in_stock: false, sort: "bogus" });
  assert.deepEqual(n, { auto: false, per_page: 100, max_items: 500, max_pages: 50, only_active: true, in_stock: false, sort: "default" });
  assert.equal(normalizeListingSettings({ per_page: "24" }).per_page, 24, "metin sayı kabul");
  assert.equal(normalizeListingSettings({ per_page: -5 }).per_page, 50);
  assert.equal(normalizeListingSettings({ sort: "price_desc" }).sort, "price_desc");
});

test("yardımcılar: activeShowcaseIds 500 tavanı; listingSortOf; listingQueryParams sözleşme §3; cappedTotalPages", () => {
  const many = Array.from({ length: 600 }, (_, i) => ({ product_id: i + 1 }));
  assert.equal(activeShowcaseIds(many).length, 500);
  assert.deepEqual(activeShowcaseIds(null), []);
  assert.equal(listingSortOf("category_order"), "default");
  assert.equal(listingSortOf(undefined), "default");
  assert.equal(listingSortOf("price_asc"), "price_asc");
  assert.equal(listingSortOf("zzz"), "default");
  assert.deepEqual(
    listingQueryParams({ source: { kind: "location", city: "istanbul", district: "maltepe", neighborhood: "aydinevler-mah" }, page: 3, per_page: 50, max_items: 500, in_stock: true, sort: "default" }),
    [["source", "location"], ["city", "istanbul"], ["district", "maltepe"], ["neighborhood", "aydinevler-mah"], ["page", "3"], ["per_page", "50"], ["max_items", "500"], ["in_stock", "true"], ["sort", "default"]],
  );
  assert.deepEqual(listingQueryParams({ source: { kind: "category", category_id: 7 }, page: 1, per_page: 12 }), [["source", "category"], ["category_id", "7"], ["per_page", "12"]], "page 1 yazılmaz");
  assert.deepEqual(listingQueryParams({ source: { kind: "occasion", category_id: 9 } }), [["source", "occasion"], ["category_id", "9"]]);
  assert.deepEqual(listingQueryParams({ source: { kind: "catalog" }, per_page: 1000 }), [["source", "catalog"], ["per_page", "100"]], "sınıra çekilir");
  assert.deepEqual(listingQueryParams({ source: { kind: "ids", ids: [3, 1, 2] }, page: 2, per_page: 50 }), [["source", "ids"], ["ids", "3,1,2"]], "ids: sayfalama yok");
  assert.equal(cappedTotalPages({ total: 1300, total_pages: 26 }, 50, 500, 10), 10, "uç tavan uygulamamışsa motor kırpar");
  assert.equal(cappedTotalPages({ total: 90, total_pages: 2 }, 50, 500, 10), 2);
  assert.equal(cappedTotalPages({ total_pages: 26 }, 50, 500, 10), 10, "total yoksa ucun sayfa sayısı max_pages ile");
  assert.equal(cappedTotalPages(null, 50, 500, 10), 0);
});

// ---------------------------------------------------------------------------
// KAYNAK NÖBETİ — yüzeyler motoru kullanır; ikinci bir sayfalama sistemi yok; fail-open dalları yerinde.
// ---------------------------------------------------------------------------
test("KAYNAK: app/[...slug]/page.tsx listeleme ucunu dener, null'da bugünkü fallback; ShowcaseGrid totalPages'i listing pagination'dan alır", () => {
  const page = oku("../app/[...slug]/page.tsx");
  assert.ok(page.includes("fetchListingPage({"), "lokasyon / özel gün otomatik listesi listeleme ucundan");
  assert.ok(page.includes("const listing = await fetchListingPage({"));
  assert.ok(page.includes("if (!listing) return null; // FAIL-OPEN: uç yok / 404 / 5xx / zaman aşımı → bugünkü yol (LocationProducts / fetchProducts / per-id)"));
  assert.ok(page.includes("totalPages: cappedTotalPages(listing.pagination, cfg.perPage, cfg.maxItems, cfg.maxPages)"), "toplam sayfa listing pagination'dan (motor tavanlarıyla)");
  assert.ok(page.includes("const cards = await fetchListingCardsByIds(cfg.items);"), "manual: kartlar toplu uç");
  assert.ok(page.includes("if (cards === null) {"), "ids ucu yoksa per-id yola düşer");
  assert.ok(page.includes("loadShowcaseCards("), "per-id fallback korunur");
  assert.ok(page.includes("<ShowcaseGrid items={showcase.items} basePath={ownPath} page={pageNumber} totalPages={showcase.totalPages} />"));
  // Nöbet sırası (lib/maltepeFamily.test.ts ile aynı): güvenli yol → taban sayfa → /sayfa/1 yönlendirmesi; sayfa > toplam → 404.
  const iSafe = page.indexOf("isSafeInternalPath(parsed.basePath)");
  const iFetch = page.indexOf("const base = await fetchSeoPage(parsed.basePath)");
  const iRedirect = page.indexOf('if (parsed.page === 1) return { kind: "redirect"');
  const iState = page.indexOf('listingPageState(parsed.page, view.totalPages, true) !== "ok"');
  assert.ok(iSafe > 0 && iFetch > iSafe && iRedirect > iFetch && iState > iRedirect);
  // Ayarlar fail-open okunur; sentetik sayfada otomatik seri açılmaz (taban yayında değil → /sayfa/N 404 olurdu).
  assert.ok(page.includes("fetchListingSettings()"));
  assert.ok(page.includes("if (!block && (page.synthetic === true || !isLocationPageType(page.page_type))) return null;"), "blok yokken otomatik seri yalnız yayınlı lokasyon sayfasında");
  // Özel gün: yalnız vitrinli özel gün sayfasında /sayfa/N açık; diğer genel sayfalar bugünkü gibi 404.
  assert.ok(page.includes('const specialShowcase = page.page_type === "special_day" && showcase ? showcase : null;'));
  assert.ok(page.includes("if (pageNumber > 1 && !specialShowcase) notFound();"));
  // Bugünkü fallback zinciri AYNEN (LocationProducts + fetchProducts) ve sabit 30 korunur.
  assert.ok(page.includes("const LOCATION_PAGE_SIZE = 30;"));
  assert.ok(page.includes("pageSize={LOCATION_PAGE_SIZE}"), "LocationProducts ilk tık hatası: SSR ile aynı sayfa boyutu");
});

test("KAYNAK: kategori sayfası settings.per_page kullanır; listeleme ucu → fetchProductsPaged fallback tek yardımcıda; sonsuz kaydırma aynı per_page", () => {
  const surface = oku("./listingSurface.ts");
  assert.ok(surface.includes("export async function fetchCategoryListing("));
  assert.ok(surface.includes("fetchListingPage({"));
  assert.ok(surface.includes("fetchProductsPaged({"), "fallback bugünkü uç");
  assert.ok(surface.includes("page_size: perPage"));
  const landing = oku("../components/category/CategoryLanding.tsx");
  assert.ok(landing.includes("const settings = await fetchListingSettings();"));
  assert.ok(landing.includes("const perPage = settings.per_page;"));
  assert.ok(landing.includes("pageSize={perPage}"));
  assert.ok(landing.includes("maxPages={settings.max_pages}"));
  assert.ok(!/page_size: 50\b/.test(landing), "düz 50 kalmadı");
  const route = oku("../app/kategori/[...slug]/page.tsx");
  assert.ok(route.includes("const settings = await fetchListingSettings();"));
  assert.ok(!/page_size: 50\b/.test(route), "düz 50 kalmadı");
  const grid = oku("../components/category/CategoryProductGrid.tsx");
  assert.ok(grid.includes("maxPages?: number;"));
  const action = oku("./categoryProducts.actions.ts");
  assert.ok(action.includes("maxPages?: number;"));
});

test("KAYNAK: ana sayfa dolgusu listeleme ucunu dener, null'da fetchProducts; LİMİT 12 ve SPECS aynen", () => {
  const src = oku("./homepageShowcase.ts");
  assert.ok(src.includes("const LIMIT = 12;"));
  assert.ok(src.includes('fetchListingPage({ source: { kind: "category", category_id: categoryId }, page: 1, per_page: LIMIT, sort: "created_at_desc" })'));
  assert.ok(src.includes("fetchProducts({ category_id: categoryId, page_size: LIMIT * 2, sort: \"created_at_desc\" })"), "kesintide bugünkü dolgu");
});

test("KAYNAK: global locale lokasyon listesi settings.per_page; global kategori gerçek seri (slice + 404 kapısı + GlobalPagination); hreflang yalnız sayfa 1", () => {
  const src = oku("./global/page.tsx");
  assert.ok(src.includes("resolveLocationCatalog(plan, searchParams, `/${locale}/${row.page_key}`, SHOP[locale].all, listingSize)"));
  assert.equal(src.split("sliceLocationPage(surface.products, categoryPage, perPage)").length - 1, 2, "yeni API (kart alanlı) ve eski API (detaylı) dalı aynı dilim");
  assert.ok(src.includes("if (isCategoryListingNotFound(searchParams, categoryTotalPages)) notFound();"));
  assert.ok(src.includes("<GlobalPagination locale={locale} pagination={locationPagination("));
  assert.ok(src.includes("if (isCategoryListingNotFound(listing, categoryTotalPages)) return { robots: NOINDEX };"));
  const kategoriMeta = src.slice(src.indexOf('if (parsed.kind === "category")'), src.indexOf('if (parsed.kind === "product")'));
  assert.ok(kategoriMeta.includes("if (surface.indexable) {") && kategoriMeta.includes("if (listingPage === 1) {"), "hreflang kümesi yalnız 1. sayfada");
  assert.ok(kategoriMeta.indexOf("if (listingPage === 1) {") < kategoriMeta.indexOf("fetchCategoryLocaleVersions("), "sayfa ≥ 2 küme okumaz");
});
