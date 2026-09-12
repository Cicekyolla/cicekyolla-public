// GLOBAL VERSION 80 — sözleşme, çözümleyici ve 13 dil kopya koruma testleri.
// Çalıştır: npm run test:unit  (node --test lib/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { GLOBAL_LOCALES } from "./global/config.ts";
import {
  parseStorefrontConfig, defaultConfig, defaultStructure, targetHref, referencedProductIds, V80_SECTION_IDS, V80_PAGE_KEY, V80_LOCALES,
} from "./global/v80/schema.ts";
import { V80_COPY, flattenCopy, mergedTexts, interp } from "./global/v80/copy.ts";
import { resolveV80, type V80SourceProduct, type V80SourceCategory } from "./global/v80/view.ts";
import { applyFilters } from "./global/v80/filters.ts";

const EN_KEYS = Object.keys(flattenCopy(V80_COPY.en)).sort();

test("13 dilin tamamı aynı düz anahtar kümesini taşır (eksik/fazla metin yok)", () => {
  for (const l of GLOBAL_LOCALES) {
    const keys = Object.keys(flattenCopy(V80_COPY[l])).sort();
    assert.deepEqual(keys, EN_KEYS, `${l} anahtar kümesi EN ile aynı olmalı`);
    for (const [k, v] of Object.entries(flattenCopy(V80_COPY[l]))) assert.ok(v.trim().length > 0, `${l}:${k} boş`);
  }
});

test("kopyada yasak vaat yok: saat/dakika sözü, 90 dk, uydurma sipariş sayısı, iade vaadi", () => {
  const YASAK = [
    /\b\d{1,2}[:.]\d{2}\b/, // HH:MM
    /\b90\s*(dk|min|мин|分)/i,
    /\b(214|3\.?412)\b/, // Figma demo sayıları
    /7\s*\/\s*24|24\s*\/\s*7/,
  ];
  for (const l of GLOBAL_LOCALES) {
    for (const [k, v] of Object.entries(flattenCopy(V80_COPY[l]))) {
      for (const re of YASAK) assert.ok(!re.test(v), `${l}:${k} yasak kalıp → ${v}`);
    }
  }
});

test("yer tutucular her dilde korunur ({n} {x} {price})", () => {
  for (const l of GLOBAL_LOCALES) {
    const f = flattenCopy(V80_COPY[l]);
    assert.ok(f["discovery.match"].includes("{n}"), `${l} discovery.match {n}`);
    assert.ok(f["shop.titleFor"].includes("{x}"), `${l} shop.titleFor {x}`);
    assert.ok(f["shop.more"].includes("{n}"), `${l} shop.more {n}`);
    assert.ok(f["categories.kinds"].includes("{n}"), `${l} categories.kinds {n}`);
    assert.ok(f["categories.from"].includes("{price}"), `${l} categories.from {price}`);
    assert.ok(f["destinations.districts"].includes("{n}"), `${l} destinations.districts {n}`);
  }
  assert.equal(interp("{n} picks", { n: 3 }), "3 picks");
});

test("schema locale listesi config ile birebir", () => {
  assert.deepEqual([...V80_LOCALES].sort(), [...GLOBAL_LOCALES].sort());
});

test("marka adı çevrilmez", () => {
  for (const l of GLOBAL_LOCALES) assert.equal(V80_COPY[l].card.brand, "ÇiçekYolla");
});

test("mergedTexts: yalnız bilinen anahtarlar ve x.* özel anahtarlar geçersiz kılınır", () => {
  const m = mergedTexts("de", { "hero.title1": "Hallo", "x.nav.custom": "Sonder", "evil.key": "nope" });
  assert.equal(m["hero.title1"], "Hallo");
  assert.equal(m["x.nav.custom"], "Sonder");
  assert.equal(m["evil.key"], undefined);
  assert.equal(m["hero.body"], V80_COPY.de.hero.body);
});

