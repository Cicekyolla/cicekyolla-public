// GLOBAL SATIŞ SAYFALARI (15 Eki 2026) — adres, tekil kanonik, ürün seçimi, sitemap/hreflang kaynağı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isSalesSegment, isSalesPageRow, salesPagePath, salesRedirectTarget, salesProductIds, curateCatalog, orderSalesLinks,
} from "./global/salesPages.ts";
import { INTENT_PAGE_KEYS, DESTINATION_ROOTS, SEGMENTS, GLOBAL_LOCALES } from "./global/config.ts";
import { commercialSlug } from "./global/commercialUrl.ts";

const oku = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("adres kuralı: yerleşik niyetler satış sayfası; ayrılmış bölümler, şehir kökleri ve ticari lokasyon adresleri değil", () => {
  for (const k of INTENT_PAGE_KEYS) assert.ok(isSalesPageRow({ page_key: k }), k);
  for (const r of DESTINATION_ROOTS) assert.equal(isSalesSegment(r), false, r);
  for (const l of GLOBAL_LOCALES) { assert.equal(isSalesSegment(SEGMENTS[l].product), false); assert.equal(isSalesSegment(SEGMENTS[l].category), false); }
  for (const r of ["home", "storefront", "blog", "Rose", "ro", "rose--x", "a/b"]) assert.equal(isSalesSegment(r), false, r);
  assert.ok(isSalesSegment("dostavka-tsvetov-v-otel"));
  assert.equal(isSalesPageRow({ page_key: "istanbul/kadikoy" }), false);
  // 1.015 RU ve 7 canlı dilin ticari lokasyon adresleri satış adresi olarak açılamaz (çakışma yok)
  for (const [l, key] of [["ru", "istanbul"], ["ru", "istanbul/maltepe"], ["ru", "istanbul/maltepe/cevizli-mah"], ["en", "istanbul/kadikoy"], ["es", "istanbul"], ["pt", "istanbul/fatih"]] as const) {
    const slug = commercialSlug(l, key);
    assert.ok(slug, `${l} ${key}`);
    assert.equal(isSalesSegment(slug!), false, slug!);
  }
});

test("tek kanonik adres: url_slug varken anahtarla gelen istek 301; adres yoksa bugünkü /dil/anahtar", () => {
  assert.equal(salesPagePath("ru", "hotel-delivery", null), "/ru/hotel-delivery");
  assert.equal(salesPagePath("ru", "hotel-delivery", "dostavka-tsvetov-v-otel"), "/ru/dostavka-tsvetov-v-otel");
  assert.equal(salesRedirectTarget("ru", "hotel-delivery", { page_key: "hotel-delivery", url_slug: "dostavka-tsvetov-v-otel" }), "/ru/dostavka-tsvetov-v-otel");
  assert.equal(salesRedirectTarget("ru", "dostavka-tsvetov-v-otel", { page_key: "hotel-delivery", url_slug: "dostavka-tsvetov-v-otel" }), null);
  assert.equal(salesRedirectTarget("ru", "hotel-delivery", { page_key: "hotel-delivery", url_slug: null }), null, "bugünkü niyet sayfası aynen");
});

test("ürün seçimi: yalnız seçili ürünler, seçim sırasıyla; katalogda olmayan düşer; seçim yoksa yanıt aynen", () => {
  const resp = {
    locale: "ru", total: 4, selection: "none", featured_ids: [4], location: null,
    products: [1, 2, 3, 4].map((id) => ({ id, slug: `p${id}` })),
    categories: [{ id: 9, slug: "rozy", name: "Розы", image: null, image_source: null, product_ids: [1, 2, 4] }],
  };
  assert.equal(curateCatalog(resp, []), resp);
  const c = curateCatalog(resp, [3, 99, 1]) as typeof resp;
  assert.deepEqual(c.products.map((p) => p.id), [3, 1]);
  assert.deepEqual(c.featured_ids, [3, 1]);
  assert.equal(c.total, 2);
  assert.equal(c.selection, "manual");
  assert.deepEqual(c.categories[0].product_ids, [1]);
  assert.deepEqual(salesProductIds({ product_ids: [5, "6", 5, -1, "x"] }), [5, 6]);
  assert.deepEqual(salesProductIds({ product_ids: null }), []);
  assert.equal(curateCatalog(null, [1]), null);
});

