// lib/testProduct.test.ts — TEST ürünü herkese açık liste / arama / ürün akışında görünmez.
// Çalıştırma: node --experimental-strip-types --test lib/testProduct.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isTestProductName, withoutTestProducts } from "./testProduct.ts";

test("ad kuralı: yalnız BÜYÜK HARFLE TEST ile başlayan ve ardından harf gelmeyen ad", () => {
  for (const n of ["TEST — Uygulama Ödeme Testi (satışa kapalı)", "TEST: deneme", "TEST 2", "  TEST", "TEST"]) assert.equal(isTestProductName(n), true, n);
  for (const n of ["Testere", "Test Buketi", "TESTİ", "TESTER", "Kırmızı Gül TEST", "", null, undefined]) assert.equal(isTestProductName(n), false, String(n));
});

test("liste süzgeci: test ürünü çıkar, sıra korunur", () => {
  const items = [{ id: 1, name: "Gül" }, { id: 1915, name: "TEST — Uygulama Ödeme Testi (satışa kapalı)" }, { id: 3, name: "Test Buketi" }];
  assert.deepEqual(withoutTestProducts(items).map((i) => i.id), [1, 3]);
});

test("tek nokta: /api/products okuyan fetchProductsPaged süzgeci uygular (arama, vitrin yedeği, ürün akışı buradan geçer)", () => {
  const src = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export async function fetchProductsPaged"));
  assert.ok(fn.slice(0, fn.indexOf("\n}\n")).includes("withoutTestProducts(rawItems)"));
  // Doğrudan ürün sayfası (slug ile okuma) süzülmez → link çalışmaya devam eder.
  const bySlug = src.slice(src.indexOf("/api/products/slug/"));
  assert.equal(bySlug.slice(0, 1500).includes("withoutTestProducts"), false);
});
