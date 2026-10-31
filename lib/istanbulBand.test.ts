// lib/istanbulBand.test.ts — üst bant İstanbul ayrımı (ADDITIVE).
// Çalıştırma: node --test lib/istanbulBand.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isIstanbulPagePath } from "./istanbulBand.ts";

test("İstanbul sayfaları: il, ilçe, mahalle, yer sayfası, İstanbul teslimat kategorisi", () => {
  for (const p of [
    "/istanbul", "/istanbul/", "/kategori/istanbul-teslimat",
    "/kadikoy-cicek-siparisi", "/maltepe-cicek-siparisi?x=1", "/eyupsultan-cicek-siparisi",
    "/kadikoy/caferaga-cicek-siparisi", "/adalar/burgazada-cicek-siparisi",
    "/hastaneye-cicek-gonderimi", "/avmye-cicek-gonderimi/zorlu-center", "/mezarliga-cicek-gonderimi",
  ]) assert.equal(isIstanbulPagePath(p), true, p);
});

test("İstanbul dışı ve genel sayfalar: bant iki yarıyla kalır", () => {
  for (const p of [
    "/", "/kategori/cicekler", "/kategori/turkiye-geneli-kargo", "/kategori/ogretmenler-gunu",
    "/antalya", "/antalya/alanya", "/ankara-cicek-siparisi", "/muratpasa/x-cicek-siparisi",
    "/kadikoy", "/kadikoy/caferaga", "/urun/kirmizi-gul", "/en/istanbul", "/sepet", null, undefined, "",
  ]) assert.equal(isIstanbulPagePath(p as string), false, String(p));
});

test("KAYNAK: Header bandı İstanbul'da kargo yarısını göstermez", () => {
  const src = readFileSync(new URL("../components/Header.tsx", import.meta.url), "utf8");
  assert.ok(src.includes("const istanbulBand = isIstanbulPagePath(pathname);"));
  assert.ok(src.includes('t(istanbulBand ? "header.bandIstanbul" : "header.band")'));
});
