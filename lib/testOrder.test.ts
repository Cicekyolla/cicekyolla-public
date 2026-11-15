// Sprint ödeme-akışı-v1.2 — test siparişinde tarayıcı tarafı dönüşüm (GA4 / Ads / Meta Pixel) gönderilmez.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isTestProductName, isTestPurchase, TEST_ORDER_SKIP_LOG } from "./testOrder.ts";

const src = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("test ürünü adı: API ile AYNI kural", () => {
  for (const n of ["TEST — Uygulama Ödeme Testi (satışa kapalı)", "TEST: ödeme", "TEST 2", "TEST", "  TEST-urun"]) assert.equal(isTestProductName(n), true, n);
  for (const n of ["Testere", "Test Buketi", "TESTİ Buketi", "Kırmızı Gül TEST", "test — küçük harf", "", null, undefined]) assert.equal(isTestProductName(n), false, String(n));
});

test("test siparişi: API bayrağı YA DA sepette test ürünü", () => {
  const real = [{ product_name: "Kırmızı Gül Buketi" }];
  const withTest = [{ product_name: "Kırmızı Gül Buketi" }, { product_name: "TEST — Uygulama Ödeme Testi (satışa kapalı)" }];
  assert.equal(isTestPurchase(real), false);
  assert.equal(isTestPurchase(real, false), false);
  assert.equal(isTestPurchase(real, true), true, "elle test işaretlenmiş sipariş (bayrak API'den)");
  assert.equal(isTestPurchase(withTest), true);
  assert.equal(isTestPurchase(null), false);
  assert.equal(isTestPurchase(undefined, null), false);
  assert.equal(TEST_ORDER_SKIP_LOG, "test siparişi — dönüşüm atlandı");
});

test("KAYNAK: kart ve havale purchase'ı test siparişinde HİÇBİR event göndermez; gerçek siparişin yolu aynen", () => {
  const s = src("./purchaseAnalytics.ts");
  const paid = s.slice(s.indexOf("export function trackPaidPurchase"), s.indexOf("export function trackHavaleOrderPurchase"));
  const havale = s.slice(s.indexOf("export function trackHavaleOrderPurchase"));
  // Koruma, event'ten ve mükerrer işaretinden ÖNCE.
  assert.ok(paid.includes("if (isTestPurchase(status.items, status.conversion_excluded)) {"));
  assert.ok(paid.indexOf("isTestPurchase(") < paid.indexOf('pushEcommerceEvent("purchase"'));
  assert.ok(paid.indexOf("isTestPurchase(") < paid.indexOf("metaTrack("));
  assert.ok(havale.includes("if (isTestPurchase(order.items, order.conversion_excluded)) {"));
  assert.ok(havale.indexOf("isTestPurchase(") < havale.indexOf('pushEcommerceEvent("purchase"'));
  // Gerçek sipariş: event'ler yerinde (GA4/Ads dataLayer + Meta Pixel).
  assert.equal(s.split('pushEcommerceEvent("purchase"').length - 1, 2);
  assert.equal(s.split("metaTrack(").length - 1, 1);
  assert.equal(s.split("TEST_ORDER_SKIP_LOG").length - 1 >= 3, true);
});
