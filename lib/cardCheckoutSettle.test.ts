import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CARD_CHECKOUT_PREFIX,
  CARD_CHECKOUT_TTL_MS,
  dropCardCheckout,
  paymentConfirmed,
  readCardCheckout,
  settleCardCheckout,
  stashCardCheckout,
  type KeyValueStorage,
} from "./cardCheckoutSettle.ts";

/* --------------------------------------------------------------------------
 * Kart ödemesi sonrası sepet (canlı bulgu 19 Eyl: CY-20260919-184308 ödendi,
 * sepet dolu kaldı). Kırmızı çizgi: sepet YALNIZ sunucu onayı + bu sekmenin
 * notu birlikteyken ve YALNIZ ödemeye giden satırlar için düşer.
 * ------------------------------------------------------------------------ */

const NOW = 1_800_000_000_000;
const OID = "CY20260919184308";
const PAID = { paid: true, status: "paid", order_number: "CY-20260919-184308" };

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(index: number) { return [...this.map.keys()][index] ?? null; }
  getItem(key: string) { return this.map.has(key) ? (this.map.get(key) as string) : null; }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
  removeItem(key: string) { this.map.delete(key); }
  keys() { return [...this.map.keys()]; }
}

const cart = [
  { key: "1493:base:2026-09-20:3:place-a", name: "Beyaz Kasımpatı" },
  { key: "1500:base:2026-09-20:3:place-a", name: "Vazo" },
];

test("başarılı + not var → ödemeye giden TÜM satırlar düşer (havale ile aynı sonuç)", () => {
  const s = new MemoryStorage();
  assert.equal(stashCardCheckout(s, { oid: OID, cartKeys: cart.map((c) => c.key), draftKey: "cy_checkout_draft_x" }, NOW), true);
  const stash = readCardCheckout(s, OID, NOW + 60_000);
  const d = settleCardCheckout({ oid: OID, status: PAID, stash, items: cart });
  assert.equal(d.settle, true);
  assert.deepEqual(d.remaining, []);
  assert.deepEqual(d.removedKeys, cart.map((c) => c.key));
  assert.equal(stash?.draftKey, "cy_checkout_draft_x");
});

test("ödeme başladıktan SONRA eklenen satır kalır", () => {
  const s = new MemoryStorage();
  stashCardCheckout(s, { oid: OID, cartKeys: [cart[0].key] }, NOW);
  const later = { key: "1777:base:2026-09-21:1:place-b", name: "Sonradan eklenen" };
  const d = settleCardCheckout({ oid: OID, status: PAID, stash: readCardCheckout(s, OID, NOW), items: [cart[0], later] });
  assert.equal(d.settle, true);
  assert.deepEqual(d.remaining, [later]);
  assert.deepEqual(d.removedKeys, [cart[0].key]);
});

test("sunucu onayı yoksa sepete dokunulmaz: başarısız, bekleyen, numarasız", () => {
  const s = new MemoryStorage();
  stashCardCheckout(s, { oid: OID, cartKeys: cart.map((c) => c.key) }, NOW);
  const stash = readCardCheckout(s, OID, NOW);
  for (const status of [
    { paid: false, status: "failed", order_number: null },
    { paid: false, status: "pending", order_number: null },
    { paid: true, status: "paid", order_number: null },
    { paid: true, status: "paid", order_number: "   " },
    null,
    undefined,
  ]) {
    const d = settleCardCheckout({ oid: OID, status, stash, items: cart });
    assert.equal(d.settle, false, JSON.stringify(status));
    assert.deepEqual(d.remaining, cart);
    assert.deepEqual(d.removedKeys, []);
  }
  // Not silinmedi: geç gelen callback + sayfa yenileme yine temizleyebilir.
  assert.ok(readCardCheckout(s, OID, NOW));
});

test("yalnız istemci yönlendirmesi (ok URL) yetmez: not olmadan ödenmiş durum da sepete dokunmaz", () => {
  const d = settleCardCheckout({ oid: OID, status: PAID, stash: null, items: cart });
  assert.equal(d.settle, false);
  assert.deepEqual(d.remaining, cart);
});

test("başka siparişin notu bu sepeti silemez (oid eşleşmesi şart)", () => {
  const s = new MemoryStorage();
  stashCardCheckout(s, { oid: "CY20260919000001", cartKeys: cart.map((c) => c.key) }, NOW);
  const other = readCardCheckout(s, "CY20260919000001", NOW);
  const d = settleCardCheckout({ oid: OID, status: PAID, stash: other, items: cart });
  assert.equal(d.settle, false);
  assert.equal(readCardCheckout(s, OID, NOW), null);
});

test("sayfa yenileme: not düşürüldükten sonra ikinci temizlik yok", () => {
  const s = new MemoryStorage();
  stashCardCheckout(s, { oid: OID, cartKeys: [cart[0].key] }, NOW);
  const first = settleCardCheckout({ oid: OID, status: PAID, stash: readCardCheckout(s, OID, NOW), items: cart });
  assert.equal(first.settle, true);
  dropCardCheckout(s, OID);
  const again = settleCardCheckout({ oid: OID, status: PAID, stash: readCardCheckout(s, OID, NOW), items: first.remaining });
  assert.equal(again.settle, false);
  assert.deepEqual(again.remaining, first.remaining);
});

