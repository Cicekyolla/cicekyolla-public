// Ziyaretçi ölçümü (migration 118) — saf yardımcılar ve sunucu tarafı güvenliği.
import { test } from "node:test";
import assert from "node:assert/strict";
import { orderNumberFromOid, trackFromEcommerce, trackVisit, flushVisit } from "./visitTracker.ts";

test("PayTR merchant_oid → sipariş numarası", () => {
  assert.equal(orderNumberFromOid("CY20261022174946"), "CY-20261022-174946");
  assert.equal(orderNumberFromOid("CY-20261022-174946"), "CY-20261022-174946");
  assert.equal(orderNumberFromOid("XX123"), null);
  assert.equal(orderNumberFromOid(null), null);
});

test("tarayıcı yokken (SSR) hiçbir çağrı fırlatmaz", () => {
  assert.doesNotThrow(() => trackVisit("page_view"));
  assert.doesNotThrow(() => trackFromEcommerce("add_to_cart", { items: [{ item_id: "5", price: 10, quantity: 1 }] }));
  assert.doesNotThrow(() => flushVisit(true));
});
