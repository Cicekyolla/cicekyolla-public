// lib/globalIlgiliKategori.test.ts — 11 Kas 2026 (ADDITIVE): 13 dil "ilgili kategoriler" ürün ortaklığıyla.
// Çalıştırma: node --test lib/globalIlgiliKategori.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relatedCategories } from "./global/relatedCategories.ts";

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const cat = (slug: string, products: string[]) => ({ slug, name: slug, live_products: products.length, product_slugs: products });
const r = (n: number, p: string) => Array.from({ length: n }, (_, i) => `${p}-${i}`);

const ROSES = r(20, "rose");
const CATS = [
  cat("birthday-cakes", r(5, "cake")),
  cat("artificial", []),
  cat("boxed-roses", ROSES.slice(0, 4)),
  cat("roses", ROSES),
  cat("roses-copy", ROSES),
  cat("valentines-red-roses", [...ROSES.slice(0, 10), ...r(5, "tulip")]),
  cat("wreaths", r(6, "wreath")),
  cat("flowers", [...ROSES, ...r(10, "orchid"), ...r(6, "wreath")]),
];

test("ilgili: ortak ürünü olmayan tür (pasta, çelenk) gül sayfasına girmez; kopya liste atlanır; alt tür önde", () => {
  const out = relatedCategories("roses", CATS).map((c) => c.slug);
  assert.ok(!out.includes("birthday-cakes") && !out.includes("wreaths") && !out.includes("artificial"));
  assert.ok(!out.includes("roses-copy"), "J ≥ 0.9 kopya");
  assert.ok(!out.includes("roses"), "kendisi yok");
  assert.deepEqual(out, ["boxed-roses", "flowers", "valentines-red-roses"], "alt tür 0.6, flowers J=0.56, kırmızı güller 0.40");
});

test("ilgili: en fazla 8; product_slugs yoksa (eski API) alfabetik davranış aynen", () => {
  const many = [cat("x", r(10, "a")), ...Array.from({ length: 12 }, (_, i) => cat(`y${i}`, r(10, "a").slice(0, 9 - (i % 5))))];
  assert.equal(relatedCategories("x", many).length, 8);
  const eski = CATS.map(({ product_slugs: _p, ...c }) => c);
  assert.deepEqual(relatedCategories("roses", eski).map((c) => c.slug), eski.filter((c) => c.slug !== "roses" && (c.live_products ?? 0) > 0).slice(0, 8).map((c) => c.slug));
});

test("kaynak: kategori sayfası ilgili listeyi ortaklıktan alır (alfabetik slice kalmadı)", () => {
  const page = oku("lib/global/page.tsx");
  assert.match(page, /const ilgili = relatedCategories\(surface\.slug, catalog\.categories \?\? \[\], 8\);/);
  assert.ok(!/\.filter\(\(c\) => c\.slug !== surface\.slug && \(c\.live_products \?\? 0\) > 0\)\s*\n\s*\.slice\(0, 8\)/.test(page));
});
