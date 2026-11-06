// C8 (6 Kas 2026) — Global lokasyon "Tümü": TR vitrini (o dilde yayında) ÖNCE + teslim edilebilir katalog dolgusu.
// Kanıt: mahalle vitrini (manual 48) 13 dilde 9–18 ürüne, Adalar (kat 90) 3 ürüne düşüyordu; katalog ~500.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fillLocationListing } from "./global/locationPaging.ts";

const opts = { perPage: 50, maxItems: 500, maxPages: 10, paginationEnabled: true, page: 1 };
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

test("mahalle: 9 vitrin ürünü önce (Admin sırası), sonra katalog; tekrar yok; 50'lik sayfa", () => {
  const showcase = [907, 905, 3, 901, 2, 903, 909, 1, 908];
  const catalog = range(1, 500);
  const r = fillLocationListing(showcase, catalog, opts);
  assert.deepEqual(r.ids.slice(0, 9), showcase);
  assert.equal(r.ids.length, 50);
  assert.equal(new Set(r.ids).size, 50);
  assert.equal(r.total, 500); // 9 vitrin (3'ü katalogda) + 497 katalog = 506 → tavan 500
  assert.equal(r.totalPages, 10);
  assert.ok(!r.ids.slice(9).some((id) => showcase.includes(id)));
});

test("Adalar: 3 ürünlük vitrin artık kataloğun altına düşmez", () => {
  const r = fillLocationListing([11, 12, 13], range(1, 120), opts);
  assert.deepEqual(r.ids.slice(0, 3), [11, 12, 13]);
  assert.equal(r.total, 120);
  assert.equal(r.totalPages, 3);
  const p3 = fillLocationListing([11, 12, 13], range(1, 120), { ...opts, page: 3 });
  assert.equal(p3.page, 3);
  assert.equal(p3.ids.length, 20);
});

test("vitrin zaten büyükse (Fatih kat 93: 476) sıra aynen; katalog yalnız eksikleri ekler", () => {
  const showcase = range(1001, 1476);
  const r = fillLocationListing(showcase, [...range(1001, 1476), ...range(1, 100)], opts);
  assert.deepEqual(r.ids, range(1001, 1050));
  assert.equal(r.total, 500);
  const last = fillLocationListing(showcase, [...range(1001, 1476), ...range(1, 100)], { ...opts, page: 10 });
  assert.deepEqual(last.ids.slice(-24), range(1, 24));
});

test("listeleme ucu kimliği metin döndürür (\"1431\") — vitrin DÜŞMEZ, katalogla tekilleşir", () => {
  const r = fillLocationListing(["1431", "1436", "7"], [7, 8, 1431, 9], opts);
  assert.deepEqual(r.ids, [1431, 1436, 7, 8, 9]);
});

test("geçersiz / aşan sayfa → 1 (404 kararı çağıranda); boş giriş; sayfalama kapalı", () => {
  assert.equal(fillLocationListing([1], range(1, 10), { ...opts, page: 9 }).page, 1);
  assert.deepEqual(fillLocationListing([], [], opts), { ids: [], total: 0, totalPages: 0, page: 1 });
  const off = fillLocationListing([5], range(1, 80), { ...opts, paginationEnabled: false, maxItems: 60 });
  assert.equal(off.ids.length, 60);
  assert.equal(off.ids[0], 5);
  assert.equal(off.totalPages, 1);
  assert.equal(fillLocationListing([0, -1, 2], [2, 3], opts).total, 2);
});

test("KAYNAK: Global lokasyon sayfası vitrini tam liste okur ve katalog planıyla doldurur", () => {
  const src = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.match(src, /listingQueryFor\(\{ \.\.\.cfg, paginationEnabled: false \}, 1, \{ locale \}\)/);
  assert.match(src, /fillLocationListing\(showcase\.map\(\(r\) => Number\(r\.id\)\), plan\.allOrder, \{/);
  assert.match(src, /plan\.byId\.set\(id, \{ \.\.\.localeRowToCatalogProduct\(r\), id \}\)/);
  assert.doesNotMatch(src, /listingQueryFor\(cfg, wantedPage, \{ locale \}\)/);
});
