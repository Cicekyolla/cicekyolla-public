// GLOBAL VERSION 80 — sözleşme, çözümleyici ve 13 dil kopya koruma testleri.
// Çalıştır: npm run test:unit  (node --test lib/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { GLOBAL_LOCALES } from "./global/config.ts";
import {
  parseStorefrontConfig, defaultConfig, defaultStructure, targetHref, referencedProductIds, V80_SECTION_IDS, V80_PAGE_KEY, V80_LOCALES,
  V80_SCHEMA_VERSION, activeProductRefs, mapStructureImages, v80ImageUnoptimized,
} from "./global/v80/schema.ts";
import { mediaUrlOrNull } from "./media.ts";
import { V80_COPY, flattenCopy, mergedTexts, interp } from "./global/v80/copy.ts";
import { resolveV80, hasCategoryOrder, type V80SourceProduct, type V80SourceCategory } from "./global/v80/view.ts";
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

// ── Sürüm 2 (Global Master Faz): ileri uyumluluk, vitrin aktifliği, mobil hero, gizli bölüm hedefleri ──

test("şema sürümü 2; ayrıştırıcı v1 ve v2 belgelerini aynı yoldan okur", () => {
  assert.equal(V80_SCHEMA_VERSION, 2);
  assert.equal(defaultConfig().v, 2);
  const v1 = parseStorefrontConfig(JSON.stringify({ v: 1, structure: { hero: { image: "/h.jpg" } }, texts: { "hero.title1": "Hi" } }))!;
  assert.equal(v1.v, 1, "belgenin kendi sürümü korunur");
  assert.equal(v1.structure.hero.image, "/h.jpg");
  assert.deepEqual(v1.structure.banners, [], "v1 belgesinde banner yok → boş liste");
  const v2 = parseStorefrontConfig(JSON.stringify({ v: 2, structure: { banners: [{ key: "yaz", image: "/b.jpg" }] }, texts: {} }))!;
  assert.equal(v2.v, 2);
  assert.equal(v2.structure.banners[0].key, "yaz");
});

test("ileri uyumluluk: bilinmeyen üst düzey structure anahtarları HAM korunur; parse(serialize(parse(x))) aynı kalır", () => {
  const raw = {
    v: 3,
    structure: {
      sections: [{ id: "shop", enabled: true }, { id: "gelecek_bolum", enabled: true }],
      locationSections: [{ id: "commerce", enabled: true }, { id: "trust", enabled: false }],
      categoryOrder: [12, 4, 9],
      futureWidget: { mode: "x", items: [1, { a: null }] },
    },
    texts: { "x.banner.yaz.title": "Sommer" },
  };
  const a = parseStorefrontConfig(JSON.stringify(raw))!;
  const extra = a.structure as unknown as Record<string, unknown>;
  assert.deepEqual(a.structure.locationSections, raw.structure.locationSections);
  assert.deepEqual(a.structure.categoryOrder, [12, 4, 9]);
  assert.deepEqual(extra.futureWidget, raw.structure.futureWidget);
  // Public bilinmeyen bölüm id'sini basmaz (bugünkü gibi).
  assert.ok(!a.structure.sections.some((s) => (s.id as string) === "gelecek_bolum"));
  const b = parseStorefrontConfig(JSON.stringify(a))!;
  assert.deepEqual(b.structure, a.structure, "ikinci tur yapıyı değiştirmez");
  const bx = b.structure as unknown as Record<string, unknown>;
  assert.deepEqual(bx.futureWidget, raw.structure.futureWidget);
  assert.deepEqual(b.structure.locationSections, raw.structure.locationSections);
  assert.equal(b.v, 3, "ileri sürüm numarası da korunur (ayrıştırıcı asla fırlatmaz)");
});

test("ileri uyumluluk: güvensiz anahtar adları taşınmaz (__proto__, boşluklu ad); prototip kirlenmez", () => {
  const c = parseStorefrontConfig('{"structure":{"__proto__":{"polluted":true},"bad key":1,"ok_key":2}}')!;
  const extra = c.structure as unknown as Record<string, unknown>;
  assert.equal(Object.prototype.hasOwnProperty.call(extra, "__proto__"), false);
  assert.equal(extra["bad key"], undefined);
  assert.equal(extra.ok_key, 2);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal((extra as { polluted?: unknown }).polluted, undefined);
});