test("KAYNAK: sayfa motoru — satış adresi çözümü, 301 (sorgu korunur), kanonik/hreflang/kırıntı/sitemap url_slug'tan", () => {
  const page = oku("./global/page.tsx");
  assert.ok(page.includes('else if (parsed.kind === "unknown" && isSalesSegment(seg)) row = await requireGlobalSalesPage(locale, seg);'));
  assert.ok(page.includes("if (sales?.redirect) permanentRedirect(withQuery(sales.redirect, searchParams"), "301 + gclid/utm korunur");
  assert.ok(page.includes("if (sales && !sales.row) notFound();"), "yayında değil → 404");
  assert.ok(page.includes("if (isSalesPageRow(row)) return salesPagePath(locale, row.page_key, row.url_slug);"), "self-canonical");
  assert.ok(page.includes(": isSalesPageRow(row) ? salesPagePath(alt.locale, row.page_key, alt.url_slug)"), "hreflang dil karşılığının kendi adresi");
  assert.ok(page.includes("const catalogResp = pickedIds.length ? curateCatalog(rawCatalogResp, pickedIds) : rawCatalogResp;"));
  assert.ok(page.includes("data-sales-links"), "iç bağlantı listesi");
  const sitemap = oku("./global/sitemap.ts");
  assert.ok(sitemap.includes("isSalesPageRow(g) ? salesPagePath(locale, g.page_key, g.url_slug)"));
  const api = oku("./global/api.ts");
  assert.ok(api.includes("/api/public/global/page?locale=${locale}&slug=${encodeURIComponent(seg)}"));
  assert.ok(api.includes("/api/public/global/pages-inventory?locale=${locale}&kind=sales"));
});

// C1 (5 Kas 2026): canlı EN envanterinin gerçek ilk 16 anahtarı (alfabetik) — hub 15. sırada, 12'de kesiliyordu.
const CANLI_EN = ["hospital-delivery", "hotel-10-karakoy-istanbul", "hotel-armada-hotel-istanbul", "hotel-bosphorus-palace-hotel",
  "hotel-ciragan-palace-kempinski", "hotel-conrad-istanbul-bosphorus", "hotel-courtyard-by-marriott-istanbul-west",
  "hotel-crowne-plaza-istanbul-asia", "hotel-crowne-plaza-istanbul-florya", "hotel-crowne-plaza-istanbul-old-city",
  "hotel-crowne-plaza-istanbul-oryapark", "hotel-crowne-plaza-istanbul-tuzla-viaport-marina",
  "hotel-crowne-plaza-istanbul-zeytinburnu", "hotel-cvk-park-bosphorus-hotel", "hotel-delivery", "hotel-divan-istanbul",
].map((page_key) => ({ page_key, url_slug: null, h1: page_key }));
const anahtar = (xs: { page_key: string }[]) => xs.map((x) => x.page_key);

test("iç bağ listesi: yayındaki niyet hub'ları başta, kalan bugünkü sırada, en fazla 12", () => {
  const eski = anahtar(CANLI_EN.filter((l) => l.page_key !== "istanbul").slice(0, 12));
  assert.equal(eski.includes("hotel-delivery"), false, "kanıt: eski kesimde otel hub'ı yok");
  const yeni = anahtar(orderSalesLinks(CANLI_EN, "istanbul", INTENT_PAGE_KEYS, 12));
  assert.equal(yeni.length, 12);
  assert.deepEqual(yeni.slice(0, 2), ["hotel-delivery", "hospital-delivery"]);
  assert.deepEqual(yeni.slice(2), anahtar(CANLI_EN).filter((k) => k !== "hotel-delivery" && k !== "hospital-delivery").slice(0, 10));
  assert.equal(new Set(yeni).size, yeni.length, "tekrar yok");
});

test("iç bağ listesi: bulunduğu sayfa çıkar, yayında olmayan hub eklenmez, RU adressiz dahil, kısa liste aynen", () => {
  const otelde = anahtar(orderSalesLinks(CANLI_EN, "hotel-delivery", INTENT_PAGE_KEYS, 12));
  assert.equal(otelde.includes("hotel-delivery"), false);
  assert.equal(otelde[0], "hospital-delivery");
  assert.equal(otelde.includes("delivery-without-address"), false, "EN'de yayında değil → bağ yok");
  const ru = [{ page_key: "apology-flowers" }, { page_key: "delivery-without-address" }, { page_key: "hospital-delivery" }, { page_key: "hotel-a" }, { page_key: "hotel-delivery" }];
  assert.deepEqual(anahtar(orderSalesLinks(ru, "istanbul", INTENT_PAGE_KEYS, 12)), ["hotel-delivery", "hospital-delivery", "delivery-without-address", "apology-flowers", "hotel-a"]);
  const kisa = [{ page_key: "b" }, { page_key: "a" }, { page_key: "a" }];
  assert.deepEqual(anahtar(orderSalesLinks(kisa, "x", INTENT_PAGE_KEYS, 12)), ["b", "a"]);
  assert.deepEqual(orderSalesLinks([], "x", INTENT_PAGE_KEYS, 12), []);
});

test("motor iç bağ listesini orderSalesLinks ile kurar (12 sınırı korunur)", () => {
  const page = oku("./global/page.tsx");
  assert.ok(page.includes("orderSalesLinks(await fetchLiveSalesPages(locale), row.page_key, INTENT_PAGE_KEYS, 12)"));
});
