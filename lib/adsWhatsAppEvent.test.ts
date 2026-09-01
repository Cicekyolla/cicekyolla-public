import test from "node:test";
import assert from "node:assert/strict";
import { isWhatsAppHref } from "./adsAttribution.ts";
import { pushEvent } from "./analytics.ts";

const TABAN = "https://www.cicekyolla.com.tr";

/* ---------------------------------------------------------------- */
/* isWhatsAppHref — ölçülen tıklama kümesini bu fonksiyon belirler.  */
/* Fazla geniş olursa alakasız tıklamalar dönüşüm sayılır; fazla dar */
/* olursa gerçek sohbetler kaybolur. İkisi de sessiz hatadır.        */
/* ---------------------------------------------------------------- */

test("isWhatsAppHref: gercek WhatsApp adresleri taninir", () => {
  assert.equal(isWhatsAppHref("https://wa.me/905458813450", TABAN), true);
  assert.equal(isWhatsAppHref("https://wa.me/905458813450?text=Merhaba", TABAN), true);
  assert.equal(isWhatsAppHref("https://api.whatsapp.com/send?phone=905458813450", TABAN), true);
});

test("isWhatsAppHref: benzeyen ama farkli adresler ELENIR", () => {
  assert.equal(isWhatsAppHref("https://whatsapp.com/", TABAN), false);
  assert.equal(isWhatsAppHref("https://wa.me.example.com/905458813450", TABAN), false);
  assert.equal(isWhatsAppHref("https://www.cicekyolla.com.tr/wa.me/123", TABAN), false);
  assert.equal(isWhatsAppHref("/kategori/guller", TABAN), false);
  assert.equal(isWhatsAppHref("tel:+905458813450", TABAN), false);
});

test("isWhatsAppHref: bozuk girdide patlamaz", () => {
  assert.equal(isWhatsAppHref("", TABAN), false);
  assert.equal(isWhatsAppHref("javascript:void(0)", TABAN), false);
  assert.equal(isWhatsAppHref("http://", TABAN), false);
});

/* ---------------------------------------------------------------- */
/* pushEvent — aynı sekmede navigasyon buna bağlı. onDone bir kez ve */
/* HER DURUMDA çalışmalı; çalışmazsa kullanıcı WhatsApp'a hiç gidemez */
/* ---------------------------------------------------------------- */

function sahteWindow() {
  const dataLayer: Array<Record<string, unknown>> = [];
  const zamanlayicilar: Array<() => void> = [];
  const w = {
    dataLayer,
    setTimeout: (fn: () => void) => { zamanlayicilar.push(fn); return 0; },
  };
  return { w, dataLayer, calistirZamanlayicilari: () => zamanlayicilar.forEach((f) => f()) };
}

function windowIle<T>(w: unknown, fn: () => T): T {
  const oncesi = (globalThis as Record<string, unknown>).window;
  (globalThis as Record<string, unknown>).window = w;
  try { return fn(); } finally { (globalThis as Record<string, unknown>).window = oncesi; }
}

test("pushEvent: olay dataLayer'a yazilir", () => {
  const { w, dataLayer } = sahteWindow();
  windowIle(w, () => pushEvent("whatsapp_click"));
  assert.equal(dataLayer.length, 1);
  assert.equal(dataLayer[0].event, "whatsapp_click");
  assert.equal("eventCallback" in dataLayer[0], false); // onDone yoksa eklenmez
});

test("pushEvent: onDone verilince eventCallback ve eventTimeout gonderilir", () => {
  const { w, dataLayer } = sahteWindow();
  windowIle(w, () => pushEvent("whatsapp_click", {}, () => {}, 700));
  assert.equal(typeof dataLayer[0].eventCallback, "function");
  assert.equal(dataLayer[0].eventTimeout, 700);
});

test("pushEvent: GTM hic cevap vermezse yedek zamanlayici onDone'u yine de calistirir", () => {
  const { w, calistirZamanlayicilari } = sahteWindow();
  let sayac = 0;
  windowIle(w, () => pushEvent("whatsapp_click", {}, () => { sayac += 1; }));
  assert.equal(sayac, 0, "hemen cagrilmamali");
  calistirZamanlayicilari();
  assert.equal(sayac, 1, "zaman asiminda cagrilmali");
});

test("pushEvent: onDone GTM + zaman asimi ikisinden de gelse TEK KEZ calisir", () => {
  const { w, dataLayer, calistirZamanlayicilari } = sahteWindow();
  let sayac = 0;
  windowIle(w, () => pushEvent("whatsapp_click", {}, () => { sayac += 1; }));
  (dataLayer[0].eventCallback as () => void)();
  (dataLayer[0].eventCallback as () => void)(); // GTM birden fazla kez cagirabilir
  calistirZamanlayicilari();
  assert.equal(sayac, 1);
});

test("pushEvent: sunucuda (window yok) onDone hemen calisir, patlamaz", () => {
  let sayac = 0;
  windowIle(undefined, () => pushEvent("whatsapp_click", {}, () => { sayac += 1; }));
  assert.equal(sayac, 1);
});
