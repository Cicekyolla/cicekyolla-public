// lib/yabanciSepetDil.test.ts — 11 Kas 2026 (ADDITIVE): yabancı müşteri sepet/ödeme yolunda dil korunur.
// Çalıştırma: node --test lib/yabanciSepetDil.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { localeProductHref, trToLocaleSlugMap } from "./i18n/productPath.ts";
import { cartFeeRowState } from "./cartFeeDisplay.ts";
import { isCommerceFooterPath } from "./commerceFooter.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("TR slug → dil ürün adresi (13 dil segmenti); bulunamazsa / geçersizse null", () => {
  const map = trToLocaleSlugMap([
    { slug: "rosen-arrangement-orange-rosa", tr_slug: "turuncu-pembe-gul-aranjmani" },
    { slug: "../x", tr_slug: "kotu" },
    { slug: "ok", tr_slug: "Büyük Harf" },
  ]);
  assert.equal(map.size, 1);
  assert.equal(localeProductHref("de", "turuncu-pembe-gul-aranjmani", map), "/de/produkt/rosen-arrangement-orange-rosa");
  assert.equal(localeProductHref("az", "turuncu-pembe-gul-aranjmani", map), "/az/mehsul/rosen-arrangement-orange-rosa");
  assert.equal(localeProductHref("en", "yok-boyle-urun", map), null, "çözülemezse TR'ye düşülür");
  assert.equal(localeProductHref("tr", "turuncu-pembe-gul-aranjmani", map), null, "TR'de bugünkü /urun/");
  assert.equal(localeProductHref("xx", "turuncu-pembe-gul-aranjmani", map), null);
  assert.equal(localeProductHref("de", "javascript:alert(1)", map), null);
});

test("teslimat ücreti satırı: seçim eksikse 'hesaplanır' (Ücretsiz değil); tam seçimde 0 → ücretsiz, >0 → tutar", () => {
  assert.equal(cartFeeRowState([undefined], 0), "pending");
  assert.equal(cartFeeRowState([{ date: "2026-11-12" }], 0), "pending", "yöntem yok");
  assert.equal(cartFeeRowState([{ date: "2026-11-12", mode: "sameday" }, undefined], 25000), "pending", "bir satır eksik");
  assert.equal(cartFeeRowState([], 0), "pending");
  assert.equal(cartFeeRowState([{ date: "2026-11-12", mode: "sameday" }], 0), "free");
  assert.equal(cartFeeRowState([{ date: "2026-11-12", mode: "cargo" }], 15000), "amount");
});

test("yerel alt bilgi yalnız sepet / ödeme / takip yollarında", () => {
  for (const p of ["/sepet", "/checkout", "/checkout/sonuc", "/siparis-takip", "/sepet?x=1"]) assert.ok(isCommerceFooterPath(p), p);
  for (const p of ["/", "/kategori/guller", "/urun/x", "/sepetler", "/en/checkout", null]) assert.ok(!isCommerceFooterPath(p), String(p));
});

test("sözlük: yeni anahtarlar 14 dilde dolu; TR çerez metinleri bugünkü varsayılanlarla birebir", () => {
  const keys = ["cart.feePending", "consent.title", "consent.desc", "consent.descShort", "consent.policy", "consent.details", "consent.acceptAll", "consent.accept", "consent.manage", "consent.prefsKicker", "consent.prefsTitle", "consent.close", "consent.required", "consent.requiredDesc", "consent.analytics", "consent.analyticsDesc", "consent.marketing", "consent.marketingDesc", "consent.save", "lfooter.tagline", "lfooter.help", "lfooter.home", "lfooter.whatsapp", "lfooter.cookies", "lfooter.contact", "lfooter.legal", "lfooter.privacy", "lfooter.terms", "lfooter.rights"];
  for (const l of ["tr", ...GLOBAL_LOCALES]) {
    const d = oku(`lib/i18n/dict/${l}.ts`);
    for (const k of keys) assert.match(d, new RegExp(`"${k.replace(".", "\\.")}": "[^"]+"`), `${l} ${k}`);
  }
  const tr = oku("lib/i18n/dict/tr.ts");
  assert.ok(tr.includes('"consent.title": "Deneyiminizi size özel hale getirelim."'));
  assert.ok(tr.includes('"consent.acceptAll": "Tümünü Kabul Et"'));
  assert.ok(tr.includes('"consent.manage": "Tercihleri Yönet"'));
  for (const l of GLOBAL_LOCALES) {
    const d = oku(`lib/i18n/dict/${l}.ts`);
    const block = d.slice(d.indexOf('"consent.title"'), d.indexOf('"lfooter.rights"'));
    assert.ok(!/Çerez|Tümünü|Tercihleri|Gizlilik|Kabul Et|Yardım/.test(block), `${l}: Türkçe kalıntı yok`);
  }
});

test("kaynak: sepet bağı dil adresinden; çerez bandı TR'de Admin, diğer dillerde sözlük; mobil çubuk bandın üstünde", () => {
  const cart = oku("app/sepet/page.tsx");
  assert.ok(!cart.includes("href={`/urun/${item.productSlug}`}"), "sepette sabit TR ürün bağı kalmadı");
  assert.match(cart, /<DeliveryPickLink trSlug=\{item\.productSlug\}>/);
  assert.match(cart, /feeState === "pending" \? <span[^>]*data-delivery-fee-pending>\{t\("cart\.feePending"\)\}/);
  const cm = oku("components/consent/ConsentManager.tsx");
  assert.match(cm, /const trCfg = locale === "tr" \? cfg : null;/);
  assert.ok(!/>\s*(Zorunlu Çerezler|Analiz Çerezleri|Pazarlama Çerezleri|Seçimi Kaydet|Gizlilik Ayarları|Detaylar)\s*</.test(cm), "panelde sabit TR metin yok");
  assert.match(cm, /root\.style\.setProperty\("--cy-consent-h"/);
  assert.match(cm, /cfg\?\.push\.active && locale === "tr" && <NotificationConsent/);
  assert.match(oku("components/product/ProductDetail.tsx"), /bottom: "var\(--cy-consent-h, 0px\)"/);
  assert.match(oku("app/layout.tsx"), /<LocaleCommerceFooterGate identity=\{footerBrand\?\.identity\}><Footer /);
});
