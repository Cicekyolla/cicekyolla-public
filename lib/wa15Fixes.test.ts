// 15 Kas 2026 canlı olayı — gclid biçim denetimi + uzak bölge kurtarma linki.
import test from "node:test";
import assert from "node:assert/strict";
import { gecerliTiklamaKimligi } from "./adsAttribution.ts";
import { farZoneListingHref, foldTrSlug } from "./farZoneListing.ts";

test("gclid: 'test123' gibi biçimsiz değer yok sayılır, gerçek kimlik korunur", () => {
  const real = "Cj0KCQiA_bieBhDSARIsADU4zLfX1x2n3p4q5r6s7t8u9v0wAbCdEfGh_BwE";
  assert.equal(gecerliTiklamaKimligi("test123"), null);
  assert.equal(gecerliTiklamaKimligi(""), null);
  assert.equal(gecerliTiklamaKimligi(null), null);
  assert.equal(gecerliTiklamaKimligi("a b c d e f g h i j k l m n"), null);
  assert.equal(gecerliTiklamaKimligi(real), real);
});

test("uzak bölge linki: İstanbul ilçesi müşterinin dilindeki ilçe sayfasına gider; başka il → null", () => {
  assert.equal(foldTrSlug("Küçükçekmece"), "kucukcekmece");
  assert.equal(farZoneListingHref("tr", "İstanbul", "Esenyurt"), "/istanbul/esenyurt");
  // Ticari slug dil bayrağına bağlıdır; anahtar yolu (/en/istanbul/esenyurt) canlıda kanonik adrese 301 ile taşınır.
  assert.match(String(farZoneListingHref("en", "İstanbul", "Esenyurt")), /^/en/.*esenyurt/);
  assert.equal(farZoneListingHref("ar", "Istanbul", "Esenyurt"), "/ar/istanbul/esenyurt");
  assert.equal(farZoneListingHref("en", "Ankara", "Çankaya"), null);
  assert.equal(farZoneListingHref("en", "İstanbul", null), null);
});
