import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deliveryPresentation, catalogDecision } from "./global/globalCatalog.ts";
import { REACH, FAR, formatThresholdTl } from "./global/reachCopy.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";

/**
 * UZAK BÖLGE (API 108, reach 'far') — 24 Eyl 2026 operatör kararı: İstanbul 45 km+ fiyat eşikli band.
 * Public hiçbir karar vermez; API'nin ürün bazında süzdüğü kataloğu ve eşiği (min_product_price_minor) basar.
 * Sayfa "aynı gün" VAAT ETMEZ; "eşik ve üzeri ürünlerde, günün planı uygunsa, geniş gündüz aralığında özel araç"
 * koşullu dille yazılır; slot saati (Admin'de değişir) metne gömülmez; eşik API'den gelir.
 * TR landing ve 13 Global dil AYNI motor kararını okur (meta.reach / location.reach).
 */

const base = { locale: "en", total: 1, selection: "none", featured_ids: [], categories: [], products: [] };
const loc = (o: Partial<{ found: boolean; same_day: boolean | null; reach: string; min_product_price_minor: number | null }>) =>
  ({ city: "istanbul", district: "silivri", neighborhood: null, found: true, same_day: true, ...o });
const dec = (o: Partial<{ found: boolean; same_day: boolean | null; reach: string; min_product_price_minor: number | null }>) => catalogDecision({ ...base, location: loc(o) }, true);

// "aynı gün" ibaresi 13 dilde (uzak bölge metninde YASAK — vaat çağrışımı)
const AYNI_GUN = /same[- ]day|taggleich|selben Tag|jour même|dezelfde dag|in giornata|mismo día|mesmo dia|eyni gün|тот же день|в день заказа|نفس اليوم|当日|당일/iu;
const CONF = /checkout|ödeme|Checkout|paiement|afrekenen|caja|pagar|decis|결제|決済|结账|الدفع|оформлен|zahl|ödəniş/i;
const GARANTI_YASAK = /\b(guarantee|garantiert|garanti|garantie|garanzia|garantía|garantido|zəmanət|гарант|ضمان|保证|保証|보장)\b|\b\d{1,2}\s?(min|dk|dakika|minutes|minuten)\b|90\s?(dk|min)/iu;

test("deliveryPresentation: reach 'far' → 'far' (same_day=null olsa da nötr değil, kargo değil); eski API/diğer durumlar değişmez", () => {
  assert.equal(deliveryPresentation(dec({ same_day: null, reach: "far", min_product_price_minor: 250000 }), true), "far");
  assert.equal(deliveryPresentation(dec({ same_day: null, reach: "mixed" }), true), "neutral", "uzak band kenarı → nötr (kapatma yok)");
  assert.equal(deliveryPresentation(dec({ same_day: false, reach: "out" }), true), "cargo", "uzak band KAPALI → bugünkü kargo sunumu");
  assert.equal(deliveryPresentation(dec({ same_day: true, reach: "in" }), true), "same_day");
  assert.equal(deliveryPresentation(dec({ same_day: true }), true), "same_day", "eski API (reach yok) → aynen");
});

test("FAR metinleri (13 dil): 4 madde + not; yer adı ve eşik basılır; 'aynı gün' YOK; garanti/dakika YOK; ödemede doğrulama dili VAR; saat aralığı gömülü DEĞİL", () => {
  for (const l of GLOBAL_LOCALES) {
    const t = formatThresholdTl(l, 250000);
    const items = FAR[l].trust("Silivri", t);
    assert.equal(items.length, 4, l);
    const all = items.flat().join(" ") + " " + FAR[l].catalogNote("Silivri", t);
    assert.ok(all.includes("Silivri"), l + " yer adı");
    assert.ok(all.includes(t), l + " eşik basılmalı: " + t);
    assert.doesNotMatch(all, AYNI_GUN, l + " uzak bölgede 'aynı gün' ibaresi yasak");
    assert.doesNotMatch(all, GARANTI_YASAK, l + " garanti/dakika vaadi");
    assert.ok(CONF.test(all), l + " ödemede doğrulama dili");
    assert.doesNotMatch(all, /09[:.]00|18[:.]00/, l + " slot saati Admin'de değişir — metne gömülmez");
    assert.match(all, /1\s?[–-]\s?3|1〜3|1 à 3/, l + " kargo süresi (kargolanabilir ürünler için)");
    // Nötr metinle karışmasın: FAR ayrı bir sunumdur
    assert.notEqual(FAR[l].catalogNote("Silivri", t), REACH[l].catalogNote("Silivri"), l);
  }
});

test("formatThresholdTl: TL eşiği dil biçimiyle, para birimi seçiminden bağımsız (₺)", () => {
  assert.equal(formatThresholdTl("en", 250000), "₺2,500");
  assert.equal(formatThresholdTl("de", 250000), "₺2.500");
  assert.equal(formatThresholdTl("en", null), "₺0");
});

