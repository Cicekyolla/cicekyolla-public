import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PAYTR_EMBED_ENABLED } from "./payment.ts";

/* --------------------------------------------------------------------------
 * PayTR site-içi çerçeve + ölçüm zinciri KORUMA testleri.
 *
 * Bu dosya davranışı kaynak üzerinden sabitler: ödeme akışında sessizce
 * bozulabilecek şeyler (kart verisinin bize gelmesi, Purchase'ın ödeme
 * onaylanmadan atılması, gclid'in siparişten önce okunmaması) burada kırılır.
 * ------------------------------------------------------------------------ */

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
const WIZARD = src("components/checkout/CheckoutWizard.tsx");
const FRAME = src("components/checkout/PaytrFrame.tsx");
const RESULT = src("app/checkout/sonuc/page.tsx");
const ANALYTICS = src("lib/purchaseAnalytics.ts");

test("bayrak VARSAYILAN KAPALI — üretim davranışı kendiliğinden değişmez", () => {
  assert.equal(PAYTR_EMBED_ENABLED, false);
  assert.match(src("lib/payment.ts"), /NEXT_PUBLIC_PAYTR_EMBED === "true"/);
});

test("bayrak kapalıyken ESKİ yönlendirme akışı korunuyor", () => {
  assert.match(WIZARD, /window\.location\.href = r\.iframe_url/);
  assert.match(WIZARD, /if \(PAYTR_EMBED_ENABLED\)/);
});

