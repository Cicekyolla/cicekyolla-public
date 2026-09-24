// GLOBAL LOKASYON SAYFASI — bölüm sırası (saf modül) + sayfa kompozisyonu kaynak korumaları.
// Çalıştır: npm run test:unit  (node --test lib/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLOBAL_LOCALES } from "./global/config.ts";
import { mergedTexts } from "./global/v80/copy.ts";
import {
  LOCATION_SECTION_IDS, DEFAULT_LOCATION_SECTIONS, CARGO_HIDDEN_LOCATION_SECTIONS,
  parseLocationSections, renderableLocationSections, isLocationSectionId,
} from "./global/locationSections.ts";

const oku = (yol: string) => readFileSync(new URL(yol, import.meta.url), "utf8");
const DEFAULT_ORDER = ["trust", "commerce", "categories", "emotion", "reviews", "story", "locations", "content", "cta"];

// ── Saf modül ────────────────────────────────────────────────────────────────

test("sabitler: 9 bölüm, varsayılan sıra güven → ürünler → kategoriler → duygu → yorumlar → hikâye → lokasyonlar → içerik → CTA (hepsi açık)", () => {
  assert.deepEqual([...LOCATION_SECTION_IDS], DEFAULT_ORDER);
  assert.deepEqual(DEFAULT_LOCATION_SECTIONS.map((s) => [s.id, s.enabled]), DEFAULT_ORDER.map((id) => [id, true]));
  assert.ok(Object.isFrozen(DEFAULT_LOCATION_SECTIONS), "varsayılan liste değiştirilemez");
  assert.equal(isLocationSectionId("hero"), false, "hero listede yok — her zaman en üstte");
  assert.deepEqual([...CARGO_HIDDEN_LOCATION_SECTIONS], ["emotion", "cta"]);
});

test("parse: alan yok / eski API / bozuk değer → varsayılan sıra (asla throw etmez)", () => {
  for (const raw of [undefined, null, "trust", 42, {}, { trust: true }, true]) {
    assert.deepEqual(parseLocationSections(raw), DEFAULT_ORDER.map((id) => ({ id, enabled: true })), String(raw));
  }
  // Geçerli öğesi olmayan dizi → varsayılan sonuçla aynı
  assert.deepEqual(parseLocationSections([null, "trust", { id: "hero" }, { id: 7 }]).map((s) => s.id), DEFAULT_ORDER);
});

test("parse: Admin sırası korunur; tekrar yok (ilk geçen kazanır); bilinmeyen id atılır; eksikler varsayılan sırayla sona (açık)", () => {
  const raw = [
    { id: "reviews", enabled: true },
    { id: "commerce", enabled: false },
    { id: "reviews", enabled: false }, // tekrar → yok sayılır
    { id: "banners", enabled: true }, // bilinmeyen → atılır
    { id: "hero", enabled: true }, // hero listede değil → atılır
    { id: "cta" }, // enabled yok → açık
    { id: "trust", enabled: "false" }, // boolean değil → açık
  ];
  assert.deepEqual(parseLocationSections(raw), [
    { id: "reviews", enabled: true },
    { id: "commerce", enabled: false },
    { id: "cta", enabled: true },
    { id: "trust", enabled: true },
    { id: "categories", enabled: true },
    { id: "emotion", enabled: true },
    { id: "story", enabled: true },
    { id: "locations", enabled: true },
    { id: "content", enabled: true },
  ]);
});

test("parse: her çağrı yeni dizi döner (varsayılan sabit mutasyona kapalı)", () => {
  const a = parseLocationSections(undefined);
  a[0].enabled = false;
  a.reverse();
  assert.deepEqual(parseLocationSections(undefined).map((s) => [s.id, s.enabled]), DEFAULT_ORDER.map((id) => [id, true]));
  assert.equal(DEFAULT_LOCATION_SECTIONS[0].enabled, true);
});

