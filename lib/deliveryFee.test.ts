import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cartDeliveryFeeMinor, cartTotalMinor, deliveryMethodLabel } from "./deliveryFee.ts";
import { classifyCheckoutFailure } from "./couponErrors.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";

/**
 * CANLI SATIŞ HATASI (25 Eyl 2026): Şile, ₺7.299 ürün + özel araç ₺500 → sepet "Kargo Ücretsiz", toplam ₺7.299.
 * Kök neden (public): /check'in ücreti (same_day.fee_minor) seçime yazılmıyor, sepet statik "Kargo · Ücretsiz" basıyor,
 * checkout toplamı ara toplam − indirim. Düzeltme: motor ücreti seçimle PendingDelivery.deliveryFeeMinor'a yazılır;
 * sepet/checkout toplamı ücreti içerir; sipariş gövdesi expected_total_minor bildirir; 409 total_changed → yeni tutarla yeniden onay.
 */

test("ŞİLE SENARYOSU: 7.299 + 500 = 7.799; kargo 0 → 'Ücretsiz'; 0–45 km bandı (ücret 0) değişmez", () => {
  const sile = { mode: "sameday" as const, band: "İstanbul - Uzak Bölge Özel Araç (45-150 km)", deliveryFeeMinor: 50000 };
  assert.equal(cartDeliveryFeeMinor([sile]), 50000);
  assert.equal(cartTotalMinor(729900, 0, 50000), 779900);
  assert.equal(cartTotalMinor(729900, 30000, 50000), 749900, "indirim düşer, ücret eklenir");
  assert.equal(cartDeliveryFeeMinor([{ mode: "cargo", deliveryFeeMinor: 0 }]), 0);
  assert.equal(cartDeliveryFeeMinor([{ mode: "sameday", band: "İstanbul - Yakın (Maltepe 0-7 km)", deliveryFeeMinor: 0 }]), 0);
  assert.equal(cartDeliveryFeeMinor([undefined, null, { mode: "sameday" }]), 0, "ücret yoksa 0 (eski kayıt)");
  assert.equal(cartDeliveryFeeMinor([{ deliveryFeeMinor: 50000 }, { deliveryFeeMinor: 0 }]), 50000, "tek gönderim: en büyük");
});

test("teslimat satırı adı: özel araç bandı ('İstanbul - ' öneki düşer), kargo, seçim yok", () => {
  const L = { sameDay: "İstanbul Aynı Gün", cargo: "Kargo", none: "Teslimat" };
  assert.equal(deliveryMethodLabel({ mode: "sameday", band: "İstanbul - Uzak Bölge Özel Araç (45-150 km)" }, L), "Uzak Bölge Özel Araç (45-150 km)");
  assert.equal(deliveryMethodLabel({ mode: "sameday", band: null }, L), "İstanbul Aynı Gün");
  assert.equal(deliveryMethodLabel({ mode: "cargo", band: null }, L), "Kargo");
  assert.equal(deliveryMethodLabel(undefined, L), "Teslimat");
});

test("classifyCheckoutFailure: total_changed kendi sınıfına düşer (kupon reddi sanılmaz)", () => {
  assert.equal(classifyCheckoutFailure({ status: 409, error: "total_changed", hadCoupon: true }).kind, "total_changed");
});

test("kaynak nöbeti — planlayıcı motor ücretini seçime yazar; PDP ve checkout paneli PendingDelivery.deliveryFeeMinor'a taşır", () => {
  const planner = readFileSync(new URL("../components/product/DeliveryPlanner.tsx", import.meta.url), "utf8");
  assert.ok(planner.includes("feeMinor: Number(result?.same_day?.fee_minor ?? 0) + Number(s.extra_fee_minor ?? 0)"), "kurye: band + slot ek ücreti");
  assert.equal((planner.match(/feeMinor: Number\(result\??\.cargo\?\.fee_minor \?\? 0\)/g) ?? []).length, 2, "kargo: iki seçim yolu da ücreti taşır");
  const pdp = readFileSync(new URL("../components/product/ProductDetail.tsx", import.meta.url), "utf8");
  assert.ok(pdp.includes("deliveryFeeMinor: sel.feeMinor ?? 0,"), "PDP seçimi ücreti kaydeder");
  const wiz = readFileSync(new URL("../components/checkout/CheckoutWizard.tsx", import.meta.url), "utf8");
  assert.ok(wiz.includes("deliveryFeeMinor: sel.feeMinor ?? 0,"), "checkout paneli seçimi ücreti kaydeder");
});

test("kaynak nöbeti — sepet ve checkout toplamı ücreti içerir; statik 'Kargo · Ücretsiz' satırı kalktı; gövde expected_total_minor; total_changed → yeni tutar", () => {
  const cart = readFileSync(new URL("../app/sepet/page.tsx", import.meta.url), "utf8");
  assert.ok(cart.includes("const deliveryFeeMinor = cartDeliveryFeeMinor(items.map((item) => item.delivery));"), "sepet ücreti seçimden");
  assert.ok(cart.includes("const totalMinor = cartTotalMinor(subtotalMinor, discountMinor, deliveryFeeMinor);"), "sepet toplamı ücretli");
  assert.ok(!cart.includes('{t("common.cargo")}</span><span className="font-semibold text-[#86EFAC]">{t("common.free")}</span>'), "statik ücretsiz satırı yok");
  assert.ok(cart.includes("data-delivery-fee-row"), "yöntem + ücret satırı");
  const wiz = readFileSync(new URL("../components/checkout/CheckoutWizard.tsx", import.meta.url), "utf8");
  assert.ok(wiz.includes("const total = cartTotalMinor(subtotal, discountMinor, deliveryFeeMinor);"), "checkout toplamı ücretli");
  assert.ok(wiz.includes("expected_total_minor: total,"), "tutar kilidi gövdede");
  assert.ok(wiz.includes(`} else if (kind.kind === "total_changed") {`) && wiz.includes(`t("co.err.totalChanged", { total: money(Number(d?.total_amount_minor ?? total)) })`), "yeni tutar mesajı");
  assert.equal((wiz.match(/data-delivery-fee-row/g) ?? []).length, 2, "özet ve fişte ücret satırı");
  assert.ok(!wiz.includes("const total = Math.max(0, subtotal - discountMinor);"), "eski ücretsiz toplam formülü kalktı");
});

test("14 sözlük: common.deliveryFee ve co.err.totalChanged ({total})", () => {
  for (const l of [...GLOBAL_LOCALES, "tr"]) {
    const d = readFileSync(new URL(`./i18n/dict/${l}.ts`, import.meta.url), "utf8");
    assert.ok(/"common\.deliveryFee": "[^"]{3,}"/.test(d), l + " common.deliveryFee");
    const m = d.match(/"co\.err\.totalChanged": "([^"]+)"/);
    assert.ok(m && m[1].includes("{total}"), l + " co.err.totalChanged {total}");
  }
});
