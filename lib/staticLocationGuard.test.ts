import { test } from "node:test";
import assert from "node:assert/strict";
import { coreNeighborhoodDecision, istanbulLocationDecision } from "./staticLocationGuard.ts";

// Canlı yönetilen 301 haritasının şekli (yalnız ilgili kayıtlar).
const map = new Map<string, string>([
  ["/istanbul/kadikoy", "/kadikoy-cicek-siparisi"],
  ["/istanbul/kadikoy/fenerbahce-mah", "/kadikoy/fenerbahce-cicek-siparisi"],
  ["/istanbul/pendik", "/pendik-cicek-siparisi"],
  ["/istanbul/pendik/kaynarca-mah", "/pendik/kaynarca-cicek-siparisi"],
  ["/eski-sayfa", "/yeni-sayfa"],
]);

test("İstanbul: gerçek mahallenin eksiz yolu yeni adresine yönlenir", () => {
  assert.deepEqual(istanbulLocationDecision(["istanbul", "kadikoy", "fenerbahce"], map), { kind: "redirect", to: "/kadikoy/fenerbahce-cicek-siparisi" });
  assert.deepEqual(istanbulLocationDecision(["istanbul", "pendik", "kaynarca"], map), { kind: "redirect", to: "/pendik/kaynarca-cicek-siparisi" });
});

test("İstanbul: -mah biçimi de aynı hedefe (middleware atlanırsa)", () => {
  assert.deepEqual(istanbulLocationDecision(["istanbul", "kadikoy", "fenerbahce-mah"], map), { kind: "redirect", to: "/kadikoy/fenerbahce-cicek-siparisi" });
});

test("İstanbul: haritada olmayan segment / ilçe → 404", () => {
  assert.deepEqual(istanbulLocationDecision(["istanbul", "kadikoy", "orkideler"], map), { kind: "notfound" });
  assert.deepEqual(istanbulLocationDecision(["istanbul", "kadikoy", "gul-buketi"], map), { kind: "notfound" });
  assert.deepEqual(istanbulLocationDecision(["istanbul", "uydurma", "xyz"], map), { kind: "notfound" });
  assert.deepEqual(istanbulLocationDecision(["istanbul", "uydurma"], map), { kind: "notfound" });
});

test("İstanbul: geçerli ilçe kökü yeni adresine yönlenir", () => {
  assert.deepEqual(istanbulLocationDecision(["istanbul", "pendik"], map), { kind: "redirect", to: "/pendik-cicek-siparisi" });
});

test("İstanbul: harita boş / İstanbul kaydı yok → bugünkü davranış (synthetic)", () => {
  assert.deepEqual(istanbulLocationDecision(["istanbul", "kadikoy", "orkideler"], new Map()), { kind: "synthetic" });
  assert.deepEqual(istanbulLocationDecision(["istanbul", "kadikoy", "orkideler"], new Map([["/eski", "/yeni"]])), { kind: "synthetic" });
});

test("İstanbul dışı ya da il kökü: dokunulmaz", () => {
  assert.deepEqual(istanbulLocationDecision(["istanbul"], map), { kind: "synthetic" });
  assert.deepEqual(istanbulLocationDecision(["ankara", "cankaya", "x"], map), { kind: "synthetic" });
});

test("Çekirdek: x ya da x-mah varsa bugünkü gibi; yoksa 404; çekirdek yoksa bugünkü gibi", () => {
  const slugs = ["100-yil-mah", "ayranci-mah", "kizilay"];
  assert.deepEqual(coreNeighborhoodDecision("ayranci", slugs), { kind: "synthetic" });
  assert.deepEqual(coreNeighborhoodDecision("ayranci-mah", slugs), { kind: "synthetic" });
  assert.deepEqual(coreNeighborhoodDecision("kizilay", slugs), { kind: "synthetic" });
  assert.deepEqual(coreNeighborhoodDecision("gul-buketi", slugs), { kind: "notfound" });
  assert.deepEqual(coreNeighborhoodDecision("gul-buketi", null), { kind: "synthetic" });
});
