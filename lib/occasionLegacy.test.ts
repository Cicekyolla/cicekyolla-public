// lib/occasionLegacy.test.ts — eski "{kategori}-cicek-siparisi" adresleri.
// Çalıştırma: node --test lib/occasionLegacy.test.ts  (npm run test:unit)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { occasionCategoryTarget } from "./occasionLegacy.ts";

const slugs = new Set<string>(JSON.parse(readFileSync(new URL("./legacy-category-slugs.json", import.meta.url), "utf8")));
const has = (s: string) => slugs.has(s);

test("özel gün eski adresleri gerçek kategoriye gider (ana sayfaya değil)", () => {
  assert.equal(occasionCategoryTarget("kadinlar-gunu", "cicek-siparisi", has), "/kategori/kadinlar-gunu");
  assert.equal(occasionCategoryTarget("anneler-gunu", "cicek-siparisi", has), "/kategori/anneler-gunu");
  assert.equal(occasionCategoryTarget("sevgililer-gunu", "cicek-gonderme", has), "/kategori/sevgililer-gunu");
});

test("kategori olmayan taban ve başka sonekler dokunulmaz (bugünkü davranış)", () => {
  assert.equal(occasionCategoryTarget("uydurma-gun", "cicek-siparisi", has), null);
  assert.equal(occasionCategoryTarget("kadinlar-gunu", "cicek", has), null);
  assert.equal(occasionCategoryTarget("kadinlar-gunu", "cicekci", has), null);
  assert.equal(occasionCategoryTarget(undefined, "cicek-siparisi", has), null);
});

test("kategori slug'ı bir il/ilçe adıyla çakışmıyor (konum kurtarmayı gölgelemez)", () => {
  const map = JSON.parse(readFileSync(new URL("./legacy-location-map.json", import.meta.url), "utf8")) as Record<string, string[]>;
  const places = new Set<string>([...Object.keys(map), ...Object.values(map).flat(), ...Object.entries(map).flatMap(([c, ds]) => ds.map((d) => `${c}-${d}`))]);
  const clash = [...slugs].filter((s) => places.has(s));
  assert.deepEqual(clash, [], `çakışan slug: ${clash.join(", ")}`);
});
