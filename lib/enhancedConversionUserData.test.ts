import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildHashedUserData,
  normalizeEmailForTag,
  normalizePhoneE164TR,
  orderNumberToOid,
  stashCardPurchaseUserData,
  takeCardPurchaseUserData,
} from "./enhancedConversionUserData.ts";

/* --------------------------------------------------------------------------
 * Gelişmiş dönüşümler (web) — hash'li kullanıcı verisi KORUMA testleri.
 * Birincil Purchase ölçümü bozulmamalı; ham e-posta/telefon hiçbir yere
 * yazılmamalı; purchase event'i yalnız zenginleşmeli.
 * ------------------------------------------------------------------------ */

const sha = (v: string) => createHash("sha256").update(v, "utf8").digest("hex");
const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

function sahteOturum() {
  const m = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
  };
  (globalThis as unknown as { window: unknown }).window = { sessionStorage };
  return m;
}

test("e-posta (web kuralı): trim + küçük harf; gmail/googlemail'de yalnız noktalar silinir", () => {
  assert.equal(normalizeEmailForTag("  Ayse.Yilmaz@Example.COM "), "ayse.yilmaz@example.com");
  assert.equal(normalizeEmailForTag("Ay.Se@Gmail.com"), "ayse@gmail.com");
  assert.equal(normalizeEmailForTag("a.b@googlemail.com"), "ab@googlemail.com");
  assert.equal(normalizeEmailForTag("a.b+etiket@gmail.com"), "ab+etiket@gmail.com", "web kuralında + eki silinmez");
  assert.equal(normalizeEmailForTag("ali@notcicekyolla.com"), "ali@notcicekyolla.com");
});

test("e-posta gönderilmez: boş / geçersiz / yer tutucu / kendi alan adımız", () => {
  for (const v of [null, undefined, "", "   ", "abc", "a@b", "@x.com", "a b@x.com", ".@gmail.com",
    "musteri@cicekyolla.com.tr", "INFO@CicekYolla.com.tr", "x@mail.cicekyolla.com.tr", "eski@cicekyolla.com"]) {
    assert.equal(normalizeEmailForTag(v), null, String(v));
  }
});

test("telefon: TR biçimleri +905… olur; diğerleri gönderilmez", () => {
  for (const v of ["5321234567", "05321234567", "0532 123 45 67", "905321234567", "+90 (532) 123-45-67", "00905321234567"]) {
    assert.equal(normalizePhoneE164TR(v), "+905321234567", v);
  }
  for (const v of [null, undefined, "", "12345", "02161234567", "+4915123456789"]) {
    assert.equal(normalizePhoneE164TR(v), null, String(v));
  }
});

test("hash: SHA-256 HEX, Google anahtar adları, ham değer YOK", async () => {
  const ud = await buildHashedUserData(" Ayse@Example.com ", "0532 123 45 67");
  assert.deepEqual(ud, {
    sha256_email_address: sha("ayse@example.com"),
    sha256_phone_number: sha("+905321234567"),
  });
  assert.ok(!/ayse|example|5321234567/i.test(JSON.stringify(ud)));
  assert.equal(await buildHashedUserData("musteri@cicekyolla.com.tr", "123"), null, "hiçbiri geçerli değilse null");
  assert.deepEqual(await buildHashedUserData("", "05321234567"), { sha256_phone_number: sha("+905321234567") });
});

test("merchant_oid eşlemesi API toOid ile aynı", () => {
  assert.equal(orderNumberToOid("CY-20260914-123456"), "CY20260914123456");
});

test("kart akışı: yalnız HASH saklanır, sonuç sayfasında tek kez okunup SİLİNİR", async () => {
  const m = sahteOturum();
  await stashCardPurchaseUserData("CY20260914123456", "Ayse@Example.com", "05321234567", 1_000);
  assert.equal(m.size, 1);
  const saklanan = [...m.values()][0];
  assert.ok(!/ayse|example|5321234567/i.test(saklanan), "depoya ham e-posta/telefon YAZILMAZ");

  const ilk = takeCardPurchaseUserData("CY-20260914-123456", 2_000);
  assert.deepEqual(ilk, { sha256_email_address: sha("ayse@example.com"), sha256_phone_number: sha("+905321234567") });
  assert.equal(m.size, 0, "okunduğu an silinmeli");
  assert.equal(takeCardPurchaseUserData("CY-20260914-123456", 3_000), null, "ikinci okuma boş");
});

test("kart akışı: süresi geçmiş / bozuk kayıt kullanılmaz; veri yoksa hiçbir şey saklanmaz", async () => {
  const m = sahteOturum();
  await stashCardPurchaseUserData("OID1", "a@example.com", null, 0);
  assert.equal(takeCardPurchaseUserData("OID1", 3 * 60 * 60 * 1000), null, "2 saati aşan kayıt kullanılmaz");
  m.set("cicekyolla:ec-user:OID2", JSON.stringify({ sha256_email_address: "ham@eposta.com", ts: 1 }));
  assert.equal(takeCardPurchaseUserData("OID2", 2), null, "hex olmayan değer asla geçmez");
  await stashCardPurchaseUserData("OID3", "", "12", 0);
  assert.equal(m.size, 0, "geçerli veri yoksa kayıt açılmaz");
});

test("KAYNAK: purchase yalnız zenginleşir; kilitli ölçüm satırları ve sonuç sayfası aynen", () => {
  const a = src("lib/purchaseAnalytics.ts");
  assert.match(a, /const userData = takeCardPurchaseUserData\(transactionId\);/);
  assert.ok(a.indexOf("if (wasSent(transactionId)) return false;") < a.indexOf("takeCardPurchaseUserData(transactionId)"),
    "hash'ler mükerrer kapısından SONRA okunur");
  assert.equal((a.match(/purchase_user_data: /g) ?? []).length, 2, "kart + havale purchase");
  assert.match(a, /transaction_id: transactionId/);
  assert.match(a, /currency: "TRY"/);

  const r = src("app/checkout/sonuc/page.tsx");
  assert.match(r, /trackPaidPurchase\(s\)/);
  assert.ok(!/sessionStorage|user_data|sha256/i.test(r), "sonuç sayfası değişmedi");

  const w = src("components/checkout/CheckoutWizard.tsx");
  const submit = w.slice(w.indexOf("const submit = async"));
  const init = submit.indexOf("await initPaytr(orderBody)");
  const stash = submit.indexOf("await stashCardPurchaseUserData(r.merchant_oid, senderEmail, senderPhone)");
  const redirect = submit.indexOf("window.location.href = r.iframe_url");
  assert.ok(init > -1 && stash > init && redirect > stash, "hash'ler sipariş oluştuktan sonra, yönlendirmeden önce");

  const mod = src("lib/enhancedConversionUserData.ts");
  assert.ok(!/console\.|localStorage|location|fetch\(/.test(mod), "log / kalıcı depo / URL / ağ YOK");
});
