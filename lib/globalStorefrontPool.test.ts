// GLOBAL VİTRİN SEÇİM HAVUZU — kategori + lokasyon yüzeylerine yayılım (saf modül testleri).
// Çalıştır: npm run test:unit  (node --test lib/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { GLOBAL_LOCALES } from "./global/config.ts";
import {
  poolDecision, poolForCategory, poolCategoryStats, planLocationSections, applyPoolToStorefront, effectivePriceMinor,
  type PoolProduct, type StorefrontPoolResponse,
} from "./global/storefrontPool.ts";
import { resolveV80, type V80SourceProduct, type V80SourceCategory } from "./global/v80/view.ts";
import { applyFilters } from "./global/v80/filters.ts";
import { defaultConfig } from "./global/v80/schema.ts";

const row = (id: number, cats: string[], o: Partial<PoolProduct> = {}): PoolProduct => ({
  id, tr_slug: `tr-${id}`, slug: `en-${id}`, name: `P${id}`, price_minor: 100_00 * id, sale_price_minor: null,
  image: `https://x.r2.dev/p${id}.webp`, blurhash: null, derivatives: null, same_day_available: true,
  delivery_model_code: "same_day_courier", is_new: false, is_bestseller: false,
  category_slugs: [], product_category_slugs: cats, product_type: "flower", delivery_scope: "istanbul", ...o,
});
const resp = (products: PoolProduct[], o: Partial<StorefrontPoolResponse> = {}): StorefrontPoolResponse => ({
  selection: "manual", ids: products.map((p) => p.id), location: null, products, ...o,
});

test("karar: uç yok / ağ hatası / bozuk yanıt → bugünkü davranış (ne topluca gizle ne topluca aç)", () => {
  assert.deepEqual(poolDecision(null, false), { mode: "fallback" });
  assert.deepEqual(poolDecision(null, true), { mode: "fallback" });
  assert.deepEqual(poolDecision("<html>", false), { mode: "fallback" });
  assert.deepEqual(poolDecision({ selection: "manual", products: "x" }, false), { mode: "fallback" });
});

test("karar: vitrin kaydı yok / taslak / otomatik mod (selection=none) → bugünkü V80 varsayılanı", () => {
  assert.deepEqual(poolDecision(resp([], { selection: "none", ids: [] }), false), { mode: "fallback" });
  assert.deepEqual(poolDecision(resp([], { selection: "none", ids: [], location: { city: "istanbul", district: null, neighborhood: null, found: false, same_day: true } }), true), { mode: "fallback" });
});

test("karar: APPROVED elle seçim → havuz; lokasyon çözülemedi → boş havuz (fail closed); lokasyon yanıtta yoksa bugünkü davranış", () => {
  const p = [row(1, ["roses"]), row(2, ["orchids"])];
  assert.deepEqual(poolDecision(resp(p), false), { mode: "pool", products: p });
  const loc = { city: "istanbul", district: "maltepe", neighborhood: "altaycesme-mah", found: true, same_day: true };
  assert.deepEqual(poolDecision(resp(p, { location: loc }), true), { mode: "pool", products: p });
  assert.deepEqual(poolDecision(resp(p, { location: { ...loc, found: false } }), true), { mode: "pool", products: [] });
  assert.deepEqual(poolDecision(resp(p, { location: null }), true), { mode: "fallback" });
  // Sözleşme dışı satır elenir (gerçek kategori bağı olmayan satır yüzeye giremez)
  const bozuk = { ...row(3, []), product_category_slugs: undefined } as unknown as PoolProduct;
  assert.deepEqual(poolDecision(resp([p[0], bozuk]), false), { mode: "pool", products: [p[0]] });
});

test("kategori matrisi: seçili+gerçek kategori → GÖSTER, yanlış kategori → GİZLE, seçili olmayan → havuzda yok, çoklu bağ korunur", () => {
  // Havuz API'den gelir: seçili değil / pasif / dilde canlı değil ürünler ZATEN yoktur.
  const havuz = [row(10, ["roses", "flower-for-my-love"]), row(11, ["orchids"]), row(12, ["roses"])];
  assert.deepEqual(poolForCategory(havuz, "roses").map((p) => p.id), [10, 12]);
  assert.deepEqual(poolForCategory(havuz, "orchids").map((p) => p.id), [11]);
  assert.deepEqual(poolForCategory(havuz, "flower-for-my-love").map((p) => p.id), [10]);
  assert.deepEqual(poolForCategory(havuz, "peonies"), []);
  // Global üyelik (076) alanı bu zincirde karar vermez
  assert.deepEqual(poolForCategory([row(13, ["orchids"], { category_slugs: ["roses"] })], "roses"), []);
});

test("sayılar: kategori başına havuz sayısı, indirimli en düşük fiyat, ilk ürün kapak", () => {
  const havuz = [row(2, ["roses"]), row(5, ["roses", "orchids"], { sale_price_minor: 150_00 }), row(1, ["orchids"])];
  const s = poolCategoryStats(havuz);
  assert.equal(s.get("roses")?.count, 2);
  assert.equal(s.get("roses")?.minPriceMinor, 150_00);
  assert.equal(s.get("roses")?.first.id, 2);
  assert.equal(s.get("orchids")?.count, 2);
  assert.equal(s.get("orchids")?.minPriceMinor, 100_00);
  assert.equal(effectivePriceMinor({ price_minor: 100, sale_price_minor: 120 }), 100); // geçersiz indirim yok sayılır
});

