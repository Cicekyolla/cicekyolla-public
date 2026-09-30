// GLOBAL KATALOG — kategori + lokasyon yüzeyleri (saf modül testleri).
// Çalıştır: npm run test:unit  (node --test lib/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { GLOBAL_LOCALES } from "./global/config.ts";
import {
  catalogDecision, planLocationPage, flattenPlan, applyRealCategorySlugs, hasCardFields, fallbackCategoryCards,
  type CatalogProduct, type CatalogCategory, type GlobalCatalogResponse,
} from "./global/globalCatalog.ts";
import { resolveV80, type V80SourceProduct, type V80SourceCategory } from "./global/v80/view.ts";
import { applyFilters } from "./global/v80/filters.ts";
import { defaultConfig } from "./global/v80/schema.ts";

const row = (id: number, cats: string[], o: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id, tr_slug: `tr-${id}`, slug: `en-${id}`, name: `P${id}`, price_minor: 100_00, sale_price_minor: null,
  image: `/p${id}.webp`, blurhash: null, derivatives: null, same_day_available: true, delivery_model_code: "same_day_courier",
  is_new: false, is_bestseller: false, product_category_slugs: cats, product_type: "flower", delivery_scope: "istanbul", ...o,
});
const catg = (id: number, slug: string, ids: number[], image: string | null = `/c-${slug}.jpg`): CatalogCategory => ({ id, slug, name: slug.toUpperCase(), image, image_source: image ? "category" : null, product_ids: ids });
const resp = (o: Partial<GlobalCatalogResponse> = {}): GlobalCatalogResponse => ({
  locale: "en", total: 6, selection: "manual", featured_ids: [5, 2], location: null,
  categories: [catg(13, "roses", [3, 1, 2]), catg(14, "orchids", [2, 4]), catg(19, "peonies", [6], null)],
  products: [row(6, ["peonies"]), row(5, []), row(4, ["orchids"]), row(3, ["roses"]), row(2, ["roses", "orchids"]), row(1, ["roses"])],
  ...o,
});

test("karar: uç yok / ağ hatası / bozuk yanıt → bugünkü davranış (ne topluca gizle ne topluca aç)", () => {
  assert.deepEqual(catalogDecision(null, false), { mode: "fallback" });
  assert.deepEqual(catalogDecision({ products: [] }, false), { mode: "fallback" });
  assert.deepEqual(catalogDecision("<html>", true), { mode: "fallback" });
  assert.deepEqual(catalogDecision(resp(), true), { mode: "fallback" }); // lokasyon istendi, yanıtta yok
});

test("karar: lokasyon çözülemedi → boş katalog (fail closed); geçerli yanıt → katalog", () => {
  const loc = { city: "istanbul", district: "yok", neighborhood: null, found: false, same_day: true };
  const d = catalogDecision(resp({ location: loc }), true);
  assert.equal(d.mode, "catalog");
  if (d.mode === "catalog") {
    assert.deepEqual(d.catalog.products, []);
    assert.deepEqual(d.catalog.featured_ids, []);
    assert.ok(d.catalog.categories.every((c) => c.product_ids.length === 0));
  }
  const ok = catalogDecision(resp(), false);
  assert.equal(ok.mode, "catalog");
});

test("katalog ≠ vitrin: vitrinde OLMAYAN ürün (1,3,4,6) görünür; ÇOK KATEGORİLİ ürün (2) her gerçek kategorisinde; Tümü'nde tek", () => {
  const d = catalogDecision(resp(), false);
  assert.equal(d.mode, "catalog");
  if (d.mode !== "catalog") return;
  const plan = planLocationPage(d.catalog);
  assert.deepEqual(plan.allOrder, [5, 2, 6, 4, 3, 1]); // önce vitrin sırası (5,2), sonra katalog sırası
  // Kategori listeleri: gerçek bağ + admin sırası; #2 hem roses hem orchids listesinde (tekilleştirme YOK)
  assert.deepEqual(plan.categories.map((c) => [c.slug, c.ids]), [["roses", [3, 1, 2]], ["orchids", [2, 4]], ["peonies", [6]]]);
  assert.ok(!plan.categories.find((c) => c.slug === "peonies")!.ids.includes(2), "gerçek bağı olmayan kategoride yok");
  const all = flattenPlan(plan).map((p) => p.id);
  assert.deepEqual([...all].sort(), [1, 2, 3, 4, 5, 6]);
  assert.equal(new Set(all).size, all.length);
  assert.deepEqual(plan.tiles.map((t) => [t.slug, t.count, t.image]), [["roses", 3, "/c-roses.jpg"], ["orchids", 2, "/c-orchids.jpg"], ["peonies", 1, null]]);
});

