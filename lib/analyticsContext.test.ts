import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAnalyticsContext, normalizeSiteLanguage, paymentTypeFor, readAnalyticsContext, resolveDisplayCurrency } from "./analyticsContext.ts";
import { pushEcommerceEvent, pushEvent } from "./analytics.ts";

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

test("sayfa dili: <html lang> → 2 harf; boş / geçersiz → tr", () => {
  assert.equal(normalizeSiteLanguage("en"), "en");
  assert.equal(normalizeSiteLanguage("de-DE"), "de");
  assert.equal(normalizeSiteLanguage("ZH_cn"), "zh");
  assert.equal(normalizeSiteLanguage(""), "tr");
  assert.equal(normalizeSiteLanguage(null), "tr");
  assert.equal(normalizeSiteLanguage("x"), "tr");
});

test("gösterim para birimi: Türkçe sayfada her zaman TRY; yabancı dilde seçim > dil varsayılanı", () => {
  assert.equal(resolveDisplayCurrency("tr", "cy_currency=USD"), "TRY");
  assert.equal(resolveDisplayCurrency("en", "cy_lang=en; cy_currency=EUR"), "EUR");
  const def = resolveDisplayCurrency("en", null);
  assert.match(def, /^[A-Z]{3}$/);
  assert.deepEqual(buildAnalyticsContext("tr", null), { site_language: "tr", display_currency: "TRY" });
});

test("ödeme türü gerçek seçimden gelir", () => {
  assert.equal(paymentTypeFor("card"), "card");
  assert.equal(paymentTypeFor("havale"), "bank_transfer");
  assert.equal(paymentTypeFor(undefined), "card");
});

test("sunucuda / belge yokken varsayılan döner, fırlatmaz", () => {
  assert.deepEqual(readAnalyticsContext(), { site_language: "tr", display_currency: "TRY" });
});

function withWindow(lang: string, cookie: string, fn: (dl: Array<Record<string, unknown>>) => void) {
  const g = globalThis as Record<string, unknown>;
  const prevW = g.window, prevD = g.document;
  const dataLayer: Array<Record<string, unknown>> = [];
  g.window = { dataLayer, setTimeout: () => 0, location: { pathname: "/", search: "" } };
  g.document = { documentElement: { lang }, cookie };
  try { fn(dataLayer); } finally { g.window = prevW; g.document = prevD; }
}

test("e-ticaret olayı: bağlam üst düzeye eklenir; ecommerce.currency TRY kalır", () => {
  withWindow("en", "cy_currency=USD", (dl) => {
    pushEcommerceEvent("add_payment_info", { currency: "TRY", value: 2499, payment_type: "card", items: [] });
    const ev = dl.find((x) => x.event === "add_payment_info")!;
    assert.equal(ev.site_language, "en");
    assert.equal(ev.display_currency, "USD");
    assert.equal((ev.ecommerce as Record<string, unknown>).currency, "TRY");
    assert.equal((ev.ecommerce as Record<string, unknown>).value, 2499);
    assert.equal("site_language" in (ev.ecommerce as Record<string, unknown>), false);
  });
});

test("tekil olay: bağlam eklenir; çağıranın verdiği alan önceliklidir", () => {
  withWindow("ar", "", (dl) => {
    pushEvent("whatsapp_click", { konum: "pdp" });
    assert.equal(dl[0].site_language, "ar");
    assert.equal(dl[0].konum, "pdp");
    pushEvent("x", { site_language: "elle" });
    assert.equal(dl[1].site_language, "elle");
  });
});

test("add_payment_info artık metne değil ödeme adımına bağlı; eski izleyici devre dışı", () => {
  const w = src("components/checkout/CheckoutWizard.tsx");
  const i = w.indexOf("const paymentInfoSent = useRef<string | null>(null);");
  assert.ok(i > 0);
  const block = w.slice(i, i + 1500);
  assert.match(block, /if \(stepKey !== "odeme"\) \{ paymentInfoSent\.current = null; return; \}/);
  assert.match(block, /pushEcommerceEvent\("add_payment_info", \{/);
  assert.match(block, /payment_type: paymentTypeFor\(paymentMethod\)/);
  assert.match(block, /currency: "TRY"/);
  assert.match(block, /\}, \[stepKey, paymentMethod\]\);/);
  const old = src("components/analytics/EcommercePaymentInfoTracker.tsx");
  assert.ok(!/pushEcommerceEvent\(|MutationObserver|innerText/.test(old), "eski izleyici olay göndermemeli (çift sayım)");
  assert.match(old, /export function EcommercePaymentInfoTracker\(\) \{\s*return null;\s*\}/);
  // Tek kaynak: add_payment_info yalnız sihirbazdan gönderilir.
  const hits = ["components/analytics/EcommerceCheckoutTracker.tsx", "components/analytics/EcommerceCartViewTracker.tsx", "lib/cart.tsx", "lib/purchaseAnalytics.ts"]
    .filter((f) => /"add_payment_info"/.test(src(f)));
  assert.deepEqual(hits, []);
});
