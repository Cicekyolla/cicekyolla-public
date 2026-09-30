import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCouponItems,
  buildCouponRequestBody,
  buildOrderRegionFields,
  cartFingerprint,
  readCouponPreview,
  readRegionIds,
  readServerTotalMinor,
  unanimousRegionIds,
} from "./couponState.ts";

/* --------------------------------------------------------------------------
 * Kupon gövdesi + yanıt okuyucusu.
 * Kırmızı çizgi: indirim/geçerlilik İSTEMCİDE ÜRETİLMEZ; hepsi sunucudan.
 * ------------------------------------------------------------------------ */

test("önizleme kalemleri VARYANT kimliğini taşır (₺0 sipariş kök nedeni)", () => {
  // ADDENDUM #1: motor ana ürün fiyatıyla, sipariş varyant fiyatıyla
  // hesaplayınca indirim sipariş tutarını aşabiliyordu.
  const items = buildCouponItems([
    { productId: 12, variantId: 77, quantity: 2 },
    { productId: 13, variantId: null, quantity: 1 },
  ]);
  assert.deepEqual(items, [
    { product_id: 12, quantity: 2, variant_id: 77 },
    { product_id: 13, quantity: 1, variant_id: null },
  ]);
});

test("ürün kimliği olmayan satır atlanır; adet en az 1; string değerler sayıya çevrilir", () => {
  const items = buildCouponItems([
    { productId: null, quantity: 3 },
    { productId: undefined, quantity: 1 },
    { productId: "0" as unknown as number, quantity: 1 },
    { productId: "21" as unknown as number, variantId: "9" as unknown as number, quantity: 0 },
  ]);
  assert.deepEqual(items, [{ product_id: 21, quantity: 1, variant_id: 9 }]);
});

test("bölge kimliği ASLA ad'dan türetilmez — yalnız gerçek sayısal alan okunur", () => {
  assert.deepEqual(readRegionIds({ city: "İstanbul", district: "Maltepe" }), { city_id: null, district_id: null });
  assert.deepEqual(readRegionIds({ cityId: 34, districtId: 560 }), { city_id: 34, district_id: 560 });
  assert.deepEqual(readRegionIds({ city_id: "34", district_id: "0" }), { city_id: 34, district_id: null });
  assert.deepEqual(readRegionIds(undefined), { city_id: null, district_id: null });
});

test("bilinmeyen bölge alanı gövdeye HİÇ yazılmaz (null bile değil)", () => {
  const body = buildCouponRequestBody(" indirim10 ", [{ productId: 5, quantity: 1 }], { city: "İstanbul" });
  assert.deepEqual(body, { code: "indirim10", items: [{ product_id: 5, quantity: 1, variant_id: null }] });
  assert.ok(!("city_id" in body));
  assert.ok(!("district_id" in body));

  const withIds = buildCouponRequestBody("X", [{ productId: 5, quantity: 1 }], { cityId: 34, districtId: 560 });
  assert.equal(withIds.city_id, 34);
  assert.equal(withIds.district_id, 560);
});

test("sipariş gövdesi bölge alanları önizlemeyle AYNI kaynaktan", () => {
  assert.deepEqual(buildOrderRegionFields({ cityId: 34, districtId: 560 }), {
    delivery_city_id: 34,
    delivery_district_id: 560,
  });
  assert.deepEqual(buildOrderRegionFields({ city: "İstanbul" }), {});
});

test("readCouponPreview: geçerlilik ve tutar YALNIZ sunucudan", () => {
  const ok = readCouponPreview(
    { data: { valid: true, code: "HOSGELDIN150", discount_minor: 15000, total_minor: 35000, message: "Kupon uygulandı." } },
    "hosgeldin150",
  );
  assert.deepEqual(ok, {
    valid: true,
    code: "HOSGELDIN150",
    discountMinor: 15000,
    totalMinor: 35000,
    message: "Kupon uygulandı.",
  });
});

