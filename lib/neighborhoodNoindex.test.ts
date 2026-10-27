// lib/neighborhoodNoindex.test.ts — il bazlı mahalle noindex şalteri (ADDITIVE).
// Çalıştırma: node --test lib/neighborhoodNoindex.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { isClosedLocationPath, isNoindexNeighborhoodPath, NEIGHBORHOOD_NOINDEX_PROVINCES } from "./neighborhoodNoindex.ts";

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

test("İstanbul dışı köy ve mahalle kapalı", () => {
  assert.equal(isClosedLocationPath("/ankara/cankaya/kizilay-mah", "neighborhood"), true);
  assert.equal(isClosedLocationPath("/agri/dogubayazit/bardakli-koyu", "neighborhood"), true);
});

test("il ve ilçe sayfaları ve İstanbul açık", () => {
  assert.equal(isClosedLocationPath("/ankara", "city"), false);
  assert.equal(isClosedLocationPath("/ankara/cankaya", "district"), false);
  assert.equal(isClosedLocationPath("/agri/dogubayazit", "district"), false);
  assert.equal(isClosedLocationPath("/maltepe-cicek-siparisi", "district"), false);
  assert.equal(isClosedLocationPath("/maltepe/cinar-cicek-siparisi", "neighborhood"), false);
  assert.equal(isClosedLocationPath("/istanbul/pendik", "district"), false);
  assert.equal(isClosedLocationPath("/istanbul/pendik/fatih-mah", "neighborhood"), false);
});

test("lokasyon dışı sayfalar etkilenmez", () => {
  assert.equal(isClosedLocationPath("/kategori/cicekler", "category"), false);
  assert.equal(isClosedLocationPath("/blog/yazi", "delivery_info"), false);
  assert.equal(isClosedLocationPath("/dekorasyon", "delivery_info"), false);
  assert.equal(isClosedLocationPath("/ankara/cankaya", "category_location"), false);
});

test("sentetik (kayıtsız) dinamik lokasyon sayfası parça sayısına göre", () => {
  assert.equal(isClosedLocationPath("/bursa/nilufer", "delivery_info", { synthetic: true }), false);
  assert.equal(isClosedLocationPath("/bursa/nilufer/gorukle-mah", "delivery_info", { synthetic: true }), true);
  assert.equal(isClosedLocationPath("/bursa", "delivery_info", { synthetic: true }), false);
});

test("kademeli açma: il ya da il/ilçe listeye eklenince mahalleleri açılır", () => {
  const scopes = ["istanbul", "ankara", "izmir/konak"];
  assert.equal(isClosedLocationPath("/ankara/cankaya/kizilay-mah", "neighborhood", { scopes }), false);
  assert.equal(isClosedLocationPath("/izmir/konak/alsancak-mah", "neighborhood", { scopes }), false);
  assert.equal(isClosedLocationPath("/izmir/bornova/kazimdirik-mah", "neighborhood", { scopes }), true);
});

test("ana şalter kapalıysa yalnız Kastamonu pilotu kalır", () => {
  assert.equal(isClosedLocationPath("/ankara/cankaya/kizilay-mah", "neighborhood", { enabled: false }), false);
  assert.equal(isClosedLocationPath("/kastamonu/abana/ali-kahya-mah-akcam-koyu", "neighborhood", { enabled: false }), true);
});
