import { test } from "node:test";
import assert from "node:assert/strict";
import { countdownPhase, formatRemaining, normalizeCountdownItems, pickCountdown } from "./countdown.ts";

const raw = [{
  id: "ogretmenler-gunu-2026", enabled: true, label: "24 Kasım Öğretmenler Günü'ne", target_date: "2026-11-24",
  sub_text: "Bugün sipariş verin", day_text: "Bugün Öğretmenler Günü", cta_label: "Hemen Sipariş Ver",
  cta_href: "/kategori/ogretmenler-gunu", show_on_home: true,
  paths: ["/kategori/ogretmenler-gunu", "/kategori/sinif-ogretmenine-cicek/"],
}];
const items = normalizeCountdownItems(raw);
const NOW = Date.parse("2026-11-01T12:00:00Z");

test("yol eşleşmesi: liste + sondaki / + sorgu; ana sayfa show_on_home; başka sayfa yok", () => {
  assert.equal(pickCountdown(items, "/kategori/ogretmenler-gunu", NOW)?.id, "ogretmenler-gunu-2026");
  assert.equal(pickCountdown(items, "/kategori/sinif-ogretmenine-cicek?sort=x", NOW)?.id, "ogretmenler-gunu-2026");
  assert.equal(pickCountdown(items, "/", NOW)?.id, "ogretmenler-gunu-2026");
  assert.equal(pickCountdown(items, "/kategori/dogum-gunu", NOW), null);
  assert.equal(pickCountdown([{ ...items[0], show_on_home: false }], "/", NOW), null);
  assert.equal(pickCountdown([{ ...items[0], enabled: false }], "/kategori/ogretmenler-gunu", NOW), null);
});

test("evreler: önce sayaç, 24 Kasım TR gün içi, 25 Kasım 00:00 TR gizli", () => {
  assert.deepEqual(countdownPhase("2026-11-24", Date.parse("2026-11-23T20:00:00Z")), { kind: "before", days: 0, hours: 1, minutes: 0 });
  assert.deepEqual(countdownPhase("2026-11-24", Date.parse("2026-11-23T21:00:00Z")), { kind: "day" });
  assert.deepEqual(countdownPhase("2026-11-24", Date.parse("2026-11-24T20:59:00Z")), { kind: "day" });
  assert.deepEqual(countdownPhase("2026-11-24", Date.parse("2026-11-24T21:00:00Z")), { kind: "over" });
  assert.equal(pickCountdown(items, "/kategori/ogretmenler-gunu", Date.parse("2026-11-24T21:00:00Z")), null);
});

test("biçim: 22 gün 9 saat 0 dk; gün yoksa saatten başlar", () => {
  const ph = countdownPhase("2026-11-24", NOW);
  assert.equal(ph.kind, "before");
  if (ph.kind === "before") assert.equal(formatRemaining(ph), "22 gün 9 saat 0 dk");
  assert.equal(formatRemaining({ days: 0, hours: 0, minutes: 5 }), "5 dk");
  assert.equal(formatRemaining({ days: 22, hours: 9, minutes: 0 }, true), "22g 9sa 0dk");
});

test("normalize: dış link ve bozuk tarih süzülür", () => {
  assert.equal(normalizeCountdownItems([{ ...raw[0], cta_href: "//kotu.example" }])[0].cta_href, "");
  assert.equal(normalizeCountdownItems([{ ...raw[0], target_date: "24.11.2026" }]).length, 0);
});
