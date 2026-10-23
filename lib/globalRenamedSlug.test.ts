// lib/globalRenamedSlug.test.ts — çeviri slug'ı değişmiş global ürün → yeni slug (ağ YOK).
// Çalıştırma: node --test lib/globalRenamedSlug.test.ts   (npm run test:unit)
// Örnekler GSC 404 listesinden (23 Eki 2026) ve canlı envanterdeki gerçek slug'lardan.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findRenamedSlug, findRenamedLocaleSlug } from "./global/renamedSlug.ts";

const FR = [
  "adele-bouquet-de-roses-saumon",
  "madeleine-bouquet-de-marguerites-roses-et-blanches",
  "vivienne-bouquet-de-marguerites-blanches-en-emballage-lilas",
  "7-roses-blanches-emballage-violet",
];

test("kelimeleri yeniden sıralanmış yeni slug bulunur (bağlaç ve çoğul -s yok sayılır)", () => {
  assert.equal(findRenamedSlug("bouquet-roses-saumon-adele", FR), "adele-bouquet-de-roses-saumon");
  assert.equal(findRenamedSlug("bouquet-vivienne-marguerite-blanche-lilas", FR), "vivienne-bouquet-de-marguerites-blanches-en-emballage-lilas");
  assert.equal(findRenamedSlug("ramo-penelope-rosa-lisianthus", ["penelope-ramo-de-rosas-rosas-y-lisianthus", "audrey-ramo-de-rosas-azules"]), "penelope-ramo-de-rosas-rosas-y-lisianthus");
  assert.equal(findRenamedSlug("bouquet-rose-blu-bianche-audrey", ["audrey-bouquet-di-rose-blu-e-bianche"]), "audrey-bouquet-di-rose-blu-e-bianche");
});

test("tahmin yok: kelime eksikse, birden fazla aday varsa ya da slug çok kısaysa null", () => {
  // Almanca bileşik sözcük ayrışmış (lachsrosen ≠ lachsfarbener + rosen) → eşleşme yok, 404 kalır.
  assert.equal(findRenamedSlug("adele-lachsrosen-strauss", ["adele-strauss-lachsfarbener-rosen"]), null);
  assert.equal(findRenamedSlug("bouquet-roses-blanches", ["bouquet-roses-blanches-a", "bouquet-roses-blanches-b"]), null);
  assert.equal(findRenamedSlug("roses-blanches", ["roses-blanches-bouquet"]), null);
  assert.equal(findRenamedSlug("bouquet-roses-saumon-adele", []), null);
});

test("adayın kendisi (aynı slug) eşleşme sayılmaz", () => {
  assert.equal(findRenamedSlug("adele-bouquet-de-roses-saumon", ["adele-bouquet-de-roses-saumon"]), null);
});

test("envanter locale başına 5 dk tutulur; okuma hatası 404'ü bozmaz", async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return FR; };
  assert.equal(await findRenamedLocaleSlug("fr-test", "bouquet-roses-saumon-adele", fetcher, 0), "adele-bouquet-de-roses-saumon");
  assert.equal(await findRenamedLocaleSlug("fr-test", "bouquet-vivienne-marguerite-blanche-lilas", fetcher, 60_000), FR[2]);
  assert.equal(calls, 1);
  assert.equal(await findRenamedLocaleSlug("de-test", "x-y-z", async () => { throw new Error("api"); }, 0), null);
});

test("kaynak nöbeti: global ürün yüzeyi yoksa önce yeniden adlandırma aranır, sonra 404", () => {
  const src = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.match(src, /const moved = await findRenamedLocaleSlug\(locale, parsed\.slug,/);
  assert.match(src, /if \(moved\) permanentRedirect\(withQuery\(localeProductPath\(locale, moved\)/);
});
