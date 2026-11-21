// conciergeSeed.test.ts — asistan → ürün sayfası tek seferlik ön-doldurma (22 Kas 2026).
import test from "node:test";
import assert from "node:assert/strict";
import { buildSeed, CONCIERGE_SEED_TTL_MS, dayOffsetFor, normalizeSlotLabel, readSeed } from "./conciergeSeed.ts";

const NOW = Date.UTC(2026, 10, 22, 9, 0);

test("kayıt: yalnız gün / saat / semt; rakamlı semt ve geçersiz tarih düşer", () => {
  const s = buildSeed("/urun/pembe-guller", { date: "2026-11-23", time: "12:00 - 15:00", district: "Kadıköy", city: "İstanbul" }, true, NOW)!;
  assert.deepEqual(s, { path: "/urun/pembe-guller", date: "2026-11-23", time: "12:00 - 15:00", place: "Kadıköy, İstanbul", focus: true, ts: NOW });
  const b = buildSeed("/urun/x", { date: "yarın", time: "öğleden sonra", district: "Bağdat Cd 12" }, false, NOW);
  assert.equal(b, null, "kullanılabilir alan yoksa ve odak yoksa kayıt yazılmaz");
  assert.equal(buildSeed("https://evil.example/x", { date: "2026-11-23" }, true, NOW), null);
});

test("okuma: aynı ürün yolu + süre içinde; başka ürün / süresi dolmuş / bozuk → null", () => {
  const raw = JSON.stringify(buildSeed("/en/product/rose", { date: "2026-11-23" }, true, NOW));
  assert.equal(readSeed(raw, "/en/product/rose", NOW + 1000)?.date, "2026-11-23");
  assert.equal(readSeed(raw, "/en/product/other", NOW), null);
  assert.equal(readSeed(raw, "/en/product/rose", NOW + CONCIERGE_SEED_TTL_MS + 1), null);
  assert.equal(readSeed("{bozuk", "/en/product/rose", NOW), null);
});

test("gün farkı 0-29; geçmiş / çok ileri null", () => {
  const today = new Date(2026, 10, 22, 10);
  assert.equal(dayOffsetFor("2026-11-22", today), 0);
  assert.equal(dayOffsetFor("2026-11-23", today), 1);
  assert.equal(dayOffsetFor("2026-11-21", today), null);
  assert.equal(dayOffsetFor("2027-01-30", today), null);
  assert.equal(dayOffsetFor(null, today), null);
});

test("slot etiketi biçim farkına dayanıklı", () => {
  assert.equal(normalizeSlotLabel("12:00 - 15:00"), normalizeSlotLabel("12.00–15.00"));
  assert.equal(normalizeSlotLabel("9:00-12:00"), "09:00-12:00");
});
