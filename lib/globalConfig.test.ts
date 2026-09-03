// GLOBAL Faz 1 — locale routing sözleşmesi regresyon testleri.
import test from "node:test";
import assert from "node:assert/strict";
import { isGlobalLocalePath, parseLocalePath, localeProductPath, GLOBAL_LOCALES } from "./global/config.ts";

test("isGlobalLocalePath: yalnız /de ve /en önekleri; TR path'leri asla", () => {
  assert.equal(isGlobalLocalePath("/de"), true);
  assert.equal(isGlobalLocalePath("/de/produkt/rote-rosen"), true);
  assert.equal(isGlobalLocalePath("/en"), true);
  assert.equal(isGlobalLocalePath("/en/product/red-roses"), true);
  // TR ve tuzak path'ler: locale guard'a girmez (legacy resolver'lar çalışmaya devam eder)
  for (const p of ["/", "/urun/gul-buketi", "/kategori/guller", "/istanbul/kadikoy", "/sepet", "/checkout", "/dekorasyon", "/denizli", "/develi", "/enez"]) {
    assert.equal(isGlobalLocalePath(p), false, p);
  }
});

test("parseLocalePath: home/product/category/unknown", () => {
  assert.deepEqual(parseLocalePath("de", []), { kind: "home" });
  assert.deepEqual(parseLocalePath("de", ["produkt", "rote-rosen"]), { kind: "product", slug: "rote-rosen" });
  assert.deepEqual(parseLocalePath("en", ["product", "red-roses"]), { kind: "product", slug: "red-roses" });
  assert.deepEqual(parseLocalePath("de", ["kategorie", "rosen"]), { kind: "category", slug: "rosen" });
  // Yanlış dil segmenti, geçersiz slug, fazla derinlik → unknown (404)
  assert.equal(parseLocalePath("de", ["product", "red-roses"]).kind, "unknown");
  assert.equal(parseLocalePath("en", ["produkt", "rote-rosen"]).kind, "unknown");
  assert.equal(parseLocalePath("de", ["produkt", "Rote-Rosen"]).kind, "unknown");
  assert.equal(parseLocalePath("de", ["produkt"]).kind, "unknown");
  assert.equal(parseLocalePath("de", ["produkt", "a", "b"]).kind, "unknown");
});

test("parseLocalePath: lokasyon yüzeyleri — destinasyon kapısı (İstanbul + Antalya/Muğla/İzmir; bkz. globalDestinations.test)", () => {
  assert.deepEqual(parseLocalePath("de", ["istanbul"]), { kind: "page", key: "istanbul" });
  assert.deepEqual(parseLocalePath("en", ["istanbul", "kadikoy"]), { kind: "page", key: "istanbul/kadikoy" });
  // Mahalle seviyesi (3 segment) tanınır; render yalnız approved sayfayla olur.
  assert.deepEqual(parseLocalePath("de", ["istanbul", "kadikoy", "moda"]), { kind: "page", key: "istanbul/kadikoy/moda" });
  // Kurul kararı dışındaki şehir (Ankara) açılmaz; derinlik 3 ile sınırlı; büyük harf red
  assert.equal(parseLocalePath("de", ["ankara"]).kind, "unknown");
  assert.equal(parseLocalePath("de", ["istanbul", "kadikoy", "moda", "x"]).kind, "unknown");
  assert.equal(parseLocalePath("de", ["istanbul", "Kadikoy"]).kind, "unknown");
});

test("localeProductPath: locale'e özgü segment", () => {
  assert.equal(localeProductPath("de", "rote-rosen"), "/de/produkt/rote-rosen");
  assert.equal(localeProductPath("en", "red-roses"), "/en/product/red-roses");
});

test("GLOBAL_LOCALES: 13 hedef dil (API TRANSLATION_LOCALES ile birebir küme)", () => {
  assert.deepEqual([...GLOBAL_LOCALES].sort(), ["ar","az","de","en","es","fr","it","ja","ko","nl","pt","ru","zh"]);
});

test("isGlobalLocalePath: yeni diller tanınır, TR path'leri asla", () => {
  assert.equal(isGlobalLocalePath("/fr"), true);
  assert.equal(isGlobalLocalePath("/ru/istanbul/kadikoy"), true);
  assert.equal(isGlobalLocalePath("/arama"), false); // /ar öneki /arama'yı YAKALAMAMALI
  assert.equal(isGlobalLocalePath("/koleksiyonlar"), false);
  assert.equal(isGlobalLocalePath("/esenyurt"), false);
});

test("parseLocalePath: locale'e özgü segmentler (yeni diller)", () => {
  assert.deepEqual(parseLocalePath("fr", ["produit", "roses-rouges"]), { kind: "product", slug: "roses-rouges" });
  assert.deepEqual(parseLocalePath("ru", ["product", "red-roses"]), { kind: "product", slug: "red-roses" });
  assert.equal(parseLocalePath("fr", ["product", "x"]).kind, "unknown");
});