test("parseStorefrontConfig: bozuk JSON → null, boş nesne → varsayılan yapı, bilinmeyen bölüm atılır", () => {
  assert.equal(parseStorefrontConfig("{not json"), null);
  assert.equal(parseStorefrontConfig(42), null);
  const c = parseStorefrontConfig("{}");
  assert.ok(c);
  assert.deepEqual(c!.structure.sections.map((s) => s.id), [...V80_SECTION_IDS]);
  const d = parseStorefrontConfig(JSON.stringify({ structure: { sections: [{ id: "shop", enabled: false }, { id: "nope" }, { id: "hero" }] } }))!;
  assert.equal(d.structure.sections[0].id, "shop");
  assert.equal(d.structure.sections[0].enabled, false);
  assert.equal(d.structure.sections[1].id, "hero");
  assert.equal(d.structure.sections.length, V80_SECTION_IDS.length, "eksik bölümler sona eklenir");
});

test("parseStorefrontConfig: hedefler güvenli — javascript:/protocol-relative reddedilir, ürün/kategori referansı doğrulanır", () => {
  const c = parseStorefrontConfig(JSON.stringify({
    structure: {
      hero: { ctaTarget: { kind: "url", href: "javascript:alert(1)" }, cta2Target: { kind: "url", href: "//evil.com" } },
      shop: { mode: "manual", products: [{ id: 5, tr_slug: "gul" }, { id: "x" }, { tr_slug: "y" }], limit: 999, tabs: [{ key: "a", category: { id: 1, tr_slug: "guller", slugs: { de: "rosen", xx: "bad", en: "roses" } } }] },
    },
    texts: { "hero.title1": "  Hi  ", "bad key!": "x", "hero.body": "" },
  }))!;
  assert.equal(c.structure.hero.ctaTarget.kind, "none");
  assert.equal(c.structure.hero.cta2Target.kind, "none");
  assert.deepEqual(c.structure.shop.products, [{ id: 5, tr_slug: "gul" }]);
  assert.equal(c.structure.shop.limit, 80, "limit tavanı 80'e kırpılır (12 Eyl 2026: 48 → 80)");
  assert.deepEqual(c.structure.shop.tabs[0].category?.slugs, { de: "rosen", en: "roses" });
  assert.deepEqual(c.texts, { "hero.title1": "Hi" });
  assert.deepEqual(referencedProductIds(c.structure), [5]);
});

test("parseStorefrontConfig: vitrin 'ilk görünen' tavanı 80 (12 Eyl 2026: 48 → 80); alt sınır 4 aynı", () => {
  const limitOf = (limit: number) =>
    parseStorefrontConfig(JSON.stringify({ structure: { shop: { mode: "manual", products: [], limit } } }))!.structure.shop.limit;
  assert.equal(limitOf(48), 48, "eski tavan hâlâ geçerli bir değer");
  assert.equal(limitOf(49), 49, "48 üstü artık kırpılmıyor");
  assert.equal(limitOf(80), 80, "yeni tavan aynen korunur");
  assert.equal(limitOf(81), 80, "tavan aşılırsa 80'e kırpılır (mevcut davranış)");
  assert.equal(limitOf(3), 4, "alt sınır değişmedi");
  // 80 ürünlük seçim parse turunda AYNEN korunur (ürün dizisinde tavan yok, sıra bozulmaz).
  const p80 = Array.from({ length: 80 }, (_, i) => ({ id: i + 1, tr_slug: `urun-${i + 1}` }));
  const c80 = parseStorefrontConfig(JSON.stringify({ structure: { shop: { mode: "manual", products: p80, limit: 80 } } }))!;
  assert.equal(c80.structure.shop.products.length, 80);
  assert.deepEqual(c80.structure.shop.products[0], { id: 1, tr_slug: "urun-1" });
  assert.deepEqual(c80.structure.shop.products[79], { id: 80, tr_slug: "urun-80" });
  assert.deepEqual(referencedProductIds(c80.structure).slice(0, 3), [1, 2, 3]);
  assert.equal(referencedProductIds(c80.structure).length, 80);
});

