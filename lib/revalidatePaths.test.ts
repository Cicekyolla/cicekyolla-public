// lib/revalidatePaths.test.ts — SEO sayfası anında yenileme (ADDITIVE).
// Çalıştırma: node --test lib/revalidatePaths.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAX_REVALIDATE_PATHS, normalizeSitePath, parseRevalidatePaths, seoPageTag } from "./revalidatePaths.ts";

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("normalizeSitePath — site içi yollar kabul, sorgu/parça/sondaki / atılır", () => {
  assert.equal(normalizeSitePath("/kategori/ogretmenler-gunu"), "/kategori/ogretmenler-gunu");
  assert.equal(normalizeSitePath("/maltepe/cinar-cicek-siparisi/"), "/maltepe/cinar-cicek-siparisi");
  assert.equal(normalizeSitePath("/kategori/x?page=2#a"), "/kategori/x");
  assert.equal(normalizeSitePath("/"), "/");
});

test("normalizeSitePath — dış / bozuk yollar reddedilir", () => {
  for (const bad of ["//evil.com/x", "https://evil.com", "kategori/x", "/a b", "/a\\b", "/../etc", "", 5, null, `/${"a".repeat(600)}`]) {
    assert.equal(normalizeSitePath(bad), null, String(bad));
  }
});

test("parseRevalidatePaths — gövdesiz / paths'siz çağrı null (bugünkü: yalnız ana sayfa)", () => {
  assert.equal(parseRevalidatePaths(null), null);
  assert.equal(parseRevalidatePaths({}), null);
  assert.equal(parseRevalidatePaths("x"), null);
});

test("parseRevalidatePaths — tekil, geçerli yollar + reddedilen sayısı + üst sınır", () => {
  assert.deepEqual(parseRevalidatePaths({ paths: ["/a", "/a/", "//x", "/b"] }), { paths: ["/a", "/b"], rejected: 1 });
  assert.deepEqual(parseRevalidatePaths({ paths: "/a" }), { paths: [], rejected: 1 });
  const many = Array.from({ length: MAX_REVALIDATE_PATHS + 5 }, (_, i) => `/p${i}`);
  const r = parseRevalidatePaths({ paths: many })!;
  assert.equal(r.paths.length, MAX_REVALIDATE_PATHS);
  assert.equal(r.rejected, 5);
});

test("seoPageTag — yolla birebir, sondaki / ve sorgu etkisiz", () => {
  assert.equal(seoPageTag("/kategori/ogretmenler-gunu"), "seo-page:/kategori/ogretmenler-gunu");
  assert.equal(seoPageTag("/kategori/ogretmenler-gunu/"), seoPageTag("/kategori/ogretmenler-gunu"));
});

test("KAYNAK: uç gövdeli çağrıda yol + etiket yeniler, gövdesiz çağrı bugünkü gibi ana sayfa", () => {
  const route = oku("app/api/revalidate/route.ts");
  assert.match(route, /parseRevalidatePaths\(/);
  assert.match(route, /revalidatePath\(p\)/);
  assert.match(route, /revalidateTag\(seoPageTag\(p\)\)/);
  assert.match(route, /revalidateTag\(HOMEPAGE_CACHE_TAG\)/);
  const api = oku("lib/api.ts");
  assert.equal((api.match(/tags: \[seoPageTag\(path\)\]/g) ?? []).length, 2, "fetchSeoPage + fetchSeoPageChecked etiketli");
});
