import test from "node:test";
import assert from "node:assert/strict";
import { ATTEMPT_KEY_RE, attemptField, isAttemptKey, makeAttemptKey, newAttemptKey } from "./checkoutAttempt.ts";

/* --------------------------------------------------------------------------
 * Deneme anahtarı (checkout_attempt_id).
 * Kırmızı çizgi: anahtar UUID ŞEMASINA BAĞLI DEĞİL (backend opak token bekler,
 * z.string().uuid() olsaydı checkout 422 alırdı — A5-6) ve anahtar üretilemezse
 * sipariş anahtarsız geçer.
 * ------------------------------------------------------------------------ */

test("kalıp backend paymentController ile birebir aynı", () => {
  assert.equal(ATTEMPT_KEY_RE.source, "^[A-Za-z0-9_-]{8,64}$");
});

test("uuid üreteci varsa onun değeri kullanılır", () => {
  const uuid = "3f2a1c9e-4b7d-4f0a-9c1e-8d5b6a7c2e10";
  assert.equal(makeAttemptKey(() => uuid), uuid);
  assert.equal(isAttemptKey(uuid), true);
});

test("uuid yoksa/patlarsa yedek anahtar üretilir ve kalıba UYAR", () => {
  const fallback = makeAttemptKey(undefined, 1_800_000_000_000, () => 0.123456789);
  assert.match(fallback, ATTEMPT_KEY_RE);

  const thrown = makeAttemptKey(() => { throw new Error("no crypto"); }, 1_800_000_000_000, () => 0.5);
  assert.match(thrown, ATTEMPT_KEY_RE);
});

test("uuid geçersiz biçimdeyse (boşluk/nokta) yedeğe düşülür", () => {
  const bad = makeAttemptKey(() => "kısa", 1_800_000_000_000, () => 0.42);
  assert.match(bad, ATTEMPT_KEY_RE);
  assert.notEqual(bad, "kısa");
});

test("rastgele kaynağı hep 0 dönse bile en az 8 karakter üretilir", () => {
  const key = makeAttemptKey(undefined, 0, () => 0);
  assert.match(key, ATTEMPT_KEY_RE);
});

test("newAttemptKey gerçek ortamda da kalıba uyar", () => {
  assert.match(newAttemptKey(), ATTEMPT_KEY_RE);
});

test("geçersiz anahtar sipariş gövdesine HİÇ yazılmaz", () => {
  assert.deepEqual(attemptField(null), {});
  assert.deepEqual(attemptField(undefined), {});
  assert.deepEqual(attemptField("kısa"), {});
  assert.deepEqual(attemptField("iki kelime var burada"), {});
  assert.deepEqual(attemptField("abcdefgh"), { checkout_attempt_id: "abcdefgh" });
});
