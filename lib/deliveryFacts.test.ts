// lib/deliveryFacts.test.ts — teslimat bilgi notu (14 Kas 2026, ADDITIVE).
// Çalıştırma: node --test lib/deliveryFacts.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarizeSamples, type CheckSample } from "./deliveryFacts.ts";

const s = (cutoff: string | null, fee: number | null = 0, extras: number[] = [0, 0, 0]): CheckSample =>
  ({ cutoff_time: cutoff, fee_minor: fee, slot_extra_fee_minor: extras });

test("aralık: en erken–en geç saat motor örneklerinden (Kadıköy Moda 18:00, Göztepe 19:00)", () => {
  assert.deepEqual(summarizeSamples([s("19:00:00"), s("18:00:00"), s("19:00:00")]), { earliest: "18:00", latest: "19:00", feeMinor: 0 });
});

test("tek saat: tüm örnekler aynıysa earliest = latest", () => {
  assert.deepEqual(summarizeSamples([s("20:00:00"), s("20:00")]), { earliest: "20:00", latest: "20:00", feeMinor: 0 });
});

test("ücret: örnekler arasında farklıysa ya da saat dilimi ek ücreti varsa ücret yazılmaz (null)", () => {
  assert.equal(summarizeSamples([s("18:00", 0), s("18:00", 50000)])!.feeMinor, null);
  assert.equal(summarizeSamples([s("18:00", 0, [0, 15000])])!.feeMinor, null);
  assert.equal(summarizeSamples([s("18:00", null)])!.feeMinor, null);
  assert.equal(summarizeSamples([s("18:00", 50000), s("17:00", 50000)])!.feeMinor, 50000);
});

test("uydurma yok: örnek okunamadıysa, saat yoksa ya da liste boşsa null → not basılmaz", () => {
  assert.equal(summarizeSamples([]), null);
  assert.equal(summarizeSamples([s("18:00"), null]), null);
  assert.equal(summarizeSamples([s(null)]), null);
  assert.equal(summarizeSamples([s("yarın")]), null);
});

test("bileşen ve yardımcıda sabit saat ya da ücretsiz vaadi yok", () => {
  const comp = readFileSync(new URL("../components/DeliveryFactsNote.tsx", import.meta.url), "utf8");
  const lib = readFileSync(new URL("./deliveryFacts.ts", import.meta.url), "utf8");
  for (const src of [comp, lib]) {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
    assert.ok(!/["'`][^"'`\n]*\b\d{2}:\d{2}\b/.test(code), "metinlerde sabit HH:MM yok — saat yalnız motordan");
    assert.ok(!/ücretsiz|free delivery|kostenlos/i.test(code), "ücretsiz teslimat vaadi yok");
  }
});

test("yalnız 6 sayfa: not yalnız beklenen yerlerde çağrılır", () => {
  const slug = readFileSync(new URL("../app/[...slug]/page.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const global = readFileSync(new URL("./global/page.tsx", import.meta.url), "utf8");
  assert.match(slug, /parts\[1\] === "kadikoy" \|\| parts\[1\] === "besiktas"/);
  assert.equal((home.match(/<DeliveryFactsNote /g) ?? []).length, 2, "TR ana sayfa: CMS ve yedek düzen");
  assert.match(global, /loc\.district === "kadikoy"/);
  assert.match(global, /locale === "de" && row\.page_key === DESTINATION_ROOT/);
  assert.match(global, /afterHero=\{locale === "de" \?/);
});
