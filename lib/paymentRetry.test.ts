// paymentRetry.test.ts — kart ödemesi yedek altyapı kuralları (çift çekim kalkanı).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  resolveResultView, retryButtonLabel, retryErrorView, saveRetryInfo, readRetryInfo, isEmailLike, PAY_RETRY_PREFIX,
} from "./paymentRetry.ts";

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, m };
};
const KEY = "a".repeat(40);
const src = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("görünüm: yedek YALNIZ sunucu kesin başarısız + yedek açık + bu sekmede anahtar varken", () => {
  const failed = { paid: false, status: "failed", order_number: null, retry_available: true, retry_provider: "iyzico" as const };
  assert.equal(resolveResultView(failed, false, true), "retry");
  assert.equal(resolveResultView(failed, false, false), "failed", "anahtar yoksa (başka sekme) buton yok");
  assert.equal(resolveResultView({ ...failed, retry_available: false }, false, true), "failed");
  assert.equal(resolveResultView({ ...failed, payment_failed: true }, false, true), "failed", "ana + yedek başarısız");
});

test("görünüm: BELİRSİZ (pending) asla yedek göstermez; zaman aşımı başarısızlık DEĞİLDİR", () => {
  const pending = { paid: false, status: "pending", order_number: null, retry_available: true, retry_provider: "iyzico" as const };
  assert.equal(resolveResultView(pending, false, true), "checking");
  assert.equal(resolveResultView(pending, true, true), "uncertain");
  assert.equal(resolveResultView(null, true, true), "uncertain", "ağ hatası da belirsizdir");
});

test("görünüm: ödendi → Siparişiniz alındı (başka denemeyle ödenmiş sipariş dahil)", () => {
  assert.equal(resolveResultView({ paid: true, status: "failed", order_number: "CY-1" }, false, false), "paid");
});

test("yedek başlatma hataları: belirsiz → kontrol ediliyor; tükendi → diğer yöntemler; ham kod gösterilmez", () => {
  assert.deepEqual(retryErrorView("payment_pending", 409), { view: "uncertain", message: null });
  assert.deepEqual(retryErrorView("payment_unverified", 409), { view: "uncertain", message: null });
  assert.equal(retryErrorView("exhausted", 409).view, "failed");
  assert.equal(retryErrorView("already_paid", 409).view, "checking");
  const other = retryErrorView("unavailable", 503);
  assert.equal(other.view, "retry");
  assert.ok(other.message && !/unavailable|503/.test(other.message));
  assert.equal(retryButtonLabel("iyzico"), "iyzico ile Öde");
});

test("yeniden deneme anahtarı: yalnız bu sekmede, doğrulanmış biçimde; bozuk/eksik okunmaz", () => {
  const s = mem();
  assert.equal(saveRetryInfo(s, { oid: "CY20261104123456", order_id: 42, retry_key: KEY }), true);
  assert.deepEqual(readRetryInfo(s, "CY20261104123456")?.order_id, 42);
  assert.equal(readRetryInfo(s, "CY20261104999999"), null);
  assert.equal(saveRetryInfo(s, { oid: "CY1-2", order_id: 42, retry_key: KEY }), false, "alfanümerik olmayan oid");
  assert.equal(saveRetryInfo(s, { oid: "CY20261104123456", order_id: 0, retry_key: KEY }), false);
  assert.equal(saveRetryInfo(s, { oid: "CY20261104123456", order_id: 42, retry_key: null }), false);
  s.setItem(`${PAY_RETRY_PREFIX}CY20261104777777`, "{bozuk");
  assert.equal(readRetryInfo(s, "CY20261104777777"), null);
  assert.equal(readRetryInfo(s, "CY20261104123456", Date.now() + 25 * 3600 * 1000), null, "24 sa sonra geçersiz");
  assert.equal(isEmailLike("a@b.co"), true); assert.equal(isEmailLike("x"), false);
});

test("sonuç sayfası: karar sunucudan; ?fail=1 kararı belirlemez; tutar istemciden gönderilmez; token kullanılır", () => {
  const page = src("app/checkout/sonuc/page.tsx");
  assert.ok(!/params\.get\("fail"\)/.test(page), "fail parametresi okunmuyor");
  assert.match(page, /resolveResultView\(s, tries >= FAST_POLLS, canRetryHere\)/);
  assert.ok(!/amount|total_amount_minor:/.test(page.slice(page.indexOf("const startRetry"), page.indexOf("return (\n"))), "yeniden denemede tutar gönderilmez");
  assert.ok(!/#[0-9A-Fa-f]{6}\b/.test(page), "sabit renk yok (tasarım token'ları)");
  assert.ok(!/style=\{\{/.test(page), "satır içi stil yok");
  // C7: metinler sözlükten (müşterinin dili); TR değerleri birebir aynı kalır.
  const trDict = src("lib/i18n/dict/tr.ts");
  for (const [key, text] of [
    ["payres.uncertainTitle", "Ödemeniz kontrol ediliyor"],
    ["payres.uncertainText", "Birkaç dakika içinde size bilgi vereceğiz"],
    ["payres.retryText", "Diğer ödeme altyapımızla tekrar deneyebilirsiniz"],
    ["payres.otherMethod", "Farklı ödeme yöntemi seç"],
    ["payres.paidTitle", "Siparişiniz alındı"],
  ]) {
    assert.ok(page.includes(`t("${key}")`), key);
    const line = trDict.split("\n").find((l) => l.includes(`"${key}": "`)) ?? "";
    assert.ok(line.includes(text), key);
  }
  // belirsiz görünümde yedek düğme YOK
  const uncertain = page.slice(page.indexOf('{view === "uncertain"'), page.indexOf('{view === "paid"'));
  assert.ok(!/startRetry|retryButtonLabel|payres\.payWith/.test(uncertain));
});

test("checkout: ödeme ekranı oluşmadıysa yalnız sunucu yedeği onaylarsa sonuç sayfasına; havale akışı değişmedi", () => {
  const w = src("components/checkout/CheckoutWizard.tsx");
  const c = w.slice(w.indexOf("} catch (failure) {"), w.indexOf("const apiError = failure instanceof CheckoutApiError"));
  assert.match(c, /paymentMethod !== "havale"/);
  assert.match(c, /d\.retry_available === true/);
  assert.match(w, /saveRetryInfo\(tabStorage\(\), \{ oid: r\.merchant_oid, order_id: r\.order_id, retry_key: r\.retry_key \}\)/);
  const proxy = src("app/api/payment/iyzico-init/route.ts");
  assert.match(proxy, /\/api\/public\/payment\/iyzico\/init/);
});
