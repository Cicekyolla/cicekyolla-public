// globalFoundationR1.test.ts — çalıştırma: node --test lib/globalFoundationR1.test.ts
//
// RELEASE 1 — GLOBAL FOUNDATION (26 Eyl 2026) kaynak nöbetçileri.
// Kanıt: Google `site:cicekyolla.com.tr/en` sonuçlarının tamamına "Translate this page" koyuyordu;
// locale sayfalarının ilk HTML'i Türkçe arayüz taşıyordu (24× "Sepete Ekle", TR rozetler, TR alt metin,
// TR WhatsApp hazır mesajı, TR sepet kabuğu). Bu testler düzeltmelerin geri alınmasını engeller.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLOBAL_DICTS, dictFor } from "./i18n/dicts.ts";
import { V80_COPY, flattenCopy } from "./global/v80/copy.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";
import tr from "./i18n/dict/tr.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("I18nProvider seed'lenebilir: initialLocale/initialDict prop'ları var, kök kullanım (TR) değişmedi", () => {
  const src = read("./i18n/index.tsx");
  assert.match(src, /initialLocale\?: Locale;/);
  assert.match(src, /initialDict\?: Dict;/);
  assert.match(src, /cache\[seeded\] = initialDict/);
  const layout = read("../app/layout.tsx");
  assert.match(layout, /<I18nProvider>\s*\{\/\*/, "kök layout provider'ı prop'suz (TR) çağırmaya devam etmeli");
});

test("V80Shell locale alt ağacını o dilin sözlüğüyle sarar (SSR o dilde)", () => {
  const src = read("../components/global/v80/V80Shell.tsx");
  assert.match(src, /<I18nProvider initialLocale=\{locale\} initialDict=\{GLOBAL_DICTS\[locale\]\}>/);
});

test("13 Global dilin sözlüğü sunucu haritasında; TR için undefined", () => {
  for (const l of GLOBAL_LOCALES) {
    const d = GLOBAL_DICTS[l];
    assert.ok(d && typeof d["card.addToCart"] === "string" && d["card.addToCart"].length > 0, `${l} sözlüğü`);
    assert.equal(dictFor(l), d);
  }
  assert.equal(dictFor("tr"), undefined);
});

test("ProductCard rozetleri sözlükten: deriveTags hardcoded Türkçe etiket taşımaz", () => {
  const src = read("../components/home/ProductCard.tsx");
  for (const s of ["\"Taze Çiçek\"", "\"Aynı Gün Teslim\"", "\"Premium Koleksiyon\"", "\"Kampanyalı\"", "\"Saksı Bitkisi\"", "aria-label=\"Favorilere ekle\""]) {
    assert.ok(!src.includes(s), `hardcoded metin geri gelmemeli: ${s}`);
  }
  assert.match(src, /export function deriveTags\(p: Product, ctx: CardContextTag \| undefined, t: CardTagT\)/);
  for (const k of ["card.tag.fresh", "card.tag.sameDay", "card.tag.premium", "card.tag.sale", "card.tag.plant", "card.wishlist"]) {
    assert.ok(src.includes(`t("${k}")`) || src.includes(`tr("${k}")`), `${k} kullanılmalı`);
    assert.ok(typeof (tr as Record<string, string>)[k] === "string", `${k} TR sözlüğünde olmalı`);
  }
});

test("TR sözlüğü eski rozet metinlerini birebir taşır (TR kart görünümü değişmez)", () => {
  const d = tr as Record<string, string>;
  assert.equal(d["card.tag.fresh"], "Taze Çiçek");
  assert.equal(d["card.tag.sameDay"], "Aynı Gün Teslim");
  assert.equal(d["card.tag.premium"], "Premium Koleksiyon");
  assert.equal(d["card.tag.sale"], "Kampanyalı");
  assert.equal(d["card.tag.plant"], "Saksı Bitkisi");
  assert.equal(d["card.wishlist"], "Favorilere ekle");
  assert.equal(d["pdp.guaranteeTitle"], "%100 ÇiçekYolla Garantisi");
  assert.equal(d["pdp.waText"], "Merhaba, \"{name}\" ürününü sipariş vermek istiyorum. {url}");
});

