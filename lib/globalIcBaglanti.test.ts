// lib/globalIcBaglanti.test.ts — 11 Kas 2026 (ADDITIVE): 13 dil menü önceliği, alt bilgi hizmet hub'ları, PDP kırıntısı.
// Çalıştırma: node --test lib/globalIcBaglanti.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prioritizedNavCategories, NAV_PRIORITY } from "./global/v80/navPriority.ts";
import { buildV80Footer, V80_INTENT_LABELS } from "./global/v80/footer.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

// Canlı /en kataloğundan (11 Kas 2026) alfabetik sıradaki ilk kategoriler + öncelikliler (id, slug, canlı ürün).
const EN = [
  { id: 8, slug: "artificial-decoration", name: "Artificial Decoration", live: 0 },
  { id: 303, slug: "birthday-cakes", name: "Birthday Cakes", live: 5 },
  { id: 160, slug: "birthday-flowers", name: "Birthday Flowers", live: 365 },
  { id: 24, slug: "bouquets", name: "Bouquets", live: 243 },
  { id: 4, slug: "flowers-by-delivery-purpose", name: "By Delivery Purpose", live: 340 },
  { id: 12, slug: "collections", name: "Collections", live: 365 },
  { id: 148, slug: "flower-for-my-love", name: "Flower for My Love", live: 297 },
  { id: 3, slug: "flowers", name: "Flowers", live: 350 },
  { id: 25, slug: "flowers-in-a-box", name: "Flowers in a Box", live: 32 },
  { id: 14, slug: "orchids", name: "Orchids", live: 72 },
  { id: 13, slug: "roses", name: "Roses", live: 252 },
];

test("menü: alfabetik ilk 6 değil öncelik sırası (Güller, Buketler, Orkideler, Doğum günü, Sevgiliye, Kutuda)", () => {
  assert.deepEqual(prioritizedNavCategories(EN).map((c) => c.slug), ["roses", "bouquets", "orchids", "birthday-flowers", "flower-for-my-love", "flowers-in-a-box"]);
});

test("menü: yalnız canlı kategori; eksikte kapsayıcı kökler (Çiçekler/Gönderim Amacı/Koleksiyonlar) atlanır", () => {
  const az = EN.filter((c) => ![13, 14, 25].includes(c.id)).concat([{ id: 999, slug: "tulips", name: "Tulips", live: 33 }]);
  const out = prioritizedNavCategories(az).map((c) => c.slug);
  assert.equal(out.length, 5, "6'ya tamamlamak için kapsayıcı kök kullanılmaz; birthday-cakes (5) + tulips (33)");
  assert.deepEqual(out, ["bouquets", "birthday-flowers", "flower-for-my-love", "tulips", "birthday-cakes"]);
  assert.ok(!out.includes("artificial-decoration"), "canlı ürünü olmayan kategori basılmaz");
  assert.ok(!out.some((s) => ["flowers", "collections", "flowers-by-delivery-purpose"].includes(s)));
});

test("menü: TR slug ile de eşleşir (ana sayfa paketi kimlik taşımazsa)", () => {
  const out = prioritizedNavCategories([{ slug: "rozen", name: "Rozen", live: 10, trSlug: "guller" }, { slug: "boeketten", name: "Boeketten", live: 9, trSlug: "buketler" }]);
  assert.deepEqual(out.map((c) => c.slug), ["rozen", "boeketten"]);
  assert.equal(new Set(NAV_PRIORITY.map((r) => r.id)).size, NAV_PRIORITY.length);
});

const footerInput = (locale: (typeof GLOBAL_LOCALES)[number], intentPages?: { key: string; slug: string }[]) => ({
  locale, texts: { "footer.deliver": "Deliver", "footer.shop": "Shop" }, categories: [], allHref: null,
  liveDestinations: ["istanbul"], contact: { phone: "0507 441 34 74", email: "info@cicekyolla.com.tr" },
  whatsapp: "https://wa.me/905074413474", isHome: false, intentPages,
});

test("alt bilgi: yayındaki otel/hastane hub'ı o dilin adresiyle teslimat sütununda; verilmezse sütun aynen", () => {
  for (const l of GLOBAL_LOCALES) {
    const m = buildV80Footer(footerInput(l, [{ key: "hotel-delivery", slug: "hotel-delivery" }, { key: "hospital-delivery", slug: "hospital-delivery" }]));
    const d = m.columns.find((c) => c.key === "deliver")!;
    assert.deepEqual(d.links.slice(-2).map((x) => x.href), [`/${l}/hotel-delivery`, `/${l}/hospital-delivery`], l);
    assert.ok(d.links.slice(-2).every((x) => x.label && !x.external), l);
    assert.ok(V80_INTENT_LABELS[l]["hotel-delivery"] && V80_INTENT_LABELS[l]["hospital-delivery"], `etiket ${l}`);
    const yok = buildV80Footer(footerInput(l)).columns.find((c) => c.key === "deliver")!;
    assert.equal(yok.links.length, d.links.length - 2);
  }
});

test("alt bilgi: bilinmeyen anahtar ya da geçersiz slug basılmaz", () => {
  const m = buildV80Footer(footerInput("en", [{ key: "delivery-without-address", slug: "delivery-without-address" }, { key: "hotel-delivery", slug: "../x" }]));
  const d = m.columns.find((c) => c.key === "deliver")!;
  assert.ok(d.links.every((x) => !x.href.includes("delivery-without-address") && !x.href.includes("..")));
});

test("kaynak: başlık/alt bilgi öncelikten, hub bağı envanter doğrulamalı, PDP kırıntısı dilin ana sayfası", () => {
  const data = oku("lib/global/v80/data.ts");
  assert.ok(!/\.filter\(\(c\) => \(c\.live_products \?\? 0\) > 0\)\s*\n\s*\.slice\(0, 6\)/.test(data), "alfabetik ilk 6 kalmadı");
  assert.match(data, /const nav = navFromCatalog\(locale, catalog\);/);
  assert.match(data, /const row = inv\.find\(\(r\) => r\.page_key === k\);/);
  assert.match(data, /if \(!inv\) return m\?\.v \?\? \[\];/, "uç hatasında uydurma bağ yok");
  const view = oku("lib/global/v80/view.ts");
  assert.match(view, /const navCategories = hasCategoryOrder\(s\)\s*\n\s*\? categories\.slice\(0, 6\)/, "operatör sırası korunur");
  assert.match(view, /const nav = s\.nav\.length/, "admin menü listesi önce gelir");
  const page = oku("lib/global/page.tsx");
  assert.match(page, /breadcrumbHome=\{\{ href: `\/\$\{locale\}`, label: LABELS\[locale\]\.ana \}\}/);
  const pd = oku("components/product/ProductDetail.tsx");
  assert.match(pd, /<Link href=\{breadcrumbHome\?\.href \?\? "\/"\}/, "TR'de varsayılan / aynen");
});