test("render planı: İstanbul varsayılanı tam sıra; kargo destinasyonunda duygu + CTA HİÇ basılmaz (Admin açık bıraksa bile)", () => {
  assert.deepEqual(renderableLocationSections(DEFAULT_LOCATION_SECTIONS, { cargo: false }), DEFAULT_ORDER);
  assert.deepEqual(
    renderableLocationSections(DEFAULT_LOCATION_SECTIONS, { cargo: true }),
    ["trust", "commerce", "categories", "reviews", "story", "locations", "content"],
  );
  // Admin sırası + kapalı bölüm
  const admin = parseLocationSections([{ id: "commerce" }, { id: "trust", enabled: false }, { id: "cta" }, { id: "emotion" }]);
  assert.deepEqual(renderableLocationSections(admin, { cargo: false }), ["commerce", "cta", "emotion", "categories", "reviews", "story", "locations", "content"]);
  assert.deepEqual(renderableLocationSections(admin, { cargo: true }), ["commerce", "categories", "reviews", "story", "locations", "content"]);
  // Doğrulanmamış giriş (tekrar / bilinmeyen) bile tekil ve bilinen id'lerle sınırlı
  const kirli = [{ id: "trust", enabled: true }, { id: "trust", enabled: true }, { id: "x", enabled: true }] as unknown as Parameters<typeof renderableLocationSections>[0];
  assert.deepEqual(renderableLocationSections(kirli, { cargo: false }), ["trust"]);
});

test("V80 yorum başlıkları 13 dilde dolu (reviews.eyebrow / title / source) — İngilizce/Türkçe sabit etiket gerekmez", () => {
  assert.equal(GLOBAL_LOCALES.length, 13);
  for (const l of GLOBAL_LOCALES) {
    const t = mergedTexts(l, null);
    for (const k of ["reviews.eyebrow", "reviews.title", "reviews.source"]) assert.ok((t[k] ?? "").trim().length > 0, `${l}: ${k}`);
    if (l !== "en") assert.notEqual(t["reviews.eyebrow"], "Google Reviews", `${l}: yerelleştirilmiş`);
  }
});

// ── Sayfa kompozisyonu (kaynak korumaları; JSX çalışma zamanı testi DB/Next gerektirir) ─────────

const page = oku("./global/page.tsx");
const body = (() => {
  const a = page.indexOf("async function GlobalPageBody");
  const b = page.indexOf("// ---- Sayfa", a);
  assert.ok(a > 0 && b > a, "GlobalPageBody bulunmalı");
  return page.slice(a, b);
})();
const fn = (name: string) => {
  const a = page.indexOf(`function ${name}(`);
  assert.ok(a > 0, `${name} bulunmalı`);
  const b = page.indexOf("\n}\n", a);
  return page.slice(a, b);
};

test("KAYNAK: hero (kırıntı → H1 → giriş) HER ZAMAN önce, sonra bölümler Admin/varsayılan sırasıyla tek map'ten", () => {
  const hero = body.indexOf('data-location-section="hero"');
  const kirinti = body.indexOf("{kirinti}", hero);
  const h1 = body.indexOf("<h1 style={S.h1}>{row.h1}</h1>", hero);
  const intro = body.indexOf("row.intro_html ?", hero);
  const map = body.indexOf("{order.map(block)}");
  assert.ok(hero > 0 && hero < kirinti && kirinti < h1 && h1 < intro && intro < map, "hero → bölümler");
  assert.match(body, /const order = renderableLocationSections\(sections \?\? DEFAULT_LOCATION_SECTIONS, \{ cargo \}\);/);
  // <main> içinde bölüm bileşeni doğrudan basılmaz — sıra yalnız order listesinden gelir.
  const main = body.slice(body.indexOf("<main "), body.indexOf("</main>"));
  for (const tag of ["<TrustStrip", "<CargoTrustStrip", "<CatalogCommerceSection", "<CargoCatalogSection", "<CategoryCardsSection", "<EmotionSection", "<GlobalGoogleTrust", "<DistanceSection", "<MessageSection", "<LocationGrid", "{izgara}", "<FaqSection", "<FinalCta"]) {
    assert.ok(!main.includes(tag), `${tag} sabit JSX sırasında olmamalı`);
  }
  // Her bölüm id'si switch'te karşılanır; SSR HTML'de sıra data-location-section ile doğrulanabilir.
  for (const id of LOCATION_SECTION_IDS) assert.ok(body.includes(`case "${id}":`), `case ${id}`);
  assert.ok(body.includes("data-location-section={id}"));
});

