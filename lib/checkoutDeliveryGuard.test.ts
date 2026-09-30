import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyCheckoutFailure, blockingItemNames } from "./couponErrors.ts";
import { CheckoutApiError } from "./payment.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";

/**
 * YAYIN ÖNCESİ SİPARİŞ GÜVENLİĞİ (24 Eyl 2026) — checkout tarafı.
 *  • Sunucu seçilen teslimat seçeneğini artık geçerli bulmazsa siparişi kargoya ÇEVİRMEZ; 409
 *    'delivery_option_changed' + details döner. Checkout: eski seçim düşer, teslimat paneli aynı adresle yeniden
 *    açılır, müşteri güncel seçenekleri görüp yeniden seçer ve onaylar. Slot dolu/kapalı ('delivery slot is no
 *    longer available') aynı yolu izler.
 *  • 'cart_needs_split': sepet tek yöntemle gidemiyor → ödeme öncesi açık ayırma mesajı (ürün adlarıyla).
 *  • Ayrıntı (details) CheckoutApiError ile taşınır; 14 sözlükte metinler.
 */

test("classifyCheckoutFailure: yeni sunucu kodları kendi sınıfına düşer; eski sınıflar aynen", () => {
  assert.equal(classifyCheckoutFailure({ status: 409, error: "delivery_option_changed", hadCoupon: false }).kind, "delivery_changed");
  assert.equal(classifyCheckoutFailure({ status: 409, error: "cart_needs_split", hadCoupon: true }).kind, "cart_split", "kupon varken bile kupon reddi sanılmaz");
  assert.equal(classifyCheckoutFailure({ status: 409, error: "delivery slot is no longer available", hadCoupon: false }).kind, "slot");
  assert.equal(classifyCheckoutFailure({ status: 409, error: "product_not_deliverable_to_address", hadCoupon: false }).kind, "not_deliverable");
  assert.equal(classifyCheckoutFailure({ status: 409, error: "Kupon limiti doldu.", hadCoupon: true }).kind, "coupon");
  assert.equal(classifyCheckoutFailure({ status: null, error: "Failed to fetch", hadCoupon: true }).kind, "generic");
});

test("CheckoutApiError ayrıntı taşır; blockingItemNames engelleyen ürünlerin adını (yoksa numarasını) listeler", () => {
  const details = {
    chosen: "courier", available_methods: [],
    items: [{ product_id: 1, name: "Orkide", courier: false, cargo: true }, { product_id: 2, name: "Gül Kutusu", courier: true, cargo: false }, { product_id: 3, name: null, courier: true, cargo: true }],
    blocking_product_ids: [], courier_only_product_ids: [2], cargo_only_product_ids: [1], undeliverable_product_ids: [],
  };
  const err = new CheckoutApiError(409, "cart_needs_split", details);
  assert.equal(err.details, details);
  assert.deepEqual(blockingItemNames(err.details), ["Orkide", "Gül Kutusu"]);
  assert.deepEqual(blockingItemNames({ items: [{ product_id: 9, name: null }] }), ["#9"], "hiç engelleyen id yoksa tüm ürünler; ad yoksa numara");
  assert.deepEqual(blockingItemNames(null), []);
  assert.equal(new CheckoutApiError(409, "x").details, null, "eski çağrı imzası korunur");
});

test("kaynak nöbeti — CheckoutWizard: delivery_changed/slot → sessiz kabul yok, teslimat paneli yeniden açılır; cart_split → ürün adlı mesaj; sipariş gövdesi son seçimi taşır", () => {
  const src = readFileSync(new URL("../components/checkout/CheckoutWizard.tsx", import.meta.url), "utf8");
  assert.ok(src.includes(`} else if (kind.kind === "delivery_changed" || kind.kind === "slot") {`), "yeni dal");
  const branch = src.slice(src.indexOf(`kind.kind === "delivery_changed" || kind.kind === "slot"`), src.indexOf(`} else if (kind.kind === "cart_split") {`));
  assert.ok(branch.includes("setDraftDelivery(null);") && branch.includes("setEditingDelivery(true);"), "eski seçim düşer, panel açılır");
  assert.ok(branch.includes(`t("co.err.deliveryChanged")`) && branch.includes(`t("co.err.slotGone")`), "mesajlar sözlükten");
  assert.ok(src.includes(`setError(t("co.err.cartSplit", { items: names.length ? names.join(", ") : "—" }));`), "karma sepet mesajı ürün adlarıyla");
  assert.ok(src.includes(`blockingItemNames(failure.details)`), "ayrıntı sunucudan");
  // Sipariş gövdesi: yöntem ve slot müşterinin SON onayladığı seçimden (pd) gelir; kargoda slot yok
  assert.ok(src.includes(`delivery_method: pd?.mode === "cargo" ? "cargo" : pd?.mode === "sameday" ? "courier" : null,`), "yöntem son seçimden");
  assert.ok(src.includes(`delivery_slot_id: pd?.mode === "cargo" ? null : (pd?.slotId ?? null),`), "slot son seçimden");
  // Payment: ayrıntı okunur
  const pay = readFileSync(new URL("./payment.ts", import.meta.url), "utf8");
  assert.ok(pay.includes("return new CheckoutApiError(response.status, apiError, body?.details ?? null);"), "details zarfı okunur");
});

test("14 sözlük: co.err.deliveryChanged / co.err.cartSplit ({items}) / co.err.slotGone (panel dili) var; 'ürün sayfasından' yönlendirmesi kalktı", () => {
  for (const l of [...GLOBAL_LOCALES, "tr"]) {
    const d = readFileSync(new URL(`./i18n/dict/${l}.ts`, import.meta.url), "utf8");
    const changed = d.match(/"co\.err\.deliveryChanged": "([^"]+)"/);
    const split = d.match(/"co\.err\.cartSplit": "([^"]+)"/);
    const slot = d.match(/"co\.err\.slotGone": "([^"]+)"/);
    assert.ok(changed && changed[1].length > 40, l + " deliveryChanged");
    assert.ok(split && split[1].includes("{items}"), l + " cartSplit {items}");
    assert.ok(slot && slot[1].length > 30, l + " slotGone");
  }
  const tr = readFileSync(new URL("./i18n/dict/tr.ts", import.meta.url), "utf8");
  assert.doesNotMatch(tr.match(/"co\.err\.slotGone": "([^"]+)"/)![1], /ürün sayfasından/, "slot mesajı artık checkout panelini işaret eder");
  assert.match(tr.match(/"co\.err\.deliveryChanged": "([^"]+)"/)![1], /başka bir yönteme çevrilmedi/);
});
