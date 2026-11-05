// C7 (6 Kas 2026) — ödeme sayfası + kart ödeme sonucu müşterinin dilinde. TR ekranı birebir aynı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import tr from "./i18n/dict/tr.ts";
import { GLOBAL_DICTS } from "./i18n/dicts.ts";
import { retryErrorMessageKey, retryErrorView, retryButtonLabel, providerBrand } from "./paymentRetry.ts";

const oku = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const C7_KEYS = Object.keys(tr).filter((k) => k === "co.pageTitle" || k.startsWith("payres.") || k.startsWith("paytr.")) as Array<keyof typeof tr>;

test("29 yeni anahtar 14 sözlüğün hepsinde dolu; {provider} değişkeni korunur", () => {
  assert.equal(C7_KEYS.length, 29);
  for (const [loc, d] of Object.entries(GLOBAL_DICTS)) {
    for (const k of C7_KEYS) {
      assert.ok(typeof d[k] === "string" && d[k].trim().length > 0, `${loc}.${k}`);
      if (k !== "payres.emailPlaceholder") assert.notEqual(d[k], tr[k], `${loc}.${k} çevrilmemiş`);
    }
    assert.ok(d["payres.payWith"].includes("{provider}"), `${loc} payWith`);
  }
});

test("TR değerleri eski sabit metinle birebir aynı (TR ekranı değişmez)", () => {
  assert.equal(tr["payres.paidTitle"], "Siparişiniz alındı");
  assert.equal(tr["payres.paidText"], "Ödemeniz onaylandı. Sipariş numaranız");
  assert.equal(tr["payres.failedTitle"], "Ödemeniz alınamadı");
  assert.equal(tr["payres.uncertainText"], "Bankanızdan yanıt henüz gelmedi. Birkaç dakika içinde size bilgi vereceğiz. Lütfen bu sırada yeniden ödeme yapmayın.");
  assert.equal(tr["paytr.secure"], "Güvenli Ödeme");
  // Yedek buton: TR metni retryButtonLabel ile aynı kalır.
  for (const p of ["paytr", "iyzico"] as const) {
    assert.equal(tr["payres.payWith"].replace("{provider}", providerBrand(p)), retryButtonLabel(p));
  }
  // Hata mesajı anahtarları: TR metni retryErrorView'ün mesajıyla aynı.
  for (const [err, st] of [["email_required", 400], ["unavailable", 503], [null, 0]] as const) {
    const key = retryErrorMessageKey(err, st)!;
    assert.equal(tr[key], retryErrorView(err, st).message, String(err));
  }
  for (const [err, st] of [["payment_pending", 409], ["exhausted", 409], ["already_paid", 409], [null, 403]] as const) {
    assert.equal(retryErrorMessageKey(err, st), null, String(err));
  }
});

test("checkout layout: /sepet deseni — TR çocuklar aynen, global dil seed'li provider + başlık, noindex korunur", () => {
  const l = oku("../app/checkout/layout.tsx");
  assert.match(l, /export const dynamic = "force-dynamic";/);
  assert.match(l, /if \(!dict\) return \{ robots: PRIVATE_ROUTE_ROBOTS \};/);
  assert.match(l, /return \{ title: dict\["co\.pageTitle"\], robots: PRIVATE_ROUTE_ROBOTS \};/);
  assert.match(l, /if \(!dict\) return children;/);
  assert.match(l, /<I18nProvider initialLocale=\{locale\} initialDict=\{dict\}>/);
});

test("sonuç sayfası + PayTR kutusu + hesap adımı: görünür TR sabit metin kalmadı", () => {
  const kodSatirlari = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((x) => !/^\s*(\/\/|\/\*|\*)/.test(x) && !/\{\/\*/.test(x)).join("\n");
  const sonuc = kodSatirlari(oku("../app/checkout/sonuc/page.tsx"));
  const paytr = kodSatirlari(oku("../components/checkout/PaytrFrame.tsx"));
  for (const [ad, s] of [["sonuc", sonuc], ["PaytrFrame", paytr]] as const) {
    const tr_metin = s.match(/(>|"|')[^"'<>{}\n]*[çğıöşüÇĞİÖŞÜ][^"'<>{}\n]*(<|"|')/g) ?? [];
    assert.deepEqual(tr_metin, [], ad);
  }
  const gate = oku("../components/checkout/AccountGate.tsx");
  assert.doesNotMatch(gate, />✦ Siparişiniz</);
  assert.doesNotMatch(gate, />%100 ÇiçekYolla Garantisi</);
  const w = oku("../components/checkout/CheckoutWizard.tsx");
  assert.doesNotMatch(w, />%100 ÇiçekYolla Garantisi</);
  assert.doesNotMatch(w, />Favorileriniz</);
  // Ödeme akışı aynen: yedek sağlayıcı isteği ve payment_locale değişmedi.
  assert.match(sonuc, /payment_locale: "tr"/);
});
