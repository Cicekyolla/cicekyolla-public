import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { engineSaysCargo, deliveryPresentation, catalogDecision } from "./global/globalCatalog.ts";
import { renderableLocationSections, DEFAULT_LOCATION_SECTIONS, NEUTRAL_HIDDEN_LOCATION_SECTIONS } from "./global/locationSections.ts";
import { REACH } from "./global/reachCopy.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";
import { buildProductJsonLd } from "./productSchema.ts";

/**
 * TESLİMAT GERÇEĞİ (24 Eyl 2026): canlı Delivery Motor İstanbul'da Maltepe şubeden 45 km'ye kadar
 * aynı gün kurye tanıyor; Silivri (103 km), Şile (67 km), Çatalca (83 km) vb. servis alanı DIŞINDA.
 * 13 dildeki İstanbul lokasyon sayfaları şehir kuralıyla aynı gün vaadi basıyordu.
 * ÜÇ DURUMLU sunum (operatör geri bildirimi): same_day → bugünkü; cargo → yalnız kargo;
 * neutral → 'mixed'/'unknown': VAAT YOK, KATALOG KAPANMAZ, "ödemede doğrulanır".
 */

const base = { locale: "en", total: 1, selection: "none", featured_ids: [], categories: [], products: [] };
const loc = (o: Partial<{ found: boolean; same_day: boolean | null; reach: string }>) => ({ city: "istanbul", district: "silivri", neighborhood: null, found: true, same_day: true, ...o });
const dec = (o: Partial<{ found: boolean; same_day: boolean | null; reach: string }>) => catalogDecision({ ...base, location: loc(o) }, true);

test("engineSaysCargo: lokasyon çözüldü + same_day=false → kargo; true/null → hayır", () => {
  assert.equal(engineSaysCargo(dec({ same_day: false })), true);
  assert.equal(engineSaysCargo(dec({})), false);
  assert.equal(engineSaysCargo(dec({ same_day: null, reach: "mixed" })), false);
  assert.equal(engineSaysCargo({ mode: "fallback" }), false);
  assert.equal(engineSaysCargo(undefined), false);
});

test("deliveryPresentation: kargo şehri daima cargo; İstanbul 'in' same_day; 'out' cargo; 'mixed'/'unknown' NEUTRAL", () => {
  assert.equal(deliveryPresentation(dec({}), false), "cargo", "Antalya/Muğla/İzmir şehir kuralı");
  assert.equal(deliveryPresentation(dec({ same_day: true, reach: "in" }), true), "same_day");
  assert.equal(deliveryPresentation(dec({ same_day: false, reach: "out" }), true), "cargo");
  assert.equal(deliveryPresentation(dec({ same_day: null, reach: "mixed" }), true), "neutral", "Başakşehir: kenar → vaat yok, katalog açık");
  assert.equal(deliveryPresentation(dec({ same_day: null, reach: "unknown" }), true), "neutral", "motor çözemedi → belirsizlik vaat DEĞİL");
  assert.equal(deliveryPresentation(dec({ same_day: true, reach: "unknown" }), true), "neutral", "reach alanı belirsiz diyorsa same_day=true olsa da vaat yok");
});

test("deliveryPresentation: motor sessiz (fallback / lokasyon yok / çözülemedi / eski API) → bugünkü şehir kuralı", () => {
  assert.equal(deliveryPresentation({ mode: "fallback" }, true), "same_day");
  assert.equal(deliveryPresentation(undefined, true), "same_day");
  assert.equal(deliveryPresentation(catalogDecision({ ...base, location: null }, false), true), "same_day");
  assert.equal(deliveryPresentation(dec({ found: false, same_day: false }), true), "same_day", "found=false → katalog boş ama sunum şehir kuralı");
  assert.equal(deliveryPresentation(dec({ same_day: true }), true), "same_day", "eski API (reach alanı yok, boolean) → aynen");
});

test("nötr modda kapanış CTA'sı düşer; duygu/hikâye/kategori kalır; kargo davranışı değişmez", () => {
  const neutral = renderableLocationSections(DEFAULT_LOCATION_SECTIONS, { cargo: false, neutral: true });
  assert.ok(!neutral.includes("cta"));
  for (const id of ["trust", "commerce", "categories", "emotion", "reviews", "story", "locations", "content"]) assert.ok(neutral.includes(id as never), id);
  assert.deepEqual([...NEUTRAL_HIDDEN_LOCATION_SECTIONS], ["cta"]);
  const cargo = renderableLocationSections(DEFAULT_LOCATION_SECTIONS, { cargo: true });
  assert.ok(!cargo.includes("emotion") && !cargo.includes("cta"));
  const sameDay = renderableLocationSections(DEFAULT_LOCATION_SECTIONS, { cargo: false });
  assert.equal(sameDay.length, DEFAULT_LOCATION_SECTIONS.length);
});

const GARANTI_YASAK = /\b(guarantee|garantiert|garanti|garantie|garanzia|garantía|garantido|zəmanət|гарант|ضمان|保证|保証|보장)\b|\b\d{1,2}\s?(min|dk|dakika|minutes|minuten)\b|90\s?(dk|min)/iu;
test("reachCopy (13 dil): 'ödemede doğrulanır' dili var; garanti/dakika vaadi yok; yer adı doldurulur", () => {
  const conf = /checkout|ödeme|Checkout|paiement|afrekenen|caja|pagar|decis|결제|決済|结账|الدفع|оформлен|zahl|ödəniş/i;
  for (const l of GLOBAL_LOCALES) {
    const items = REACH[l].trust("Başakşehir");
    assert.equal(items.length, 4, l);
    const all = items.flat().join(" ") + " " + REACH[l].catalogNote("Başakşehir");
    assert.ok(all.includes("Başakşehir"), l + " yer adı");
    assert.ok(conf.test(all), l + " ödemede doğrulama dili");
    assert.doesNotMatch(all, GARANTI_YASAK, l + " garanti/dakika vaadi");
  }
});

