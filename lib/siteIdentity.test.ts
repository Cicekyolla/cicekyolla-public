import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  IDENTITY_FALLBACK, IDENTITY_CMS_KEYS, FLORIST_ID, resolveSiteIdentity, contactChannels, floristLocalFields,
  istanbulDistrictJsonLd, mapsOpenUrl, directionsUrl, toE164Tr,
} from "./siteIdentity.ts";
import { SITE_URL } from "./site-config.ts";

/**
 * TEK DAMAR (25 Eyl 2026): Admin (hero.config) → resolveSiteIdentity → /iletisim + footer + ana sayfa Florist şeması +
 * İstanbul ilçe Service şeması. Bu testler (1) Admin'de değişen alanın DÖRT yüzeyde birlikte değiştiğini, (2) Admin alanı boşken
 * GBP yedeğinin devreye girdiğini, (3) origin kilidini (url/@id yalnız SITE_URL), (4) kaynak kablolamayı korur.
 */
const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

// Admin'de değiştirilmiş bir yayın sürümü: saat 08:00–23:00, yeni telefon, yeni adres, yeni harita bağı.
const CMS = {
  business_name: "ÇiçekYolla",
  contact_phone: "0507 000 11 22",
  contact_whatsapp: "0545 000 33 44",
  contact_email: "merhaba@cicekyolla.com.tr",
  address_street: "Örnek Mah. Deneme Sk. No: 5",
  address_district: "Kartal",
  address_city: "İstanbul",
  postal_code: "34870",
  hours_opens: "08:00",
  hours_closes: "23:00",
  hours_note: "Her gün",
  google_maps_url: "https://maps.google.com/?cid=123",
  google_place_id: "ChIJTEST",
  social_instagram: "https://instagram.com/cicekyolla",
  social_facebook: "https://facebook.com/cicekyolla",
};

test("aynı kaynak: Admin'de değişen saat/telefon/adres iletişim kanallarında, footer değerlerinde, ana sayfa şemasında ve ilçe şemasında BİRLİKTE değişir", () => {
  const id = resolveSiteIdentity(CMS);
  assert.equal(id.cmsFields.length, IDENTITY_CMS_KEYS.length, "tüm alanlar CMS'ten okundu");
  // /iletisim kanalları
  const ch = contactChannels(id);
  assert.equal(ch.find((c) => c.kind === "phone")!.value, "0507 000 11 22");
  assert.equal(ch.find((c) => c.kind === "phone")!.note, "Her gün 08:00–23:00");
  assert.equal(ch.find((c) => c.kind === "whatsapp")!.href, "https://wa.me/905450003344");
  assert.equal(ch.find((c) => c.kind === "address")!.value, "Örnek Mah. Deneme Sk. No: 5, 34870 Kartal / İstanbul");
  assert.equal(ch.find((c) => c.kind === "address")!.href, "https://maps.google.com/?cid=123");
  // footer değerleri (Footer aynı identity nesnesini basar)
  assert.equal(id.hoursLabel, "Her gün 08:00–23:00");
  assert.equal(id.addressLine, "Örnek Mah. Deneme Sk. No: 5, 34870 Kartal / İstanbul");
  // ana sayfa Florist şeması
  const f = floristLocalFields(id) as Record<string, unknown>;
  assert.equal(f.telephone, "+905070001122");
  assert.equal((f.address as Record<string, string>).streetAddress, "Örnek Mah. Deneme Sk. No: 5");
  assert.equal((f.address as Record<string, string>).postalCode, "34870");
  const hours = f.openingHoursSpecification as Array<Record<string, unknown>>;
  assert.equal(hours[0].closes, "23:00");
  assert.equal(f.hasMap, "https://maps.google.com/?cid=123");
  assert.ok((f.sameAs as string[]).includes("https://maps.google.com/?cid=123"));
  // ilçe Service şeması
  const g = JSON.parse(istanbulDistrictJsonLd(id, { path: "/istanbul/maltepe", areaName: "Maltepe", pageName: "Maltepe Çiçek Gönder" })) as { "@graph": Array<Record<string, unknown>> };
  const florist = g["@graph"][0];
  assert.equal(florist.telephone, "+905070001122");
  assert.equal((florist.address as Record<string, string>).postalCode, "34870");
  assert.equal((florist.openingHoursSpecification as Array<Record<string, unknown>>)[0].closes, "23:00");
  assert.equal(florist.hasMap, "https://maps.google.com/?cid=123");
});

test("Admin alanları boşken GBP yedeği: Adalı Sk. 37 A Maltepe, 0507 441 34 74, 08:00–22:00, harita cid", () => {
  for (const cfg of [null, undefined, {}, { contact_phone: "   " }]) {
    const id = resolveSiteIdentity(cfg as Record<string, unknown> | null | undefined);
    assert.equal(id.cmsFields.length, 0);
    assert.equal(id.name, "ÇiçekYolla");
    assert.equal(id.phoneDisplay, IDENTITY_FALLBACK.contact_phone);
    assert.equal(id.phoneE164, "+905074413474");
    assert.equal(id.whatsappE164, "+905458813450");
    assert.equal(id.address.streetAddress, "Altayçeşme Mah. Adalı Sk. No: 37 A");
    assert.equal(id.address.addressLocality, "Maltepe");
    assert.equal(id.address.postalCode, "34843");
    assert.equal(id.hoursLabel, "Her gün 08:00–22:00");
    assert.equal(id.googleMapsUrl, "https://maps.google.com/?cid=1591470732109749248");
    assert.deepEqual(id.alternateNames, ["Çiçek Yolla", "Cicekyolla"]);
  }
  // kısmi Admin verisi: yalnız saat değişti → diğerleri yedekte kalır
  const p = resolveSiteIdentity({ hours_closes: "23:00" });
  assert.deepEqual(p.cmsFields, ["hours_closes"]);
  assert.equal(p.hoursLabel, "Her gün 08:00–23:00");
  assert.equal(p.address.postalCode, "34843");
});

