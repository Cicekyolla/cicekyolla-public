import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* --------------------------------------------------------------------------
 * Havale siparişinde `purchase` NÖBETİ.
 *
 * Havale siparişi oluştuğunda para henüz gelmemiştir. Tarayıcı o anda GA4 /
 * Google Ads'e "satın alma" bildirirse ödenmeyen her havale siparişi dönüşüm
 * sayılır. Havalede satın alma yalnız ödeme panelden onaylanınca sunucudan
 * bildirilir. Kart yolu değişmez: purchase, sunucu "paid" dediğinde sonuç
 * sayfasında atılır.
 * ------------------------------------------------------------------------ */

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
const yorumsuz = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const WIZARD = src("components/checkout/CheckoutWizard.tsx");
const RESULT = src("app/checkout/sonuc/page.tsx");
const ANALYTICS = src("lib/purchaseAnalytics.ts");

function havaleDali(): string {
  const bas = WIZARD.indexOf('if (paymentMethod === "havale") {');
  assert.ok(bas > -1, "havale dalı bulunamadı");
  const son = WIZARD.indexOf("} else {", bas);
  assert.ok(son > bas, "havale dalının sonu bulunamadı");
  return WIZARD.slice(bas, son);
}

test("havale siparişinde purchase ATILMAZ: sihirbaz havale purchase fonksiyonunu hiç çağırmaz", () => {
  const kod = yorumsuz(WIZARD);
  assert.ok(!kod.includes("trackHavaleOrderPurchase"), "sihirbazda havale purchase çağrısı/importu kalmamalı");
  assert.ok(!kod.includes("pushEcommerceEvent(\"purchase\""), "sihirbaz doğrudan purchase itmemeli");
  assert.ok(!kod.includes("trackPaidPurchase"), "kart purchase'ı sihirbazda değil, sonuç sayfasında atılır");

  const dal = yorumsuz(havaleDali());
  assert.ok(!/purchase/i.test(dal), "havale dalında purchase ile ilgili kod kalmamalı");
  assert.ok(!dal.includes("metaTrack("), "havale dalı Meta Pixel Purchase atmaz (ödeme onayında CAPI gider)");
});

test("havale başarısında panel ölçümü ve başarı ekranı AYNEN: order_created + setDone", () => {
  const dal = havaleDali();
  const olustur = dal.indexOf("await createHavaleOrder(orderBody)");
  const ziyaret = dal.indexOf('trackVisit("order_created", { o: r.order_number');
  const bitti = dal.indexOf("setDone({");
  assert.ok(olustur > -1 && ziyaret > olustur && bitti > ziyaret, "sipariş → order_created → başarı ekranı sırası korunmalı");
  assert.match(dal, /clearPendingDelivery\(\);/);
  assert.match(dal, /clearPendingCoupon\(\);/);
});

test("reklam tıklama kimlikleri siparişle birlikte SUNUCUYA gider (ödeme onayındaki yükleme bunlara dayanır)", () => {
  assert.match(WIZARD, /const adsAttr = readAdsAttribution\(\);/);
  for (const alan of ["ads_gclid: adsAttr.gclid", "ads_gbraid: adsAttr.gbraid", "ads_wbraid: adsAttr.wbraid"]) {
    assert.ok(WIZARD.includes(alan), `${alan} sipariş gövdesinde olmalı`);
  }
});

test("kart yolunda purchase ATILIR: yalnız sunucu 'paid' dediğinde, sonuç sayfasında", () => {
  assert.match(RESULT, /trackPaidPurchase\(s\)/);
  const paid = ANALYTICS.slice(
    ANALYTICS.indexOf("export function trackPaidPurchase"),
    ANALYTICS.indexOf("export function trackHavaleOrderPurchase"),
  );
  assert.match(paid, /if \(!status\.paid \|\| !status\.order_number\) return false;/);
  assert.ok(
    paid.indexOf("if (!status.paid") < paid.indexOf('pushEcommerceEvent("purchase"'),
    "paid kapısı purchase'tan ÖNCE",
  );
  assert.ok(paid.includes("metaTrack("), "kart yolunda Meta Pixel Purchase yerinde");
});

test("havale purchase fonksiyonu dosyada durur ama HİÇBİR yerden çağrılmaz", () => {
  assert.ok(ANALYTICS.includes("export function trackHavaleOrderPurchase"), "fonksiyon silinmedi/yeniden adlandırılmadı");
  assert.ok(ANALYTICS.includes("ARTIK ÇAĞRILMIYOR"), "neden çağrılmadığı fonksiyonun başında yazmalı");
  assert.ok(!yorumsuz(RESULT).includes("trackHavaleOrderPurchase"), "sonuç sayfası havale purchase çağırmaz");
});
