import test from "node:test";
import assert from "node:assert/strict";
import {
  dayNumber,
  minuteOfDay,
  expiryStamp,
  istanbulNow,
  isDeliveryExpired,
  partitionExpired,
} from "./deliveryExpiry.ts";

/** Europe/Istanbul yaz/kış farkı yok (UTC+3 sabit) — beklenenler buna göre. */
test("istanbulNow: UTC epoch'u İstanbul takvimine çevirir", () => {
  // 2026-09-03T21:30:00Z → İstanbul 2026-09-04 00:30
  const n = istanbulNow(Date.UTC(2026, 8, 3, 21, 30));
  assert.equal(n.ymd, "2026-09-04");
  assert.equal(n.minutes, 30);
});

test("istanbulNow: gece yarısı 0. dakikadır (24 taşması yok)", () => {
  const n = istanbulNow(Date.UTC(2026, 8, 3, 21, 0)); // İstanbul 00:00
  assert.equal(n.ymd, "2026-09-04");
  assert.equal(n.minutes, 0);
});

test("dayNumber: geçerli/geçersiz tarihler", () => {
  assert.equal(dayNumber("1970-01-01"), 0);
  assert.equal(dayNumber("1970-01-02"), 1);
  assert.equal(dayNumber("2026-09-04")! - dayNumber("2026-09-03")!, 1);
  assert.equal(dayNumber("2026-02-31"), null, "ay taşması reddedilir");
  assert.equal(dayNumber("2026-13-01"), null);
  assert.equal(dayNumber("04.09.2026"), null);
  assert.equal(dayNumber(""), null);
  assert.equal(dayNumber(undefined), null);
});

test("minuteOfDay: HH:MM ve HH:MM:SS", () => {
  assert.equal(minuteOfDay("12:00:00"), 720);
  assert.equal(minuteOfDay("09:30"), 570);
  assert.equal(minuteOfDay("00:00:00"), 0);
  assert.equal(minuteOfDay("24:00"), null);
  assert.equal(minuteOfDay("bugün"), null);
  assert.equal(minuteOfDay(null), null);
});

test("expiryStamp: slot varsa slot bitişi, yoksa gün sonu", () => {
  const day = dayNumber("2026-09-03")!;
  assert.equal(expiryStamp({ date: "2026-09-03", slotEnd: "12:00:00" }), day * 1440 + 720);
  assert.equal(expiryStamp({ date: "2026-09-03" }), day * 1440 + 1440);
  assert.equal(expiryStamp({}), null, "tarihsiz satırın süresi DOLMAZ");
  assert.equal(expiryStamp(null), null);
  assert.equal(expiryStamp({ date: "bozuk" }), null);
});

const NOW = istanbulNow(Date.UTC(2026, 8, 3, 10, 0)); // İstanbul 2026-09-03 13:00

test("DÜN teslimatlı satır geçmiştir", () => {
  assert.equal(isDeliveryExpired({ date: "2026-09-02", slotEnd: "18:00:00" }, NOW), true);
  assert.equal(isDeliveryExpired({ date: "2026-09-02" }, NOW), true);
});

test("BUGÜN hâlâ geçerli saat silinmez", () => {
  assert.equal(isDeliveryExpired({ date: "2026-09-03", slotEnd: "15:00:00" }, NOW), false);
  // Tam sınırda (13:00 slot bitişi, saat 13:00) HENÜZ geçmemiştir.
  assert.equal(isDeliveryExpired({ date: "2026-09-03", slotEnd: "13:00:00" }, NOW), false);
});

test("BUGÜN artık geçersiz saat geçmiştir", () => {
  assert.equal(isDeliveryExpired({ date: "2026-09-03", slotEnd: "12:00:00" }, NOW), true);
  assert.equal(isDeliveryExpired({ date: "2026-09-03", slotEnd: "12:59" }, NOW), true);
});

test("BUGÜN slotsuz (kargo) satır gün sonuna kadar geçerli", () => {
  assert.equal(isDeliveryExpired({ date: "2026-09-03", mode: "cargo" }, NOW), false);
});

test("YARIN teslimatlı satır geçerli", () => {
  assert.equal(isDeliveryExpired({ date: "2026-09-04", slotEnd: "12:00:00" }, NOW), false);
});

test("emniyet payı (saat sunucuya demirlenmemişken) yanlış silmeyi önler", () => {
  // 12:00'de bitmiş slot, şimdi 13:00 → 60 dk pay ile HENÜZ silinmez.
  assert.equal(isDeliveryExpired({ date: "2026-09-03", slotEnd: "12:00:00" }, NOW, 60), false);
  // 11:00'de bitmişse 60 dk pay bile kurtarmaz.
  assert.equal(isDeliveryExpired({ date: "2026-09-03", slotEnd: "11:00:00" }, NOW, 60), true);
  // Dün gece yarısı bitmiş satır 60 dk payla da geçmiştir.
  assert.equal(isDeliveryExpired({ date: "2026-09-02" }, NOW, 60), true);
});

test("tarihsiz (legacy) satır HİÇBİR koşulda silinmez", () => {
  assert.equal(isDeliveryExpired(undefined, NOW), false);
  assert.equal(isDeliveryExpired({ address: "Maltepe" }, NOW), false);
  assert.equal(isDeliveryExpired({ slotEnd: "09:00:00" }, NOW), false);
});

test("partitionExpired: sepet satırlarını ayırır, sırayı korur", () => {
  const rows = [
    { key: "a", delivery: { date: "2026-09-02", slotEnd: "18:00:00" } },
    { key: "b", delivery: { date: "2026-09-03", slotEnd: "18:00:00" } },
    { key: "c", delivery: undefined },
    { key: "d", delivery: { date: "2026-09-03", slotEnd: "09:00:00" } },
  ];
  const { kept, expired } = partitionExpired(rows, (r) => r.delivery, NOW);
  assert.deepEqual(kept.map((r) => r.key), ["b", "c"]);
  assert.deepEqual(expired.map((r) => r.key), ["a", "d"]);
  // Girdi mutasyona uğramaz.
  assert.equal(rows.length, 4);
});

test("partitionExpired: boş liste güvenli", () => {
  const { kept, expired } = partitionExpired([], () => undefined, NOW);
  assert.deepEqual(kept, []);
  assert.deepEqual(expired, []);
});
