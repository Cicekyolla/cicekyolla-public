// lib/placeUrunSayisi.test.ts — 11 Kas 2026 (ADDITIVE): yer sayfası 24 ürün + kategori bağı + erişim güvencesi.
// Çalıştırma: node --test lib/placeUrunSayisi.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { placeCategoryHref } from "./placePages.ts";

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("placeCategoryHref: yalnız geçerli slug + görünür kategori", () => {
  assert.equal(placeCategoryHref({ slug: "gecmis-olsun-cicekleri" }, true), "/kategori/gecmis-olsun-cicekleri");
  assert.equal(placeCategoryHref({ slug: "gecmis-olsun-cicekleri" }, false), null, "görünmeyen kategori → bağ yok");
  assert.equal(placeCategoryHref({ slug: "Geçersiz Slug" }, true), null);
  assert.equal(placeCategoryHref({ slug: "javascript:alert(1)" }, true), null, "yalnız a-z0-9- slug");
  assert.equal(placeCategoryHref({ slug: "../kategori" }, true), null);
  assert.equal(placeCategoryHref({ slug: "" }, true), null);
  assert.equal(placeCategoryHref({}, true), null);
  assert.equal(placeCategoryHref(null, true), null);
});

test("PlacePage: liste sayfalı okunur, en çok 24 kart, kategoriye 'Tüm Ürünleri Gör' bağı; bağ yoksa tam liste korunur", () => {
  const src = oku("components/place/PlacePage.tsx");
  assert.match(src, /const PRODUCT_COUNT = 24;/);
  // İlk okuma sayfalı: per_page'i yok sayan "sayfalama kapalı" isteği YALNIZ erişim güvencesi dalında.
  assert.match(src, /const firstPage = source \? await fetchListingPage\(\{ source, page: 1, per_page: PRODUCT_COUNT \}\)/);
  assert.equal((src.match(/paginate:\s*false/g) ?? []).length, 1, "tek kullanım: güvence dalı");
  assert.match(src, /const keepFullList = moreInCategory && !categoryHref;/);
  assert.match(src, /keepFullList && source\s*\n?\s*\? \(await fetchListingPage\(\{ source, page: 1, per_page: PRODUCT_COUNT, paginate: false \}\)/);
  assert.match(src, /\(keepFullList \? items : items\.slice\(0, PRODUCT_COUNT\)\)\.map\(toCardProduct\)/);
  assert.match(src, /placeCategoryHref\(categoryRow, !!categoryRow && isCategoryVisible\(categoryRow\)\)/);
  assert.match(src, /\{categoryHref \? \(/, "bağ yalnız href varsa");
  // SEO ilişkileri değişmez: canonical/robots aynı kaynaktan.
  assert.match(src, /alternates: \{ canonical: absoluteUrl\(path\) \}/);
  assert.match(src, /robots: indexRobots\(page\.index_state\)/);
});