test("KAYNAK: varsayılan render sırası hero → trust → commerce → categories → emotion → reviews → story → locations → content → cta", () => {
  // Varsayılan liste + switch eşlemesi: her id kendi bloğunu basar.
  assert.deepEqual(["hero", ...renderableLocationSections(parseLocationSections(undefined), { cargo: false })], ["hero", ...DEFAULT_ORDER]);
  const kase = (id: string) => {
    const a = body.indexOf(`case "${id}":`);
    const b = body.indexOf("case ", a + 6);
    return body.slice(a, b > a ? b : undefined);
  };
  assert.match(kase("trust"), /<CargoTrustStrip[\s\S]*<TrustStrip locale=\{locale\} \/>/);
  assert.match(kase("commerce"), /<CargoCatalogSection[\s\S]*<CatalogCommerceSection/);
  assert.match(kase("categories"), /<CategoryCardsSection locale=\{locale\} tiles=\{tiles\} \/>/);
  assert.match(kase("emotion"), /<EmotionSection/);
  assert.match(kase("reviews"), /<GlobalGoogleTrust labels=/);
  assert.match(kase("story"), /<DistanceSection[\s\S]*<AtelierSection[\s\S]*<ConciergeSection[\s\S]*<DeliveryProofSection[\s\S]*<MessageSection/);
  assert.match(kase("locations"), /return izgara;/);
  assert.match(kase("content"), /row\.content_html[\s\S]*<FaqSection/);
  assert.match(kase("cta"), /<FinalCta/);
});

