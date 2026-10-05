// <title>'da marka yalnız bir kez — kural + bağlantı.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripTrailingBrand, titleForTemplate } from "./titleBrand.ts";

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

test("marka başlığın İÇİNDE / BAŞINDA geçiyorsa şablon uygulanmaz (absolute) — marka yine tek kez", () => {
  const rendered = (t: string) => { const v = titleForTemplate(stripTrailingBrand(t)); return typeof v === "string" ? TEMPLATE(v) : v!.absolute; };
  for (const t of [
    "ترتيب الزهور برايم Altın Hasat ÇiçekYolla",          // çevrilmiş ürün adı markayla bitiyor (ayraç yok)
    "نسيم اللافندر ترتيب الزهور الفاخر من ÇiçekYolla",   // "… ÇiçekYolla'dan"
    "ترتيب أزهار ÇiçekYolla حلم الربيع ديلوكس",          // marka ortada
    "ÇiçekYolla — Send Flowers to Istanbul",              // dil ana sayfası yedeği: marka başta
    "تنسيق فاخر بوردة حمراء في إناء زجاجي - ÇiçekYolla",  // ayraçlı son ek → atılır, şablon ekler
    "Az Işık İsteyen Bitkiler | ÇiçekYolla",
  ]) assert.equal(brandCount(rendered(t)), 1, `${t} → ${rendered(t)}`);
  // Marka geçmeyen başlık: şablon markayı ekler (değer string kalır).
  assert.equal(titleForTemplate("11 Kırmızı Gül Buketi"), "11 Kırmızı Gül Buketi");
  assert.deepEqual(titleForTemplate("ÇiçekYolla — Send Flowers to Istanbul"), { absolute: "ÇiçekYolla — Send Flowers to Istanbul" });
  assert.equal(titleForTemplate(undefined), undefined);
});

test("bağlantı: ürün ve kategori başlıkları (TR + dil sayfaları) şablondan önce kuraldan geçer", () => {
  const root = join(import.meta.dirname, "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  assert.match(read("app/urun/[slug]/page.tsx"), /const title = stripTrailingBrand\(seo\?\.meta_title \|\| product\.name\);/);
  assert.match(read("app/kategori/[...slug]/page.tsx"), /categoryPageTitle\(stripTrailingBrand\(managedTitle\(page\) \|\| page\.title_tag\), seoPage\)/);
  const global = read("lib/global/page.tsx");
  assert.equal((global.match(/stripTrailingBrand\(surface\.seo_title \?\? surface\.name \?\? undefined\)/g) ?? []).length, 2, "dil ürün + dil kategori");
  assert.match(global, /stripTrailingBrand\(row\.seo_title \?\? row\.h1 \?\? undefined\)/);
  // Şablona verilen değer her dalda titleForTemplate'ten geçer (TR ürün + TR kategori + 5 dil dalı).
  assert.match(read("app/urun/[slug]/page.tsx"), /title: titleForTemplate\(title\),/);
  assert.match(read("app/kategori/[...slug]/page.tsx"), /title: titleForTemplate\(title\),/);
  assert.equal((global.match(/title: titleForTemplate\(title\)/g) ?? []).length, 5);
});