test("lokasyon planı: kategori kartları katalog sırasıyla (yalnız ürünü olan); teslim edilebilir seçili ürünlerin TAMAMI seçim sırasıyla (8'e kırpılmaz)", () => {
  const cats = [{ slug: "orchids", name: "Orchids" }, { slug: "peonies", name: "Peonies" }, { slug: "roses", name: "Roses" }];
  const havuz = Array.from({ length: 55 }, (_, i) => row(i + 1, i < 5 ? ["roses"] : i < 7 ? ["orchids"] : ["roses", "orchids"]));
  const plan = planLocationSections(cats, havuz);
  assert.deepEqual(plan.tiles.map((t) => [t.slug, t.count, t.cover.id]), [["orchids", 50, 6], ["roses", 53, 1]]);
  assert.equal(plan.products.length, 55);
  assert.deepEqual(plan.products.slice(18, 21).map((p) => p.id), [19, 20, 21]); // 20. sıradaki ürün de görünür
  assert.deepEqual(planLocationSections(cats, []), { tiles: [], products: [] });
});

test("lokasyon: teslim edilemeyen ürün havuzda yoksa hiçbir kart/raf/sayıda görünmez (Muğla örneği)", () => {
  const cats = [{ slug: "roses", name: "Roses" }];
  const istanbul = [row(1, ["roses"]), row(2, ["roses"], { delivery_model_code: "same_day_and_cargo" })];
  const mugla = istanbul.filter((p) => p.delivery_model_code !== "same_day_courier"); // API teslimat filtresi sonrası
  assert.deepEqual(planLocationSections(cats, istanbul).tiles[0].count, 2);
  const m = planLocationSections(cats, mugla);
  assert.deepEqual(m.products.map((p) => p.id), [2]);
  assert.deepEqual(m.tiles.map((t) => t.count), [1]);
});

// ── Ana sayfa (V80) ↔ kategori yüzeyi tutarlılığı ───────────────────────────
const src = (id: number, membership: string[], real: string[] | undefined): V80SourceProduct => ({
  id, tr_slug: `tr-${id}`, slug: `en-${id}`, name: `P${id}`, price_minor: 100_00 + id, sale_price_minor: null, image: `/p${id}.webp`,
  same_day_available: true, delivery_model_code: "same_day_courier", is_new: false, is_bestseller: false,
  category_slugs: membership, ...(real ? { product_category_slugs: real } : {}),
});
const cat = (slug: string, live: number): V80SourceCategory => ({ slug, name: slug.toUpperCase(), live_products: live, min_price_minor: 1, image: `/c-${slug}.webp` });

test("ana sayfa elle seçim: çip filtresi gerçek kategori bağına geçer ve /category/<slug> havuzuyla AYNI kümeyi verir", () => {
  const picked = [src(1, ["roses"], ["roses"]), src(2, [], ["roses", "orchids"]), src(3, ["orchids"], ["peonies"])];
  const categories = [cat("roses", 34), cat("orchids", 19), cat("peonies", 9), cat("collections", 14)];
  const real = applyPoolToStorefront(picked, categories);
  assert.ok(real);
  const cfg = defaultConfig();
  cfg.structure.shop.mode = "manual";
  cfg.structure.shop.products = picked.map((p) => ({ id: p.id, tr_slug: p.tr_slug }));
  const view = resolveV80({ locale: "en", config: cfg, home: null, products: real.products, categories: real.categories, livePages: new Set() });
  const havuz = picked.map((p) => row(p.id, p.product_category_slugs ?? []));
  for (const slug of ["roses", "orchids", "peonies"]) {
    assert.deepEqual(applyFilters(view.shop.products, { category: slug }).map((p) => p.id), poolForCategory(havuz, slug).map((p) => p.id), slug);
  }
  // Kart sayıları havuzdan; seçili ürünü olmayan kategori (collections) gizlenir; kapak seçili üründen
  assert.deepEqual(view.categories.map((c) => [c.slug, c.live]), [["roses", 2], ["orchids", 1], ["peonies", 1]]);
  assert.equal(real.categories.find((c) => c.slug === "roses")?.image, "/p1.webp");
  assert.equal(real.categories.find((c) => c.slug === "roses")?.min_price_minor, 100_01);
});

test("ana sayfa: API alanı yoksa (eski uç) hiçbir şey değişmez", () => {
  assert.equal(applyPoolToStorefront([src(1, ["roses"], undefined)], [cat("roses", 3)]), null);
});

test("13 dil parametrik: tek ürün id'si, dil yüzeyi yalnız slug/ad/kategori slug'ı değiştirir", () => {
  assert.equal(GLOBAL_LOCALES.length, 13);
  const katSlug: Record<string, string> = { de: "rosen", en: "roses", fr: "roses-fr", nl: "rozen", it: "rose", es: "rosas", pt: "rosas-pt", az: "qizilgul", ru: "rozy", ar: "wurud", zh: "meigui", ja: "bara", ko: "jangmi" };
  for (const locale of GLOBAL_LOCALES) {
    const s = katSlug[locale];
    const havuz = [row(1474, [s], { slug: `${locale}-signature` }), row(999, ["x"], { slug: `${locale}-red` })];
    const r = poolDecision(resp(havuz), false);
    assert.equal(r.mode, "pool", locale);
    const gorunen = r.mode === "pool" ? poolForCategory(r.products, s) : [];
    assert.deepEqual(gorunen.map((p) => [p.id, p.tr_slug, p.slug]), [[1474, "tr-1474", `${locale}-signature`]], locale);
  }
});
