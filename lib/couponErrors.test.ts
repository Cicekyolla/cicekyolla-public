import test from "node:test";
import assert from "node:assert/strict";
import { classifyCheckoutFailure, isPresentableMessage, MACHINE_ERROR_CODES } from "./couponErrors.ts";

/* --------------------------------------------------------------------------
 * 409 kupon reddi ile diğer hataları ayırma.
 * Kırmızı çizgi: HAM ENUM/teknik kod müşteriye ASLA gösterilmez.
 * ------------------------------------------------------------------------ */

test("teknik kodlar gösterilebilir SAYILMAZ", () => {
  for (const code of MACHINE_ERROR_CODES) {
    assert.equal(isPresentableMessage(code), false, code);
  }
  for (const code of ["not_found", "already_used", "price_changed", "409", "", "ab"]) {
    assert.equal(isPresentableMessage(code), false, code);
  }
});

test("sunucunun Türkçe cümleleri gösterilebilir", () => {
  for (const message of [
    "Bu kuponun kullanım limiti dolmuş.",
    "Bu kupon yalnızca ilk siparişte kullanılabilir.",
    "Sepetinizdeki ürünlerin fiyatı değiştiği için kupon indirimi uygulanamadı. Sepetinizi yenileyip tekrar deneyin.",
    "Kupon şu anda işleniyor. Lütfen birkaç saniye sonra tekrar deneyin.",
    "Bu kupon belirli teslimat bölgelerine özeldir; web sitesinde kullanılamaz.",
  ]) {
    assert.equal(isPresentableMessage(message), true, message);
  }
});

test("409 + kupon uygulanmış + Türkçe cümle → KUPON reddi, mesaj aynen taşınır", () => {
  const r = classifyCheckoutFailure({
    status: 409,
    error: "Bu kuponun kullanım limiti dolmuş.",
    hadCoupon: true,
  });
  assert.equal(r.kind, "coupon");
  assert.equal(r.couponMessage, "Bu kuponun kullanım limiti dolmuş.");
});

test("fiyat değişimi (price_changed) reddi de kupon reddidir", () => {
  const r = classifyCheckoutFailure({
    status: 409,
    error: "Sepetinizdeki ürünlerin fiyatı değiştiği için kupon indirimi uygulanamadı. Sepetinizi yenileyip tekrar deneyin.",
    hadCoupon: true,
  });
  assert.equal(r.kind, "coupon");
});

test("teslimat/slot makine kodları kendi ekranına gider, kupon mesajı olarak GÖSTERİLMEZ", () => {
  const slot = classifyCheckoutFailure({ status: 409, error: "delivery slot is no longer available", hadCoupon: true });
  assert.equal(slot.kind, "slot");
  assert.equal(slot.couponMessage, null);

  const region = classifyCheckoutFailure({ status: 409, error: "product_not_deliverable_to_address", hadCoupon: true });
  assert.equal(region.kind, "not_deliverable");
  assert.equal(region.couponMessage, null);
});

test("kupon uygulanmamışken 409 → genel hata (yanlış yere kupon mesajı yazılmaz)", () => {
  const r = classifyCheckoutFailure({ status: 409, error: "Bu kuponun kullanım limiti dolmuş.", hadCoupon: false });
  assert.equal(r.kind, "generic");
  assert.equal(r.couponMessage, null);
});

test("409 olmayan durumlar genel hatadır; teknik kod sızmaz", () => {
  for (const [status, error] of [[422, "validation_error"], [500, "internal_error"], [502, "proxy_error"], [404, "duplicate"]] as const) {
    const r = classifyCheckoutFailure({ status, error, hadCoupon: true });
    assert.equal(r.kind, "generic");
    assert.equal(r.couponMessage, null);
  }
});

/*
 * BAĞLANTI HATASI KUPONU SUÇLAMAZ.
 *
 * `status === null` yalnız şu durumda oluşur: tarayıcının `fetch`'i fırladı
 * (çevrimdışı, DNS, iptal) → sunucudan HİÇ yanıt alınmadı. `lib/payment.ts`
 * sunucudan gelen her yanıtı CheckoutApiError ile GERÇEK durum koduyla
 * fırlattığı için, durumsuz hata bir kupon verdikti OLAMAZ.
 *
 * Bu test olmadan `TypeError: Failed to fetch` (büyük harf taşıdığı için
 * "makine kodu" süzgecine yakalanmaz) kupon gerekçesi olarak amber kutuya
 * basılıyordu: müşteri ham İngilizce bir cümle görüyor ve GEÇERLİ kuponunu
 * gereksizce kaldırıyordu.
 */
test("sunucudan yanıt alınamadıysa (durum null) hata KUPONA yazılmaz", () => {
  for (const thrown of [
    "Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "Load failed",
    "The operation was aborted.",
    "internal_error",
  ]) {
    const r = classifyCheckoutFailure({ status: null, error: thrown, hadCoupon: true });
    assert.equal(r.kind, "generic", thrown);
    assert.equal(r.couponMessage, null, thrown);
  }
  // Sunucu GERÇEKTEN 409 dediğinde davranış değişmedi.
  assert.equal(classifyCheckoutFailure({ status: 409, error: "Kupon bulunamadı.", hadCoupon: true }).kind, "coupon");
});

/* --------------------------------------------------------------------------
 * CheckoutApiError — sınıflandırmanın GİRDİ TAŞIYICISI.
 *
 * Bu testler iki şeyi birden korur:
 *  1) HTTP durumu artık kaybolmuyor (eskiden yalnız `new Error(e.error)`
 *     fırlatılıyordu → 409 kupon reddi ile 500 ayırt edilemiyordu).
 *  2) REGRESYON KAPISI: `lib/payment.ts` TypeScript "parameter property"
 *     sözdizimi kullanırsa Node'un tip-sıyırma modu dosyayı ayrıştıramaz ve
 *     onu import eden TÜM testler çöker. Buradaki import o çökmeyi yakalar.
 * ----------------------------------------------------------------------- */

test("CheckoutApiError: durum ve sunucu gövdesi korunur, message sözleşmesi bozulmaz", async () => {
  const { CheckoutApiError } = await import("./payment.ts");
  const rejected = new CheckoutApiError(409, "Bu kuponun kullanım limiti dolmuş.");
  assert.equal(rejected.status, 409);
  assert.equal(rejected.apiError, "Bu kuponun kullanım limiti dolmuş.");
  // Mevcut çağıranlar `failure.message` ile karşılaştırıyor — aynen çalışmalı.
  assert.equal(rejected.message, "Bu kuponun kullanım limiti dolmuş.");
  assert.ok(rejected instanceof Error);

  // Gövde okunamadıysa message durum koduna düşer, ham `undefined` yazılmaz.
  const opaque = new CheckoutApiError(500, null);
  assert.equal(opaque.apiError, null);
  assert.equal(opaque.message, "500");
});

test("CheckoutApiError → classifyCheckoutFailure: 409 kupon reddi, 500 genel hata", async () => {
  const { CheckoutApiError } = await import("./payment.ts");
  const read = (e: InstanceType<typeof CheckoutApiError>, hadCoupon: boolean) =>
    classifyCheckoutFailure({ status: e.status, error: e.apiError, hadCoupon });

  assert.equal(read(new CheckoutApiError(409, "Bu kupon yalnızca ilk siparişte kullanılabilir."), true).kind, "coupon");
  assert.equal(read(new CheckoutApiError(500, "internal_error"), true).kind, "generic");
  assert.equal(read(new CheckoutApiError(409, "delivery slot is no longer available"), true).kind, "slot");
});