test("24 saati geçmiş not geçersizdir ve yeni yazımda süpürülür", () => {
  const s = new MemoryStorage();
  stashCardCheckout(s, { oid: "CY20260918000001", cartKeys: ["a"] }, NOW);
  assert.equal(readCardCheckout(s, "CY20260918000001", NOW + CARD_CHECKOUT_TTL_MS + 1), null);
  stashCardCheckout(s, { oid: OID, cartKeys: ["b"] }, NOW + CARD_CHECKOUT_TTL_MS + 1);
  assert.deepEqual(s.keys(), [`${CARD_CHECKOUT_PREFIX}${OID}`]);
});

test("bozuk/yabancı değerler ve geçersiz oid güvenle reddedilir", () => {
  const s = new MemoryStorage();
  s.setItem(`${CARD_CHECKOUT_PREFIX}${OID}`, "{bozuk");
  assert.equal(readCardCheckout(s, OID, NOW), null);
  s.setItem(`${CARD_CHECKOUT_PREFIX}${OID}`, JSON.stringify({ v: 1, oid: OID, cartKeys: [1, 2], at: NOW }));
  assert.equal(readCardCheckout(s, OID, NOW), null);
  assert.equal(stashCardCheckout(s, { oid: "CY-2026-TIRELI", cartKeys: ["a"] }, NOW), false);
  assert.equal(stashCardCheckout(s, { oid: "../../x", cartKeys: ["a"] }, NOW), false);
  assert.equal(stashCardCheckout(null, { oid: OID, cartKeys: ["a"] }, NOW), false);
  assert.equal(readCardCheckout(undefined, OID, NOW), null);
});

test("depo hata fırlatsa bile ödeme akışı durmaz (false döner, fırlatmaz)", () => {
  const throwing: KeyValueStorage = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("QuotaExceeded"); },
    removeItem() { throw new Error("SecurityError"); },
  };
  assert.equal(stashCardCheckout(throwing, { oid: OID, cartKeys: ["a"] }, NOW), false);
  assert.equal(readCardCheckout(throwing, OID, NOW), null);
  assert.doesNotThrow(() => dropCardCheckout(throwing, OID));
});

test("paymentConfirmed: yalnız paid=true VE dolu sipariş numarası", () => {
  assert.equal(paymentConfirmed(PAID), true);
  assert.equal(paymentConfirmed({ paid: true, order_number: "" }), false);
  assert.equal(paymentConfirmed({ paid: false, order_number: "CY-1" }), false);
  assert.equal(paymentConfirmed(null), false);
});

/* ── Kaynak sözleşmesi: bağlantılar doğru yerde ve doğru sırada ───────────── */

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("CheckoutWizard: not PayTR init BAŞARISINDAN sonra, yönlendirme/çerçeveden ÖNCE; sepet kart dalında temizlenmez", () => {
  const src = read("components/checkout/CheckoutWizard.tsx");
  const init = src.indexOf("const r = await initPaytr(orderBody);");
  const note = src.indexOf("onCardPaymentStarted?.({ merchantOid: r.merchant_oid, draftKey: DRAFT_KEY })");
  const iframe = src.indexOf("setPaytrUrl(r.iframe_url);");
  const redirect = src.indexOf("window.location.href = r.iframe_url;");
  assert.ok(init > 0 && note > init && note < iframe && note < redirect, "sıra: init → not → çerçeve/yönlendirme");
  const cardBranch = src.slice(init, redirect);
  assert.ok(!/clearCart|onComplete\?\.\(\)/.test(cardBranch), "kart dalı sepeti temizlememeli");
  // Havale dalı değişmedi: sipariş oluşunca onComplete (→ clearCart).
  assert.ok(src.indexOf("onComplete?.();") > 0 && src.indexOf("onComplete?.();") < init);
});

test("checkout sayfası notu o anki sepet anahtarlarıyla yazar; havale onComplete aynı kalır", () => {
  const src = read("app/checkout/page.tsx");
  assert.match(src, /stashCardCheckout\(tabStorage\(\), \{ oid: merchantOid, cartKeys: items\.map\(\(item\) => item\.key\), draftKey \}\)/);
  assert.match(src, /onCardPaymentStarted=\{rememberCardCheckout\}/);
  assert.match(src, /onComplete=\{\(\) => \{ setOrdered\(true\); clearCart\(\); \}\}/);
  assert.match(read("components/checkout/CheckoutFlow.tsx"), /onCardPaymentStarted=\{onCardPaymentStarted\}/);
});

test("sonuç sayfası: temizlik yalnız sunucu onayından (setConfirmed) ve sepet yüklendikten sonra", () => {
  const src = read("app/checkout/sonuc/page.tsx");
  const paidBranch = src.indexOf("if (s.paid && s.order_number) {");
  const setConfirmed = src.indexOf("setConfirmed(s);");
  assert.ok(paidBranch > 0 && setConfirmed > paidBranch, "onay yalnız paid dalında kurulur");
  assert.equal((src.match(/setConfirmed\(/g) || []).length, 1, "başka dal onay kuramaz");
  assert.match(src, /if \(!confirmed \|\| !hydrated \|\| settledRef\.current\) return;/);
  assert.match(src, /settleCardCheckout\(\{ oid, status: confirmed, stash, items \}\)/);
  assert.match(src, /dropCardCheckout\(storage, oid\)/);
  assert.ok(!/clearCart\(/.test(src), "sonuç sayfası tüm sepeti körlemesine silmez");
  assert.match(src, /const storage = tabStorage\(\);/);
  assert.ok(!/sessionStorage/.test(src), "depo erişimi modülde; ölçüm kilidi korunur");
});
