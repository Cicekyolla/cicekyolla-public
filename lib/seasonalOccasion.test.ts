import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applySeasonalOccasions, istanbulDay } from "./seasonalOccasion.ts";

const BASE = [
  { id: "birthday", name: "Doğum Günü", href: "/kategori/dogum-gunu-cicekleri", image: "a.webp" },
  { id: "valentine", name: "Sevgiliye", href: "/kategori/sevgiliye-cicek", image: "b.webp" },
  { id: "mothers-day", name: "Anneler Günü", href: "/kategori/anneye-cicek", image: "c.webp" },
  { id: "graduation", name: "Mezuniyet", href: "/kategori/mezuniyet-cicekleri", image: "d.webp" },
  { id: "get-well", name: "Geçmiş Olsun", href: "/kategori/gecmis-olsun-cicekleri", image: "e.webp" },
  { id: "congratulations", name: "Tebrik", href: "/kategori/tebrik-cicekleri", image: "f.webp" },
];

test("pencere içinde: Öğretmenler Günü başa, Mezuniyet yerine; kart sayısı 6 kalır", () => {
  const out = applySeasonalOccasions(BASE, new Date("2026-11-07T12:00:00Z"));
  assert.equal(out.length, 6);
  assert.equal(out[0].href, "/kategori/ogretmenler-gunu");
  assert.ok(!out.some((c) => c.id === "graduation"));
  assert.deepEqual(out.slice(1).map((c) => c.id), ["birthday", "valentine", "mothers-day", "get-well", "congratulations"]);
});

test("24 Kasım İstanbul günü sonuna kadar dahil; 25 Kasım'da eski liste", () => {
  assert.equal(applySeasonalOccasions(BASE, new Date("2026-11-24T20:59:00Z"))[0].id, "teachers-day");
  assert.deepEqual(applySeasonalOccasions(BASE, new Date("2026-11-24T21:00:00Z")).map((c) => c.id), BASE.map((c) => c.id));
  assert.equal(istanbulDay(new Date("2026-11-24T21:00:00Z")), "2026-11-25");
});

test("pencere öncesi ve değiştirilecek kart yoksa liste aynen", () => {
  assert.deepEqual(applySeasonalOccasions(BASE, new Date("2026-10-31T12:00:00Z")).map((c) => c.id), BASE.map((c) => c.id));
  const noGrad = BASE.filter((c) => c.id !== "graduation");
  assert.deepEqual(applySeasonalOccasions(noGrad, new Date("2026-11-07T12:00:00Z")).map((c) => c.id), noGrad.map((c) => c.id));
});

test("bileşen varsayılan listeye sezon kartını uygular", () => {
  const s = readFileSync(new URL("../components/home/OccasionShopping.tsx", import.meta.url), "utf8");
  assert.match(s, /applySeasonalOccasions\(DEFAULT_OCCASIONS, new Date\(\)\)/);
});