test("lokasyon: teslim edilemeyen ürün çıkar, kategori sırası bozulmaz (Muğla örneği)", () => {
  // API sonucu: yalnız kargolanabilir 2 ve 3 kaldı → kategori listeleri sıralı alt küme
  const mugla = resp({
    location: { city: "mugla", district: null, neighborhood: null, found: true, same_day: false },
    featured_ids: [2],
    products: [row(3, ["roses"], { delivery_model_code: "cargo" }), row(2, ["roses", "orchids"], { delivery_model_code: "same_day_and_cargo" })],
    categories: [catg(13, "roses", [3, 2]), catg(14, "orchids", [2]), catg(19, "peonies", [])],
  });
  const d = catalogDecision(mugla, true);
  assert.equal(d.mode, "catalog");
  if (d.mode !== "catalog") return;
  const plan = planLocationPage(d.catalog);
  assert.deepEqual(flattenPlan(plan).map((p) => p.id), [2, 3]);
  assert.deepEqual(plan.categories.find((c) => c.slug === "roses")!.ids, [3, 2]); // admin sırası korunur
  assert.deepEqual(plan.tiles.map((t) => [t.slug, t.count]), [["roses", 2], ["orchids", 1]]); // boş şakayık kartı yok
});

test("lokasyon: kategori kartları ile çipler AYNI plan ve AYNI (API) sırada; 0 ürünlü kategori ikisinde de yok", () => {
  const d = catalogDecision(resp({ categories: [catg(19, "peonies", [6]), catg(20, "lilies", []), catg(13, "roses", [3, 1, 2]), catg(14, "orchids", [2, 4])] }), false);
  assert.equal(d.mode, "catalog");
  if (d.mode !== "catalog") return;
  const plan = planLocationPage(d.catalog);
  const chipSlugs = plan.categories.filter((c) => c.ids.length > 0).map((c) => c.slug); // çip kuralı (locationPaging resolveLocationCatalog)
  assert.deepEqual(plan.tiles.map((t) => t.slug), chipSlugs);
  assert.deepEqual(chipSlugs, ["peonies", "roses", "orchids"]); // alfabetik değil, API sırası
  assert.deepEqual(plan.tiles.map((t) => t.count), [1, 3, 2]);
});

test("katalog yanıtı: additive location_sections alanı karar sonrası korunur (fail closed dahil); yoksa undefined", () => {
  const ham = [{ id: "commerce", enabled: true }, { id: "trust", enabled: false }];
  const ok = catalogDecision(resp({ location_sections: ham }), false);
  assert.equal(ok.mode, "catalog");
  if (ok.mode === "catalog") assert.deepEqual(ok.catalog.location_sections, ham);
  const loc = { city: "istanbul", district: "yok", neighborhood: null, found: false, same_day: true };
  const closed = catalogDecision(resp({ location: loc, location_sections: ham }), true);
  if (closed.mode === "catalog") assert.deepEqual(closed.catalog.location_sections, ham);
  const eski = catalogDecision(resp(), false);
  if (eski.mode === "catalog") assert.equal(eski.catalog.location_sections, undefined);
});

test("sözleşme dışı satır/kategori id'si katalogdan elenir; kategori listesi yalnız mevcut ürünleri taşır", () => {
  const bozuk = { ...row(9, []), product_category_slugs: undefined } as unknown as CatalogProduct;
  const d = catalogDecision(resp({ products: [row(1, ["roses"]), bozuk], featured_ids: [9, 1], categories: [catg(13, "roses", [9, 1])] }), false);
  assert.equal(d.mode, "catalog");
  if (d.mode !== "catalog") return;
  assert.deepEqual(d.catalog.products.map((p) => p.id), [1]);
  assert.deepEqual(d.catalog.featured_ids, [1]);
  assert.deepEqual(d.catalog.categories[0].product_ids, [1]);
});

