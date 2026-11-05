// C5 (5 Kas 2026) — checkout sipariş gövdesi alışveriş dilini taşır (api 126 sender_locale).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const oku = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("CheckoutWizard: orderBody sender_locale = site dili (useI18n)", () => {
  const w = oku("../components/checkout/CheckoutWizard.tsx");
  assert.match(w, /const \{ t, intl, locale \} = useI18n\(\);/);
  const body = w.slice(w.indexOf("const orderBody = {"), w.indexOf("const orderBody = {") + 4000);
  assert.match(body, /sender_locale: locale,/);
  // aynı gövde üç ödeme yoluna da gider (havale, iyzico, PayTR)
  for (const f of ["createHavaleOrder(orderBody)", "initIyzicoPrimary(orderBody)", "initPaytr(orderBody)"]) assert.ok(w.includes(f), f);
});

test("ödeme proxy'leri gövdeyi olduğu gibi iletir (alan düşmez)", () => {
  for (const r of ["../app/api/payment/havale/route.ts", "../app/api/payment/iyzico-init/route.ts", "../app/api/payment/paytr-init/route.ts"]) {
    const s = oku(r);
    assert.match(s, /JSON\.stringify\(body\)/, r);
  }
});