test("vitrin satırı aktifliği: enabled yalnız boolean ise taşınır; pasif satır gösterilmez, sıra korunur", () => {
  const c = parseStorefrontConfig(JSON.stringify({ structure: { shop: { mode: "manual", products: [
    { id: 3, tr_slug: "c", enabled: false }, { id: 1, tr_slug: "a", enabled: true }, { id: 2, tr_slug: "b", enabled: "evet" }, { id: 4, tr_slug: "d" },
  ] } } }))!;
  assert.deepEqual(c.structure.shop.products, [
    { id: 3, tr_slug: "c", enabled: false }, { id: 1, tr_slug: "a", enabled: true }, { id: 2, tr_slug: "b" }, { id: 4, tr_slug: "d" },
  ]);
  assert.deepEqual(activeProductRefs(c.structure).map((r) => r.id), [1, 2, 4]);
  assert.deepEqual(referencedProductIds(c.structure), [3, 1, 2, 4], "referans listesi (motor çözümü) değişmedi");
  const v = resolveV80({ locale: "de", config: c, home: null, products: [P({ id: 1 }), P({ id: 2 }), P({ id: 3 }), P({ id: 4 })], categories: [C("rosen", 1)], livePages: new Set() });
  assert.deepEqual(v.shop.products.map((p) => p.id), [1, 2, 4]);
});

test("vitrin satırı aktifliği: tüm satırlar pasifse boş seçimle aynı davranış (otomatik havuz)", () => {
  const cfg = defaultConfig();
  cfg.structure.shop.mode = "manual";
  cfg.structure.shop.products = [{ id: 9, tr_slug: "x", enabled: false }];
  const v = resolveV80({ locale: "de", config: cfg, home: null, products: [P({ id: 1 }), P({ id: 9 })], categories: [], livePages: new Set() });
  assert.deepEqual(v.shop.products.map((p) => p.id), [1, 9]);
});

test("hero mobil görseli ayrıştırılır ve görünüm modeline taşınır; yoksa null (masaüstü görsel kullanılır)", () => {
  const c = parseStorefrontConfig(JSON.stringify({ structure: { hero: { image: "/d.jpg", imageMobile: "  /m.jpg " } } }))!;
  const v = resolveV80({ locale: "en", config: c, home: null, products: [], categories: [], livePages: new Set() });
  assert.equal(v.heroImage, "/d.jpg");
  assert.equal(v.heroImageMobile, "/m.jpg");
  const d = resolveV80({ locale: "en", config: null, home: null, products: [], categories: [], livePages: new Set() });
  assert.equal(d.heroImageMobile, null);
  assert.equal(d.heroImage, "/global/v80/hero.jpg");
});

