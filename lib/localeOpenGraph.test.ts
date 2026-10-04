// lib/localeOpenGraph.test.ts — locale sayfası OpenGraph'ı: kök layout'un Türkçe openGraph'ı miras alınmaz.
// Çalıştırma: node --test lib/localeOpenGraph.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLOBAL_LOCALES } from "./global/config.ts";
import { OG_DEFAULT_IMAGE, OG_LOCALE, OG_SITE_NAME, localeOpenGraph } from "./global/localeOpenGraph.ts";

const oku = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const SITE = "https://www.cicekyolla.com.tr";

test("og:locale: 13 dilin tamamı eşlenir, biçim dil_BÖLGE, hiçbiri tr_TR değil", () => {
  assert.deepEqual(Object.keys(OG_LOCALE).sort(), [...GLOBAL_LOCALES].sort());
  assert.deepEqual(OG_LOCALE, {
    de: "de_DE", en: "en_US", fr: "fr_FR", nl: "nl_NL", it: "it_IT", es: "es_ES", pt: "pt_PT",
    az: "az_AZ", ru: "ru_RU", ar: "ar_AR", zh: "zh_CN", ja: "ja_JP", ko: "ko_KR",
  });
  for (const l of GLOBAL_LOCALES) {
    assert.match(OG_LOCALE[l], /^[a-z]{2}_[A-Z]{2}$/, l);
    assert.ok(OG_LOCALE[l].startsWith(`${l}_`), l);
    assert.notEqual(OG_LOCALE[l], "tr_TR");
  }
});

test("liste / ana sayfa / kategori: url = canonical, tür website, site adı, o dilin kodu, başlık + açıklama, varsayılan görsel", () => {
  const og = localeOpenGraph("de", { url: `${SITE}/de/istanbul`, title: "Blumen nach Istanbul", description: "Taggleiche Lieferung." });
  assert.deepEqual(og, {
    type: "website",
    url: `${SITE}/de/istanbul`,
    siteName: "ÇiçekYolla",
    locale: "de_DE",
    title: "Blumen nach Istanbul",
    description: "Taggleiche Lieferung.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ÇiçekYolla — Premium Çiçekçi" }],
  });
});

test("ürün sayfası: görsel = ürün kapağı (varsayılan görsel yerine)", () => {
  const og = localeOpenGraph("en", { url: `${SITE}/en/product/red-roses`, title: "Red Roses", image: "/r2/products/1.webp" });
  assert.deepEqual(og.images, [{ url: "/r2/products/1.webp" }]);
  assert.equal(og.locale, "en_US");
});

test("başlık / açıklama yoksa anahtar hiç yazılmaz (Next sayfanın title/description'ını kullanır); varsayılan görsel kopyadır", () => {
  const og = localeOpenGraph("ar", { url: `${SITE}/ar`, title: null, description: undefined, image: null });
  assert.equal("title" in og, false);
  assert.equal("description" in og, false);
  assert.equal(og.locale, "ar_AR");
  assert.notEqual(og.images[0], OG_DEFAULT_IMAGE, "paylaşılan sabit nesne dışarı verilmez");
  assert.deepEqual(og.images[0], { ...OG_DEFAULT_IMAGE });
});

test("KAYNAK: site adı ve varsayılan görsel kök layout'takiyle AYNI ('bugün kullanılan')", () => {
  const layout = oku("../app/layout.tsx");
  assert.ok(layout.includes(`siteName: "${OG_SITE_NAME}"`));
  assert.ok(layout.includes(`url: "${OG_DEFAULT_IMAGE.url}"`));
  assert.ok(layout.includes(`width: ${OG_DEFAULT_IMAGE.width}`) && layout.includes(`height: ${OG_DEFAULT_IMAGE.height}`));
  assert.ok(layout.includes(`alt: "${OG_DEFAULT_IMAGE.alt}"`));
  assert.ok(layout.includes('<html lang="tr"'), "kök layout tek ve Türkçe — <html lang> bu işin kapsamı dışında");
});

test("KAYNAK: localeMetadata'nın gerçek sayfa dönen HER dalı kendi openGraph'ını kurar (5 dal); PDP'de kapak geçer", () => {
  const motor = oku("./global/page.tsx");
  const meta = motor.slice(motor.indexOf("export async function localeMetadata"), motor.indexOf("// ---- Ortak parçalar"));
  assert.equal(meta.split("openGraph: localeOpenGraph(locale, {").length - 1, 5, "ana sayfa (yedek + satır) + sayfa + kategori + ürün");
  assert.ok(meta.includes("openGraph: localeOpenGraph(locale, { url: self, title, description: surface.meta_description, image: cover }),"));
  // EK (TEK GÖRSEL KAYNAĞI): kapak, vitrinin sunduğu dosyaya çözülür (lib/productImageUrl.ts); aday sırası aynı.
  assert.ok(meta.includes('const cover = firstServedProductImageUrl([detail?.images.find((i) => i.role === "cover")?.url, detail?.images[0]?.url]);'));
  assert.ok(!meta.includes("tr_TR"));
});

test("KAYNAK: Türkçe PDP openGraph'ı url (canonical) + tr_TR taşır; görsel / başlık davranışı aynen", () => {
  const urun = oku("../app/urun/[slug]/page.tsx");
  const og = urun.slice(urun.indexOf("openGraph: {"), urun.indexOf("twitter: {"));
  assert.ok(og.includes("url: absoluteUrl(canonicalPath),"));
  assert.ok(og.includes('locale: "tr_TR",'));
  assert.ok(og.includes("title: seo?.og_title || title,"));
  assert.ok(og.includes("images: ogImage ? [{ url: ogImage }] : undefined,"));
});
