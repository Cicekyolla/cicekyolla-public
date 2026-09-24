import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { localeKirintiBasamaklari, localeBreadcrumbJsonLd } from "./global/localeBreadcrumb.ts";
import { LABELS } from "./global/locationLabels.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";

const mutlak = (p: string) => `https://www.cicekyolla.com.tr${p}`;

test("locale kırıntı basamakları: /<locale>/ öneki, ad yoksa o basamak ve altı yazılmaz, en fazla 3", () => {
  assert.deepEqual(localeKirintiBasamaklari("en", ["istanbul", "kadikoy", "moda-mah"], ["Istanbul", "Kadıköy", "Moda"]), [
    { ad: "Istanbul", yol: "/en/istanbul" },
    { ad: "Kadıköy", yol: "/en/istanbul/kadikoy" },
    { ad: "Moda", yol: "/en/istanbul/kadikoy/moda-mah" },
  ]);
  assert.deepEqual(localeKirintiBasamaklari("de", ["istanbul", "kadikoy"], ["Istanbul", ""]), [{ ad: "Istanbul", yol: "/de/istanbul" }]);
  assert.deepEqual(localeKirintiBasamaklari("de", ["istanbul"], [null]), []);
  assert.equal(localeKirintiBasamaklari("fr", ["a", "b", "c", "d"], ["A", "B", "C", "D"]).length, 3);
});

test("BreadcrumbList JSON-LD: ilk basamak o dilin ana sayfası, tam URL'ler, sıralı position", () => {
  const ld = localeBreadcrumbJsonLd("de", ["istanbul", "silivri"], ["İstanbul", "Silivri"], mutlak, LABELS.de.ana);
  assert.ok(ld);
  const obj = JSON.parse(ld!);
  assert.equal(obj["@type"], "BreadcrumbList");
  assert.deepEqual(obj.itemListElement.map((x: { position: number; name: string; item: string }) => [x.position, x.name, x.item]), [
    [1, "Startseite", "https://www.cicekyolla.com.tr/de"],
    [2, "İstanbul", "https://www.cicekyolla.com.tr/de/istanbul"],
    [3, "Silivri", "https://www.cicekyolla.com.tr/de/istanbul/silivri"],
  ]);
});

test("BreadcrumbList JSON-LD: basamak yoksa null; '<' kaçırılır (script erken kapanmaz)", () => {
  assert.equal(localeBreadcrumbJsonLd("en", ["istanbul"], [""], mutlak, "Home"), null);
  const ld = localeBreadcrumbJsonLd("en", ["istanbul"], ["<script>x</script>"], mutlak, "Home")!;
  assert.equal(ld.includes("<"), false);
  assert.equal(JSON.parse(ld).itemListElement[1].name, "<script>x</script>");
});

test("13 dilde 'ana sayfa' etiketi dolu ve Türkçe değil", () => {
  for (const l of GLOBAL_LOCALES) {
    assert.ok(LABELS[l].ana && LABELS[l].ana.trim().length > 0, l);
    assert.notEqual(LABELS[l].ana, "Ana Sayfa", l);
  }
});

test("kaynak nöbeti: lokasyon sayfası kırıntı JSON-LD'yi hero bloğunda basar", () => {
  const src = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.ok(src.includes(`{kirintiLd ? <script type="application/ld+json"`), "kırıntı JSON-LD script etiketi");
  assert.equal(src.split("localeBreadcrumbJsonLd(locale,").length - 1, 3, "şehir + ilçe + mahalle dallarının üçü de");
});