test("yedek yol: kategori kartı görseli yalnız kategorinin kendi kapağı; ürün fotoğrafı kapak olmaz; ürünsüz kategori yok", async () => {
  const cats = [
    { slug: "roses", name: "Roses", image: "/r2/roses-cover.jpg", live_products: 78, product_slugs: ["p-red-roses"] },
    { slug: "boxed-roses", name: "Boxed Roses", image: null, live_products: 10, product_slugs: ["p-rose-box"] },
    { slug: "artificial", name: "Artificial", image: "/r2/a.jpg", live_products: 0, product_slugs: [] },
  ];
  assert.deepEqual(fallbackCategoryCards(cats), [
    { slug: "roses", name: "Roses", count: 78, image: "/r2/roses-cover.jpg" },
    { slug: "boxed-roses", name: "Boxed Roses", count: 10, image: null },
  ]);
  // Kaynak koruması: iki yedek yol da kategori kartına ürün detay görseli koymaz
  const { readFileSync } = await import("node:fs");
  const page = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  const data = readFileSync(new URL("./global/v80/data.ts", import.meta.url), "utf8");
  assert.ok(page.includes("tiles = fallbackCategoryCards(catalog.categories)") && !page.includes("kapakSlug"));
  assert.ok(data.includes("fallbackCategoryCards(catalog.categories)") && !data.includes("Kategori kapakları için her canlı kategorinin ilk ürünü"));
});

test("kategori yüzeyi: yeni API kart alanları → satırdan kart; eski API → bugünkü detay yolu", () => {
  assert.equal(hasCardFields([{ id: 1, image: null, delivery_model_code: null, slug: "a" }]), true);
  assert.equal(hasCardFields([{ slug: "a", name: "A", tr_slug: "a" }]), false);
  assert.equal(hasCardFields([{ id: "1", image: null, delivery_model_code: null }]), false); // BIGINT metin → eski yol
});

// ── Ana sayfa (V80): çip filtresi gerçek bağ ─────────────────────────────────
const src = (id: number, membership: string[], real: string[] | undefined): V80SourceProduct => ({
  id, tr_slug: `tr-${id}`, slug: `en-${id}`, name: `P${id}`, price_minor: 100_00, sale_price_minor: null, image: `/p${id}.webp`,
  same_day_available: true, delivery_model_code: "same_day_courier", is_new: false, is_bestseller: false,
  category_slugs: membership, ...(real ? { product_category_slugs: real } : {}),
});
const cat = (slug: string, live: number): V80SourceCategory => ({ slug, name: slug, live_products: live, min_price_minor: 1, image: `/c-${slug}.webp` });

test("ana sayfa: öne çıkanların çip filtresi gerçek bağa geçer; kategori sayıları API'den (katalog) aynen kalır", () => {
  const picked = [src(1, ["peonies"], ["roses"]), src(2, [], ["roses", "orchids"])];
  const products = applyRealCategorySlugs(picked);
  assert.ok(products);
  const cfg = defaultConfig();
  cfg.structure.shop.mode = "manual";
  cfg.structure.shop.products = picked.map((p) => ({ id: p.id, tr_slug: p.tr_slug }));
  const view = resolveV80({ locale: "en", config: cfg, home: null, products, categories: [cat("roses", 78), cat("orchids", 36), cat("peonies", 3)], livePages: new Set() });
  assert.deepEqual(applyFilters(view.shop.products, { category: "roses" }).map((p) => p.id), [1, 2]);
  assert.deepEqual(applyFilters(view.shop.products, { category: "peonies" }).map((p) => p.id), []); // sahte üyelik etkisiz
  assert.deepEqual(view.categories.map((c) => [c.slug, c.live]), [["roses", 78], ["orchids", 36], ["peonies", 3]]);
  assert.equal(applyRealCategorySlugs([src(1, ["roses"], undefined)]), null); // eski API → değişiklik yok
});

test("13 dil parametrik: tek ürün id; dil yalnız slug'ı değiştirir, sıra ve plan aynı", () => {
  assert.equal(GLOBAL_LOCALES.length, 13);
  let ref: number[] | null = null;
  for (const locale of GLOBAL_LOCALES) {
    const r = resp({ locale, products: resp().products.map((p) => ({ ...p, slug: `${locale}-${p.id}` })) });
    const d = catalogDecision(r, false);
    assert.equal(d.mode, "catalog", locale);
    if (d.mode !== "catalog") continue;
    const ids = flattenPlan(planLocationPage(d.catalog)).map((p) => p.id);
    if (!ref) ref = ids;
    assert.deepEqual(ids, ref, `${locale}: aynı merchandising planı`);
    assert.ok(d.catalog.products.every((p) => p.tr_slug === `tr-${p.id}` && p.slug === `${locale}-${p.id}`), locale);
  }
});

test("100+ kartlı ızgara: giriş animasyonu gecikmesi TR CategoryProductGrid standardıyla sınırlı (Math.min(idx, 7))", async () => {
  const { readFileSync } = await import("node:fs");
  const browser = readFileSync(new URL("../components/global/GlobalCatalogBrowser.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.ok(browser.includes("idx={Math.min(idx, 7)}"));
  assert.ok(!/<ProductCard[^>]*idx=\{idx\}/.test(page), "Global sayfada sınırsız idx gecikmesi yok");
});
