// <title>'da marka yalnız bir kez — kural + bağlantı.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripTrailingBrand } from "./titleBrand.ts";

const TEMPLATE = (t: string) => `${t} | ÇiçekYolla`; // app/layout.tsx title.template
const brandCount = (t: string) => (t.match(/[çc]i[çc]ek\s?yolla/giu) ?? []).length;

test("canlıdaki gerçek çift marka örnekleri: şablondan sonra marka tam bir kez", () => {
  const stored = [
    "Aurelia Krem Beyaz Gül Palmiye Buketi | Cicekyolla",
    "Beyaz Zarafet Orkide Aranjmanı | Cicekyolla",
    "Mor Menekşe Orkide Bahçesi | Aynı Gün Teslimat - Cicekyolla",
    "Pembe Orkide Aranjmanı | Aynı Gün Teslimat - Cicekyolla",
    "Red Rose Bouquet | ÇiçekYolla",
    "Rote Rosen — Çiçekyolla",
    "Buket · cicekyolla.com.tr",
    "Buket | Cicekyolla | ÇiçekYolla",
  ];
  for (const s of stored) {
    assert.equal(brandCount(TEMPLATE(s)) >= 2, true, `ön koşul: "${s}" şablonla çift marka üretir`);
    const out = TEMPLATE(stripTrailingBrand(s));
    assert.equal(brandCount(out), 1, `"${s}" → "${out}"`);
  }
  assert.equal(stripTrailingBrand("Mor Menekşe Orkide Bahçesi | Aynı Gün Teslimat - Cicekyolla"), "Mor Menekşe Orkide Bahçesi | Aynı Gün Teslimat");
});

test("marka ile BİTMEYEN başlık aynen kalır (içinde marka geçse de, ayraç olsa da)", () => {
  for (const s of [
    "11 Kırmızı Gül Buketi",
    "Dekoratif Lilyum Saksı | Taze Çiçek Teslimat",
    "Çiçekyolla ile İstanbul'a Çiçek Gönder",
    "ÇiçekYolla — Send Flowers to Istanbul",
    "Gül - Lale - Orkide",
    "Çiçek Yollama Rehberi",
    "",
  ]) assert.equal(stripTrailingBrand(s), s);
});

test("yalnız markadan ibaret başlık ve string olmayan değerler aynen döner", () => {
  assert.equal(stripTrailingBrand("| Cicekyolla"), "| Cicekyolla");
  assert.equal(stripTrailingBrand(undefined), undefined);
  assert.equal(stripTrailingBrand(null), null);
});

test("bağlantı: ürün ve kategori başlıkları (TR + dil sayfaları) şablondan önce kuraldan geçer", () => {
  const root = join(import.meta.dirname, "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  assert.match(read("app/urun/[slug]/page.tsx"), /const title = stripTrailingBrand\(seo\?\.meta_title \|\| product\.name\);/);
  assert.match(read("app/kategori/[...slug]/page.tsx"), /categoryPageTitle\(stripTrailingBrand\(managedTitle\(page\) \|\| page\.title_tag\), seoPage\)/);
  const global = read("lib/global/page.tsx");
  assert.equal((global.match(/stripTrailingBrand\(surface\.seo_title \?\? surface\.name \?\? undefined\)/g) ?? []).length, 2, "dil ürün + dil kategori");
  assert.match(global, /stripTrailingBrand\(row\.seo_title \?\? row\.h1 \?\? undefined\)/);
});
