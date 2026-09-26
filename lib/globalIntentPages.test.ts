// globalIntentPages.test.ts — çalıştırma: node --test lib/globalIntentPages.test.ts
//
// RELEASE 3 — INTERNATIONAL SALES INTENT (26 Eyl 2026): en fazla 3 pilot niyet sayfası, mevcut
// global_pages motoru. Ülke sayfası fabrikası YOK; genel "from abroad" landing'i YOK (/en ile çakışır).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLocalePath, INTENT_PAGE_KEYS, INTENT_PAGE_CATEGORY, isIntentPageKey, DESTINATION_ROOTS, GLOBAL_LOCALES } from "./global/config.ts";
import { parseLocationKey } from "./global/locationKey.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("izin listesi tam 3 pilot anahtar; kategori haritası her anahtar için tanımlı", () => {
  assert.deepEqual([...INTENT_PAGE_KEYS], ["hotel-delivery", "hospital-delivery", "delivery-without-address"]);
  for (const k of INTENT_PAGE_KEYS) assert.ok(k in INTENT_PAGE_CATEGORY, k);
  assert.equal(INTENT_PAGE_CATEGORY["delivery-without-address"], null, "adressiz teslimat sayfası ürün süzgeci taşımaz (WhatsApp öncelikli)");
  // Ülke sayfası / genel yurt dışı landing anahtarı YOK
  for (const bad of ["send-flowers-to-istanbul-from-usa", "from-abroad", "international-ordering", "from-uk"]) assert.equal(isIntentPageKey(bad), false, bad);
});

test("parseLocalePath: niyet anahtarı tek segmentle 'page'; başka slug, derinlik ve büyük harf unknown", () => {
  for (const l of GLOBAL_LOCALES) {
    for (const k of INTENT_PAGE_KEYS) assert.deepEqual(parseLocalePath(l, [k]), { kind: "page", key: k }, `${l}/${k}`);
  }
  assert.equal(parseLocalePath("en", ["hotel-delivery", "x"]).kind, "unknown");
  assert.equal(parseLocalePath("en", ["Hotel-Delivery"]).kind, "unknown");
  assert.equal(parseLocalePath("en", ["ankara"]).kind, "unknown", "destinasyon kapısı değişmedi");
  assert.equal(parseLocalePath("en", ["from-abroad"]).kind, "unknown");
  // Niyet anahtarları destinasyon kökü DEĞİLDİR (lokasyon hiyerarşisi bozulmaz)
  for (const k of INTENT_PAGE_KEYS) {
    assert.equal((DESTINATION_ROOTS as readonly string[]).includes(k), false);
    assert.equal(parseLocationKey(k), null, `${k} lokasyon anahtarı değil`);
  }
});

test("KAYNAK: sayfa motoru niyet sayfasında İstanbul kataloğu + varsayılan kategori + kırıntı + FAQPage (gerçek SSS) + WhatsApp H1 ön-metni", () => {
  const src = read("./global/page.tsx");
  assert.match(src, /const intent = isIntentPageKey\(parsed\.key\) \? parsed\.key : null;/);
  assert.match(src, /fetchGlobalCatalog\(locale, \{ city: DESTINATION_ROOT \}\)/);
  assert.match(src, /withIntentCategory\(rawSearchParams, catalog, INTENT_PAGE_CATEGORY\[intent\]\)/);
  assert.match(src, /searchParams=\{searchParams\} intent=\{intent\} cutoffs=\{cutoffs\}/, "lokasyon sayfası sorgusu değişmeden geçer");
  assert.match(src, /function faqJsonLd\(faq/);
  assert.match(src, /"@type": "FAQPage"/);
  assert.match(src, /localeBreadcrumbJsonLd\(locale, \[row\.page_key\], \[row\.h1\], absoluteUrl, LABELS\[locale\]\.ana\)/);
  assert.match(src, /const waText = intent && row\.h1 \? row\.h1 : undefined;/);
  // Uydurma puan/yorum şeması yok
  const intentBlock = src.slice(src.indexOf("function faqJsonLd"), src.indexOf("async function GlobalPageBody"));
  assert.ok(!/aggregateRating|ratingValue|reviewCount|Review"/.test(intentBlock));
  const sections = read("./global/sections.tsx");
  assert.match(sections, /export function waHref\(text\?: string\): string/);
  assert.match(sections, /href=\{waHref\(waText\)\}/);
});

test("KAYNAK: kesme saati şeridi yalnız Delivery Motor verisinden; adressiz teslimat sayfasında basılmaz; 13 dilde metin", () => {
  const src = read("./global/page.tsx");
  assert.match(src, /const cutoffs = intent && intent !== "delivery-without-address" \? await intentCutoffRows\(locale\) : null;/);
  assert.match(src, /fetchDistrictReach\(locale, DESTINATION_ROOT, d\.slug\)/);
  assert.match(src, /\{intent && cutoffs && cutoffs\.length > 0 \? <CutoffStrip locale=\{locale\} rows=\{cutoffs\} \/> : null\}/);
  const sections = read("./global/sections.tsx");
  const strip = sections.slice(sections.indexOf("export function CutoffStrip"), sections.indexOf("export function waHref"));
  assert.ok(!/\d{2}:\d{2}/.test(strip), "şeritte sabit saat YOK — saat yalnız API cutoff_time'dan");
  assert.match(strip, /const sameDay = r\.reach === "in" && t;/);
  for (const l of GLOBAL_LOCALES) assert.match(sections, new RegExp(`\\n  ${l}: \\{ title: "`), `${l} CUTOFF_COPY`);
  const api = read("./global/api.ts");
  assert.match(api, /\/api\/public\/global\/reach\?locale=/);
});

test("API ile aynı küme: STATIC_PAGE_KEYS niyet anahtarlarını içermeli (yetim taraması) — sözleşme notu", () => {
  // Public tarafı API'yi import edemez; sözleşme dokümante edilir ve API testi (globalPagesAdmin) kendi tarafını sınar.
  assert.equal(INTENT_PAGE_KEYS.length, 3);
});
