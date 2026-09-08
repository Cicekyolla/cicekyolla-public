// GLOBAL VERSION 80 — locale alt bilgi (footer) sözleşme testleri.
// Çalıştır: npm run test:unit  (node --test lib/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { GLOBAL_LOCALES, type GlobalLocale } from "./global/config.ts";
import { V80_COPY, flattenCopy, mergedTexts } from "./global/v80/copy.ts";
import { buildV80Footer, phoneHref, V80_SOCIAL } from "./global/v80/footer.ts";

const input = (locale: GlobalLocale, over: Partial<Parameters<typeof buildV80Footer>[0]> = {}) => ({
  locale,
  texts: mergedTexts(locale, null),
  categories: [
    { name: "Roses", href: `/${locale}/category/roses` },
    { name: "Bouquets", href: `/${locale}/category/bouquets` },
  ],
  allHref: `/${locale}/category/roses`,
  liveDestinations: ["istanbul", "antalya"],
  contact: { phone: "0507 441 34 74", email: "info@cicekyolla.com.tr" },
  whatsapp: "https://wa.me/905458813450",
  isHome: true,
  hasFaq: true,
  year: 2026,
  ...over,
});

test("footer metinleri 13 dilde tam; rights {year} taşır; Türkçe sabit metin yok", () => {
  const keys = Object.keys(flattenCopy(V80_COPY.en.footer)).sort();
  assert.ok(keys.length >= 18);
  for (const l of GLOBAL_LOCALES) {
    const f = flattenCopy(V80_COPY[l].footer);
    assert.deepEqual(Object.keys(f).sort(), keys, `${l} footer anahtarları`);
    assert.ok(f.rights.includes("{year}"), `${l} rights {year}`);
    for (const [k, v] of Object.entries(f)) {
      assert.ok(v.trim().length > 0, `${l}:${k} boş`);
      assert.ok(!/Tüm hakları|Koleksiyonlar|Kurumsal|İletişim\b|Çerez Tercihleri/.test(v) || l === "az", `${l}:${k} TR metin sızmış → ${v}`);
    }
  }
});

test("footer modeli: her iç bağlantı locale zincirinde (/xx/...), dış bağlantılar gerçek, '#' tek başına yok", () => {
  for (const l of GLOBAL_LOCALES) {
    const m = buildV80Footer(input(l));
    assert.equal(m.homeHref, `/${l}`);
    for (const col of m.columns) {
      assert.ok(col.title, `${l} ${col.key} başlık`);
      for (const link of col.links) {
        assert.ok(link.label, `${l} ${col.key}/${link.key} etiket`);
        assert.notEqual(link.href, "#", `${l} sahte bağlantı`);
        if (link.external) assert.match(link.href, /^https:\/\//, `${l} dış bağlantı https`);
        else assert.ok(link.href.startsWith(`/${l}`) || link.href.startsWith("#"), `${l} ${col.key}/${link.key} zincir dışı → ${link.href}`);
      }
    }
    assert.equal(m.dir, l === "ar" ? "rtl" : "ltr");
    assert.equal(m.contact.phoneHref, "tel:+905074413474");
    assert.equal(m.contact.emailHref, "mailto:info@cicekyolla.com.tr");
    assert.ok(m.rights.includes("2026") && !m.rights.includes("{year}"), `${l} rights yıl`);
    assert.ok(m.contact.address.includes(","), `${l} adres şehir, ülke`);
  }
});

test("footer: teslimat sütunu yalnız YAYIMLI şehirler; kategori en fazla 6 + 'tümü'; SSS yalnız varsa; ana sayfa dışında anchor'lar ana sayfaya gider", () => {
  const home = buildV80Footer(input("en"));
  const deliver = home.columns.find((c) => c.key === "deliver");
  assert.ok(deliver);
  assert.deepEqual(deliver!.links.map((x) => x.href), ["/en/istanbul", "/en/antalya"]);
  assert.deepEqual(deliver!.links.map((x) => x.label), ["Istanbul", "Antalya"]);
  const shop = home.columns.find((c) => c.key === "shop")!;
  assert.equal(shop.links.length, 3);
  assert.equal(shop.links[2].label, "All products");
  const help = home.columns.find((c) => c.key === "help")!;
  assert.deepEqual(help.links.map((x) => x.href), ["#journey", "#destinations", "#content", "https://wa.me/905458813450"]);
  assert.equal(home.cta.href, "#shop");

  const none = buildV80Footer(input("de", { liveDestinations: [], hasFaq: false, isHome: false, categories: Array.from({ length: 9 }, (_, i) => ({ name: `K${i}`, href: `/de/kategorie/k${i}` })) }));
  assert.equal(none.columns.find((c) => c.key === "deliver"), undefined, "yayımlı şehir yoksa sütun basılmaz");
  assert.equal(none.columns.find((c) => c.key === "shop")!.links.length, 7);
  assert.deepEqual(none.columns.find((c) => c.key === "help")!.links.map((x) => x.href), ["/de#journey", "/de#destinations", "https://wa.me/905458813450"]);
  assert.equal(none.cta.href, "/de#shop");
  const follow = none.columns.find((c) => c.key === "follow")!;
  assert.deepEqual(follow.links.map((x) => x.href), V80_SOCIAL.map((s) => s.href));
});

test("footer: Arapça RTL + Arapça metin; şehir eksonimleri o dilde", () => {
  const ar = buildV80Footer(input("ar"));
  assert.equal(ar.dir, "rtl");
  assert.match(ar.columns[0].title, /[؀-ۿ]/);
  assert.ok(ar.contact.address.startsWith("إسطنبول"));
  const ru = buildV80Footer(input("ru"));
  assert.deepEqual(ru.columns.find((c) => c.key === "deliver")!.links.map((x) => x.label), ["Стамбул", "Анталья"]);
});

test("phoneHref: 0507… → +90507…, 90… → +90…, boş → boş", () => {
  assert.equal(phoneHref("0507 441 34 74"), "+905074413474");
  assert.equal(phoneHref("+90 545 881 34 50"), "+905458813450");
  assert.equal(phoneHref("507 441 34 74"), "+905074413474");
  assert.equal(phoneHref(""), "");
});
