// C2 (5 Kas 2026) — satış odaklı güvence bloğu: 13 dil metni, şartlı maddeler, dürüstlük kuralları, yerleşim.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ASSURANCE, ASSURANCE_FLAGS, ASSURANCE_PHONES, assuranceItems, assuranceWaHref } from "./global/assuranceCopy.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";

const oku = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const PAIRS = ["pay", "photo", "slots", "slotsFallback", "refund", "airport", "airportFallback", "mosque"] as const;

test("13 global dilin hepsinde eksiksiz metin; marka/sağlayıcı adları çevrilmez", () => {
  assert.deepEqual(Object.keys(ASSURANCE).sort(), [...GLOBAL_LOCALES].sort());
  for (const l of GLOBAL_LOCALES) {
    const c = ASSURANCE[l];
    for (const k of ["title", "intro", "wa", "ctaShop", "ctaWa", "waText"] as const) assert.ok(c[k].trim().length > 1, `${l}.${k}`);
    for (const k of PAIRS) { assert.ok(c[k][0].trim() && c[k][1].trim(), `${l}.${k}`); }
    for (const brand of ["PayTR", "iyzico", "3-D Secure"]) assert.ok(c.pay[1].includes(brand), `${l} pay ${brand}`);
  }
});

test("dürüstlük: fiyat, GBP ve koşulsuz 'ücretsiz iptal' sözü yok; çekim TL olarak söylenir", () => {
  for (const l of GLOBAL_LOCALES) {
    const all = JSON.stringify(ASSURANCE[l]);
    assert.ok(!/£|GBP|₺|€|\$\s?\d/.test(all), `${l}: para birimi/fiyat sözü`);
    assert.ok(!/free cancel|kostenlose storn|annulation gratuite|бесплатн/i.test(all), `${l}: ücretsiz iptal`);
  }
  assert.match(ASSURANCE.en.pay[1], /Turkish lira/);
  assert.match(ASSURANCE.de.pay[1], /Türkischer Lira/);
  assert.match(ASSURANCE.ru.pay[1], /турецких лирах/);
  assert.match(ASSURANCE.ar.pay[1], /بالليرة التركية/);
});

test("şartlı maddeler kapalı başlar: saat listesi ve havalimanı sözü motor doğrulanmadan basılmaz", () => {
  assert.deepEqual({ ...ASSURANCE_FLAGS }, { slots: false, airport: false });
  for (const l of GLOBAL_LOCALES) {
    const items = assuranceItems(l);
    assert.equal(items.length, 7, l);
    assert.deepEqual(items[2], ASSURANCE[l].slotsFallback, `${l} slot yedeği`);
    assert.deepEqual(items[4], ASSURANCE[l].airportFallback, `${l} havalimanı yedeği`);
    assert.ok(!/20[–-]23|8[–-]11/.test(JSON.stringify(items)), `${l}: kapalıyken 20–23 yok`);
    const on = assuranceItems(l, { flags: { slots: true, airport: true } });
    assert.deepEqual(on[2], ASSURANCE[l].slots);
    assert.deepEqual(on[4], ASSURANCE[l].airport);
  }
  assert.ok(!/airport/i.test(JSON.stringify(assuranceItems("en"))), "EN kapalıyken 'airport' geçmez");
});

test("aynı gün teslim edilemeyen ürün: aynı gün sözü taşıyan 3 madde basılmaz", () => {
  for (const l of GLOBAL_LOCALES) {
    const items = assuranceItems(l, { sameDay: false });
    assert.deepEqual(items.map((x) => x[0]), [ASSURANCE[l].pay[0], ASSURANCE[l].photo[0], ASSURANCE[l].refund[0], ASSURANCE[l].wa]);
  }
});

test("WhatsApp: iki hat uluslararası biçimde; bağlantı müşterinin dilinde hazır mesajla", () => {
  for (const l of GLOBAL_LOCALES) {
    const items = assuranceItems(l);
    assert.equal(items[items.length - 1][1], ASSURANCE_PHONES.join(" · "));
    const href = assuranceWaHref(l);
    assert.ok(href.startsWith("https://wa.me/905458813450?text="), l);
    assert.equal(decodeURIComponent(href.split("text=")[1]), ASSURANCE[l].waText);
  }
});

test("yerleşim: yalnız İstanbul ticari ana sayfası (1. sayfa); ürün sayfası masaüstü panel + mobil liste; TR aynen", () => {
  const page = oku("./global/page.tsx");
  assert.ok(page.includes("{!continuation && row.page_key === DESTINATION_ROOT ? <GlobalAssuranceSection locale={locale} /> : null}"));
  assert.ok(page.includes('<span id="products"'), "Çiçeği seç düğmesinin hedefi");
  const panel = oku("../components/product/ProductTrustPanel.tsx");
  assert.ok(panel.includes("if (isGlobalLocale(locale))"));
  for (const k of ["trust.a1", "trust.a2", "trust.a3", "trust.faq", "trust.faqd"]) assert.ok(panel.includes(`t("${k}")`), `TR paneli korunur: ${k}`);
  assert.match(panel, /encodeURIComponent\(t\("trust\.waText"\)\)/);
  const pdp = oku("../components/product/ProductDetail.tsx");
  assert.ok(pdp.includes("<ProductTrustPanel sameDay={!!product.same_day_available} />"));
  assert.match(pdp, /isGlobalLocale\(locale\) \? \(\s*<div data-global-assurance-mobile className="[^"]*lg:hidden/);
});