test("readCouponPreview: valid=false iken indirim SIFIRLANIR, sunucu mesajı korunur", () => {
  const blocked = readCouponPreview(
    { data: { valid: false, code: "E2E-C-MIN500", discount_minor: 5000, message: "Sepet tutarı kupon için yeterli değil." } },
    "e2e-c-min500",
  );
  assert.equal(blocked.valid, false);
  assert.equal(blocked.discountMinor, 0);
  assert.equal(blocked.message, "Sepet tutarı kupon için yeterli değil.");
});

test("readCouponPreview: valid=true ama indirim 0 → geçerli SAYILMAZ (sahte indirim yok)", () => {
  const zero = readCouponPreview({ data: { valid: true, discount_minor: 0 } }, "KOD");
  assert.equal(zero.valid, false);
  assert.equal(zero.discountMinor, 0);
  assert.equal(zero.code, "KOD");
});

test("readCouponPreview: bozuk/eksik gövde çökmez", () => {
  for (const payload of [null, undefined, {}, { data: null }, { data: { valid: "true" } }, "hata"]) {
    const r = readCouponPreview(payload, "KOD");
    assert.equal(r.valid, false);
    assert.equal(r.discountMinor, 0);
  }
});

test("cartFingerprint: adet/varyant/FİYAT değişimi parmak izini değiştirir, sıra değiştirmez", () => {
  const a = [
    { productId: 1, variantId: 2, quantity: 1, unitPriceMinor: 10000 },
    { productId: 3, variantId: null, quantity: 2, unitPriceMinor: 5000 },
  ];
  const reordered = [a[1], a[0]];
  assert.equal(cartFingerprint(a), cartFingerprint(reordered));
  assert.notEqual(cartFingerprint(a), cartFingerprint([{ ...a[0], quantity: 2 }, a[1]]));
  assert.notEqual(cartFingerprint(a), cartFingerprint([{ ...a[0], unitPriceMinor: 12000 }, a[1]]));
  assert.notEqual(cartFingerprint(a), cartFingerprint([{ ...a[0], variantId: 9 }, a[1]]));
});

/* --------------------------------------------------------------------------
 * SUNUCU TOPLAMI KAZANIR (baseline S: havale başarı ekranı + PayTR etiketi
 * istemci hesabını yazıyordu). Bu testler olmadan "sunucu ₺0 dedi" ile "alan
 * hiç gelmedi" birbirine karışır ve müşteriye yanlış tutar gösterilir.
 * ----------------------------------------------------------------------- */

test("readServerTotalMinor: sunucu tutarı VARSA daima o gösterilir", () => {
  assert.deepEqual(readServerTotalMinor(60000, 99999), { minor: 60000, fromServer: true });
  // Sunucu 0 dedi: geçerli bir toplam, fallback TETİKLENMEZ.
  assert.deepEqual(readServerTotalMinor(0, 99999), { minor: 0, fromServer: true });
  // Sayı olarak gelen metin de sunucu değeridir.
  assert.deepEqual(readServerTotalMinor("60000", 99999), { minor: 60000, fromServer: true });
});

test("readServerTotalMinor: alan YOKSA (eski API) istemci toplamına düşer", () => {
  for (const missing of [null, undefined]) {
    assert.deepEqual(readServerTotalMinor(missing, 60000), { minor: 60000, fromServer: false });
  }
  // Anlamsız/negatif değer de fallback'e düşer; asla NaN gösterilmez.
  assert.deepEqual(readServerTotalMinor("abc", 60000), { minor: 60000, fromServer: false });
  assert.deepEqual(readServerTotalMinor(-5, 60000), { minor: 60000, fromServer: false });
  assert.deepEqual(readServerTotalMinor(undefined, Number.NaN), { minor: 0, fromServer: false });
});

