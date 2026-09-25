import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITE_IDENTITY, FLORIST_ID, floristLocalFields, istanbulDistrictJsonLd } from "./siteIdentity.ts";

/**
 * YEREL KİMLİK (25 Eyl 2026) — "çiçekçi / online çiçekçi / <ilçe> çiçekçi" sorgularında Google yerel sonuç
 * gösteriyor; site kendini yalnız Organization olarak tanıtıyor, adres/saat/harita/GBP bağı yoktu. Bu testler
 * (1) ana sayfa şemasının Florist + tam NAP taşıdığını, (2) görünür adresin GBP ile aynı olduğunu,
 * (3) İstanbul ilçe sayfalarının aynı işletme kimliğine bağlandığını korur.
 */
const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("floristLocalFields: Florist tipi, tam adres, telefon, saat, harita, GBP sameAs; puan/yorum YOK", () => {
  const f = floristLocalFields() as Record<string, unknown>;
  assert.deepEqual(f["@type"], ["Organization", "Florist"]);
  assert.equal(f["@id"], FLORIST_ID);
  assert.ok(String(FLORIST_ID).startsWith("https://") && String(FLORIST_ID).endsWith("/#florist"));
  const addr = f.address as Record<string, string>;
  assert.equal(addr["@type"], "PostalAddress");
  assert.equal(addr.streetAddress, "Altayçeşme Mah. Adalı Sk. No: 37 A");
  assert.equal(addr.addressLocality, "Maltepe");
  assert.equal(addr.addressRegion, "İstanbul");
  assert.equal(addr.postalCode, "34843");
  assert.equal(addr.addressCountry, "TR");
  assert.equal(f.telephone, "+905074413474");
  const hours = f.openingHoursSpecification as Array<Record<string, unknown>>;
  assert.equal(hours.length, 1);
  assert.equal((hours[0].dayOfWeek as string[]).length, 7);
  assert.equal(hours[0].opens, "08:00");
  assert.equal(hours[0].closes, "22:00");
  assert.equal(f.hasMap, SITE_IDENTITY.googleMapsUrl);
  assert.ok((f.sameAs as string[]).includes(SITE_IDENTITY.googleMapsUrl), "GBP harita bağı sameAs'te");
  assert.ok(!("aggregateRating" in f) && !("review" in f), "Google puanı şemaya yazılmaz");
  assert.equal(f.name, "ÇiçekYolla");
});

test("istanbulDistrictJsonLd: aynı @id ile Florist + ilçe Service düğümü, geçerli JSON", () => {
  const raw = istanbulDistrictJsonLd({ path: "/istanbul/maltepe", areaName: "Maltepe", pageName: "Maltepe Çiçek Gönder" });
  const doc = JSON.parse(raw) as { "@context": string; "@graph": Array<Record<string, unknown>> };
  assert.equal(doc["@context"], "https://schema.org");
  const florist = doc["@graph"].find((n) => Array.isArray(n["@type"]) && (n["@type"] as string[]).includes("Florist"));
  const service = doc["@graph"].find((n) => n["@type"] === "Service");
  assert.ok(florist && service);
  assert.equal(florist!["@id"], FLORIST_ID);
  assert.equal((service!.provider as Record<string, string>)["@id"], FLORIST_ID);
  assert.equal((service!.areaServed as Record<string, string>).name, "Maltepe, İstanbul");
  assert.ok(String(service!.url).endsWith("/istanbul/maltepe"));
  assert.equal(service!.name, "Maltepe Çiçek Gönder");
  assert.ok(!raw.includes("aggregateRating"));
});

test("kaynak nöbeti — ana sayfa şeması floristLocalFields kullanır; eski adressiz Organization bloğu kalktı", () => {
  const page = src("../app/page.tsx");
  assert.ok(page.includes("...floristLocalFields()"), "ana sayfa Florist alanlarını yayar");
  assert.ok(page.includes(`import { floristLocalFields } from "@/lib/siteIdentity";`));
  assert.ok(!page.includes(`addressLocality: "İstanbul",\n      },`), "adressiz eski PostalAddress kalktı");
  assert.ok(page.includes(`"@type": "WebSite"`), "WebSite düğümü korunur");
});

test("kaynak nöbeti — görünür NAP: iletişim sayfası ve footer GBP adresini basar", () => {
  const contact = src("../app/iletisim/page.tsx");
  assert.ok(contact.includes("SITE_IDENTITY.addressLine"), "iletişim adresi tek kaynaktan");
  assert.ok(!contact.includes(`value:"İstanbul, Türkiye"`), "iletişimde adressiz 'İstanbul, Türkiye' kalktı");
  const footer = src("../components/Footer.tsx");
  assert.ok(footer.includes("SITE_IDENTITY.addressLine"), "footer adresi tek kaynaktan");
  assert.ok(!footer.includes(">İstanbul, Türkiye<"), "footer adressiz satır kalktı");
});

test("kaynak nöbeti — İstanbul ilçe sayfaları istanbulDistrictJsonLd taşır (mahalle/il dışı taşımaz)", () => {
  const slug = src("../app/[...slug]/page.tsx");
  assert.ok(slug.includes(`import { istanbulDistrictJsonLd } from "@/lib/siteIdentity";`));
  assert.ok(slug.includes(`staticParts[0] === "istanbul" && staticParts.length === 2`), "yalnız /istanbul/<ilçe>");
});