test("kaynak nöbeti: GlobalPageBody üç durumlu sunum; nötr şerit + not; kargo bölümleri ilçe adını alır", () => {
  const src = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.ok(src.includes(`const presentation = loc ? deliveryPresentation(source, isSameDayDestination(loc.city)) : "same_day";`), "sunum kararı");
  assert.ok(src.includes(`const cargoCity = loc && presentation === "cargo" ? loc.city : null;`));
  assert.ok(src.includes(`<NeutralTrustStrip locale={locale} place={neutralPlace} />`));
  assert.ok(src.includes(`note={far ? FAR[locale].catalogNote(neutralPlace, farThreshold) : neutral ? REACH[locale].catalogNote(neutralPlace) : undefined}`));
  assert.ok(src.includes("<CargoTrustStrip locale={locale} city={cargoCity} label={cargoLabel} />"));
  assert.ok(src.includes("<CargoCatalogSection locale={locale} city={cargoCity} label={cargoLabel}"));
  assert.ok(src.includes("{ cargo, neutral: neutral || far }"), "bölüm sırası nötr/uzak modu bilir");
  const sections = readFileSync(new URL("./global/sections.tsx", import.meta.url), "utf8");
  assert.ok(sections.includes("CARGO[locale].trust(label ?? cityDisplayName(locale, city))"));
  assert.ok(sections.includes("data-neutral-trust"));
});

test("locale PDP Product JSON-LD: URL locale yolundan, TR /urun yolu korunur", () => {
  const deps = { absolute: (p: string) => `https://www.cicekyolla.com.tr${p}`, plainText: (h: string | null | undefined) => (h ?? "").replace(/<[^>]+>/g, "") };
  const input = { name: "White roses", slug: "white-roses", productId: 7, priceMinor: 149900, stockQuantity: 3, images: [{ url: "/r2/a.jpg" }] };
  const tr = buildProductJsonLd(input, deps);
  assert.equal(tr.url, "https://www.cicekyolla.com.tr/urun/white-roses");
  const en = buildProductJsonLd({ ...input, path: "/en/product/white-roses" }, deps);
  assert.equal(en.url, "https://www.cicekyolla.com.tr/en/product/white-roses");
  assert.equal((en.offers as { url: string }).url, "https://www.cicekyolla.com.tr/en/product/white-roses");
  assert.equal((en.offers as { priceCurrency: string }).priceCurrency, "TRY", "fiyat/tahsilat DAİMA TRY");
  const src = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.ok(src.includes("path: localeProductPath(locale, surface.slug)"), "locale PDP yolu");
  assert.ok(src.includes(`<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />`));
});

test("ürün kartı 'Aynı Gün Teslim' rozeti yalnız aynı gün sunumunda; kargo ve nötr sunumda rozet yok", () => {
  const src = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.ok(src.includes("function catalogItems(locale: GlobalLocale, plan: LocationCatalogPlan, ids: readonly number[], sameDayBadge = true)"));
  assert.ok(src.includes("sameDay: sameDayBadge && !!p.same_day_available"));
  assert.ok(src.includes("items={catalogItems(locale, plan, view.ids, !note)}"), "aynı gün bölümü: nötr notu varsa rozet kapalı");
  assert.ok(src.includes("items={catalogItems(locale, plan, view.ids, false)}"), "kargo bölümü: rozet kapalı");
  assert.ok(src.includes("{ ...detailToCard(locale, d, p.name), sameDay: false }"), "kargo yedek yolu: rozet kapalı");
});

test("reachCopy notu (13 dil): kargo süresi yalnız kargolanabilir ürünler için nitelenmiş; locale PDP bölge cümlesi İstanbul kurye bölgesiyle sınırlı", async () => {
  const QUAL = /shipped|versandfähig|expédiable|verzendbar|spedibil|aptos para envío|expedíve|göndərilə bilən|пригодные к пересылке|القابلة للشحن|可寄送|発送可能|발송 가능/u;
  for (const l of GLOBAL_LOCALES) assert.match(REACH[l].catalogNote("X"), QUAL, l + " notu ürün-koşullu değil");
  const IST = /Istanbul|Istambul|Estambul|İstanbul|Стамбул|إسطنبول|伊斯坦布尔|イスタンブール|이스탄불/u;
  for (const l of GLOBAL_LOCALES) {
    const dict = readFileSync(new URL(`./i18n/dict/${l}.ts`, import.meta.url), "utf8");
    const m = dict.match(/"pdp\.regionSameDay":\s*"([^"]*)"/);
    assert.ok(m && IST.test(m[1]), l + " pdp.regionSameDay İstanbul kurye bölgesi nitelemesi taşımalı");
  }
  const tr = readFileSync(new URL("./i18n/dict/tr.ts", import.meta.url), "utf8");
  assert.match(tr, /"pdp\.regionSameDay":\s*"Aynı gün teslimat/, "TR sözlüğü dokunulmadı");
});
