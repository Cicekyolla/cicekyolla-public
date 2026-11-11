// lib/placeHubBaglanti.test.ts — 11 Kas 2026 (ADDITIVE): İstanbul hizmet hub'ları iç bağlantı.
// Çalıştırma: node --test lib/placeHubBaglanti.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FOOTER_PLACE_KINDS, PLACE_KINDS, placeDistrictHref, siblingPlaceHubs } from "./placePages.ts";
import { KOMSU_ILCELER } from "./istanbulKomsuIlceler.ts";

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const ILCE = new Set(Object.keys(KOMSU_ILCELER));

test("ilçe bağı: Türkçe ad → 39 ilçeden biri; ekler atılır; tanımsız/İstanbul dışı → null", () => {
  assert.equal(ILCE.size, 39);
  assert.equal(placeDistrictHref("Kadıköy", ILCE), "/kadikoy-cicek-siparisi");
  assert.equal(placeDistrictHref("Ataşehir, İstanbul", ILCE), "/atasehir-cicek-siparisi");
  assert.equal(placeDistrictHref("Şişli / İstanbul", ILCE), "/sisli-cicek-siparisi");
  assert.equal(placeDistrictHref("Büyükçekmece", ILCE), "/buyukcekmece-cicek-siparisi");
  assert.equal(placeDistrictHref("Eyüpsultan", ILCE), "/eyupsultan-cicek-siparisi");
  assert.equal(placeDistrictHref("Gaziosmanpaşa", ILCE), "/gaziosmanpasa-cicek-siparisi");
  assert.equal(placeDistrictHref("ÜSKÜDAR", ILCE), "/uskudar-cicek-siparisi");
  assert.equal(placeDistrictHref("Çankaya", ILCE), null, "İstanbul dışı");
  assert.equal(placeDistrictHref("", ILCE), null);
  assert.equal(placeDistrictHref(undefined, ILCE), null);
  assert.equal(placeDistrictHref("<script>", ILCE), null);
});

test("hub şeridi: kendi hub'ı hariç 9 hub; alt bilgi 4 hub, hepsi tanımlı hub", () => {
  for (const k of PLACE_KINDS) {
    const s = siblingPlaceHubs(k.kind);
    assert.equal(s.length, PLACE_KINDS.length - 1);
    assert.ok(!s.some((x) => x.kind === k.kind));
  }
  assert.deepEqual([...FOOTER_PLACE_KINDS], ["hastane", "otel", "cami", "dugun"]);
  assert.ok(FOOTER_PLACE_KINDS.every((k) => PLACE_KINDS.some((d) => d.kind === k)));
});

test("kaynak: yer sayfası şeridi yalnız hub'da; ilçe bağı koşullu; alt bilgi locale'de boş; site haritası 10 hub", () => {
  const pp = oku("components/place/PlacePage.tsx");
  assert.match(pp, /const siblings = slug \? \[\] : siblingPlaceHubs\(kind\);/);
  assert.match(pp, /districtHref \? <Link href=\{districtHref\}/);
  // SEO ilişkileri değişmez.
  assert.match(pp, /alternates: \{ canonical: absoluteUrl\(path\) \}/);
  assert.match(pp, /robots: indexRobots\(page\.index_state\)/);
  const f = oku("components/Footer.tsx");
  const hubFn = f.slice(f.indexOf("function placeHubLinks("));
  assert.ok(hubFn.includes(String.raw`const m = /^\/([a-z]{2})(?:\/|$)/.exec(pathname ?? "");`), "locale öneki regex'i (teslimatLinkleri ile aynı)");
  assert.match(f, /if \(m && \(GLOBAL_LOCALES as readonly string\[\]\)\.includes\(m\[1\]\)\) return \[\];\n  return FOOTER_PLACE_KINDS/);
  const sm = oku("app/site-haritasi/page.tsx");
  assert.match(sm, /\{PLACE_KINDS\.map\(\(k\) => \(\n\s*<Link key=\{k\.kind\} href=\{k\.hub\}/);
});