test("origin kilidi: @id, url ve Service url yalnız SITE_URL'den; Admin origin üretemez", () => {
  assert.ok(SITE_URL.startsWith("https://"));
  assert.equal(FLORIST_ID, `${SITE_URL}/#florist`);
  const id = resolveSiteIdentity({ ...CMS, google_maps_url: "https://evil.example/x" });
  const g = JSON.parse(istanbulDistrictJsonLd(id, { path: "/istanbul/kartal", areaName: "Kartal", pageName: "" })) as { "@graph": Array<Record<string, unknown>> };
  assert.equal(g["@graph"][0].url, SITE_URL);
  assert.equal(g["@graph"][0]["@id"], FLORIST_ID);
  assert.equal(g["@graph"][1].url, `${SITE_URL}/istanbul/kartal`);
  assert.equal((g["@graph"][1].provider as Record<string, string>)["@id"], FLORIST_ID);
  assert.equal(g["@graph"][1].name, "Kartal çiçek teslimatı");
  const f = floristLocalFields(id) as Record<string, unknown>;
  assert.ok(!("aggregateRating" in f) && !("review" in f), "Google puanı şemaya yazılmaz");
});

test("harita bağlantıları: Admin harita bağı varsa o; yoksa adres + Place ID ile arama; yol tarifi anahtarsız", () => {
  const id = resolveSiteIdentity(null);
  assert.equal(mapsOpenUrl(id), IDENTITY_FALLBACK.google_maps_url);
  assert.ok(directionsUrl(id).startsWith("https://www.google.com/maps/dir/?api=1&destination="));
  assert.ok(directionsUrl(id).includes("destination_place_id=ChIJt-IisKbGyhQRABzV6TIKFhY"));
  // Admin alanı BOŞ bırakılırsa GBP yedeği devreye girer (adres/harita asla boş kalmaz).
  const emptyAdmin = resolveSiteIdentity({ ...CMS, google_maps_url: "" });
  assert.equal(mapsOpenUrl(emptyAdmin), IDENTITY_FALLBACK.google_maps_url);
  // Harita bağı hiç yoksa (yedek de boşsa) adres + Place ID ile Google Haritalar araması üretilir.
  const noMap = { ...resolveSiteIdentity(CMS), googleMapsUrl: "" };
  assert.ok(mapsOpenUrl(noMap).startsWith("https://www.google.com/maps/search/?api=1&query=") && mapsOpenUrl(noMap).includes("query_place_id=ChIJTEST"));
});

test("toE164Tr: yerel/uluslararası yazımlar tek biçime iner", () => {
  assert.equal(toE164Tr("0507 441 34 74"), "+905074413474");
  assert.equal(toE164Tr("+90 507 441 34 74"), "+905074413474");
  assert.equal(toE164Tr("5074413474"), "+905074413474");
  assert.equal(toE164Tr(""), "");
});

test("kaynak nöbeti — dört yüzey de resolveSiteIdentity(hero.config) kullanır; sabit adres/saat metni kalmadı", () => {
  const page = src("../app/page.tsx");
  assert.ok(page.includes("const identity = resolveSiteIdentity(heroSection?.config);"));
  assert.ok(page.includes("...floristLocalFields(identity)"));
  assert.ok(page.includes("<HomeJsonLd logoUrl={schemaLogoUrl} identity={identity} />"));
  const layout = src("../app/layout.tsx");
  assert.ok(layout.includes("identity: resolveSiteIdentity(heroConfig),"), "footer kimliği layout'ta aynı hero.config'ten");
  const footer = src("../components/Footer.tsx");
  assert.ok(footer.includes("const identity = brand?.identity ?? resolveSiteIdentity(null);"));
  assert.ok(footer.includes("{identity.hoursLabel}") && footer.includes("{identity.addressLine}"));
  assert.ok(!footer.includes("Her gün 08:00 – 22:00") && !footer.includes(">İstanbul, Türkiye<"), "footer'da sabit saat/adres yok");
  const contact = src("../app/iletisim/page.tsx");
  assert.ok(contact.includes("resolveSiteIdentity(homepage?.sections.find((s) => s.type === \"hero\")?.config)"));
  assert.ok(contact.includes("contactChannels(identity)") && contact.includes("mapsOpenUrl(identity)") && contact.includes("directionsUrl(identity)"));
  assert.ok(contact.includes("{identity.hours.opens}–{identity.hours.closes}"), "çalışma saati kutusu kimlikten");
  assert.ok(!contact.includes(`value:"İstanbul, Türkiye"`) && !contact.includes("08:00–22:00</strong>"), "iletişimde sabit adres/saat yok");
  const slug = src("../app/[...slug]/page.tsx");
  assert.ok(slug.includes("istanbulDistrictJsonLd(identity, {") && slug.includes(`staticParts[0] === "istanbul" && staticParts.length === 2`));
  assert.ok(slug.includes("resolveSiteIdentity(homepage?.sections.find((s) => s.type === \"hero\")?.config)"));
});
