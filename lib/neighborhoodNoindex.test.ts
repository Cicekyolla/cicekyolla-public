// lib/neighborhoodNoindex.test.ts — il bazlı mahalle noindex şalteri (ADDITIVE).
// Çalıştırma: node --test lib/neighborhoodNoindex.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { isNoindexNeighborhoodPath, NEIGHBORHOOD_NOINDEX_PROVINCES } from "./neighborhoodNoindex.ts";

test("pilot il yalnız Kastamonu", () => {
  assert.deepEqual([...NEIGHBORHOOD_NOINDEX_PROVINCES], ["kastamonu"]);
});

test("Kastamonu mahalle/köy yolları takılır", () => {
  assert.equal(isNoindexNeighborhoodPath("/kastamonu/arac/ali-kahya-mah-akcam-koyu"), true);
  assert.equal(isNoindexNeighborhoodPath("/kastamonu/merkez/inonu-mah"), true);
  assert.equal(isNoindexNeighborhoodPath("/kastamonu/merkez/inonu-mah?x=1"), true);
});

test("il / ilçe sayfası ve başka iller takılmaz", () => {
  assert.equal(isNoindexNeighborhoodPath("/kastamonu"), false);
  assert.equal(isNoindexNeighborhoodPath("/kastamonu/arac"), false);
  assert.equal(isNoindexNeighborhoodPath("/sinop/ayancik/abali-koyu"), false);
  assert.equal(isNoindexNeighborhoodPath("/maltepe/cinar-cicek-siparisi"), false);
  assert.equal(isNoindexNeighborhoodPath("/kastamonu/arac/x/sayfa/2"), false);
});

test("boş liste = şalter kapalı", () => {
  assert.equal(isNoindexNeighborhoodPath("/kastamonu/arac/inonu-mah", []), false);
});