test("gizli bölüme işaret eden çapa hedefi null olur → mevcut yedekler (ilk canlı kategori) devreye girer", () => {
  const s = defaultStructure();
  s.sections = s.sections.map((x) => (x.id === "shop" || x.id === "journey" ? { ...x, enabled: false } : x));
  s.nav = [{ key: "vitrin", target: { kind: "anchor", id: "shop" }, enabled: true }, { key: "icerik", target: { kind: "anchor", id: "content" }, enabled: true }];
  s.discovery[0].chips = [{ key: "mother", target: { kind: "anchor", id: "journey" }, enabled: true }];
  const cfg = { v: 2, structure: s, texts: { "x.nav.vitrin": "Shop", "x.nav.icerik": "Mehr" } };
  const v = resolveV80({ locale: "de", config: cfg, home: null, products: [P({ id: 1 })], categories: [C("rosen", 3)], livePages: new Set() });
  assert.equal(v.heroCtaHref, "/de/kategorie/rosen", "hero CTA (#shop gizli) → ilk canlı kategori");
  assert.equal(v.heroCta2Href, null, "ikinci CTA (#journey gizli) basılmaz");
  assert.equal(v.card.href, null, "kart CTA (#shop gizli) basılmaz");
  assert.equal(v.ctaHref, "/de/kategorie/rosen", "kapanış CTA yedeğe düşer");
  assert.equal(v.shop.promo?.href, null, "promo (#journey gizli) bağlantısız");
  assert.deepEqual(v.nav.map((n) => n.href), ["#content"], "gizli bölüm menüden düşer; açık bölüm çapası kalır");
  assert.ok(!v.discovery.some((g) => g.key === "who"), "gizli bölüme giden tek çip düşer → grup basılmaz");
  // Duygu: vitrin gizliyken filtre düğmesi yok; hedefsiz öğe ilk canlı kategoriye bağlanır.
  const love = v.mood.find((m) => m.key === "love")!;
  assert.equal(love.filter, null);
  assert.equal(love.href, "/de/kategorie/rosen");
  // Bölüm OLMAYAN çapa bugünkü gibi çözülür.
  assert.equal(targetHref({ kind: "anchor", id: "main-content" }, { locale: "de", categorySegment: "kategorie", whatsapp: "" }), "#main-content");
  // Kontrol: aynı yapı, bölümler açık → çip ve menü çapası basılır.
  const open = { ...s, sections: defaultStructure().sections };
  const vo = resolveV80({ locale: "de", config: { ...cfg, structure: open }, home: null, products: [P({ id: 1 })], categories: [C("rosen", 3)], livePages: new Set() });
  assert.deepEqual(vo.discovery.find((g) => g.key === "who")?.chips.map((c) => c.href), ["#journey"]);
  assert.deepEqual(vo.nav.map((n) => n.href), ["#shop", "#content"]);
});

test("vitrin açıkken duygu/hero çapaları bugünkü gibi (#shop) — davranış değişmez", () => {
  const v = resolveV80({ locale: "de", config: null, home: null, products: [P({ id: 1 })], categories: [C("rosen", 3)], livePages: new Set() });
  assert.equal(v.heroCtaHref, "#shop");
  assert.equal(v.heroCta2Href, "#journey");
  assert.equal(v.card.href, "#shop");
  assert.equal(v.mood.find((m) => m.key === "love")?.href, "#shop");
});

test("yapı görselleri tek dönüştürücüden geçer (r2.dev → /r2); göreli yol aynen; HAM anahtarlar ve girdi korunur", () => {
  const R2 = "https://pub-abc.r2.dev";
  const c = parseStorefrontConfig(JSON.stringify({
    structure: {
      hero: { image: `${R2}/hero.jpg`, imageMobile: `${R2}/hero-m.jpg` },
      shop: { promo: { image: `${R2}/promo.jpg` } },
      collections: { mode: "manual", items: [{ key: "k", category: { id: 1, tr_slug: "g", slugs: {} }, image: `${R2}/col.jpg` }] },
      mood: { items: [{ key: "love", image: `${R2}/mood.jpg` }] },
      destinations: { items: [{ city: "istanbul", image: "https://cdn.example.com/ist.jpg" }] },
      banners: [{ key: "yaz", image: `${R2}/b.jpg`, imageMobile: "/global/v80/b-m.jpg" }],
      categoryOrder: [3],
    },
  }))!;
  const before = JSON.stringify(c.structure);
  const n = mapStructureImages(c.structure, mediaUrlOrNull);
  assert.equal(n.hero.image, "/r2/hero.jpg");
  assert.equal(n.hero.imageMobile, "/r2/hero-m.jpg");
  assert.equal(n.shop.promo.image, "/r2/promo.jpg");
  assert.equal(n.collections.items[0].image, "/r2/col.jpg");
  assert.equal(n.mood.items[0].image, "/r2/mood.jpg");
  assert.equal(n.destinations.items[0].image, "https://cdn.example.com/ist.jpg", "harici CDN değişmez");
  assert.equal(n.banners[0].image, "/r2/b.jpg");
  assert.equal(n.banners[0].imageMobile, "/global/v80/b-m.jpg");
  assert.deepEqual(n.categoryOrder, [3]);
  assert.equal(JSON.stringify(c.structure), before, "girdi değiştirilmez");
  assert.equal(mapStructureImages(defaultStructure(), mediaUrlOrNull).hero.imageMobile, null, "null korunur");
});