test("unanimousRegionIds: satırlar ayrışıyorsa bölge kimliği GÖNDERİLMEZ", () => {
  // Tek satır / hemfikir satırlar → kimlik taşınır.
  assert.deepEqual(unanimousRegionIds([{ cityId: 34, districtId: 12 }]), { city_id: 34, district_id: 12 });
  assert.deepEqual(
    unanimousRegionIds([{ cityId: 34, districtId: 12 }, { city_id: 34, district_id: 12 }]),
    { city_id: 34, district_id: 12 },
  );
  // İl aynı, ilçe farklı → yalnız il taşınır.
  assert.deepEqual(
    unanimousRegionIds([{ cityId: 34, districtId: 12 }, { cityId: 34, districtId: 99 }]),
    { city_id: 34, district_id: null },
  );
  // İl farklı → hiçbiri taşınmaz.
  assert.deepEqual(
    unanimousRegionIds([{ cityId: 34, districtId: 12 }, { cityId: 7, districtId: 12 }]),
    { city_id: null, district_id: null },
  );
  // Bir satırda kimlik yok → hemfikir sayılmaz (bugünkü teslimat kaydı böyle).
  assert.deepEqual(
    unanimousRegionIds([{ cityId: 34 }, { placeName: "Maltepe" }]),
    { city_id: null, district_id: null },
  );
  // Boş sepet / bozuk girdi çökmez.
  assert.deepEqual(unanimousRegionIds([]), { city_id: null, district_id: null });
  assert.deepEqual(unanimousRegionIds([null, undefined]), { city_id: null, district_id: null });
});

test("unanimousRegionIds sonucu doğrudan gövde kurucularına verilebilir", () => {
  const region = unanimousRegionIds([{ cityId: 34, districtId: 12 }]);
  assert.deepEqual(buildOrderRegionFields(region), { delivery_city_id: 34, delivery_district_id: 12 });
  const body = buildCouponRequestBody("KOD", [{ productId: 1, quantity: 1 }], region);
  assert.equal(body.city_id, 34);
  assert.equal(body.district_id, 12);
});

/* --------------------------------------------------------------------------
 * KUPON PROXY'SİNİN KİMLİK BAŞLIKLARI (kaynak düzeyi kapı).
 *
 * KÖK NEDEN: `POST /api/public/coupon` API tarafında hız sınırlıdır ve kovalar
 * `requestIdentity.clientIdentity(req)` ile kurulur (publicCheckoutController
 * `rateBuckets` → `coupon:validate` + `coupon:not_found`). `x-cy-proxy-secret`
 * + `x-cy-client-ip` gönderilmezse kimlik "trusted değil" olur, istek tek bir
 * paylaşılan `:direct` kovasına düşer ve o kova `observe` modunda kalır → kod
 * deneyen bot için kapı FİİLEN kapanmaz. Proxy bu yüzden diğer üye uçlarıyla
 * aynı tek yoldan (`lib/apiProxyHeaders.forwardToApi`) geçmek ZORUNDADIR.
 *
 * Kaynak düzeyi test: bu dosya bir Next route handler'ı olduğu için birim
 * testte çağrılamaz; kural yine de kilitlenir.
 * ------------------------------------------------------------------------ */

test("/api/coupon proxy'si PAYLAŞILAN kimlik yolundan geçer (elle fetch YOK)", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../app/api/coupon/route.ts", import.meta.url), "utf8");

  // Tek upstream yolu: kimlik başlıkları + çerez + hata yalıtımı orada.
  assert.match(source, /forwardToApi/, "kupon proxy'si forwardToApi kullanmıyor");
  assert.match(source, /path:\s*["'`]\/api\/public\/coupon["'`]/, "upstream yolu değişmiş");
  // Üye oturumu ŞART: API customer_id'yi YALNIZ çerezden türetir.
  assert.match(source, /cookie:\s*true/, "üye oturum çerezi iletilmiyor");
  // Elle kurulmuş upstream fetch'i geri gelirse kimlik başlıkları yine düşer.
  assert.equal(/fetch\s*\(\s*`?\$?\{?API_ORIGIN/.test(source), false, "elle upstream fetch geri gelmiş");
  assert.equal(source.includes("NEXT_PUBLIC_API_ORIGIN"), false, "origin bu dosyada tekrar okunuyor");
});
