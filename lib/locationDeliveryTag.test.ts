// lib/locationDeliveryTag.test.ts — ürün kartı teslimat etiketi (ADDITIVE).
// Çalıştırma: node --test lib/locationDeliveryTag.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { locationDeliveryTag } from "./locationDeliveryTag.ts";

test("bağlam yoksa bugünkü davranış birebir", () => {
  assert.equal(locationDeliveryTag({ sameDay: true }), "Aynı Gün Teslimat");
  assert.equal(locationDeliveryTag({ sameDay: false }), "Premium Aranjman");
  assert.equal(locationDeliveryTag({ sameDay: true }, null), "Aynı Gün Teslimat");
});

test("kargo sayfasında (İstanbul dışı / reach out) aynı gün yazılmaz", () => {
  assert.equal(locationDeliveryTag({ sameDay: true }, { mode: "cargo" }), "Kargoyla 1–3 İş Günü");
});

test("uzak bölge: eşik ve üzeri özel araç, altı kargo", () => {
  const ctx = { mode: "far", minPriceMinor: 250000 } as const;
  assert.equal(locationDeliveryTag({ sameDay: true, priceMinor: 250000 }, ctx), "Özel Araçla Teslimat");
  assert.equal(locationDeliveryTag({ sameDay: true, priceMinor: 249999 }, ctx), "Kargoyla 1–3 İş Günü");
  assert.equal(locationDeliveryTag({ sameDay: true, price: 3000 }, ctx), "Özel Araçla Teslimat");
  assert.equal(locationDeliveryTag({ sameDay: true, priceMinor: 300000 }, { mode: "far", minPriceMinor: null }), "Kargoyla 1–3 İş Günü");
});

test("adrese göre (mixed/unknown): vaat yok", () => {
  assert.equal(locationDeliveryTag({ sameDay: true }, { mode: "neutral" }), "Premium Aranjman");
});