// ── schema-1 (DESIGN 1.6): Vitrin › Kategori sırası ana sayfada da geçerli ──────────────────────────
// API /storefront (ve /catalog) kategori listesine categoryOrder'ı zaten uygular (listedekiler önce,
// kalanlar alfabetik). Public, sıra kaydedilmişse bu sırayı canlı ürün sayısına göre YENİDEN SIRALAMAZ.
const API_ORDERED = (): V80SourceCategory[] => [
  // Operatör Çelenk'i (en az canlı ürün) başa aldı; ardından listedeki orkide; kalanlar API'de alfabetik.
  C("celenk", 1), C("orkide", 3), C("aranjman", 9), C("bos", 0), C("buket", 8), C("gul", 7), C("kaktus", 6), C("lale", 5), C("papatya", 4), C("sukulent", 2),
];
const orderCfg = (categoryOrder: unknown) => parseStorefrontConfig(JSON.stringify({ v: 2, structure: { categoryOrder }, texts: {} }))!;
const LIVE_API_ORDER = ["celenk", "orkide", "aranjman", "buket", "gul", "kaktus", "lale", "papatya", "sukulent"];
const LIVE_COUNT_ORDER = ["aranjman", "buket", "gul", "kaktus", "lale", "papatya", "orkide", "sukulent", "celenk"];

test("schema-1: categoryOrder doluysa 'Ne' çipleri, otomatik menü/sekme, kategori kartları, koleksiyonlar ve yedek bağlantı API sırasını KORUR", () => {
  const v = resolveV80({ locale: "de", config: orderCfg([14, 7]), home: null, products: [], categories: API_ORDERED(), livePages: new Set() });
  const what = v.discovery.find((g) => g.key === "what")!;
  assert.deepEqual(what.chips.map((c) => c.key), LIVE_API_ORDER.slice(0, 8), "Ne çipleri operatör sırasıyla (ilk 8)");
  assert.equal(what.chips[0].key, "celenk", "başa alınan az ürünlü kategori ilk çip");
  assert.deepEqual(what.chips[0].filter, { kind: "category", slug: "celenk", label: "CELENK" });
  assert.deepEqual(v.categories.map((c) => c.slug), LIVE_API_ORDER.slice(0, 8), "Türe göre keşfet kartları aynı sıra (limit 8)");
  assert.deepEqual(v.nav.map((n) => n.key), LIVE_API_ORDER.slice(0, 6), "otomatik menü (ilk 6)");
  assert.deepEqual(v.shop.tabs.map((t) => t.slug), LIVE_API_ORDER.slice(0, 4), "otomatik sekmeler (ilk 4)");
  assert.deepEqual(v.collections.map((c) => c.key), LIVE_API_ORDER.slice(0, 3), "otomatik koleksiyonlar (ilk 3)");
  assert.equal(v.shop.allHref, "/de/kategorie/celenk", "yedek 'tümü' bağlantısı ilk sıradaki kategori");
  assert.ok(!v.categories.some((c) => c.slug === "bos"), "0 canlı ürünlü kategori sıra kaydı olsa da gizli");
});