test("targetHref: kategori yalnız o dilde CANLI ise, sayfa yalnız yayımlıysa, whatsapp/anchor her zaman", () => {
  const ctx = { locale: "de", categorySegment: "kategorie", whatsapp: "https://wa.me/1", liveCategorySlugs: new Set(["rosen"]), livePages: new Set(["istanbul"]) };
  const ref = { id: 1, tr_slug: "guller", slugs: { de: "rosen", en: "roses" } };
  assert.equal(targetHref({ kind: "category", ref }, ctx), "/de/kategorie/rosen");
  assert.equal(targetHref({ kind: "category", ref: { ...ref, slugs: { de: "orchideen" } } }, ctx), null);
  assert.equal(targetHref({ kind: "category", ref }, { ...ctx, locale: "fr", categorySegment: "categorie" }), null);
  assert.equal(targetHref({ kind: "destination", city: "istanbul" }, ctx), "/de/istanbul");
  assert.equal(targetHref({ kind: "destination", city: "antalya" }, ctx), null);
  assert.equal(targetHref({ kind: "anchor", id: "shop" }, ctx), "#shop");
  assert.equal(targetHref({ kind: "whatsapp" }, ctx), "https://wa.me/1");
  assert.equal(targetHref({ kind: "none" }, ctx), null);
  assert.equal(V80_PAGE_KEY, "storefront");
});

const P = (o: Partial<V80SourceProduct> & { id: number }): V80SourceProduct => ({
  tr_slug: `tr-${o.id}`, slug: `de-${o.id}`, name: `P${o.id}`, price_minor: 100000, sale_price_minor: null, image: "/x.jpg",
  same_day_available: false, delivery_model_code: null, is_new: false, is_bestseller: false, category_slugs: [], ...o,
});
const C = (slug: string, live: number, extra: Partial<V80SourceCategory> = {}): V80SourceCategory => ({ slug, name: slug.toUpperCase(), live_products: live, min_price_minor: 50000, image: "/c.jpg", ...extra });

test("resolveV80 (varsayılan config): canlı kategoriler nav/sekme/kategori/koleksiyon olur, 0 canlı kategori gizlenir, hedefsiz çipler gizlenir", () => {
  const v = resolveV80({
    locale: "de", config: null, home: null,
    products: [P({ id: 1, category_slugs: ["rosen"], same_day_available: true }), P({ id: 2, category_slugs: ["orchideen"], delivery_model_code: "cargo", sale_price_minor: 80000 })],
    categories: [C("rosen", 5), C("orchideen", 2), C("leer", 0)],
    livePages: new Set(["istanbul", "antalya"]),
    districtCounts: { istanbul: 39 },
  });
  assert.deepEqual(v.nav.map((n) => n.href), ["/de/kategorie/rosen", "/de/kategorie/orchideen"]);
  assert.deepEqual(v.shop.tabs.map((t) => t.slug), ["rosen", "orchideen"]);
  assert.equal(v.categories.length, 2, "0 canlı kategori vitrine çıkmaz");
  assert.equal(v.collections.length, 2);
  // Vesile/kime çipleri: hedef yok → grup hiç basılmaz; kategori/destinasyon otomatik grupları basılır.
  assert.deepEqual(v.discovery.map((g) => g.key), ["what", "where"]);
  assert.equal(v.discovery[1].chips.find((c) => c.key === "antalya")?.href, "/de/antalya");
  assert.equal(v.discovery[1].chips.find((c) => c.key === "izmir")?.href, null, "yayımsız şehir bağlantısız");
  // Ürün: gerçek fiyat/indirim/teslimat alanları
  const p2 = v.shop.products.find((p) => p.id === 2)!;
  assert.equal(p2.hasSale, true); assert.equal(p2.priceMinor, 80000); assert.equal(p2.originalPriceMinor, 100000); assert.equal(p2.cargo, true);
  assert.equal(v.shop.products[0].sameDay, true);
  assert.equal(v.shop.products[0].href, "/de/produkt/de-1");
  assert.equal(v.destinations.find((d) => d.city === "istanbul")?.districts, 39);
  assert.equal(v.destinations.find((d) => d.city === "mugla")?.href, null);
  assert.equal(v.heroTitle.source, "default");
  assert.equal(v.sections.length, V80_SECTION_IDS.length);
});