test("çerçevede gösterilen adres initPaytr'ın döndürdüğü ADRESİN TA KENDİSİ", () => {
  // Adres elle kurulmaz / değiştirilmez; token bize ait değildir.
  assert.match(WIZARD, /setPaytrUrl\(r\.iframe_url\)/);
  assert.match(FRAME, /src=\{url\}/);
  assert.ok(!/paytr\.com\/odeme/.test(FRAME.replace(/\/\*[\s\S]*?\*\//g, "")), "adres vitrinde ELLE kurulmamalı");
});

test("KART VERİSİ BİZE DEĞMEZ: kendi kart formumuz yok", () => {
  for (const file of [WIZARD, FRAME]) {
    assert.ok(!/card_number|cardNumber|cvv|cvc|expiry|son kullanma/i.test(file), "kart alanı sızmış");
    assert.ok(!/autoComplete="cc-/i.test(file));
  }
});

test("çerçeve resmi PayTR iframeResizer'ını kullanır, başka betik yüklemez", () => {
  assert.match(FRAME, /const RESIZER_SRC = "https:\/\/www\.paytr\.com\/js\/iframeResizer\.min\.js"/);
  assert.match(FRAME, /<Script src=\{RESIZER_SRC\}/);
  // Dosyadaki TEK dış adres bu olmalı (destek bağlantısı lib/payment'tan gelir).
  // Yalnız blok yorumları ve TAM SATIR yorumları at — satır içi "//" adresin
  // kendisinde de geçtiği için genel bir `//` süpürgesi URL'i yutar.
  const code = FRAME.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  const urls = [...new Set([...code.matchAll(/https?:\/\/[^\s"'`)]+/g)].map((m) => m[0]))];
  assert.deepEqual(urls, ["https://www.paytr.com/js/iframeResizer.min.js"]);
});

test("içerik HİÇBİR durumda kırpılmaz: 'hazır' bayrağı GERÇEK boyutlanmayla kalkar", () => {
  assert.match(FRAME, /scrolling=\{resizerReady \? "no" : "auto"\}/);
  assert.match(FRAME, /minHeight: resizerReady \? \d+ : \d+/);
  // Kritik: setResizerReady yalnız onResized geri çağrısında olmalı. Sadece
  // "iFrameResize() throw etmedi" yeterli DEĞİL — alt sayfa yanıt vermezse
  // sabit yükseklik + scrolling="no" içeriği keser (yerelde ölçüldü).
  assert.match(FRAME, /onResized: \(\) => setResizerReady\(true\)/);
  const attachBody = FRAME.slice(FRAME.indexOf("const attach ="), FRAME.indexOf("}, []);"));
  const readyCalls = (attachBody.match(/setResizerReady\(true\)/g) ?? []).length;
  assert.equal(readyCalls, 1, "yalnız onResized içinde olmalı");
});

test("GÜVENLİ GERİ DÜŞÜŞ: çerçeve açılmazsa mevcut yönlendirme akışına geçilir", () => {
  // Otomatik: `load` olayı 10 sn içinde gelmezse aynı resmi adrese tam sayfa git.
  assert.match(FRAME, /const goToRedirectFlow = useCallback\(/);
  assert.match(FRAME, /window\.location\.href = url;/);
  assert.match(FRAME, /if \(!frameLoaded\) goToRedirectFlow\(\);/);
  assert.match(FRAME, /onLoad=\{\(\) => setFrameLoaded\(true\)\}/);
  assert.match(FRAME, /onError=\{goToRedirectFlow\}/);
  // Elle: her zaman görünür kaçış yolu (banka 3DS sayfası çerçeveyi reddederse).
  assert.match(FRAME, /onClick=\{goToRedirectFlow\}/);
  // Tek yönlü kapı: iki kez yönlendirme yok.
  assert.match(FRAME, /if \(bailedOut\.current \|\| typeof window === "undefined"\) return;/);
});

test("geri düşüş HEDEFİ, bugünkü akışın gittiği ADRESİN AYNISI", () => {
  // Vitrin başka bir adres uydurmaz; yönlendirme de çerçeve de `url` prop'una gider.
  const fn = FRAME.slice(FRAME.indexOf("const goToRedirectFlow"), FRAME.indexOf("}, [url]);"));
  assert.match(fn, /window\.location\.href = url;/);
  assert.ok(!/paytr\.com/.test(fn), "geri düşüşte adres elle kurulmuyor");
});

test("dönüş sayfası çerçeveden üst pencereye çıkar (sonuç kutuda sıkışmaz)", () => {
  assert.match(RESULT, /window\.top !== window\.self/);
  assert.match(RESULT, /window\.top\.location\.replace/);
});

test("ÖLÇÜM: Purchase yalnız ödeme ONAYLANDIĞINDA atılır", () => {
  assert.match(ANALYTICS, /if \(!status\.paid \|\| !status\.order_number\) return false;/);
  // Sonuç sayfası da yalnız paid durumunda tetikler.
  assert.match(RESULT, /if \(s\.paid && s\.order_number\)/);
  assert.match(RESULT, /trackPaidPurchase\(s\)/);
});

test("ÖLÇÜM: transaction_id = sipariş numarası ve mükerrer koruma var", () => {
  assert.match(ANALYTICS, /const transactionId = status\.order_number;/);
  assert.match(ANALYTICS, /if \(wasSent\(transactionId\)\) return false;/);
  assert.match(ANALYTICS, /transaction_id: transactionId/);
  assert.match(ANALYTICS, /markSent\(transactionId\)/);
  // Mükerrer koruma hem bellekte hem localStorage'da (yenilemeye dayanıklı).
  assert.match(ANALYTICS, /memorySent/);
  assert.match(ANALYTICS, /localStorage/);
});

test("ÖLÇÜM: gclid sipariş oluşturulmadan ÖNCE okunup gövdeye konuyor", () => {
  const submit = WIZARD.slice(WIZARD.indexOf("const submit = async"));
  const readIdx = submit.indexOf("readAdsAttribution()");
  const bodyIdx = submit.indexOf("const orderBody");
  const initIdx = submit.indexOf("await initPaytr(orderBody)");
  const havaleIdx = submit.indexOf("await createHavaleOrder(orderBody)");
  assert.ok(readIdx > -1 && bodyIdx > readIdx, "gclid orderBody'den önce okunmalı");
  assert.ok(initIdx > bodyIdx, "kart siparişi gövdeden sonra oluşur");
  assert.ok(havaleIdx > bodyIdx, "havale siparişi gövdeden sonra oluşur");
  for (const key of ["ads_gclid", "ads_gbraid", "ads_wbraid", "meta_fbc", "meta_fbp"]) {
    assert.ok(submit.includes(key + ":"), "attribution alanı düştü: " + key);
  }
});

test("ÖLÇÜM: kart akışında sipariş PayTR'ye GİTMEDEN önce oluşur (gclid kalıcı)", () => {
  // initPaytr sunucuda ordersService.create çağırır; vitrin yalnız gövdeyi verir.
  // Yönlendirme/çerçeve bu satırdan SONRA gelir — tarayıcı ne yaparsa yapsın
  // tıklama kimliği siparişle birlikte veritabanına yazılmış olur.
  const submit = WIZARD.slice(WIZARD.indexOf("const submit = async"));
  const initIdx = submit.indexOf("await initPaytr(orderBody)");
  const redirectIdx = submit.indexOf("window.location.href = r.iframe_url");
  const frameIdx = submit.indexOf("setPaytrUrl(r.iframe_url)");
  assert.ok(initIdx > -1 && redirectIdx > initIdx);
  assert.ok(frameIdx > initIdx);
});