test("PDP: locale sunumunda alt metin ve WhatsApp mesajı çevrilmiş adı kullanır; TR yolu aynen", () => {
  const src = read("../components/product/ProductDetail.tsx");
  assert.match(src, /const imageAlt = \(im: \{ alt\?: string \| null \}, fallback: string = product\.name\): string =>\s*presentation\?\.name \? displayName : \(im\.alt \?\? fallback\)/);
  assert.match(src, /alt=\{imageAlt\(cover\)\}/);
  assert.match(src, /presentation\?\.name\s*\? t\("pdp\.waText", \{ name: displayName, url: waProductUrl \}\)/);
  assert.match(src, /`Merhaba, "\$\{product\.name\}" ürününü sipariş vermek istiyorum\. \$\{waProductUrl\}`/, "TR biçimi korunmalı");
  assert.ok(!src.includes(">%100 ÇiçekYolla Garantisi<"), "garanti başlığı sözlükten gelmeli");
  const panel = read("../components/product/ProductTrustPanel.tsx");
  assert.match(panel, /encodeURIComponent\(t\("trust\.waText"\)\)/);
  assert.ok(!panel.includes("text=Merhaba%2C"), "sabit Türkçe wa.me metni kalmamalı");
});

test("/sepet: dil çerezine göre başlık + seed'li provider; TR için hiçbir değişiklik yok", () => {
  const layout = read("../app/sepet/layout.tsx");
  assert.match(layout, /cookies\(\)\.get\(LANG_COOKIE\)/);
  assert.match(layout, /if \(!dict\) return \{\};/, "TR: kök metadata korunur");
  assert.match(layout, /if \(!dict\) return <>\{children\}<\/>;/, "TR: sarmalama yok");
  assert.match(layout, /title: dict\["cart\.title"\]/);
  const page = read("../app/sepet/page.tsx");
  assert.ok(!page.includes("Teslimat seçilmedi — seçmek için dokunun"), "sepet satırı metni sözlükten");
});

test("Locale şema: ana sayfa Florist düğümü + İstanbul ilçe Service; aggregateRating YOK", () => {
  const src = read("./global/page.tsx");
  assert.match(src, /localeHomeJsonLd\(identity, locale\)/);
  assert.match(src, /istanbulDistrictJsonLd\(identity, \{/);
  assert.match(src, /if \(loc\.city === "istanbul"\)/);
  // Kimlik şeması (ana sayfa/ilçe) puan taşımaz — ürün şeması (gerçek onaylı yorumlardan) ayrı ve dokunulmadı.
  const homeLd = src.slice(src.indexOf("function localeHomeJsonLd"), src.indexOf("// ---- Metadata"));
  assert.ok(homeLd.length > 50 && !/aggregateRating|ratingValue|reviewCount/.test(homeLd), "locale kimlik şeması puan üretmez");
  const id = read("./siteIdentity.ts");
  assert.match(id, /serviceType\?: string; cityLabel\?: string;/);
  assert.ok(!/aggregateRating|ratingValue|reviewCount/.test(id), "siteIdentity puan üretmez");
});

test("V80 footer: kimlik kaynağından adres + saat; 13 dilde footer.hours şablonu {opens}/{closes} taşır", () => {
  const data = read("./global/v80/data.ts");
  assert.match(data, /resolveSiteIdentity\(c\)/);
  assert.match(data, /addressLine: id\.addressLine/);
  const footer = read("./global/v80/footer.ts");
  assert.match(footer, /interp\(t\("footer\.hours"\)/);
  for (const l of GLOBAL_LOCALES) {
    const f = flattenCopy(V80_COPY[l]);
    assert.ok(f["footer.hours"]?.includes("{opens}") && f["footer.hours"]?.includes("{closes}"), `${l} footer.hours`);
  }
});

test("Mühür SVG kendi dilini bildirir (marka metni Türkçe kalır)", () => {
  const src = read("../components/FlowerGuaranteeBadge.tsx");
  assert.match(src, /lang="tr"/);
  assert.match(src, /aria-label="%100 ÇiçekYolla Garantisi"/);
});