test("kaynak nöbeti — Global sayfa: 'far' sunumu ayrı şerit + FAR notu + nötr gibi CTA düşer + rozet yok; ilçe adı başlığa gelir", () => {
  const src = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.ok(src.includes(`const far = presentation === "far";`), "far bayrağı");
  assert.ok(src.includes(`formatThresholdTl(locale, (source?.mode === "catalog" ? source.catalog.location?.min_product_price_minor : null) ?? null)`), "eşik API'den (location.min_product_price_minor)");
  assert.ok(src.includes(`: far ? <FarTrustStrip locale={locale} place={neutralPlace} threshold={farThreshold} />`), "uzak güven şeridi");
  assert.ok(src.includes(`note={far ? FAR[locale].catalogNote(neutralPlace, farThreshold) : neutral ? REACH[locale].catalogNote(neutralPlace) : undefined}`), "not → rozet kapalı (catalogItems !note)");
  assert.ok(src.includes(`{ cargo, neutral: neutral || far }`), "kapanış CTA'sı uzak sunumda da düşer");
  assert.ok(src.includes(`(cargoCity || neutral || far) && loc && loc.kind !== "city" && yerAdi`), "ilçe adı");
  const sec = readFileSync(new URL("./global/sections.tsx", import.meta.url), "utf8");
  assert.ok(sec.includes("data-far-trust") && sec.includes("FAR[locale].trust(place, threshold)"), "FarTrustStrip");
});

test("kaynak nöbeti — TR landing: motor kararı (meta.reach) sözleri yönetir; out → kargo, far/mixed/unknown → 'adrese göre'; daralan erişimde genel listeye düşülmez; uzak notu eşiği API'den basar", () => {
  const src = readFileSync(new URL("../app/[...slug]/page.tsx", import.meta.url), "utf8");
  assert.ok(src.includes(`const reach = locationData?.meta?.reach ?? null;`), "reach meta'dan");
  assert.ok(src.includes(`const deliveryTime = cargoMode || reachOut ? "1–3 iş günü" : reachNeutral ? "Adrese göre belirlenir" : district?.time || "Aynı gün";`), "teslimat süresi kartı");
  assert.ok(src.includes(`{cargoMode || reachOut ? "1–3 iş günü kargo" : reachNeutral ? "Teslimat adrese göre" : "Aynı gün hızlı teslimat"} — {place}`), "hero rozeti");
  assert.ok(src.includes(`useLocationGrid || (locationData != null && (reachOut || reach === "far"))`), "boş liste kapısı");
  assert.ok(src.includes("data-far-note") && src.includes("{farThreshold} ve üzeri ürünler, günün planı uygunsa"), "uzak notu koşullu; eşik API'den");
  assert.doesNotMatch(src.slice(src.indexOf("data-far-note")), /09:00|18:00/, "slot saati TR notuna gömülmez");
  // Meta açıklaması + hero + mahalle kartı etiketi de aynı karardan: 'adrese göre' modunda statik "aynı gün" YOK
  assert.ok(src.includes(`description: locationSeoDescription(parts, cityName, districtName, neighborhood, await trMetaDeliveryMode(parts)),`), "meta açıklaması motor kararıyla");
  assert.ok(src.includes(`if (mode === "neutral") return`) && src.includes("teslimat seçenekleri adresinize göre ödeme adımında gösterilir"), "nötr meta sözü");
  assert.ok(src.includes(`deliveryLabel={hoodDeliveryLabel}`), "mahalle kartı etiketi");
  const cards = readFileSync(new URL("../components/location/NeighborhoodCards.tsx", import.meta.url), "utf8");
  assert.ok(cards.includes(`{deliveryLabel ?? "Aynı gün teslimat"}`), "kart etiketi prop'tan; varsayılan bugünkü");
});

test("kaynak nöbeti — PDP planlayıcı: eşik altı nedeni açık yazılır (planner.thresholdNote), karar API'de; 14 sözlükte anahtar var ve notDeliverable parantezsiz", () => {
  const src = readFileSync(new URL("../components/product/DeliveryPlanner.tsx", import.meta.url), "utf8");
  assert.ok(src.includes(`sd?.reason === "below_price_threshold" && sd.min_product_price_minor != null`), "neden API'den");
  assert.ok(src.includes(`t("planner.thresholdNote", { amount:`), "not metni sözlükten");
  for (const l of [...GLOBAL_LOCALES, "tr"]) {
    const d = readFileSync(new URL(`./i18n/dict/${l}.ts`, import.meta.url), "utf8");
    const note = d.match(/"planner\.thresholdNote": "([^"]+)"/);
    assert.ok(note && note[1].includes("{amount}"), l + " planner.thresholdNote {amount}");
    const nd = d.match(/"co\.err\.notDeliverable": "([^"]+)"/);
    assert.ok(nd && !/[（(]/.test(nd[1]), l + " notDeliverable: 'yalnız İstanbul içi aynı gün' parantezi kalktı (uzak bölgede eşik üstü ürün kuryeyle gidebilir)");
  }
});
