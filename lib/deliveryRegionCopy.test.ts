import { test } from "node:test";
import assert from "node:assert/strict";
import { citySectionCopy, deliveryRegionsDescription, DEFAULT_DELIVERY_REGIONS_DESCRIPTION, isCourierCity, regionDuration } from "./deliveryRegionCopy.ts";

test("İstanbul: aynı gün dili ve süre aynen kalır", () => {
  assert.equal(isCourierCity("İstanbul"), true);
  assert.deepEqual(citySectionCopy("İstanbul"), { eyebrow: "Aynı gün teslimat", note: "Uygun saatler sipariş adımında kesinleşir" });
  assert.equal(regionDuration("İstanbul", "Aynı gün · uygun siparişte 2 saat"), "Aynı gün · uygun siparişte 2 saat");
  assert.equal(regionDuration("İstanbul", ""), null);
});

test("İstanbul dışı: kargo dili, saat/süre vaadi yok", () => {
  for (const city of ["Ankara", "İzmir", "Bursa"]) {
    assert.equal(isCourierCity(city), false);
    assert.deepEqual(citySectionCopy(city), { eyebrow: "Kargo ile teslimat", note: "Kargoya uygun ürünlerde ücretsiz kargo" });
    assert.equal(regionDuration(city, "2–3 saat"), null);
    assert.ok(!/aynı gün|saat/i.test(citySectionCopy(city).eyebrow + citySectionCopy(city).note));
  }
});

test("meta: Admin kaydı doluysa o, boşsa dürüst varsayılan", () => {
  assert.equal(deliveryRegionsDescription("Kayıttaki meta"), "Kayıttaki meta");
  assert.equal(deliveryRegionsDescription("  "), DEFAULT_DELIVERY_REGIONS_DESCRIPTION);
  assert.equal(deliveryRegionsDescription(null), DEFAULT_DELIVERY_REGIONS_DESCRIPTION);
  assert.ok(DEFAULT_DELIVERY_REGIONS_DESCRIPTION.includes("Kargoya uygun ürünlerde"));
});
