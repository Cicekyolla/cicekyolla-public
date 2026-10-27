// lib/locationName.test.ts — cleanLocationName() birim testleri (ADDITIVE).
// Çalıştırma: node --test lib/locationName.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanLocationName, neighborhoodTitle } from "./locationName.ts";

test("cleanLocationName — kaynak verideki gerçek örnekler", () => {
  assert.equal(cleanLocationName("Ahuri Mah (sarıkaya Köyü)"), "Ahuri Mah (Sarıkaya Köyü)");
  assert.equal(cleanLocationName("Altıkulaç  Mah (kadı Mah) (altıkulaç Köyü)"), "Altıkulaç Mah (Kadı Mah) (Altıkulaç Köyü)");
  assert.equal(cleanLocationName("Abımıstık Mah (çakırhüyük Beldesi)"), "Abımıstık Mah (Çakırhüyük Beldesi)");
  assert.equal(cleanLocationName("Akçam Mah (maca Mah) (akçam Köyü)"), "Akçam Mah (Maca Mah) (Akçam Köyü)");
});

test("cleanLocationName — doğru adlar değişmez", () => {
  for (const ad of ["Bardaklı Köyü", "Aktuğlu Köyü", "15 Temmuz Şehitler Mah", "İnönü Mah"]) {
    assert.equal(cleanLocationName(ad), ad);
  }
});

test("cleanLocationName — i → İ (Türkçe büyük harf)", () => {
  assert.equal(cleanLocationName("Yeni Mah (ilyaslı Köyü)"), "Yeni Mah (İlyaslı Köyü)");
});

test("neighborhoodTitle — Yer, İlçe (İl) Çiçekçi", () => {
  assert.equal(neighborhoodTitle("Bardaklı Köyü", "Doğubayazıt", "Ağrı"), "Bardaklı Köyü, Doğubayazıt (Ağrı) Çiçekçi");
  assert.equal(neighborhoodTitle("Fatih Mah", "Laçin", "Çorum"), "Fatih Mah, Laçin (Çorum) Çiçekçi");
  assert.equal(neighborhoodTitle(" Kızılay Mah ", "Çankaya", "Ankara"), "Kızılay Mah, Çankaya (Ankara) Çiçekçi");
});

test("neighborhoodTitle — eksik parça varsa null (bugünkü kalıp)", () => {
  assert.equal(neighborhoodTitle("Bardaklı Köyü", "", "Ağrı"), null);
  assert.equal(neighborhoodTitle("", "Çankaya", "Ankara"), null);
});
