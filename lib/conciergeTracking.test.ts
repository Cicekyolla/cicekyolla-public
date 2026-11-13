// conciergeTracking.test.ts — Web AI asistan ölçüm olayları (M1). Ağ / pencere YOK.
import test from "node:test";
import assert from "node:assert/strict";
import { conciergeEventPlan, trackConcierge } from "./conciergeTracking.ts";

test("açılış / mesaj / WhatsApp: yalnız olay adı, içerik YOK", () => {
  for (const kind of ["open", "message", "whatsapp"] as const) {
    const p = conciergeEventPlan(kind);
    assert.equal(p.visit.type, `concierge_${kind}`);
    assert.deepEqual(p.visit.data, {});
    assert.equal(p.gtm.event, `concierge_${kind}`);
    assert.deepEqual(p.gtm.params, {});
  }
});

test("kart tıklaması ürün id ve adını taşır; bozuk kartta yalnız olay adı", () => {
  const p = conciergeEventPlan("card_click", { productId: 451, name: "Kırmızı Güller" });
  assert.deepEqual(p.visit, { type: "concierge_card_click", data: { i: 451, n: "Kırmızı Güller" } });
  assert.deepEqual(p.gtm, { event: "concierge_card_click", params: { item_id: "451", item_name: "Kırmızı Güller" } });
  assert.deepEqual(conciergeEventPlan("card_click", { productId: 0, name: "x" }).visit.data, {});
  assert.deepEqual(conciergeEventPlan("card_click", null).gtm.params, {});
  assert.equal(conciergeEventPlan("card_click", { productId: 1, name: "a".repeat(300) }).visit.data.n?.length, 160);
});

test("sunucuda (window yok) sessizce hiçbir şey yapmaz", () => {
  assert.doesNotThrow(() => trackConcierge("open"));
  assert.doesNotThrow(() => trackConcierge("card_click", { productId: 5, name: "x" }));
});
