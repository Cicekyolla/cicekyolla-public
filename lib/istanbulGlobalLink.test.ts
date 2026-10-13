// lib/istanbulGlobalLink.test.ts — İSTANBUL TR ↔ 13 DİL (13 Eki 2026): iç bağların taşınmış adrese çözülmesi
// ve footer teslimat bağlantıları. Çalıştırma: node --test lib/istanbulGlobalLink.test.ts   (npm run test:unit)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { withMovedHtmlHrefs } from "./internalHref.ts";

const HARITA = new Map<string, string>([
  ["/istanbul/uskudar", "/uskudar-cicek-siparisi"],
  ["/istanbul/atasehir", "/atasehir-cicek-siparisi"],
  ["/istanbul/kadikoy/caferaga-mah", "/kadikoy/caferaga-cicek-siparisi"],
]);

test("HTML iç bağları: 301 kaynağı → son adres; sorgu / parça korunur; diğer bağlar bayt bayt aynı", () => {
  // Canlı Kadıköy intro_html'inden (13 Eki) kesit.
  const html = `<a href="/istanbul/uskudar">Üsküdar</a>, <a href=\"/istanbul/atasehir/\">Ataşehir</a> ve <a href="/maltepe-cicek-siparisi">Maltepe</a> <a href="/istanbul">İstanbul</a>`;
  assert.equal(
    withMovedHtmlHrefs(html, HARITA),
    `<a href="/uskudar-cicek-siparisi">Üsküdar</a>, <a href="/atasehir-cicek-siparisi">Ataşehir</a> ve <a href="/maltepe-cicek-siparisi">Maltepe</a> <a href="/istanbul">İstanbul</a>`,
  );
  assert.equal(withMovedHtmlHrefs(`<a href='/istanbul/kadikoy/caferaga-mah?utm_source=x#sss'>x</a>`, HARITA), `<a href='/kadikoy/caferaga-cicek-siparisi?utm_source=x#sss'>x</a>`);
  assert.equal(withMovedHtmlHrefs(`<a href="/kategori/guller">x</a>`, HARITA), `<a href="/kategori/guller">x</a>`);
});

test("HTML iç bağları: site dışı / protokol-göreli / metin içi yol / boş harita DOKUNULMAZ", () => {
  const dis = `<a href="//istanbul/uskudar">x</a><a href="https://ornek.com/istanbul/uskudar">y</a><p>/istanbul/uskudar adresi</p>`;
  assert.equal(withMovedHtmlHrefs(dis, HARITA), dis);
  const html = `<a href="/istanbul/uskudar">x</a>`;
  assert.equal(withMovedHtmlHrefs(html, new Map()), html);
  assert.equal(withMovedHtmlHrefs("", HARITA), "");
});

test("KAYNAK: konum şablonu intro / blok metnini kayda dokunmadan çözer", () => {
  const src = readFileSync(new URL("../app/[...slug]/page.tsx", import.meta.url), "utf8");
  assert.ok(src.includes("if (injectedIntroHtml) injectedIntroHtml = withMovedHtmlHrefs(injectedIntroHtml, redirects);"));
  assert.ok(src.indexOf("withMovedHtmlHrefs(injectedIntroHtml") > src.indexOf("console.error('[linkInjection] Error:'"), "enjeksiyondan SONRA");
});

test("FOOTER: TR teslimat bağlantıları 301 kaynağına gitmez; locale modunda Global yol bugünküyle aynı", () => {
  const src = readFileSync(new URL("../components/Footer.tsx", import.meta.url), "utf8");
  const blok = src.slice(src.indexOf("const FOOTER_DELIVERY_LINKS"), src.indexOf("];", src.indexOf("const FOOTER_DELIVERY_LINKS")));
  for (const eski of ['href: "/istanbul/kadikoy"', 'href: "/istanbul/besiktas"', 'href: "/istanbul/sisli"']) assert.ok(!blok.includes(eski), eski);
  for (const yeni of ['href: "/kadikoy-cicek-siparisi", globalPath: "/istanbul/kadikoy"', 'href: "/besiktas-cicek-siparisi", globalPath: "/istanbul/besiktas"', 'href: "/sisli-cicek-siparisi", globalPath: "/istanbul/sisli"', 'href: "/istanbul", globalPath: "/istanbul"']) {
    assert.ok(blok.includes(yeni), yeni);
  }
  assert.ok(src.includes("FOOTER_DELIVERY_LINKS.flatMap((l) => (l.globalPath ? [{ label: l.label, href: `/${locale}${l.globalPath}` }] : []));"));
});

// ---------------------------------------------------------------------------
// İSTANBUL ESKİ SEMT / MAHALLE ADRESLERİ — ana sayfaya düşme (soft 404) yerine kesin eşdeğer.
// Harita kesiti canlı /api/public/redirects (13 Eki 2026) kayıtlarından.
// ---------------------------------------------------------------------------
import { istanbulLegacyNeighborhoodTarget, istanbulNeighborhoodIndex } from "./managed-redirects.ts";

