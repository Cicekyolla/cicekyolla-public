// lib/sitemapProductCoverage.test.ts — products.xml kapsama yardımcısının regresyon testleri.
// Çalıştırma: node --test lib/sitemapProductCoverage.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import { missingProductPaths } from "./sitemapProductCoverage.ts";

const envanter = new Set(["/urun/101-kirmizi-gul-buketi", "/urun/mavi-guller"]);

test("envanterdeki ürünler TEKRAR üretilmez (bugünkü düğümler değişmez)", () => {
  const out = missingProductPaths(envanter, [
    { slug: "101-kirmizi-gul-buketi", updated_at: "2026-09-01T00:00:00.000Z" },
    { slug: "mavi-guller" },
  ]);
  assert.deepEqual(out, []);
});

test("envanterde olmayan aktif ürün eklenir; lastmod ürün tarihinden, yoksa null", () => {
  const out = missingProductPaths(envanter, [
    { slug: "pembe-ambalajda-beyaz-gul-buketi", updated_at: "2026-08-20T10:00:00.000Z" },
    { slug: "green-harmony-deluxe-aranjman" },
  ]);
  assert.deepEqual(out, [
    { path: "/urun/pembe-ambalajda-beyaz-gul-buketi", updated_at: "2026-08-20T10:00:00.000Z" },
    { path: "/urun/green-harmony-deluxe-aranjman", updated_at: null },
  ]);
});

test("geçersiz slug'lar (boşluk, büyük harf, Türkçe karakter, sorgu) sitemap'e girmez", () => {
  const out = missingProductPaths(envanter, [
    { slug: "" },
    { slug: "  " },
    { slug: "Buyuk-Harf" },
    { slug: "gül-buketi" },
    { slug: "a b" },
    { slug: "x?y=1" },
    { slug: "-bastan-tire" },
  ]);
  assert.deepEqual(out, []);
});

test("aynı slug iki kez gelirse tek düğüm (tekilleştirme)", () => {
  const out = missingProductPaths(new Set(), [{ slug: "acelya-agaci" }, { slug: "acelya-agaci" }]);
  assert.equal(out.length, 1);
});

test("yalnız eksikler döner, envanter sırasına dokunulmaz (birleştirme lib/sitemap.ts'te)", () => {
  const out = missingProductPaths(new Set(["/urun/a"]), [{ slug: "b" }, { slug: "a" }, { slug: "c" }]);
  assert.deepEqual(out.map((o) => o.path), ["/urun/b", "/urun/c"]);
});
