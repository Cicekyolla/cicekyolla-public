import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { IDENTITY_FALLBACK, resolveSiteIdentity, socialLinks, floristLocalFields, istanbulDistrictJsonLd, contactChannels } from "./siteIdentity.ts";
import { buildV80Footer, V80_SOCIAL } from "./global/v80/footer.ts";

/**
 * FOOTER SOSYAL İKONLARI = ADMİN (7 Kas 2026). Admin (Ayarlar › İşletme Kimliği / Hero › Ayarlar) → hero.config →
 * resolveSiteIdentity → socialLinks → TR footer + 13 dil footer + JSON-LD sameAs. Kurallar:
 *   Admin geçerli → Admin · Admin boş → GBP yedeği · Admin geçersiz → ikon GİZLİ (kırık bağlantı basılmaz)
 *   Harita: Admin boş / geçersiz / boş kök → cid'li yedek (hasMap asla https://maps.google.com/ olmaz)
 */
const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const FB_NEW = "https://facebook.com/cicekyolla.com.tr";

test("yedekler bugünkü doğru değerler: instagram.com/cicekyolla + facebook.com/cicekyolla.com.tr", () => {
  assert.equal(IDENTITY_FALLBACK.social_instagram, "https://instagram.com/cicekyolla");
  assert.equal(IDENTITY_FALLBACK.social_facebook, FB_NEW);
  assert.deepEqual(socialLinks(resolveSiteIdentity(null)).map((l) => l.href), ["https://instagram.com/cicekyolla", FB_NEW]);
});

test("Admin'de Facebook değişince TR footer, 13 dil footer ve JSON-LD sameAs AYNI değeri basar", () => {
  const cfg = { social_facebook: "https://www.facebook.com/yeni.sayfa", social_instagram: "https://www.instagram.com/yeni_hesap/" };
  const id = resolveSiteIdentity(cfg);
  const links = socialLinks(id);
  assert.deepEqual(links.map((l) => l.href), ["https://www.instagram.com/yeni_hesap/", "https://www.facebook.com/yeni.sayfa"]);
  // 13 dil footer: v80Contact() → contact.social = socialLinks(id)
  const v80 = buildV80Footer({ locale: "en", texts: { "footer.follow": "Follow" }, categories: [], allHref: null, liveDestinations: [], contact: { phone: "0507 441 34 74", email: "info@cicekyolla.com.tr", social: links }, whatsapp: "https://wa.me/905458813450", isHome: true });
  assert.deepEqual(v80.columns.find((c) => c.key === "follow")!.links.map((l) => l.href), links.map((l) => l.href));
  // JSON-LD sameAs (ana sayfa + ilçe)
  assert.ok((floristLocalFields(id).sameAs as string[]).includes("https://www.facebook.com/yeni.sayfa"));
  const g = JSON.parse(istanbulDistrictJsonLd(id, { path: "/istanbul/maltepe", areaName: "Maltepe", pageName: "" })) as { "@graph": Array<{ sameAs?: string[] }> };
  assert.ok(g["@graph"][0].sameAs!.includes("https://www.facebook.com/yeni.sayfa"));
  assert.ok(!(floristLocalFields(id).sameAs as string[]).includes(FB_NEW), "eski yedek sızmaz");
});

test("Admin değeri geçersizse ikon gizlenir ve sameAs'a girmez (kırık link basılmaz)", () => {
  for (const bad of ["http://facebook.com/x.y.z", "https://faceb00k.com/cicekyolla", "https://facebook.com/", "facebook.com/cicekyolla.com.tr"]) {
    const id = resolveSiteIdentity({ social_facebook: bad });
    assert.equal(id.social.facebook, "", bad);
    assert.deepEqual(socialLinks(id).map((l) => l.key), ["instagram"], bad);
    assert.ok(!(floristLocalFields(id).sameAs as string[]).some((u) => /faceb/.test(u)), bad);
  }
  const v80 = buildV80Footer({ locale: "de", texts: { "footer.follow": "Follow" }, categories: [], allHref: null, liveDestinations: [], contact: { phone: "1", email: "a@b.c", social: [] }, whatsapp: "", isHome: false });
  assert.equal(v80.columns.find((c) => c.key === "follow"), undefined, "boş liste → takip sütunu ve ikon basılmaz");
});

test("eski çağıran (contact.social yok) V80_SOCIAL yedeğiyle aynen çalışır", () => {
  const v80 = buildV80Footer({ locale: "fr", texts: { "footer.follow": "Follow" }, categories: [], allHref: null, liveDestinations: [], contact: { phone: "1", email: "a@b.c" }, whatsapp: "", isHome: false });
  assert.deepEqual(v80.columns.find((c) => c.key === "follow")!.links.map((l) => l.href), V80_SOCIAL.map((s) => s.href));
});

test("hasMap: Admin boş kök / geçersiz harita → cid'li yedek; geçerli → Admin", () => {
  for (const bad of ["https://maps.google.com/", "https://maps.google.com", "https://www.google.com/maps", "https://evil.example/maps?cid=1"]) {
    const id = resolveSiteIdentity({ google_maps_url: bad });
    assert.equal(floristLocalFields(id).hasMap, IDENTITY_FALLBACK.google_maps_url, bad);
    assert.equal(contactChannels(id).find((c) => c.kind === "address")!.href, IDENTITY_FALLBACK.google_maps_url, bad);
  }
  assert.equal(floristLocalFields(resolveSiteIdentity({ google_maps_url: "https://maps.app.goo.gl/AbC123" })).hasMap, "https://maps.app.goo.gl/AbC123");
});

test("kaynak nöbeti: footer sosyal ikonları sabit dizi değil, socialLinks(identity); 13 dil v80Contact social verir", () => {
  const footer = src("../components/Footer.tsx");
  assert.ok(footer.includes("socialLinks(identity).map("));
  assert.ok(!/href: "https:\/\/www\.(facebook|instagram)\.com/.test(footer), "TR footer'da sabit sosyal adres kalmadı");
  const data = src("./global/v80/data.ts");
  assert.equal((data.match(/social: socialLinks\(id\)/g) ?? []).length, 2, "başarılı + yedek dal");
});
