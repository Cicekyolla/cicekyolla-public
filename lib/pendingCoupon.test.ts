import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isCouponCode, parsePendingCoupon, PENDING_COUPON_TTL_MS } from "./pendingCoupon.ts";

/* --------------------------------------------------------------------------
 * /sepet → checkout kupon köprüsü.
 * Kırmızı çizgi: KÖPRÜ TUTAR TAŞIMAZ. Bayat bir indirim müşteriye gösterilemez.
 * ------------------------------------------------------------------------ */

const NOW = 1_800_000_000_000;

test("geçerli kayıt okunur", () => {
  const raw = JSON.stringify({ code: "HOSGELDIN150", ts: NOW - 1000 });
  assert.deepEqual(parsePendingCoupon(raw, NOW), { code: "HOSGELDIN150", ts: NOW - 1000 });
});

test("bayat kayıt düşer (TTL)", () => {
  const raw = JSON.stringify({ code: "HOSGELDIN150", ts: NOW - PENDING_COUPON_TTL_MS - 1 });
  assert.equal(parsePendingCoupon(raw, NOW), null);
});

test("bozuk / eksik / yanlış tipli kayıt çökmez", () => {
  for (const raw of [
    null,
    "",
    "{",
    "null",
    "[]",
    JSON.stringify({ ts: NOW }),
    JSON.stringify({ code: "", ts: NOW }),
    JSON.stringify({ code: "KOD" }),
    JSON.stringify({ code: "KOD", ts: "dün" }),
    JSON.stringify({ code: 42, ts: NOW }),
  ]) {
    assert.equal(parsePendingCoupon(raw, NOW), null, String(raw));
  }
});

test("kod uzunluğu backend şemasıyla uyumlu (1..60)", () => {
  assert.equal(isCouponCode("A"), true);
  assert.equal(isCouponCode("A".repeat(60)), true);
  assert.equal(isCouponCode("A".repeat(61)), false);
  assert.equal(isCouponCode("   "), false);
  assert.equal(isCouponCode(undefined), false);
});

test("köprü İNDİRİM TUTARI saklamaz (kaynak kanıtı)", () => {
  const src = readFileSync(join(process.cwd(), "lib/pendingCoupon.ts"), "utf8");
  assert.ok(!/discount/i.test(src.replace(/^\s*(\/\/|\*|\/\*).*$/gm, "")), "kaynakta indirim tutarı alanı olmamalı");
  assert.ok(!/localStorage/.test(src), "kalıcı ikinci depo kurulmamalı");
});
