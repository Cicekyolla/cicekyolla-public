// GLOBAL KATALOG — kategori + lokasyon yüzeyleri (saf modül testleri).
// Çalıştır: npm run test:unit  (node --test lib/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { GLOBAL_LOCALES } from "./global/config.ts";
import {
  catalogDecision, planLocationPage, flattenPlan, applyRealCategorySlugs, hasCardFields,
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

test("katalog ≠ vitrin: vitrinde OLMAYAN ürün (1,3,4,6) planda görünür; her ürün TAM BİR KEZ", () => {
  const d = catalogDecision(resp(), false);
  assert.equal(d.mode, "catalog");
  if (d.mode !== "catalog") return;
  const plan = planLocationPage(d.catalog);
  assert.deepEqual(plan.featured.map((p) => p.id), [5, 2]); // vitrin sırası
  // Raflar: dar kategoriden geniş kategoriye (peonies 1, orchids 2, roses 3); raf içi admin sırası
  assert.deepEqual(plan.shelves.map((s) => [s.slug, s.products.map((p) => p.id)]), [["peonies", [6]], ["orchids", [4]], ["roses", [3, 1]]]);
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
  assert.deepEqual(plan.tiles.map((t) => [t.slug, t.count]), [["roses", 2], ["orchids", 1]]); // boş şakayık kartı yok
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