test("resolveV80: SEO satırı h1 hero başlığı olur; Vitrin metni geçersiz kılarsa o kazanır", () => {
  const home = { locale: "en", page_key: "home", h1: "Send flowers to Istanbul", seo_title: null, meta_description: null, intro_html: "<p>x</p>", content_html: null, faq: [{ q: "Q", a: "A" }], indexable: true, updated_at: "", locales: [] };
  const v1 = resolveV80({ locale: "en", config: null, home, products: [], categories: [], livePages: new Set() });
  assert.deepEqual(v1.heroTitle, { lines: ["Send flowers to Istanbul"], em: null, source: "seo" });
  assert.equal(v1.content.intro, "<p>x</p>");
  assert.equal(v1.content.faq.length, 1);
  const cfg = defaultConfig(); cfg.texts = { "hero.titleEm": "with love." };
  const v2 = resolveV80({ locale: "en", config: cfg, home, products: [], categories: [], livePages: new Set() });
  assert.equal(v2.heroTitle.source, "override");
  assert.equal(v2.heroTitle.em, "with love.");
});

test("resolveV80 (manuel): ürün sırası korunur, dilde canlı olmayan referans atlanır, bölüm sırası/görünürlüğü uygulanır", () => {
  const s = defaultStructure();
  s.shop.mode = "manual";
  s.shop.products = [{ id: 3, tr_slug: "c" }, { id: 1, tr_slug: "a" }, { id: 99, tr_slug: "yok" }];
  s.sections = [{ id: "shop", enabled: true }, { id: "hero", enabled: false }];
  s.discovery[1].chips[0].target = { kind: "category", ref: { id: 1, tr_slug: "guller", slugs: { de: "rosen" } } };
  const v = resolveV80({ locale: "de", config: { v: 1, structure: s, texts: {} }, home: null, products: [P({ id: 1 }), P({ id: 3 })], categories: [C("rosen", 1)], livePages: new Set() });
  assert.deepEqual(v.shop.products.map((p) => p.id), [3, 1]);
  assert.equal(v.sections[0], "shop");
  assert.ok(!v.sections.includes("hero"));
  const occ = v.discovery.find((g) => g.key === "occasion")!;
  assert.equal(occ.chips.length, 1);
  assert.deepEqual(occ.chips[0].filter, { kind: "category", slug: "rosen", label: "ROSEN" });
});

test("applyFilters: kategori üyeliği ve kargo şehri (yalnız kargolanabilir) gerçek alanlarla süzer", () => {
  const v = resolveV80({ locale: "en", config: null, home: null, products: [P({ id: 1, category_slugs: ["roses"] }), P({ id: 2, category_slugs: ["roses"], delivery_model_code: "same_day_and_cargo" }), P({ id: 3 })], categories: [C("roses", 2)], livePages: new Set() });
  assert.deepEqual(applyFilters(v.shop.products, { category: "roses" }).map((p) => p.id), [1, 2]);
  assert.deepEqual(applyFilters(v.shop.products, { destination: "antalya" }).map((p) => p.id), [2]);
  assert.deepEqual(applyFilters(v.shop.products, { destination: "istanbul" }).map((p) => p.id), [1, 2, 3]);
  assert.deepEqual(applyFilters(v.shop.products, { category: "roses", destination: "izmir" }).map((p) => p.id), [2]);
});

test("RTL: Arapça görünüm dir=rtl, metinler Arapça", () => {
  const v = resolveV80({ locale: "ar", config: null, home: null, products: [], categories: [], livePages: new Set() });
  assert.equal(v.dir, "rtl");
  assert.ok(/[؀-ۿ]/.test(v.texts["hero.body"]));
});