test("schema-1: categoryOrder yok / boş / yalnız geçersiz öğe → bugünkü davranış (canlı ürün sayısına göre azalan, eşitlikte ad)", () => {
  // Hata senaryosunun karşıtı: sıra kaydı yokken Çelenk (1 ürün) ilk 8 çipe giremez.
  for (const [name, config] of [
    ["config yok", null],
    ["categoryOrder alanı yok", parseStorefrontConfig(JSON.stringify({ v: 2, structure: {}, texts: {} }))!],
    ["boş dizi", orderCfg([])],
    ["dizi değil", orderCfg("14,7")],
    ["yalnız geçersiz id'ler (API de sıra uygulamaz)", orderCfg(["14", 0, -3, 1.5, null])],
  ] as const) {
    const v = resolveV80({ locale: "de", config, home: null, products: [], categories: API_ORDERED(), livePages: new Set() });
    const what = v.discovery.find((g) => g.key === "what")!;
    assert.deepEqual(what.chips.map((c) => c.key), LIVE_COUNT_ORDER.slice(0, 8), `${name}: çipler canlı sayıya göre`);
    assert.ok(!what.chips.some((c) => c.key === "celenk"), `${name}: en az ürünlü kategori ilk 8'de değil`);
    assert.deepEqual(v.nav.map((n) => n.key), LIVE_COUNT_ORDER.slice(0, 6), `${name}: menü`);
    assert.deepEqual(v.categories.map((c) => c.slug), LIVE_COUNT_ORDER.slice(0, 8), `${name}: kartlar`);
  }
  // Eşitlikte ad sırası (değişmedi).
  const tie = resolveV80({ locale: "de", config: null, home: null, products: [], categories: [C("zeta", 2), C("alfa", 2)], livePages: new Set() });
  assert.deepEqual(tie.categories.map((c) => c.slug), ["alfa", "zeta"]);
});

test("schema-1: elle seçilen kategori/sekme/koleksiyon listeleri kendi sırasını korur (categoryOrder yalnız otomatik listeleri etkiler)", () => {
  const cfg = orderCfg([14]);
  const ref = (slug: string, id: number) => ({ id, tr_slug: slug, slugs: { de: slug } });
  cfg.structure.categories = { mode: "manual", items: [ref("gul", 1), ref("celenk", 2)], limit: 8 };
  cfg.structure.shop.tabs = [{ key: "t1", category: ref("lale", 3), enabled: true }];
  const v = resolveV80({ locale: "de", config: cfg, home: null, products: [], categories: API_ORDERED(), livePages: new Set() });
  assert.deepEqual(v.categories.map((c) => c.slug), ["gul", "celenk"]);
  assert.deepEqual(v.shop.tabs.map((t) => t.slug), ["lale"]);
  // Otomatik kalan yüzey (Ne çipleri) API sırasında.
  assert.equal(v.discovery.find((g) => g.key === "what")!.chips[0].key, "celenk");
});

test("schema-1: hasCategoryOrder ölçütü API storefrontCategoryOrder ile aynı (en az bir pozitif tam sayı id); girdi dizisi değiştirilmez", () => {
  assert.equal(hasCategoryOrder(null), false);
  assert.equal(hasCategoryOrder(undefined), false);
  assert.equal(hasCategoryOrder({}), false);
  assert.equal(hasCategoryOrder({ categoryOrder: [] }), false);
  assert.equal(hasCategoryOrder({ categoryOrder: "3" }), false);
  assert.equal(hasCategoryOrder({ categoryOrder: ["3", 0, -1, 1.5, null] }), false);
  assert.equal(hasCategoryOrder({ categoryOrder: [3] }), true);
  assert.equal(hasCategoryOrder({ categoryOrder: ["x", 5] }), true);
  assert.equal(hasCategoryOrder(defaultStructure()), false, "varsayılan yapıda sıra kaydı yok");
  const input = API_ORDERED();
  const snapshot = input.map((c) => c.slug);
  resolveV80({ locale: "de", config: null, home: null, products: [], categories: input, livePages: new Set() });
  resolveV80({ locale: "de", config: orderCfg([14]), home: null, products: [], categories: input, livePages: new Set() });
  assert.deepEqual(input.map((c) => c.slug), snapshot, "kaynak kategori dizisi yerinde sıralanmaz");
});

test("next/image optimizasyonu: göreli yerel yol optimize; mutlak, protokolsüz ve /r2/ proxy yolları optimize edilmez", () => {
  assert.equal(v80ImageUnoptimized("/global/v80/hero.jpg"), false);
  assert.equal(v80ImageUnoptimized("/r2/1700000000-homepage-banner.webp"), true);
  assert.equal(v80ImageUnoptimized("https://cdn.example.com/a.jpg"), true);
  assert.equal(v80ImageUnoptimized("//evil.example/a.jpg"), true);
});
