// Ürün sayfası (DeliveryPlanner) yaka son alım saati — API yaka kuralıyla (Avrupa 17:00) aynı olmalı.
// 25 Kas 2026: sayfada Avrupa 16:00 kalmıştı → 16:00–17:00 arası "Son alım 17:00" sayacı işlerken tüm dilimler kapalıydı.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const planner = readFileSync(new URL("../components/product/DeliveryPlanner.tsx", import.meta.url), "utf8");

test("ürün sayfası: Avrupa yakası son alım 17:00 (16:00 değil)", () => {
  assert.ok(planner.includes("avrupa: 17 * 60"));
  assert.ok(!planner.includes("avrupa: 16 * 60"));
});

test("ürün sayfası: Anadolu yakası son alım 18:00 (19:00 değil) — API ile aynı", () => {
  assert.ok(planner.includes("{ anadolu: 18 * 60, avrupa: 17 * 60 }"));
  assert.ok(!planner.includes("anadolu: 19 * 60"));
});

test("ürün sayfası: dilim yine başlangıcından 1 saat önce kapanır; DB kesimi yalnız daraltır", () => {
  assert.ok(planner.includes("const PREP_LEAD_MIN = 60;"));
  assert.ok(planner.includes("Math.min(SIDE_LAST_PICKUP_MIN[side], slotStartMin - PREP_LEAD_MIN)"));
  assert.ok(planner.includes("if (dbCutoffMin != null) cutoffMin = Math.min(cutoffMin, dbCutoffMin);"));
});