test("KAYNAK: kargo destinasyonu — duygu ve CTA render edilmez; kategori kartları + yorumlar VAR; aynı gün hikâyesi yok (yalnız mesaj)", () => {
  assert.match(body, /case "emotion":\s*return cargoCity \? null :/);
  assert.match(body, /case "cta":\s*return cargoCity \? null :/);
  assert.match(body, /case "story":\s*return cargoCity \? \(\s*<MessageSection locale=\{locale\} \/>/);
  assert.match(body, /case "reviews":\s*return <GlobalGoogleTrust/, "yorumlar kargoda da basılır");
  assert.match(body, /case "categories":\s*return tiles\.length > 0 \?/, "kategori kartları kargoda da (kargo-süzülmüş plan)");
  // 24 Eyl 2026: kargo kararı şehir kuralı VEYA Delivery Motor (engineSaysCargo) — bkz. lib/globalHonestDelivery.test.ts
  assert.match(body, /const cargoCity = loc && \(!isSameDayDestination\(loc\.city\) \|\| engineSaysCargo\(source\)\) \? loc\.city : null;/);
});

test("KAYNAK: TEK plan paylaşılır (commerce + categories + emotion); ek istek yok; bölüm sırası mevcut /catalog yanıtından", () => {
  assert.equal(page.split("planLocationPage(").length - 1, 1, "planLocationPage sayfada bir kez");
  assert.match(body, /const plan: LocationCatalogPlan \| null = source\?\.mode === "catalog" \? planLocationPage\(source\.catalog\) : null;/);
  assert.match(body, /categorySlugs=\{plan \? plan\.tiles\.map\(\(x\) => x\.slug\) : undefined\}/, "duygu hedefleri lokasyonda teslim edilebilen kategoriler");
  assert.match(page, /const sections = parseLocationSections\(catalogResp\?\.location_sections\);/);
  assert.ok(!/fetchGlobalPage\(\s*locale\s*,\s*["']storefront/.test(page), "storefront belgesi için ek istek yok");
  const localePage = page.slice(page.indexOf("export async function LocalePage"));
  const pageBranch = localePage.slice(localePage.indexOf('if (parsed.kind === "page")'), localePage.indexOf('if (parsed.kind === "category")'));
  const fetchers = pageBranch.match(/\b(fetch\w+|v80Contact)\(/g) ?? [];
  assert.deepEqual([...new Set(fetchers)].sort(), ["fetchGlobalCatalog(", "fetchGlobalPage(", "fetchLocaleCatalog(", "v80Contact("].sort());
  // Yedek yol kaynak testi ve animasyon tavanı korunur
  assert.ok(page.includes("tiles = fallbackCategoryCards(catalog.categories)"));
  assert.ok(!/<ProductCard[^>]*idx=\{idx\}/.test(page));
});

test("KAYNAK: ürün alanı (commerce) kategori kartı taşımaz; kartlar kompakt ve eşit yükseklik, yalnız kendi kapağı", () => {
  const commerce = fn("CatalogCommerceSection");
  assert.ok(!commerce.includes("categories}</h2>") && !commerce.includes("tiles"), "commerce içinde kategori kartı yok");
  assert.match(commerce, /<h2[^>]*>\{ui\.popular\}<\/h2>[\s\S]*<GlobalCatalogBrowser/, "başlık → çipler + ızgara");
  const cards = fn("CategoryCardsSection");
  assert.ok(cards.includes("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"));
  assert.ok(cards.includes("aspect-[4/3]") && !page.includes("aspect-[4/5]"));
  assert.ok(cards.includes("{c.img ? <ProductImage src={c.img}") && cards.includes(": null}"), "kapak yoksa boş nötr çerçeve");
  assert.ok(cards.includes("truncate"), "tek satır ad → eşit yükseklik");
  const tilesFn = fn("locationTiles");
  assert.match(tilesFn, /if \(plan\) \{\s*tiles = plan\.tiles\.map/);
  assert.match(tilesFn, /else if \(cargo\) \{\s*tiles = \[\];/, "kargo yedeğinde teslimat süzmesiz kart yok");
});

test("KAYNAK: şehir sayfasında da kırıntı (şehir geçerli sayfa, link değil)", () => {
  assert.match(body, /kirinti = <LocationBreadcrumb locale=\{locale\} city=\{loc\.city\} cityName=\{cityDisplayName\(locale, loc\.city\)\} \/>;/);
  const nav = oku("./global/locationNav.tsx");
  assert.match(nav, /\{district \? \(\s*<Link href=\{`\/\$\{locale\}\/\$\{city\}`\}/);
  assert.match(nav, /<span aria-current="page" className="font-semibold text-\[#1F2937\]">\{cityName\}<\/span>/);
});

test("KAYNAK: çipler mobilde yatay kaydırma, sm+ sarma; GERÇEK link (?category, sunucu durumu) + data-catalog-chip korunur", () => {
  const browser = oku("../components/global/GlobalCatalogBrowser.tsx");
  assert.match(browser, /className="[^"]*\bflex\b[^"]*\boverflow-x-auto\b[^"]*\bsm:flex-wrap\b[^"]*"/);
  assert.ok(!/className="mb-4 flex flex-wrap gap-2"/.test(browser));
  // F1 (DESIGN-FIX): istemci filtresi (useState + tüm ürünler SSR'da) yerine çip = gerçek <a href>; etkin çip aria-current.
  assert.ok(browser.includes('data-catalog-chip={c.key ?? "all"}') && browser.includes("href={c.href}"));
  assert.ok(browser.includes('aria-current={c.active ? "true" : undefined}'));
  assert.ok(!browser.includes("useState") && !browser.includes("<button"), "istemci durumu / buton çip yok");
  assert.ok(browser.includes("idx={Math.min(idx, 7)}"));
});

test("KAYNAK: çift yan boşluk yok (Wrap ve GlobalGoogleTrust); yorum başlıkları V80 metinlerinden", () => {
  const sections = oku("./global/sections.tsx");
  const wrap = sections.slice(sections.indexOf("function Wrap("), sections.indexOf("function Eyebrow("));
  assert.ok(wrap.includes("mx-auto w-full max-w-6xl px-0") && !/\bpx-4\b/.test(wrap));
  const trust = oku("../components/global/GlobalGoogleTrust.tsx");
  const root = trust.match(/<section className="([^"]*)"/);
  assert.ok(root && !/\bpx-\d/.test(root[1]), "GlobalGoogleTrust kökünde yan iç boşluk yok");
  assert.ok(trust.includes("labels.eyebrow") && trust.includes("labels.title") && trust.includes("labels.source"));
  assert.match(body, /labels=\{\{ eyebrow: t\["reviews\.eyebrow"\], title: t\["reviews\.title"\], source: t\["reviews\.source"\] \}\}/);
  assert.match(body, /const t = mergedTexts\(locale, null\);/);
});