const CANLI = new Map<string, { to: string }>([
  ["/istanbul/besiktas", { to: "/besiktas-cicek-siparisi" }],
  ["/istanbul/besiktas/levent-mah", { to: "/besiktas/levent-cicek-siparisi" }],
  ["/istanbul/sisli", { to: "/sisli-cicek-siparisi" }],
  ["/istanbul/sisli/mecidiyekoy-mah", { to: "/sisli/mecidiyekoy-cicek-siparisi" }],
  ["/istanbul/sisli/19-mayis-mah", { to: "/sisli/19-mayis-cicek-siparisi" }],
  ["/istanbul/kadikoy", { to: "/kadikoy-cicek-siparisi" }],
  ["/istanbul/kadikoy/19-mayis-mah", { to: "/kadikoy/19-mayis-cicek-siparisi" }],
  ["/istanbul/kadikoy/caferaga-mah", { to: "/kadikoy/caferaga-cicek-siparisi" }],
  ["/istanbul/gaziosmanpasa", { to: "/gaziosmanpasa-cicek-siparisi" }],
  ["/istanbul/gaziosmanpasa/fevzi-cakmak-mah", { to: "/gaziosmanpasa/fevzi-cakmak-cicek-siparisi" }],
  ["/istanbul/pendik", { to: "/pendik-cicek-siparisi" }],
  ["/istanbul/pendik/fevzi-cakmak-mah", { to: "/pendik/fevzi-cakmak-cicek-siparisi" }],
  ["/kategori/yapay-cicek", { to: "/kategori/yapay-cicekler" }],
]);

test("İSTANBUL ESKİ MAHALLE: tek eşleşme → o mahalle; {ilçe}-{mahalle} → o ilçenin mahallesi", () => {
  assert.equal(istanbulLegacyNeighborhoodTarget("levent", CANLI), "/besiktas/levent-cicek-siparisi");
  assert.equal(istanbulLegacyNeighborhoodTarget("mecidiyekoy", CANLI), "/sisli/mecidiyekoy-cicek-siparisi");
  assert.equal(istanbulLegacyNeighborhoodTarget("caferaga-mahallesi", CANLI), "/kadikoy/caferaga-cicek-siparisi");
  assert.equal(istanbulLegacyNeighborhoodTarget("gaziosmanpasa-fevzi-cakmak", CANLI), "/gaziosmanpasa/fevzi-cakmak-cicek-siparisi");
  assert.equal(istanbulLegacyNeighborhoodTarget("kadikoy-19-mayis", CANLI), "/kadikoy/19-mayis-cicek-siparisi", "ilçe önekli belirsiz ad kesinleşir");
});

test("İSTANBUL ESKİ MAHALLE: belirsiz / yazım hatası / mahalle olmayan semt / geçersiz → null (sahte 301 yok)", () => {
  assert.equal(istanbulLegacyNeighborhoodTarget("19-mayis", CANLI), null, "Kadıköy + Şişli → belirsiz");
  assert.equal(istanbulLegacyNeighborhoodTarget("fevzi-cakmak", CANLI), null, "Gaziosmanpaşa + Pendik → belirsiz");
  assert.equal(istanbulLegacyNeighborhoodTarget("19-mays", CANLI), null, "yazım hatası tahmin edilmez");
  assert.equal(istanbulLegacyNeighborhoodTarget("taksim", CANLI), null, "mahalle değil");
  assert.equal(istanbulLegacyNeighborhoodTarget("", CANLI), null);
  assert.equal(istanbulLegacyNeighborhoodTarget("../levent", CANLI), null);
  assert.equal(istanbulLegacyNeighborhoodTarget("levent", new Map()), null, "harita yok → null");
  assert.deepEqual([...istanbulNeighborhoodIndex(CANLI).keys()].sort(), ["19-mayis", "caferaga", "fevzi-cakmak", "levent", "mecidiyekoy"]);
});

test("KAYNAK: middleware çözücüyü YALNIZ ana sayfa / güvenli konum yedeğinden ÖNCE, hedefsiz legacy konumda çağırır", () => {
  const mw = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
  const i = mw.indexOf("await resolveIstanbulLegacyNeighborhood(legacyLocation.normalizedBase)");
  assert.ok(i > 0);
  assert.ok(i < mw.indexOf("new URL(locationFallback(legacyLocation.normalizedBase), req.nextUrl.origin)"));
  assert.ok(i > mw.indexOf("if (legacyLocation.matched && legacyLocation.destination) {"), "hedefi olan legacy kurallar önce (değişmedi)");
  assert.ok(mw.includes("if (legacyLocation.matched && !legacyLocation.destination && legacyLocation.normalizedBase) {"));
});
